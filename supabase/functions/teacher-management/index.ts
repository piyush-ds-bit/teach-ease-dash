import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TeacherStatus = 'active' | 'suspended';

interface CreateTeacherPayload {
  email: string;
  full_name: string;
  phone?: string;
}

interface UpdateStatusPayload {
  teacher_user_id: string;
  status: TeacherStatus;
}

interface ResendInvitePayload {
  teacher_user_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify their role
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabaseUser.auth.getUser(token);
    if (claimsError || !claims.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = claims.user.id;

    // Create admin client for privileged operations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin: SupabaseClient<any> = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if caller has super_admin role
    const { data: hasRole, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: callerId,
      _role: 'super_admin',
    });

    if (roleError || !hasRole) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Super admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Route to appropriate handler
    switch (action) {
      case 'create': {
        const payload: CreateTeacherPayload = await req.json();
        return await createTeacher(supabaseAdmin, callerId, payload);
      }
      case 'update-status': {
        const payload: UpdateStatusPayload = await req.json();
        return await updateTeacherStatus(supabaseAdmin, payload);
      }
      case 'resend-invite': {
        const payload: ResendInvitePayload = await req.json();
        return await resendInvite(supabaseAdmin, payload);
      }
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createTeacher(
  supabaseAdmin: SupabaseClient<any>,
  createdBy: string,
  payload: CreateTeacherPayload
) {
  const { email, full_name, phone } = payload;

  if (!email || !full_name) {
    return new Response(
      JSON.stringify({ error: 'Email and full name are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if teacher with this email already exists
  const { data: existingTeacher } = await supabaseAdmin
    .from('teachers')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existingTeacher) {
    return new Response(
      JSON.stringify({ error: 'A teacher with this email already exists' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create auth user with a temporary random password
  // Teacher will set their own password via invite link
  const tempPassword = crypto.randomUUID() + crypto.randomUUID();

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.toLowerCase(),
    password: tempPassword,
    email_confirm: true, // Auto-confirm email so they can set password
    user_metadata: { full_name },
  });

  if (authError || !authUser.user) {
    return new Response(
      JSON.stringify({ error: authError?.message || 'Failed to create user' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Insert into teachers table
  const { error: teacherError } = await supabaseAdmin.from('teachers').insert({
    user_id: authUser.user.id,
    email: email.toLowerCase(),
    full_name,
    phone: phone || null,
    status: 'active' as TeacherStatus,
    created_by: createdBy,
  });

  if (teacherError) {
    // Rollback: delete the auth user
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return new Response(
      JSON.stringify({ error: teacherError.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Assign 'teacher' role in user_roles
  const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
    user_id: authUser.user.id,
    role: 'teacher',
  });

  if (roleError) {
    console.error('Failed to assign role:', roleError);
    // Don't fail the whole operation, just log
  }

  // Generate password reset link for teacher to set their password
  // Use redirect_to to ensure Supabase redirects to our auth callback page
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email.toLowerCase(),
    options: {
      redirectTo: 'https://piyushbusiness.lovable.app/auth/callback',
    },
  });

  // Use the Supabase action_link directly - it will redirect to /auth/callback after verification
  const inviteLink = linkData?.properties?.action_link || '';

  return new Response(
    JSON.stringify({
      success: true,
      teacher: {
        user_id: authUser.user.id,
        email: email.toLowerCase(),
        full_name,
      },
      invite_link: inviteLink || 'Link generation failed. Use resend-invite.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateTeacherStatus(
  supabaseAdmin: SupabaseClient<any>,
  payload: UpdateStatusPayload
) {
  const { teacher_user_id, status } = payload;

  if (!teacher_user_id || !status) {
    return new Response(
      JSON.stringify({ error: 'Teacher user ID and status are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update teacher status in teachers table
  const { error: updateError } = await supabaseAdmin
    .from('teachers')
    .update({ status })
    .eq('user_id', teacher_user_id);

  if (updateError) {
    return new Response(
      JSON.stringify({ error: updateError.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // If suspended, also ban the auth user to prevent login
  if (status === 'suspended') {
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
      teacher_user_id,
      { ban_duration: '876000h' } // ~100 years
    );
    if (banError) console.error('Failed to ban user:', banError);
  } else {
    // If reactivated, unban the user
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
      teacher_user_id,
      { ban_duration: 'none' }
    );
    if (unbanError) console.error('Failed to unban user:', unbanError);
  }

  return new Response(
    JSON.stringify({ success: true, status }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resendInvite(
  supabaseAdmin: SupabaseClient<any>,
  payload: ResendInvitePayload
) {
  const { teacher_user_id } = payload;

  if (!teacher_user_id) {
    return new Response(
      JSON.stringify({ error: 'Teacher user ID is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get teacher email
  const { data: teacher, error: teacherError } = await supabaseAdmin
    .from('teachers')
    .select('email')
    .eq('user_id', teacher_user_id)
    .single();

  if (teacherError || !teacher) {
    return new Response(
      JSON.stringify({ error: 'Teacher not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate new password reset link with redirect to auth callback
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: teacher.email,
    options: {
      redirectTo: 'https://piyushbusiness.lovable.app/auth/callback',
    },
  });

  // Use the Supabase action_link directly
  const inviteLink = linkData?.properties?.action_link || '';

  return new Response(
    JSON.stringify({
      success: true,
      invite_link: inviteLink || 'Link generation failed',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

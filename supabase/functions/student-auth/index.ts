import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  login_id: string;
  password: string;
}

interface GenerateCredentialsRequest {
  student_id: string;
  password: string;
}

interface ResetPasswordRequest {
  student_id: string;
  new_password: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    if (action === "login") {
      return await handleLogin(supabaseAdmin, body as LoginRequest);
    } else if (action === "generate-credentials") {
      return await handleGenerateCredentials(supabaseAdmin, body as GenerateCredentialsRequest, req);
    } else if (action === "reset-password") {
      return await handleResetPassword(supabaseAdmin, body as ResetPasswordRequest, req);
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleLogin(supabaseAdmin: any, { login_id, password }: LoginRequest) {
  // Validate input
  if (!login_id || !password) {
    return new Response(
      JSON.stringify({ error: "Login ID and password are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Normalize login_id
  const normalizedLoginId = login_id.trim().toUpperCase();

  // Fetch student with password hash
  const { data: student, error: fetchError } = await supabaseAdmin
    .from("students")
    .select("id, login_id, password_hash, name, auth_user_id")
    .eq("login_id", normalizedLoginId)
    .maybeSingle();

  if (fetchError || !student) {
    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!student.password_hash) {
    return new Response(
      JSON.stringify({ error: "Account not configured. Please contact your administrator." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify password with bcrypt
  let isValid = false;
  try {
    // Check if it's a bcrypt hash (starts with $2)
    if (student.password_hash.startsWith("$2")) {
      isValid = await bcrypt.compare(password, student.password_hash);
    } else {
      // Legacy SHA-256 hash - verify and upgrade
      const legacyHash = await sha256(password);
      if (legacyHash === student.password_hash) {
        isValid = true;
        // Upgrade to bcrypt
        const newHash = await bcrypt.hash(password);
        await supabaseAdmin
          .from("students")
          .update({ password_hash: newHash })
          .eq("id", student.id);
      }
    }
  } catch (e) {
    console.error("Password verification error:", e);
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!isValid) {
    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create or get Supabase Auth user for this student
  let authUserId = student.auth_user_id;
  
  if (!authUserId) {
    // Create a new auth user for this student
    const email = `${normalizedLoginId.toLowerCase()}@student.local`;
    
    // Try to create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        student_id: student.id, 
        login_id: student.login_id,
        is_student: true 
      }
    });

    if (createError) {
      // User might already exist, try to get them
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.find((u: any) => u.email === email);
      
      if (existingUser) {
        authUserId = existingUser.id;
        // Update password to match
        await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
      } else {
        console.error("Failed to create auth user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to authenticate" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      authUserId = newUser.user.id;
    }

    // Link auth user to student
    await supabaseAdmin
      .from("students")
      .update({ auth_user_id: authUserId })
      .eq("id", student.id);
  } else {
    // Update password in auth to match (in case it was changed)
    await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
  }

  // Sign in the user to get session tokens
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: `${normalizedLoginId.toLowerCase()}@student.local`,
  });

  // Generate session directly using signInWithPassword
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.signInWithPassword({
    email: `${normalizedLoginId.toLowerCase()}@student.local`,
    password,
  });

  if (sessionError || !sessionData.session) {
    console.error("Session error:", sessionError);
    return new Response(
      JSON.stringify({ error: "Failed to create session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      student: {
        id: student.id,
        login_id: student.login_id,
        name: student.name,
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
      }
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGenerateCredentials(supabaseAdmin: any, { student_id, password }: GenerateCredentialsRequest, req: Request) {
  // Verify admin auth - extract and validate JWT token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Extract token and verify user
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  
  if (userError || !user) {
    console.error("Token verification failed:", userError);
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify user has admin role using has_role function
  const { data: hasAdminRole, error: roleError } = await supabaseAdmin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin"
  });

  if (roleError || !hasAdminRole) {
    console.error("Admin role check failed:", roleError);
    return new Response(
      JSON.stringify({ error: "Access denied. Admin privileges required." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate input
  if (!student_id || !password) {
    return new Response(
      JSON.stringify({ error: "Student ID and password are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate student_id is valid UUID format
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(student_id)) {
    return new Response(
      JSON.stringify({ error: "Invalid student ID format" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: "Password must be at least 8 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (password.length > 128) {
    return new Response(
      JSON.stringify({ error: "Password too long" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(password);

  // Update student record
  const { error: updateError } = await supabaseAdmin
    .from("students")
    .update({ password_hash: passwordHash })
    .eq("id", student_id);

  if (updateError) {
    console.error("Update error:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to update credentials" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleResetPassword(supabaseAdmin: any, { student_id, new_password }: ResetPasswordRequest, req: Request) {
  // Verify admin auth - extract and validate JWT token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Extract token and verify user
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  
  if (userError || !user) {
    console.error("Token verification failed:", userError);
    return new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify user has admin role using has_role function
  const { data: hasAdminRole, error: roleError } = await supabaseAdmin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin"
  });

  if (roleError || !hasAdminRole) {
    console.error("Admin role check failed:", roleError);
    return new Response(
      JSON.stringify({ error: "Access denied. Admin privileges required." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate input
  if (!student_id || !new_password) {
    return new Response(
      JSON.stringify({ error: "Student ID and new password are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate student_id is valid UUID format
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(student_id)) {
    return new Response(
      JSON.stringify({ error: "Invalid student ID format" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (new_password.length < 8) {
    return new Response(
      JSON.stringify({ error: "Password must be at least 8 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (new_password.length > 128) {
    return new Response(
      JSON.stringify({ error: "Password too long" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get student info
  const { data: student, error: fetchError } = await supabaseAdmin
    .from("students")
    .select("id, login_id, auth_user_id")
    .eq("id", student_id)
    .single();

  if (fetchError || !student) {
    return new Response(
      JSON.stringify({ error: "Student not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Hash new password with bcrypt
  const passwordHash = await bcrypt.hash(new_password);

  // Update student record
  const { error: updateError } = await supabaseAdmin
    .from("students")
    .update({ password_hash: passwordHash })
    .eq("id", student_id);

  if (updateError) {
    console.error("Update error:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to reset password" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // If auth user exists, update their password too
  if (student.auth_user_id) {
    await supabaseAdmin.auth.admin.updateUserById(student.auth_user_id, {
      password: new_password
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Helper for legacy SHA-256 verification
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to identify the teacher
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teacherId = user.id;

    // Step 1: Find orphaned ledger entries (loan_id is NULL)
    const { data: orphanedEntries, error: entriesError } = await supabase
      .from('lending_ledger')
      .select('id, borrower_id, entry_type, amount, entry_date')
      .eq('teacher_id', teacherId)
      .is('loan_id', null);

    if (entriesError) throw entriesError;

    if (!orphanedEntries || orphanedEntries.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No orphaned entries found',
          stats: { entriesLinked: 0, loansCreated: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group orphaned entries by borrower_id
    const entriesByBorrower: Record<string, typeof orphanedEntries> = {};
    for (const entry of orphanedEntries) {
      if (!entriesByBorrower[entry.borrower_id]) {
        entriesByBorrower[entry.borrower_id] = [];
      }
      entriesByBorrower[entry.borrower_id].push(entry);
    }

    let entriesLinked = 0;
    let loansCreated = 0;

    for (const [borrowerId, entries] of Object.entries(entriesByBorrower)) {
      // Get borrower data (for legacy loan info)
      const { data: borrower } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', borrowerId)
        .single();

      if (!borrower) continue;

      // Check if a loan already exists for this borrower
      const { data: existingLoans } = await supabase
        .from('loans')
        .select('id, start_date')
        .eq('borrower_id', borrowerId)
        .eq('teacher_id', teacherId)
        .order('start_date', { ascending: true });

      let targetLoanId: string;

      if (existingLoans && existingLoans.length > 0) {
        // Use the first (oldest) loan for orphaned entries
        targetLoanId = existingLoans[0].id;
      } else {
        // Create a new loan from borrower's legacy data
        const { data: newLoan, error: loanError } = await supabase
          .from('loans')
          .insert({
            borrower_id: borrowerId,
            principal_amount: borrower.principal_amount,
            interest_type: borrower.interest_type,
            interest_rate: borrower.interest_rate || 0,
            start_date: borrower.loan_start_date,
            status: 'active',
            teacher_id: teacherId,
            legacy_borrower_id: borrowerId,
          })
          .select()
          .single();

        if (loanError) {
          console.error(`Failed to create loan for borrower ${borrowerId}:`, loanError);
          continue;
        }

        targetLoanId = newLoan.id;
        loansCreated++;
      }

      // Link all orphaned entries to the loan
      const entryIds = entries.map(e => e.id);
      const { error: updateError } = await supabase
        .from('lending_ledger')
        .update({ loan_id: targetLoanId })
        .in('id', entryIds);

      if (updateError) {
        console.error(`Failed to link entries for borrower ${borrowerId}:`, updateError);
      } else {
        entriesLinked += entryIds.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration complete: ${entriesLinked} entries linked, ${loansCreated} loans created`,
        stats: { entriesLinked, loansCreated }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Sends a finished report's download link by email via Resend.
// Invoked from the client via supabase.functions.invoke('send-report-email', { body: { requestId } })
// after a report has been generated and its request row has email_to set.
import { createClient } from 'npm:@supabase/supabase-js@2';

// The browser calls this from the app's own origin (e.g. http://localhost:5173
// in dev, the deployed site's origin in prod) which is cross-origin from
// *.supabase.co - without these headers on every response (including the
// preflight OPTIONS the browser sends first), the browser blocks the request
// before it ever reaches this function's logic, regardless of whether the
// function itself works.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'requestId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    /**
     * Authorize the CALLER against this specific report.
     *
     * This function runs with the service-role key, which bypasses RLS
     * entirely, and previously validated only that `requestId` was present.
     * Since the sole remaining gate was "holds any valid Supabase JWT" -
     * trivially obtained, public signup is enabled - anyone could invoke it
     * for a requestId they had no relationship to. That gave both a
     * 200-vs-404 oracle for enumerating valid report IDs and a way to
     * repeatedly re-send someone else's report link to whatever address is
     * on file, burning the Resend quota.
     *
     * Identify the caller from their own JWT (never from anything in the
     * request body, which they control), then require that they are either
     * an admin or the customer the report belongs to.
     */
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: caller, error: callerError } = await supabase.auth.getUser(jwt);
    const callerEmail = caller?.user?.email ?? '';
    if (callerError || !callerEmail) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: request, error: reqError } = await supabase
      .from('report_requests')
      .select('id, customer_id, email_to, report_type, report_from, report_to, machines(machine_name), machine_reports(file_name, file_url)')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: reqError?.message ?? 'Report request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Admin (on the admin_users allowlist) or the report's own customer.
    const [{ data: adminRow }, { data: customerRow }] = await Promise.all([
      supabase.from('admin_users').select('email').eq('email', callerEmail).maybeSingle(),
      supabase.from('customers').select('id').eq('email', callerEmail).maybeSingle(),
    ]);
    const isAdmin = Boolean(adminRow);
    const ownsReport = Boolean(customerRow && request.customer_id && customerRow.id === request.customer_id);
    if (!isAdmin && !ownsReport) {
      // Deliberately 404, not 403: a 403 would confirm the id exists, which
      // is exactly the enumeration signal this check is meant to remove.
      return new Response(JSON.stringify({ error: 'Report request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!request.email_to) {
      return new Response(JSON.stringify({ error: 'This report has no email_to address set' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const report = Array.isArray(request.machine_reports) ? request.machine_reports[0] : request.machine_reports;
    if (!report?.file_url) {
      return new Response(JSON.stringify({ error: 'Report file has not been generated yet' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from('reports')
      .createSignedUrl(report.file_url, 60 * 60 * 24 * 7); // valid 7 days
    if (signError || !signed) {
      return new Response(JSON.stringify({ error: signError?.message ?? 'Could not create a download link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const machineName = Array.isArray(request.machines) ? request.machines[0]?.machine_name : request.machines?.machine_name;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ZYGREEN Reports <onboarding@resend.dev>',
        to: [request.email_to],
        subject: `Your ${request.report_type} report is ready — ${machineName ?? 'ZYGREEN'}`,
        html: `<p>Your ${request.report_type} report for <strong>${machineName ?? 'your machine'}</strong>
          (${String(request.report_from).slice(0, 10)} to ${String(request.report_to).slice(0, 10)}) is ready.</p>
          <p><a href="${signed.signedUrl}">Download the report</a> (link expires in 7 days).</p>`,
      }),
    });

    const resendBody = await resendResp.json();
    if (!resendResp.ok) {
      return new Response(JSON.stringify({ error: resendBody }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('machine_reports').update({ emailed_at: new Date().toISOString() }).eq('request_id', requestId);

    return new Response(JSON.stringify({ ok: true, id: resendBody.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

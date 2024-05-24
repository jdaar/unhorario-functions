// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

Deno.serve(async (req) => {
  const worker = await EdgeRuntime.userWorkers.create({
    servicePath: './update-course-index',
    memoryLimitMb: 1024,
    workerTimeoutMs: 10 * 60 * 1000,
    noModuleCache: false,
    importMapPath: null,
    envVars: {},
    forceCreate: false,
    netAccessDisabled: false,
    cpuTimeSoftLimitMs: 10000,
    cpuTimeHardLimitMs: 30000,
  });
  const controller = new AbortController();
  const abortSignal = controller.signal;

  return await worker.fetch(req, { signal: abortSignal });
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-index' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

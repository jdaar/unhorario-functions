import {createClient, SupabaseClient} from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import {initParser} from "https://deno.land/x/deno_dom/deno-dom-wasm-noinit.ts";
import {Database} from '../common/database.types.ts';
import {progressiveSpider} from './spider.ts';

Deno.serve(async (req) => {
  await initParser();
  const { options } = await req.json()

  const supabase = createClient<Database>(
    Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321',
    Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  )

  const coursesToScrape = await progressiveSpider(supabase);
  /*
  */

  // pt1:r1:0:t4:1:cl2
  // pt1:r1:0:t4:2:cl2
  // event=pt1:r1:0:t4:68:cl2

  //await browser.close();

  return new Response(
    {},
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-index' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

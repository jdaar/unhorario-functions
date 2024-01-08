import {createClient, SupabaseClient} from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import {DOMParser} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import {assert} from "https://deno.land/std@0.211.0/assert/mod.ts";
import {courseScrapper} from "../common/scrapper.ts";
import {QueryParameterNames} from "../common/sia.ts";

Deno.serve(async (req) => {
  const data = JSON.stringify({ })


  const supabase = createClient<Database>(
    Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321',
    Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  )
  
  const queueElement = (await supabase
    .from("Scrapper queue")
    .select('*')
    .order('id', { ascending: true })
    .limit(1)
    .single()).data

  const workload = {
    ...Object.keys(queueElement).map((key) => (
    Object.keys(QueryParameterNames).includes(key) ? 
    {[QueryParameterNames[key]]: queueElement[key]} : {}))
      .reduce((acc, curr) => ({...acc, ...curr})),
    [QueryParameterNames.SIA_EVENT]: queueElement.SIA_EVENT,
  }

  const courses = await courseScrapper(workload)

  return new Response(
    courses,
    { headers: { "Content-Type": "text/html" } },
  )
})
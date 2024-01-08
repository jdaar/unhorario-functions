import type {SupabaseClient} from "@supabase/supabase-js";
import {type QueryParameters, QueryParameterNamesInverse, QueryParameterNames, QueryEvents} from "../common/sia.ts";
import {generateRangedDictionary} from "../common/util.ts";
import {spiderScrapper} from "../common/scrapper.ts";

export async function scheduleFullSpider(client: SupabaseClient, workloads: QueryParameters[]): boolean {
  const parsedWorkloads = workloads.map((workload) => Object.keys(workload)
    .map((key) => ({[QueryParameterNamesInverse[key]]: workload[key]}))
    .reduce((acc, curr) => ({...acc, ...curr})
  , {}))
  const response = await client 
    .from("Spider queue")
    .insert([
      ...parsedWorkloads
    ])
  return true
}

export async function progressiveSpider(client: SupabaseClient): string[] {
  const queryResponse = await client 
    .from("Spider queue")
    .select('*', { count: 'exact', head: true })
    .order('id', { ascending: true });
  
  if (queryResponse.error) {
    console.log(queryResponse.error)
    return []
  }

  const queueHead = await client 
    .from("Spider queue")
    .select('*')
    .order('id', { ascending: true })
    .limit(1);

  if (queryResponse.count === 0) {
    const workerWorkload = generateRangedDictionary({
      [QueryParameterNames.SIA_SCHOLARSHIP_LEVEL]: [0, 2],
      [QueryParameterNames.SIA_CAMPUS]: [0, 2],
      [QueryParameterNames.SIA_FACULTY]: [0, 2],
    }).map((queryParameters) => {
      return ({
        ...queryParameters,
        [QueryParameterNames.SIA_PENSUM]: 0,
        [QueryParameterNames.SIA_TIPOLOGY]: 0,
      })
    })
    await scheduleFullSpider(client, workerWorkload)
  } else {
    const workload = Object.keys(queueHead.data[0]).map((key) => (
      Object.keys(QueryParameterNames).includes(key) ? 
      {[QueryParameterNames[key]]: queueHead.data[0][key]} : {}))
        .reduce((acc, curr) => ({...acc, ...curr}), 
    {})

    try {
      const result = await spiderScrapper(workload);

      const processedResult = result.map((callback) => ({
        SIA_SCHOLARSHIP_LEVEL: queueHead.data[0].SIA_SCHOLARSHIP_LEVEL,
        SIA_CAMPUS: queueHead.data[0].SIA_CAMPUS,
        SIA_TIPOLOGY: queueHead.data[0].SIA_TIPOLOGY,
        SIA_PENSUM: queueHead.data[0].SIA_PENSUM,
        SIA_FACULTY: queueHead.data[0].SIA_FACULTY,
        SIA_EVENT: callback,
      }))

      console.log('Retrieved callbacks: ', processedResult.length)

      const response = await client
        .from("Scrapper queue")
        .upsert(processedResult, { onConflict: "SIA_EVENT" })
      console.log('Upserted callbacks: ', response)

      if (response.error) {
        console.log(response.error)
        throw new Error(response.error);
      }
    }
    catch (e) {
      console.error(e)
      return []
    }
  
    await client
      .from("Spider queue")
      .delete()
      .match({id: queueHead.data[0].id});

    console.log("Finished and deleted head from queue")
  }
  
  return []
}

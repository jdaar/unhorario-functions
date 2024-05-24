// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';
import { z } from 'https://deno.land/x/zod/mod.ts';

async function selectAndSetOption(page: puppeteer.Page, selector: string, value: string) {
    await page.waitForSelector(selector)
    const select = await page.$(selector)
    if (!select) throw new Error('select not found');

    await select.click()
    await page.waitForNetworkIdle()
    await page.select(selector, value)
    await page.waitForNetworkIdle()
}

export function generateRangedDictionary(ranges: {[key: string]: number[]}): {[key: string]: number}[] {
  const queue = Object.entries(ranges).map(([key, range]) => {
    return new Array(range[1] - range[0]).fill(0).map((_, idx) => {
      return {
        [key]: idx + range[0]
      }
    })
  })

  let result: Array<{[key: string]: number}> = queue.shift() ?? [];
  while(queue.length > 0) {
    const head = queue.shift()
    if (!head) throw new Error('head not found');
    result = result.flatMap((element) => head.map(headElement => ({
      ...element,
      ...headElement
    })))
  }

  return result;
}
    
const Options = z.object({
  faculty: z.string(),
  pensums: z.array(z.string())
})

type OptionType = z.infer<typeof Options>;

Deno.serve(async (req) => {
  const browserlessApiKey = Deno.env.get('PUPPETEER_BROWSERLESS_IO_KEY') ?? '';
  const browserlessEndpoint = `wss://chrome.browserless.io?token=${browserlessApiKey}`

  const courseSpecs = [];
  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: browserlessEndpoint
    })
    const workItemResult = await Options.safeParseAsync(await req.json());

    if (!workItemResult.success) throw new Error('workItem not found');
    const workItem = workItemResult.data as OptionType;

    const url = 'https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf?taskflowId=task-flow-AC_CatalogoAsignaturas'
    
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf', ['clipboard-read']);

    const page = await browser.newPage();
    await page.goto(url)
    await page.waitForNetworkIdle()

    await selectAndSetOption(page, 'select[name="pt1:r1:0:soc1"]', '0');
    await selectAndSetOption(page, 'select[name="pt1:r1:0:soc2"]', workItem.faculty);
    
    for (let pensumIdx = 0; pensumIdx < workItem?.pensums.length; pensumIdx += 1) {
      await selectAndSetOption(page, 'select[name="pt1:r1:0:soc3"]', workItem?.pensums[pensumIdx])

      await page.waitForSelector('div[id="pt1:r1:0:cb1"]')
      const searchBtn = await page.$('div[id="pt1:r1:0:cb1"]')
      if (!searchBtn) throw new Error('searchBtn not found');

      await searchBtn.click()
      await page.waitForNetworkIdle()

      await page.waitForSelector('div[id="pt1:r1:0:t4"] > div:nth-child(2) > table')
      const tableRows = await page.$$('div[id="pt1:r1:0:t4"] > div:nth-child(2) > table > tbody > tr')

      const courseLinks = tableRows.map(async (row) => {return (await row.$('td:nth-child(1) > span > a'))?.evaluate((el) => el.getAttribute('id'))})

      for (let idx = 0; idx < courseLinks.length; idx += 1) {
        const execTableRows = await page.$$('div[id="pt1:r1:0:t4"] > div:nth-child(2) > table > tbody > tr');
        const execCourseLinks = execTableRows.map(async (row) => {return (await row.$('td:nth-child(1) > span > a'))?.evaluate((el) => el.getAttribute('id'))});

        const results = await Promise.allSettled(execCourseLinks);

        const result = results[idx];
        console.log(idx, result)
        const courseLink = (result as { status: string, value: string }).value;

        await page.waitForSelector(`a[id="${courseLink}"]`);
        const courseLinkElement = await page.$(`a[id="${courseLink}"]`);
        if (!courseLinkElement) throw new Error('courseLinkElement not found');

        await courseLinkElement.click();

        await page.waitForNetworkIdle();

        await page.keyboard.down('ControlLeft');
        await page.keyboard.press('KeyA');
        await page.keyboard.press('KeyC');
        await page.keyboard.up('ControlLeft');

        const courseSpec = await page.evaluate(() => navigator.clipboard.readText());
        courseSpecs.push(courseSpec);

        await page.waitForSelector('div[id^="pt1:r1:"][id$=":cb4"]')
        const goBackBtn = await page.$('div[id^="pt1:r1:"][id$=":cb4"]')
        if (!goBackBtn) throw new Error('goBackBtn not found');

        await goBackBtn.click();

        await page.waitForNetworkIdle();
      }
    }
    await page.close();
    await browser.close();

    return new Response(JSON.stringify({
      faculty: workItem.faculty,
      courses: courseSpecs
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-course-index' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

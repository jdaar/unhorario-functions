import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

async function sleep(ms: number) {
  return await new Promise(resolve => setTimeout(resolve, ms));
}

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
    
async function main() {
  try {
    const browser = await puppeteer.launch({
        headless: false,
    });

    const url = 'https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf?taskflowId=task-flow-AC_CatalogoAsignaturas'
    
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf', ['clipboard-read']);

    const workQueue = [
      {
        faculty: '2', // 3064 FACULTAD DE ARQUITECTURA
        pensums: [
          '0', // 3501 AQRUITECTURA
          '1', // 3502 ARTES PLASTICAS
          '2' // 3503 CONSTRUCCION
        ]
      },
      {
        faculty: '5', // 3065 FACULTAD DE CIENCIAS
        pensums: [
          '0', // 3647 CIENCIAS DE LA COMPUTACION
          '1', // 3504 ESTADISTICA
          '2', // 3505 INGENIERIA BIOLOGICA
          '3', // 3506 INGENIERIA FISICA
          '4' // 3507 MATEMATICAS
        ]
      },
      {
        faculty: '7', // 3442 FACULTAD DE CIENCIAS AGRARIAS
        pensums: [
          '0', // 3508 INGENIERIA AGRICOLA
          '1', // 3509 INGENIERIA AGRONOMICA
          '2', // 3510 INGENIERIA FORESTAL
          '3' // 3511 ZOOTECNIA
        ]
      },
      {
        faculty: '12', // 3067 FACULTAD DE CIENCIAS HUMANAS Y ECONÓMICAS
        pensums: [
          '0', // 3512 CIENCIA POLITICA
          '1', // 3513 ECONOMIA
          '2', // 3514 HISTORIA
        ]
      },
      {
        faculty: '20', // 3068 FACULTAD DE MINAS
        pensums: [
          '0', // 3515 INGENIERÍA ADMINISTRATIVA
          '1', // 3528 INGENIERÍA ADMINISTRATIVA
          '2', // 3527 INGENIERÍA AMBIENTAL
          '3', // 3529 INGENIERÍA AMBIENTAL
          '4', // 3516 INGENIERÍA CIVIL
          '5', // 3530 INGENIERÍA CIVIL
          '6', // 3517 INGENIERÍA DE CONTROL
          '7', // 3531 INGENIERÍA DE CONTROL
          '8', // 3518 INGENIERÍA DE MINAS Y METALURGIA
          '9', // 3532 INGENIERÍA DE MINAS Y METALURGIA
          '10', // 3519 INGENIERÍA DE PETRÓLEOS
          '11', // 3533 INGENIERÍA DE PETRÓLEOS
          '12', // 3520 INGENIERÍA DE SISTEMAS E INFORMÁTICA
          '13', // 3534 INGENIERÍA DE SISTEMAS E INFORMÁTICA
          '14', // 3521 INGENIERÍA ELÉCTRICA
          '15', // 3535 INGENIERÍA ELÉCTRICA
          '16', // 3522 INGENIERÍA GEOLÓGICA
          '17', // 3536 INGENIERÍA GEOLÓGICA
          '18', // 3523 INGENIERÍA INDUSTRIAL
          '19', // 3537 INGENIERÍA INDUSTRIAL
          '20', // 3524 INGENIERÍA MECÁNICA
          '21', // 3538 INGENIERÍA MECÁNICA
          '22', // 3525 INGENIERÍA QUÍMICA
          '23', // 3525 INGENIERÍA QUÍMICA
        ]
      },
      {
        faculty: '26', // 3 SEDE MEDELLIN
        pensums: [
          '0', // 3CLE COMPONENTE DE LIBRE ELECCION
          '1', // 2540 ENFERMERIA
          '2', // 2515 FARMACIA
          '3' // MVIS PROGRAMA ESPECIAL VISITANTE
        ]
      }
    ]

    while (workQueue.length > 0) {
      const workItem = workQueue.shift();
      if (!workItem) throw new Error('workItem not found')

      const page = await browser.newPage();
      await page.goto(url)
      await page.waitForNetworkIdle()

      await selectAndSetOption(page, 'select[name="pt1:r1:0:soc1"]', '0');
      await selectAndSetOption(page, 'select[name="pt1:r1:0:soc2"]', workItem.faculty);
      console.log(`Selected faculty: ${workItem.faculty}`)

      
      const courseSpecs: { [x: string]: string[] } = {};
      for (let pensumIdx = 0; pensumIdx < workItem?.pensums.length; pensumIdx += 1) {
        await selectAndSetOption(page, 'select[name="pt1:r1:0:soc3"]', workItem?.pensums[pensumIdx])
        console.log(`Selected pensum: ${workItem?.pensums[pensumIdx]}`)

        await page.waitForSelector('div[id="pt1:r1:0:cb1"]')
        const searchBtn = await page.$('div[id="pt1:r1:0:cb1"]')
        if (!searchBtn) throw new Error('searchBtn not found');

        await searchBtn.click()
        await page.waitForNetworkIdle()

        await page.waitForSelector('div[id="pt1:r1:0:t4"] > div:nth-child(2) > table')
        const tableRows = await page.$$('div[id="pt1:r1:0:t4"] > div:nth-child(2) > table > tbody > tr')

        const courseLinks = tableRows.map(async (row) => {return (await row.$('td:nth-child(1) > span > a'))?.evaluate((el) => el.getAttribute('id'))})
        courseSpecs[workItem?.pensums[pensumIdx]] = [];

        for (let idx = 0; idx < courseLinks.length; idx += 1) {
          const execTableRows = await page.$$('div[id="pt1:r1:0:t4"] > div:nth-child(2) > table > tbody > tr');
          const execCourseLinks = execTableRows.map(async (row) => {return (await row.$('td:nth-child(1) > span > a'))?.evaluate((el) => el.getAttribute('id'))});

          const results = await Promise.allSettled(execCourseLinks);

          const result = results[idx];
          const courseLink = (result as { status: string, value: string }).value;
          console.log(`Retrieving data from course with idx: ${idx} and courseLink: ${courseLink} for pensumIdx: ${pensumIdx} and pensum: ${workItem?.pensums[pensumIdx]}`);

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
          courseSpecs[workItem?.pensums[pensumIdx]].push(courseSpec);
          console.log(`Finished retrieving course data for course with idx: ${idx} ended with total courses for pensum ${workItem?.pensums[pensumIdx]}: ${courseSpecs[workItem?.pensums[pensumIdx]].length}`)
          console.log(`Scrapped courses for pensum ${workItem?.pensums[pensumIdx]}: ${courseSpecs[workItem?.pensums[pensumIdx]].length}`)

          await page.waitForSelector('div[id^="pt1:r1:"][id$=":cb4"]')
          const goBackBtn = await page.$('div[id^="pt1:r1:"][id$=":cb4"]')
          if (!goBackBtn) throw new Error('goBackBtn not found');

          await goBackBtn.click();

          await page.waitForNetworkIdle();
        }
        await Deno.writeTextFile(`./out/${workItem.faculty}-${workItem?.pensums[pensumIdx]}.json`, JSON.stringify(courseSpecs[workItem?.pensums[pensumIdx]], null, 2))
        console.log(`Finished scrapping courses for pensum ${workItem?.pensums[pensumIdx]}`)
      }
      await page.close();
    }
  } catch (e) {
    console.error(e)
  }
}

main()
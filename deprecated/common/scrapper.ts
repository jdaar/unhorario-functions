import {DOMParser} from "https://deno.land/x/deno_dom/deno-dom-wasm-noinit.ts";
import {assert} from "https://deno.land/std@0.211.0/assert/mod.ts";
import {
  Cookie,
  CookieJar,
  wrapFetch,
} from "https://deno.land/x/another_cookiejar@v5.0.3/mod.ts";
import {type QueryParameters, QueryParameterNames, QueryEvents, SiaMappings} from "../common/sia.ts";

export function getBodyFromQueryParameters(queryParameters: QueryParameters) {
  const payload: QueryParameters & Optional<QueryMetadata> = {
    ...queryParameters,
    "org.apache.myfaces.trinidad.faces.FORM": "f1",
    "Adf-Window-Id": "0",
    "javax.faces.ViewState": "-1",
    "Adf-Page-Id": "3",
  };

  return Object.entries(payload)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/* Gets the JSESSION cookie and returns the CookieJar in order to be used to wrapFetch on another function and use the same cookies */
export async function initializeSiaSession(): CookieJar {
  const cookieJar = new CookieJar();  

  const fetch = wrapFetch({ cookieJar });

  var url = 'https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf?taskflowId=task-flow-AC_CatalogoAsignaturas'

  var request = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  url = `https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf;PortalJSESSION=${
    cookieJar.getCookie({
      name: 'PortalJSESSION',
    }).value
  }?taskflowId=task-flow-AC_CatalogoAsignaturas`;

  /* Thank god no one uses JSF nowadays, this code is stupid but needed.  */
  request = await fetch(url,  {
    method: 'GET',
    credentials: 'include',
  });

  request = await fetch(url,  {
    method: 'POST',
    credentials: 'include',
  });

  return cookieJar;
}

export async function setQueryParameter(cookieJar: CookieJar, queryParameters: QueryParameters, queryParameterName: keyof typeof QueryParameterNames, value: number) {
  const fetch = wrapFetch({ cookieJar });

  console.log('Setting new parameter with value: ', queryParameterName, value)

  const payload = getBodyFromQueryParameters({
    ...queryParameters,
    [queryParameterName]: value,
    [QueryParameterNames.SIA_EVENT]: queryParameterName
  })

  const url = `https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf;PortalJSESSION=${
    cookieJar.getCookie({
      name: 'PortalJSESSION',
    }).value
  }?taskflowId=task-flow-AC_CatalogoAsignaturas`;

  const request = await fetch(url,  {
    method: 'POST',
    credentials: 'include',
    body: payload,
  });
}

export async function searchWithPreparedQueryParameters(cookieJar: CookieJar, queryParameters: QueryParameters) {
  const fetch = wrapFetch({ cookieJar });

  const payload = getBodyFromQueryParameters({
    ...queryParameters,
    [QueryParameterNames.SIA_EVENT]: QueryEvents.SEARCH
  })

  const url = `https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf;PortalJSESSION=${
    cookieJar.getCookie({
      name: 'PortalJSESSION',
    }).value
  }?taskflowId=task-flow-AC_CatalogoAsignaturas`;

  console.log('Searching')

  const request = await fetch(url,  {
    method: 'POST',
    credentials: 'include',
    body: payload
  });

  console.log('Search finished')

  return request.text();
}

export async function spiderScrapper(workloads: QueryParameters[]): string[] {
  const queue = new Array<QueryParameters>(workloads);

  let callbacks = new Array<string>();
  while(queue.length > 0) { 
    const cookieJar = await initializeSiaSession();

    const head = queue.shift();

    for (let idx = 0; idx < Object.keys(head).length; idx++) {
      await setQueryParameter(cookieJar, head, Object.keys(head)[idx], Object.values(head)[idx])
    }
    const documentResponse = await searchWithPreparedQueryParameters(cookieJar, head)

    const document = new DOMParser().parseFromString(documentResponse, "text/html");
    assert(document);

    console.log('Parsed DOM');

    const elements = document.querySelector(`div[id='${SiaMappings.SIA_DB_TABLE}'] > table > tbody`);
    assert(elements);

    console.log('Searched elements in parsed DOM: ', elements.children.length);

    callbacks = callbacks.concat(Array.from(elements.children).map((element) => {
      return element.querySelector('tr > td').id;
    }).reduce((acc, id, idx, arr) => {
      if (arr.indexOf(id) === idx) {
        acc.push(id)
      }
      return acc
    }, new Array<string>()))

    console.log('Callbacks found: ', callbacks.length)
  }

  return callbacks;
}

export async function courseScrapper(queryParameters: QueryParameters): string {
  const cookieJar = await initializeSiaSession();

  const originalEvent = queryParameters[QueryParameterNames.SIA_EVENT];
  console.log('Original event: ', originalEvent)

  console.log(cookieJar)

  for (let idx = 1; idx < /*Object.keys(queryParameters).length*/ 3; idx += 1) {
    await setQueryParameter(cookieJar, queryParameters, Object.keys(queryParameters)[idx], Object.values(queryParameters)[idx]);
  }
  /*
  const documentResponse = await searchWithPreparedQueryParameters(cookieJar, queryParameters);

  const payload = getBodyFromQueryParameters({
    ...queryParameters,
    [QueryParameterNames.SIA_EVENT]: originalEvent,
    [`event.${originalEvent}`]: '<m+xmlns="http://oracle.com/richClient/comm"><k+v="type"><s>action</s></k></m>',
  })

  const url = `https://sia.unal.edu.co/Catalogo/facespublico/public/servicioPublico.jsf;PortalJSESSION=${
    cookieJar.getCookie({
      name: 'PortalJSESSION',
    }).value
  }?taskflowId=task-flow-AC_CatalogoAsignaturas`;

  const request = await fetch(url,  {
    method: 'POST',
    credentials: 'include',
    body: payload
  });
  console.log(request)

  return documentResponse
  */
 return ""

}
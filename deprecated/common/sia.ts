export const SiaMappings = {
  SIA_DB_TABLE: "pt1:r1:0:t4::db",
}

export const QueryParameterNames = {
  // "Nivel de estudio" ranges from 0 to 2
  SIA_SCHOLARSHIP_LEVEL: "pt1:r1:0:soc1",
  // "Sede" ranges from 0 to 9
  SIA_CAMPUS: "pt1:r1:0:soc9",
  // "Facultad" dynamic range, max 29
  SIA_FACULTY: "pt1:r1:0:soc2",
  // "Plan de estudios" dynamic range
  SIA_PENSUM: "pt1:r1:0:soc3",
  // "Tipologia de asignatura" dynamic range
  SIA_TIPOLOGY: "pt1:r1:0:soc4",
  // Event to trigger
  SIA_EVENT: "event"
}

export const QueryParameterNamesInverse = {
  "pt1:r1:0:soc1": "SIA_SCHOLARSHIP_LEVEL",
  "pt1:r1:0:soc9": "SIA_CAMPUS",
  "pt1:r1:0:soc2": "SIA_FACULTY",
  "pt1:r1:0:soc3": "SIA_PENSUM",
  "pt1:r1:0:soc4": "SIA_TIPOLOGY",
  "event": "SIA_EVENT",
}

export const QueryEvents =  {
  // Perform seach with given QueryParameters
  SEARCH: "ptr1:r1:0:cb1",
}

export type QueryParameters = {
  [QueryParameterNames.SIA_SCHOLARSHIP_LEVEL]: number,
  [QueryParameterNames.SIA_CAMPUS]: number,
  [QueryParameterNames.SIA_FACULTY]: number,
  [QueryParameterNames.SIA_PENSUM]: number,
  [QueryParameterNames.SIA_TIPOLOGY]: number,
  [QueryParameterNames.SIA_EVENT]: keyof typeof QueryEvents | keyof typeof QueryParameterNames | string
}

type QueryMetadata = {
  "org.apache.myfaces.trinidad.faces.FORM": string,
  "Adf-Window-Id": string,
  "javax.faces.ViewState": string,
  "Adf-Page-Id": string,
}
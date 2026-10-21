import * as state from '../../../../../../../../engine/index.js'
import { lineKey } from './line-key.js'

export const SHOWN_SEARCH_ROWS = 'commoditySearchRows'

export const lineRow = ({ commodityCode, speciesLatinName, commonName }) => ({
  commodityCode,
  speciesLatinName,
  commonName
})

export const resultRows = (results) =>
  (results?.groups ?? []).flatMap((group) =>
    group.species.map((species) => ({
      commodityCode: group.code,
      speciesLatinName: species.latinName,
      commonName: species.commonName
    }))
  )

const rowsByKey = (rows) => new Map(rows.map((row) => [lineKey(row), row]))

export const lineRowsByKey = (lines) => rowsByKey(lines.map(lineRow))

export const knownRows = ({ answers, flowOnlyAnswers }) =>
  new Map([
    ...rowsByKey(flowOnlyAnswers?.[SHOWN_SEARCH_ROWS] ?? []),
    ...lineRowsByKey(answers.commodityLines ?? [])
  ])

export const replaceStoredSearchRows = (request, h, rows) =>
  state.commit(request, h, {
    [SHOWN_SEARCH_ROWS]: [...rowsByKey(rows).values()]
  })

export const clearStoredSearchRows = (request, h) =>
  state.commit(request, h, { [SHOWN_SEARCH_ROWS]: [] })

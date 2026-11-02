import * as state from '../../../../../../../../engine/index.js'
import { lineKey } from './line-key.js'

export const STORED_SEARCH_ROWS = 'commoditySearchRows'

export const lineRow = ({
  commodityCode,
  speciesLatinName,
  speciesCommonName
}) => ({
  commodityCode,
  speciesLatinName,
  speciesCommonName
})

export const resultRows = (results) =>
  (results?.groups ?? []).flatMap((group) =>
    group.species.map((species) => ({
      commodityCode: group.code,
      speciesLatinName: species.latinName,
      speciesCommonName: species.commonName
    }))
  )

const rowsByKey = (rows) => new Map(rows.map((row) => [lineKey(row), row]))

export const lineRowsByKey = (lines) => rowsByKey(lines.map(lineRow))

export const knownRowsByKey = ({ answers, flowOnlyAnswers }) =>
  new Map([
    ...rowsByKey(flowOnlyAnswers?.[STORED_SEARCH_ROWS] ?? []),
    ...lineRowsByKey(answers.commodityLines ?? [])
  ])

export const replaceStoredSearchRows = (request, h, rows) =>
  state.commit(request, h, {
    [STORED_SEARCH_ROWS]: [...rowsByKey(rows).values()]
  })

export const clearStoredSearchRows = (request, h) =>
  state.commit(request, h, { [STORED_SEARCH_ROWS]: [] })

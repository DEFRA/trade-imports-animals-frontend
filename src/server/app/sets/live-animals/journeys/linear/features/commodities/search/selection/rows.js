import * as state from '../../../../../../../../engine/index.js'
import { lineKey } from './line-key.js'
import { rowKey } from './keys.js'

// The search rows the trader has been shown since the page last saved, kept in
// the session as a flow-only answer so a species ticked under an earlier search
// can still be saved with its common name. Never sent to the backend.
export const SEARCH_ROWS = 'commoditySearchRows'

export const lineRow = (line) => ({
  code: line.commoditySelection,
  latinName: line.speciesSelection,
  commonName: line.commonName
})

export const resultRows = (results) =>
  (results?.groups ?? []).flatMap((group) =>
    group.species.map((species) => ({
      code: group.code,
      latinName: species.latinName,
      commonName: species.commonName
    }))
  )

/**
 * Every row the page can resolve a key to: the rows shown by earlier searches,
 * then the lines already saved.
 *
 * @param {{answers: object, flowOnlyAnswers?: object}} view - the journey view.
 * @returns {Map<string, object>} the rows by key.
 */
export const knownRows = ({ answers, flowOnlyAnswers }) =>
  new Map([
    ...(flowOnlyAnswers?.[SEARCH_ROWS] ?? []).map((row) => [rowKey(row), row]),
    ...(answers.commodityLines ?? []).map((line) => [
      lineKey(line),
      lineRow(line)
    ])
  ])

/** Keep the chosen rows and the rows now on screen until the page saves. */
export const rememberRows = (request, h, rows) =>
  state.commit(request, h, {
    [SEARCH_ROWS]: [...new Map(rows.map((row) => [rowKey(row), row])).values()]
  })

/** The page has saved its lines; the rows have done their job. */
export const forgetRows = (request, h) =>
  state.commit(request, h, { [SEARCH_ROWS]: [] })

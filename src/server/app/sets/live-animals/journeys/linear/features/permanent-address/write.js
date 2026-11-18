import * as state from '../../../../../../engine/index.js'

const groupByLine = (answered) =>
  Map.groupBy(answered, (entry) => entry.lineIndex)

const lineWithAnsweredUnits = (line, answeredOnLine) => {
  const answerFor = new Map(
    answeredOnLine.map((entry) => [entry.unitIndex, entry])
  )
  return {
    ...line,
    animalIdentifiers: (line.animalIdentifiers ?? []).map((unit, unitIndex) => {
      const answer = answerFor.get(unitIndex)
      return answer
        ? {
            ...unit,
            permanentAddressOrigin: answer.permanentAddressOrigin,
            permanentAddress: answer.permanentAddress
          }
        : unit
    })
  }
}

/**
 * Writes the page's answers onto the notification's commodity lines.
 *
 * @param {object} request - the request being answered.
 * @param {object} h - the response toolkit.
 * @param {{lineIndex: number, unitIndex: number, permanentAddressOrigin: string, permanentAddress: object}[]} answered
 * the answers `answersFromPayload` read, one entry per answered animal.
 * @param {{index: number, entry: object}[]} lines - the notification's
 * commodity lines, as `linesOf` gives them.
 * @returns {Promise<void>} resolves once every changed line is committed, one
 * call per line that holds an answered animal.
 */
export const writeAnswers = async (request, h, answered, lines) => {
  const byLine = groupByLine(answered)
  for (const [lineIndex, answeredOnLine] of byLine) {
    const { entry: line } = lines.find(({ index }) => index === lineIndex)
    await state.updateEntryAt(
      request,
      h,
      ['commodityLines'],
      lineIndex,
      lineWithAnsweredUnits(line, answeredOnLine)
    )
  }
}

/**
 * The notification's commodity lines with the page's answers applied, for
 * showing a refused save's entered values back. Writes nothing.
 *
 * @param {{index: number, entry: object}[]} lines - as `linesOf` gives them.
 * @param {{lineIndex: number, unitIndex: number, permanentAddressOrigin: string, permanentAddress: object}[]} answered
 * the answers `answersFromPayload` read.
 * @returns {object[]} the commodity lines in order, each changed line
 * replaced by its answered copy.
 */
export const linesWithAnswered = (lines, answered) => {
  const byLine = groupByLine(answered)
  return lines.map(({ index, entry }) =>
    byLine.has(index) ? lineWithAnsweredUnits(entry, byLine.get(index)) : entry
  )
}

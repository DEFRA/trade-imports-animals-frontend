const firstArgument = ([line]) => line
const isJsonLine = (line) => typeof line === 'string' && line.startsWith('{')
const isEmfDocument = (document) => Boolean(document._aws)

/**
 * Reads the EMF documents written to a console.log spy.
 * @param {import('vitest').MockInstance} logSpy - spy on console.log
 * @returns {object[]} the parsed EMF documents, in the order they were logged
 */
export const readEmfDocuments = (logSpy) =>
  logSpy.mock.calls
    .map(firstArgument)
    .filter(isJsonLine)
    .map((line) => JSON.parse(line))
    .filter(isEmfDocument)

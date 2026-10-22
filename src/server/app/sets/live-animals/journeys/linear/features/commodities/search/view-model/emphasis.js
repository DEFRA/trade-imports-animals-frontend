/**
 * Text cut into the parts a template prints in turn, each marked with whether
 * the query matched it.
 *
 * @param {string} text - the text shown.
 * @param {Array<{start: number, end: number}>} ranges - the matched ranges, in
 *   order and not overlapping.
 * @returns {Array<{text: string, matched: boolean}>} the parts, which join back
 *   into the text.
 */
export const emphasisParts = (text, ranges) => {
  const parts = []
  let cursor = 0
  for (const { start, end } of ranges) {
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), matched: false })
    }
    parts.push({ text: text.slice(start, end), matched: true })
    cursor = end
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), matched: false })
  }
  return parts
}

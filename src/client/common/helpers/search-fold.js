const foldForSearch = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const foldTerm = (term) => foldForSearch(term.trim())

/** Whether a text holds a search term, ignoring case and accents. An empty
 * term is held by every text. */
export const containsTerm = (text, term) =>
  foldForSearch(text).includes(foldTerm(term))

const foldedCharacters = (text) => {
  let folded = ''
  const originalStartOfFolded = []
  const originalEndOfFolded = []
  let originalIndex = 0
  for (const character of text) {
    const next = originalIndex + character.length
    const foldedCharacter = foldForSearch(character)
    for (let offset = 0; offset < foldedCharacter.length; offset++) {
      originalStartOfFolded.push(originalIndex)
      originalEndOfFolded.push(next)
    }
    folded += foldedCharacter
    originalIndex = next
  }
  return { folded, originalStartOfFolded, originalEndOfFolded }
}

const extendOverDroppedMarks = (text, end) => {
  let extended = end
  for (const character of text.slice(end)) {
    if (foldForSearch(character) !== '') {
      break
    }
    extended += character.length
  }
  return extended
}

/** Where a search term sits in a text, as `{ start, end }` positions in the
 * text's own characters, so 'garcia' marks all six letters of 'García'.
 * Matches do not overlap. An empty term has none. */
export const matchPositions = (text, term) => {
  const foldedTerm = foldTerm(term)
  if (!foldedTerm) {
    return []
  }
  const { folded, originalStartOfFolded, originalEndOfFolded } =
    foldedCharacters(text)
  const positions = []
  let foldedStart = folded.indexOf(foldedTerm)
  while (foldedStart !== -1) {
    const foldedEnd = foldedStart + foldedTerm.length
    positions.push({
      start: originalStartOfFolded[foldedStart],
      end: extendOverDroppedMarks(text, originalEndOfFolded[foldedEnd - 1])
    })
    foldedStart = folded.indexOf(foldedTerm, foldedEnd)
  }
  return positions
}

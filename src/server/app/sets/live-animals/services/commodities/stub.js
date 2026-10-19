import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

// MDM's live-animal codes and their species as reference-data groups them,
// built from TST's responses of 16 Oct 2026: every selectable code the "010"
// search returned, with all 120 species of 01061900 from its species pages.
// Kept in MDM's own spelling, so stub runs see the names traders will.
export const COMMODITY_GROUPS = JSON.parse(
  readFileSync(join(HERE, 'fixtures', 'commodities.json'), 'utf8')
)

const wordsOf = (text) =>
  String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

// A term matches text when its words are a run of word-prefixes in that text,
// so 'tau' matches 'Bos taurus' on its second word.
export const matchesWords = (text, term) => {
  const termWords = wordsOf(term)
  const textWords = wordsOf(text)
  if (termWords.length === 0) {
    return false
  }
  const matchesFrom = (start) =>
    termWords.every((word, offset) =>
      textWords[start + offset]?.startsWith(word)
    )
  return textWords.some((_word, start) => matchesFrom(start))
}

// Codes are digit strings, so they match on prefix: '010' reaches 0101 and
// 0102.
export const matchesCode = (code, term) =>
  code.startsWith(String(term ?? '').trim())

const speciesMatches = (species, term) =>
  matchesWords(species.latinName, term) ||
  matchesWords(species.commonName, term)

const matchingSpecies = (group, term) =>
  matchesCode(group.code, term)
    ? group.species
    : group.species.filter((species) => speciesMatches(species, term))

// The page of species a search returns, at most `size` of them, grouped by
// code — the shape reference-data answers with. MDM ranks its matches and
// this stub does not: it lists them in data order. `total` counts every
// matching species, as MDM counts every matching row.
export const searchCommodities = (term, { page, size }) => {
  const matches = COMMODITY_GROUPS.flatMap((group) =>
    matchingSpecies(group, term).map((species) => ({
      code: group.code,
      species
    }))
  )
  const onPage = matches.slice(page * size, (page + 1) * size)
  const groups = [...Map.groupBy(onPage, (match) => match.code)].map(
    ([code, codeMatches]) => ({
      code,
      species: codeMatches.map((match) => match.species)
    })
  )
  return { total: matches.length, page, size, groups }
}

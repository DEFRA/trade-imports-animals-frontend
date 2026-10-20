import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

export const COMMODITY_GROUPS = JSON.parse(
  readFileSync(join(HERE, 'fixtures', 'commodities.json'), 'utf8')
)

const wordsOf = (text) =>
  String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

export const matchesWordPrefixes = (text, term) => {
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

export const matchesCodePrefix = (code, term) =>
  code.startsWith(String(term ?? '').trim())

const speciesMatches = (species, term) =>
  matchesWordPrefixes(species.latinName, term) ||
  matchesWordPrefixes(species.commonName, term)

const matchingSpecies = (group, term) =>
  matchesCodePrefix(group.code, term)
    ? group.species
    : group.species.filter((species) => speciesMatches(species, term))

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

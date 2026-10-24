import { commodityGroups } from '../../../../services/_capture/fixtures.js'

export const COMMODITY_GROUPS = commodityGroups

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

const listedInStub = ({ code, latinName }) =>
  COMMODITY_GROUPS.some(
    (group) =>
      group.code === code &&
      group.species.some((species) => species.latinName === latinName)
  )

export const unlistedLinesInStub = (lines) =>
  lines.filter((line) => !listedInStub(line))

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

/**
 * Rebuild _capture/fixtures/commodities.json from trade-imports-stub's saved MDM
 * product search for term "010", using the same shape reference-data returns.
 *
 * Run from the animals-frontend repo after updating the stub checkout:
 *   node scripts/regenerate-commodities-fixture-from-stub.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STUB_ROOT = join(FRONTEND_ROOT, '../../trade-imports-stub')
const SEARCH_JSON = join(
  STUB_ROOT,
  'src/main/resources/responses/mdmProductSearchResponses.json'
)
const COMMODITIES_JSON = join(
  STUB_ROOT,
  'src/main/resources/responses/mdmProductCommoditiesResponses.json'
)
const OUT = join(
  FRONTEND_ROOT,
  'src/server/app/services/_capture/fixtures/commodities.json'
)

const search = JSON.parse(readFileSync(SEARCH_JSON, 'utf8'))
const commodities = JSON.parse(readFileSync(COMMODITIES_JSON, 'utf8'))

const isGerminal = (code) =>
  commodities[code]?.isGerminal === true

const codeOf = (row) => {
  if (row.resultType === 'species') {
    return row.commodityCnCode
  }
  if (row.resultType === 'commodity') {
    return row.code
  }
  return null
}

const rows = search['010'].content
const byCode = new Map()
const seen = new Set()

for (const row of rows) {
  const code = codeOf(row)
  if (!code || isGerminal(code)) {
    continue
  }
  if (row.resultType === 'species') {
    const latinName = row.speciesName
    const key = `${code}|${latinName}`
    if (!latinName || seen.has(key)) {
      continue
    }
    seen.add(key)
    if (!byCode.has(code)) {
      byCode.set(code, [])
    }
    byCode.get(code).push({
      latinName,
      commonName: row.commonName ?? null
    })
  } else if (row.resultType === 'commodity') {
    for (const species of row.scientificNames ?? []) {
      const latinName = species.speciesName
      const key = `${code}|${latinName}`
      if (!latinName || seen.has(key)) {
        continue
      }
      seen.add(key)
      if (!byCode.has(code)) {
        byCode.set(code, [])
      }
      byCode.get(code).push({
        latinName,
        commonName: species.commonName ?? null
      })
    }
  }
}

const groups = [...byCode.entries()].map(([code, species]) => ({ code, species }))
writeFileSync(OUT, `${JSON.stringify(groups, null, 2)}\n`)
console.log(
  `Wrote ${groups.length} commodity groups (${groups.reduce((n, g) => n + g.species.length, 0)} species) to fixtures/commodities.json`
)

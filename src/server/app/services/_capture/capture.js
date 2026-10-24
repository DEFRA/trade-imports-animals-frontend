import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { referenceDataUrl } from '../reference-data/request.js'

const outDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const JSON_INDENT_SPACES = 2

const targets = [
  { name: 'countries', url: referenceDataUrl('/countries').toString() },
  {
    name: 'countries-origin',
    url: referenceDataUrl('/countries?blocks=GBNAG_SPS_EX').toString()
  },
  {
    name: 'ports-of-entry',
    url: referenceDataUrl('/ports-of-entry').toString()
  }
]

const COMMODITY_SEARCH_TERM = '010'
const COMMODITY_PAGE_SIZE = 100

const commodityPageUrl = (page) => {
  const url = referenceDataUrl('/commodities')
  url.searchParams.set('q', COMMODITY_SEARCH_TERM)
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', String(COMMODITY_PAGE_SIZE))
  return url.toString()
}

const mergeGroups = (groups) =>
  [...Map.groupBy(groups, (group) => group.code)].map(([code, sameCode]) => ({
    code,
    species: sameCode.flatMap((group) => group.species)
  }))

const commodityPages = async (target) => {
  const groups = []
  let listed = 0
  for (let page = 0; ; page += 1) {
    const response = await fetchTarget({
      ...target,
      url: commodityPageUrl(page)
    })
    if (!response) {
      return null
    }
    const body = await response.json()
    groups.push(...body.groups)
    listed += body.groups.reduce((sum, group) => sum + group.species.length, 0)
    if (listed >= body.total || body.groups.length === 0) {
      return mergeGroups(groups)
    }
  }
}

const reportFetchFailure = (target, message) => {
  console.log(`${target.name}: ${message}`)
  process.exitCode = 1
}

const fetchTarget = async (target) => {
  try {
    const response = await fetch(target.url)
    if (!response.ok) {
      reportFetchFailure(
        target,
        `HTTP ${response.status} ${response.statusText}`
      )
      return null
    }
    return response
  } catch (error) {
    reportFetchFailure(target, `FETCH FAILED ${error.message}`)
    return null
  }
}

const writeFixture = async (target, body) => {
  const file = join(outDir, `${target.name}.json`)
  await writeFile(file, `${JSON.stringify(body, null, JSON_INDENT_SPACES)}\n`)

  const count = Array.isArray(body) ? body.length : Object.keys(body).length
  const sample = Array.isArray(body) ? JSON.stringify(body[0]) : ''
  console.log(
    `${target.name}: ${count} entries -> fixtures/${target.name}.json  sample=${sample}`
  )
}

const singleResponse = async (target) => {
  const response = await fetchTarget(target)
  return response ? response.json() : null
}

const captures = [
  ...targets.map((target) => ({ target, collect: singleResponse })),
  { target: { name: 'commodities' }, collect: commodityPages }
]

await mkdir(outDir, { recursive: true })

for (const { target, collect } of captures) {
  const body = await collect(target)
  if (body) {
    await writeFixture(target, body)
  }
}

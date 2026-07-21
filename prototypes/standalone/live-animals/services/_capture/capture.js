import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const referenceDataUrl =
  process.env.REFERENCE_DATA_URL ?? 'http://localhost:8086'
const outDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

const targets = [
  { name: 'countries', url: `${referenceDataUrl}/countries` },
  {
    name: 'countries-origin',
    url: `${referenceDataUrl}/countries?blocks=GBNAG_SPS_EX`
  },
  {
    name: 'ports-of-entry',
    url: `${referenceDataUrl}/ports-of-entry`,
    optional: true
  }
]

const fetchTarget = async (target) => {
  try {
    const response = await fetch(target.url)
    if (!response.ok) {
      const tag = target.optional ? ' (expected — endpoint not built)' : ''
      console.log(
        `${target.name}: HTTP ${response.status} ${response.statusText}${tag}`
      )
      if (!target.optional) process.exitCode = 1
      return null
    }
    return response
  } catch (error) {
    console.log(`${target.name}: FETCH FAILED ${error.message}`)
    if (!target.optional) process.exitCode = 1
    return null
  }
}

const writeFixture = async (target, response) => {
  const body = await response.json()
  const file = join(outDir, `${target.name}.json`)
  await writeFile(file, `${JSON.stringify(body, null, 2)}\n`)

  const count = Array.isArray(body) ? body.length : Object.keys(body).length
  const sample = Array.isArray(body) ? JSON.stringify(body[0]) : ''
  console.log(
    `${target.name}: HTTP ${response.status}, ${count} entries -> fixtures/${target.name}.json  sample=${sample}`
  )
}

await mkdir(outDir, { recursive: true })

for (const target of targets) {
  const response = await fetchTarget(target)
  if (!response) continue
  await writeFixture(target, response)
}

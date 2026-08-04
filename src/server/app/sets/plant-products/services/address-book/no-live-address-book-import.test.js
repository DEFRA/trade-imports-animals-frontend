import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Live's services/address-book/** holds invented animal-exporter records in the
// wrong shape plus a process-global created map. dependency-cruiser cannot
// catch a plant import of it — services/ is shared L2 that plant sets may
// legitimately use — so the refusal is made mechanical here.
const APP_DIR = fileURLToPath(new URL('../../../..', import.meta.url))
const SET_DIR = fileURLToPath(new URL('../..', import.meta.url))
const LIVE_ADDRESS_BOOK_DIR = path.join(APP_DIR, 'services', 'address-book')

const SPECIFIER_PATTERN =
  /(?:from|import|include|extends)\s*\(?\s*['"](?<specifier>[^'"]+)['"]/g

const setFiles = readdirSync(SET_DIR, { recursive: true, withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      (entry.name.endsWith('.js') || entry.name.endsWith('.njk'))
  )
  .map((entry) => path.join(entry.parentPath, entry.name))

const isWithin = (root, target) => {
  const relative = path.relative(root, target)
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

const findLiveAddressBookImports = (filename, source) =>
  [...source.matchAll(SPECIFIER_PATTERN)]
    .map(({ groups }) => groups.specifier)
    .filter((specifier) => specifier.startsWith('.'))
    .filter((specifier) =>
      isWithin(
        LIVE_ADDRESS_BOOK_DIR,
        path.resolve(path.dirname(filename), specifier)
      )
    )
    .map((specifier) => `${path.relative(SET_DIR, filename)} -> ${specifier}`)

const liveAddressBookImports = setFiles.flatMap((filename) =>
  findLiveAddressBookImports(filename, readFileSync(filename, 'utf8'))
)

const PLANT_FILE = path.join(SET_DIR, 'journeys/linear/features/traders/x.js')
const LIVE_SPECIFIER = '../../../../../../services/address-book/index.js'
const PLANT_OWN_SPECIFIER = '../../../../../services/address-book/index.js'

describe('plant-products keeps clear of the live-animals address book', () => {
  it('Should find the plant source files to scan', () => {
    expect(setFiles.length).toBeGreaterThan(0)
  })

  it('imports nothing from src/server/app/services/address-book', () => {
    expect(liveAddressBookImports).toEqual([])
  })

  it('rejects a plant file that reaches into the live address book', () => {
    expect(
      findLiveAddressBookImports(
        PLANT_FILE,
        `import * as ab from '${LIVE_SPECIFIER}'`
      )
    ).toHaveLength(1)
  })

  it('accepts the plant set’s own address book at the same depth', () => {
    expect(
      findLiveAddressBookImports(
        PLANT_FILE,
        `import * as ab from '${PLANT_OWN_SPECIFIER}'`
      )
    ).toEqual([])
  })

  it.each([
    { form: 'dynamic import', source: `await import('${LIVE_SPECIFIER}')` },
    { form: 'template include', source: `{% include '${LIVE_SPECIFIER}' %}` },
    { form: 'template extends', source: `{% extends '${LIVE_SPECIFIER}' %}` }
  ])('rejects a reach-in written as a $form', ({ source }) => {
    expect(findLiveAddressBookImports(PLANT_FILE, source)).toHaveLength(1)
  })
})

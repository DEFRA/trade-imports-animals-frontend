import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mintFulfilmentId } from './fulfilment-ids.js'
import { evaluateObligations, loadJourneyModel } from '../engine/index.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const spikeRoot = path.resolve(dirname, '..')

const SAMPLE_SIZE = 50

const jsFilesUnder = (dir) =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))

describe('orchestrator/fulfilment-ids — the determinism seam (graft 4)', () => {
  it('mints opaque, unique ids', () => {
    const minted = new Set(
      Array.from({ length: SAMPLE_SIZE }, () => mintFulfilmentId())
    )
    expect(minted.size).toBe(SAMPLE_SIZE)
    for (const id of minted) {
      expect(id).toMatch(/^f-[0-9a-f-]{36}$/)
    }
  })

  it('is importable only by orchestrator/* (import-ban over the tree)', () => {
    const importers = jsFilesUnder(spikeRoot).filter((file) =>
      /from\s+'[^']*fulfilment-ids(\.js)?'/.test(fs.readFileSync(file, 'utf8'))
    )
    expect(importers.length).toBeGreaterThan(0)
    for (const file of importers) {
      expect(path.relative(spikeRoot, file)).toMatch(/^orchestrator\//)
    }
  })

  it('never sees its fresh ids in evaluator output — indexed ids come only from stored keys or controller values', () => {
    const { obligations, identifiers } = loadJourneyModel()
    const storedClaimId = mintFulfilmentId()
    const stored = {
      [identifiers.idOf('hadClaims')]: { value: 'yes' },
      [identifiers.idOf('claimType')]: { [storedClaimId]: { value: 'theft' } },
      [identifiers.idOf('addons')]: { value: ['named-driver'] }
    }

    const { obligations: state } = evaluateObligations(obligations, stored)
    const seen = Object.values(state).flatMap((entry) =>
      (entry.fulfilments ?? []).map((fulfilment) => fulfilment.fulfilmentId)
    )
    expect(seen).toContain(storedClaimId)
    for (const fulfilmentId of seen) {
      expect([storedClaimId, 'named-driver']).toContain(fulfilmentId)
    }
  })

  it('projects zero fulfilment ids from an empty journey — the evaluator cannot invent them', () => {
    const { obligations } = loadJourneyModel()
    const { obligations: state } = evaluateObligations(obligations, {})
    const seen = Object.values(state).flatMap(
      (entry) => entry.fulfilments ?? []
    )
    expect(seen).toEqual([])
  })
})

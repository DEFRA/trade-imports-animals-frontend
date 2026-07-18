import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { walkObligations } from '../registry.js'
import { obligations as vendoredObligations } from '../model/obligations/obligations.js'

const mapping = JSON.parse(
  readFileSync(new URL('./mapping.json', import.meta.url))
)

// The A side is checked against the LIVE registry, so it rots loudly: add or
// rename an obligation without touching mapping.json and these fail.
//
// The B side is now ALSO checked against the live vendored manifest under
// live-animals/model/ (vendored at inc-005). mapping.json still snapshots B's
// original names in `bName` (pinned to provenance.bSha), but the vendored
// obligation each bId points at is asserted to exist and — for exact/rename
// entries — to carry `name === aId`. That name === aId is the bridge key
// inc-007 wires so the bridge can resolve B's implication by A's obligation id.
const B_OBLIGATION_COUNT = 45

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const { entries } = mapping

const registryIds = [...walkObligations()].map((node) => node.obligation.id)

const vendoredById = new Map(
  vendoredObligations.map((obligation) => [obligation.id, obligation])
)

const aIds = entries.map((entry) => entry.aId).filter((aId) => aId !== null)
const bIds = entries.map((entry) => entry.bId).filter((bId) => bId !== null)

const duplicates = (values) =>
  values.filter((value, index) => values.indexOf(value) !== index)

describe('retrofit obligation mapping — provenance', () => {
  it('Should pin both sides to a branch and a sha', () => {
    expect(mapping.provenance).toMatchObject({
      aBranch: expect.any(String),
      aSha: expect.any(String),
      bBranch: expect.any(String),
      bSha: expect.any(String)
    })
  })
})

describe('retrofit obligation mapping — A side against the live registry', () => {
  it('Should map every obligation the registry declares', () => {
    expect([...aIds].sort()).toEqual([...registryIds].sort())
  })

  it('Should not map an aId the registry does not declare', () => {
    const orphans = aIds.filter((aId) => !registryIds.includes(aId))
    expect(orphans).toEqual([])
  })

  it('Should leave no registry obligation unmapped', () => {
    const unmapped = registryIds.filter((id) => !aIds.includes(id))
    expect(unmapped).toEqual([])
  })

  it('Should map each aId exactly once', () => {
    expect(duplicates(aIds)).toEqual([])
  })
})

describe('retrofit obligation mapping — B side snapshot', () => {
  it('Should carry a bId for every obligation in B manifest', () => {
    expect(bIds).toHaveLength(B_OBLIGATION_COUNT)
  })

  it('Should map each bId exactly once', () => {
    expect(duplicates(bIds)).toEqual([])
  })

  it('Should use a well-formed uuid for every bId', () => {
    const malformed = bIds.filter((bId) => !UUID.test(bId))
    expect(malformed).toEqual([])
  })

  it('Should name every obligation it maps, and only those', () => {
    const misnamed = entries.filter(
      (entry) => (entry.bId === null) !== (entry.bName === null)
    )
    expect(misnamed.map((entry) => entry.aId ?? entry.bId)).toEqual([])
  })

  it('Should give each bName exactly once', () => {
    const bNames = entries
      .map((entry) => entry.bName)
      .filter((bName) => bName !== null)
    expect(duplicates(bNames)).toEqual([])
  })
})

describe('retrofit obligation mapping — B side against the live vendored manifest', () => {
  it('Should vendor exactly the mapped number of B obligations', () => {
    expect(vendoredObligations).toHaveLength(B_OBLIGATION_COUNT)
  })

  it('Should carry a live vendored obligation for every bId', () => {
    const missing = bIds.filter((bId) => !vendoredById.has(bId))
    expect(missing).toEqual([])
  })

  it('Should wire the vendored name to the aId for every exact or rename entry', () => {
    const broken = entries
      .filter((entry) => entry.kind === 'exact' || entry.kind === 'rename')
      .filter((entry) => vendoredById.get(entry.bId)?.name !== entry.aId)
      .map((entry) => entry.bName)
    expect(broken).toEqual([])
  })
})

describe('retrofit obligation mapping — kind consistency', () => {
  const withKind = (kind) => entries.filter((entry) => entry.kind === kind)

  it('Should only use the four known kinds', () => {
    const unknown = entries.filter(
      (entry) => !['exact', 'rename', 'a-only', 'b-only'].includes(entry.kind)
    )
    expect(unknown.map((entry) => entry.kind)).toEqual([])
  })

  it('Should mean aId === bName by exact', () => {
    const broken = withKind('exact').filter(
      (entry) => entry.aId !== entry.bName
    )
    expect(broken.map((entry) => entry.aId)).toEqual([])
  })

  it('Should mean two differently-named counterparts by rename', () => {
    const broken = withKind('rename').filter(
      (entry) =>
        entry.aId === null || entry.bId === null || entry.aId === entry.bName
    )
    expect(broken.map((entry) => entry.aId)).toEqual([])
  })

  it('Should mean no B counterpart by a-only', () => {
    const broken = withKind('a-only').filter(
      (entry) => entry.bId !== null || entry.aId === null
    )
    expect(broken.map((entry) => entry.aId)).toEqual([])
  })

  it('Should mean no A counterpart by b-only', () => {
    const broken = withKind('b-only').filter(
      (entry) => entry.aId !== null || entry.bId === null
    )
    expect(broken.map((entry) => entry.bName)).toEqual([])
  })

  it('Should explain every entry', () => {
    const unexplained = entries.filter(
      (entry) => (entry.note ?? '').trim() === ''
    )
    expect(unexplained.map((entry) => entry.aId ?? entry.bName)).toEqual([])
  })
})

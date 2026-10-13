import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from '../../shared/copy-leaves.js'
import { LEVELS } from '../levels.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const MACHINE_DRAFT_MARKER =
  '// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.'

const enLeaves = leaves(en)
const cyLeaves = new Map(leaves(cy).map((leaf) => [leaf.path, leaf.value]))

describe('page maturity copy', () => {
  it('Should give cy the same leaf paths as en', () => {
    expect([...cyLeaves.keys()].sort()).toEqual(
      enLeaves.map((leaf) => leaf.path).sort()
    )
  })

  it('Should translate every cy string and leave none empty', () => {
    for (const { path, value } of enLeaves) {
      const welsh = cyLeaves.get(path)

      expect(isCopyLeaf(welsh), `${path} must be copy`).toBe(true)
      expect(welsh, `${path} must be translated`).not.toBe(value)
    }
  })

  it('Should have one levels entry per level id', () => {
    expect(Object.keys(en.levels).sort()).toEqual(Object.values(LEVELS).sort())
    expect(Object.keys(cy.levels).sort()).toEqual(Object.values(LEVELS).sort())
  })

  it('Should open copy.cy.js with the machine-draft marker', () => {
    const source = readFileSync(
      new URL('./copy.cy.js', import.meta.url),
      'utf-8'
    )

    expect(source.split('\n')[0]).toBe(MACHINE_DRAFT_MARKER)
  })
})

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copy as sharedCopy, validatorDefaults } from './shared/copy.en.js'

const SET_ROOTS = ['live-animals', 'plant-products']

const featuresDirFor = (set) =>
  fileURLToPath(
    new URL(`./sets/${set}/journeys/linear/features`, import.meta.url)
  )

describe.each(SET_ROOTS)(
  'copy convention — every %s feature owns its copy',
  (set) => {
    const featuresDir = featuresDirFor(set)
    const featureDirs = readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    const filesOf = (feature, ...segments) =>
      readdirSync(path.join(featuresDir, feature, ...segments))
    const featuresWithTemplates = featureDirs.filter((feature) =>
      readdirSync(path.join(featuresDir, feature), { recursive: true }).some(
        (file) => String(file).endsWith('.njk')
      )
    )

    it(`Should find the ${set} feature folders`, () => {
      expect(featuresWithTemplates.length).toBeGreaterThan(0)
    })

    it.each(featuresWithTemplates)(
      `Should give ${set} %s a copy/ folder with copy.en.js, copy.cy.js and copy.test.js`,
      (feature) => {
        const files = filesOf(feature, 'copy')
        expect(files, `${set}:${feature} must own its copy`).toContain(
          'copy.en.js'
        )
        expect(files, `${set}:${feature} must carry its Welsh copy`).toContain(
          'copy.cy.js'
        )
        expect(files, `${set}:${feature} must test its copy`).toContain(
          'copy.test.js'
        )
      }
    )

    it.each(featureDirs)(
      `Should keep ${set} %s free of copy files at the feature root`,
      (feature) => {
        expect(
          filesOf(feature).filter((file) =>
            /^copy\.(en|cy|test)\.js$/.test(file)
          ),
          `${set}:${feature} must keep its copy files in copy/`
        ).toEqual([])
      }
    )

    it.each(featuresWithTemplates)(
      `Should keep every ${set} %s copy leaf a non-empty string or copy function`,
      async (feature) => {
        const { copy } = await import(
          `./sets/${set}/journeys/linear/features/${feature}/copy/copy.en.js`
        )
        for (const { path: leafPath, value } of leaves(copy)) {
          expect(
            isCopyLeaf(value),
            `${set}:${feature}: ${leafPath} must be copy`
          ).toBe(true)
        }
      }
    )
  }
)

describe('copy convention — shared chrome', () => {
  it('Should carry the chrome namespaces in the shared module', () => {
    expect(Object.keys(sharedCopy)).toEqual(
      expect.arrayContaining([
        'layout',
        'errorSummary',
        'saveActions',
        'journeyStrip'
      ])
    )
  })

  it('Should carry the footer meta-link labels the layout renders', () => {
    expect(sharedCopy.layout.footer).toEqual({
      privacy: 'Privacy',
      cookies: 'Cookies',
      accessibility: 'Accessibility statement'
    })
  })

  it('Should keep every shared and validator-default leaf valid copy', () => {
    for (const { path: leafPath, value } of [
      ...leaves(sharedCopy),
      ...leaves(validatorDefaults)
    ]) {
      expect(isCopyLeaf(value), `${leafPath} must be copy`).toBe(true)
    }
  })
})

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copy as sharedCopy, validatorDefaults } from './shared/copy.en.js'

const FEATURES_DIR = fileURLToPath(new URL('./features', import.meta.url))

const featureDirs = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const filesOf = (feature) => readdirSync(path.join(FEATURES_DIR, feature))

const featuresWithTemplates = featureDirs.filter((feature) =>
  filesOf(feature).some((file) => file.endsWith('.njk'))
)

describe('copy convention — every feature owns its copy', () => {
  it('Should find the feature folders', () => {
    expect(featuresWithTemplates.length).toBeGreaterThan(0)
  })

  it.each(featuresWithTemplates)(
    'Should give %s a copy.en.js, a copy.cy.js and a copy.test.js',
    (feature) => {
      const files = filesOf(feature)
      expect(files, `${feature} must own its copy`).toContain('copy.en.js')
      expect(files, `${feature} must carry its Welsh copy`).toContain(
        'copy.cy.js'
      )
      expect(files, `${feature} must test its copy`).toContain('copy.test.js')
    }
  )

  it.each(featuresWithTemplates)(
    'Should keep every %s copy leaf a non-empty string or copy function',
    async (feature) => {
      const { copy } = await import(`./features/${feature}/copy.en.js`)
      for (const { path: leafPath, value } of leaves(copy)) {
        expect(isCopyLeaf(value), `${feature}: ${leafPath} must be copy`).toBe(
          true
        )
      }
    }
  )
})

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

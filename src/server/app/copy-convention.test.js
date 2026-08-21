import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copy as sharedCopy, validatorDefaults } from './shared/copy.en.js'

const FEATURES_DIR = fileURLToPath(
  new URL('./sets/live-animals/journeys/linear/features', import.meta.url)
)

const featureDirs = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const filesOf = (feature, ...segments) =>
  readdirSync(path.join(FEATURES_DIR, feature, ...segments))

const featuresWithTemplates = featureDirs.filter((feature) =>
  readdirSync(path.join(FEATURES_DIR, feature), { recursive: true }).some(
    (file) => String(file).endsWith('.njk')
  )
)

describe('copy convention — every feature owns its copy', () => {
  it('Should find the feature folders', () => {
    expect(featuresWithTemplates.length).toBeGreaterThan(0)
  })

  it.each(featuresWithTemplates)(
    'Should give %s a copy/ folder with copy.en.js, copy.cy.js and copy.test.js',
    (feature) => {
      const files = filesOf(feature, 'copy')
      expect(files, `${feature} must own its copy`).toContain('copy.en.js')
      expect(files, `${feature} must carry its Welsh copy`).toContain(
        'copy.cy.js'
      )
      expect(files, `${feature} must test its copy`).toContain('copy.test.js')
    }
  )

  it.each(featureDirs)(
    'Should keep %s free of copy files at the feature root',
    (feature) => {
      expect(
        filesOf(feature).filter((file) =>
          /^copy\.(en|cy|test)\.js$/.test(file)
        ),
        `${feature} must keep its copy files in copy/`
      ).toEqual([])
    }
  )

  it.each(featuresWithTemplates)(
    'Should keep every %s copy leaf a non-empty string or copy function',
    async (feature) => {
      const { copy } = await import(
        `./sets/live-animals/journeys/linear/features/${feature}/copy/copy.en.js`
      )
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

  it('Should carry the Design release 1 phase-banner wording', () => {
    expect(sharedCopy.layout.phaseBanner).toEqual({
      tag: 'Alpha',
      bodyPrefix: 'This is a new service. Help us improve it and',
      feedbackLink: 'give your feedback by email'
    })

    expect(
      `${sharedCopy.layout.phaseBanner.bodyPrefix} ${sharedCopy.layout.phaseBanner.feedbackLink}.`
    ).toBe(
      'This is a new service. Help us improve it and give your feedback by email.'
    )
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

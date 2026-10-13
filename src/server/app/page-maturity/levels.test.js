import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compile } from 'sass'
import { describe, expect, it } from 'vitest'

import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'

const govukFrontendCss = readFileSync(
  new URL(
    '../../../../node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css',
    import.meta.url
  ),
  'utf-8'
)

const GOVUK_BASE = pathToFileURL(
  fileURLToPath(
    new URL(
      '../../../../node_modules/govuk-frontend/dist/govuk/_base.scss',
      import.meta.url
    )
  )
)

const bannerCss = compile(
  fileURLToPath(new URL('./_banner.scss', import.meta.url)),
  {
    importers: [
      { findFileUrl: (url) => (url === 'govuk-frontend' ? GOVUK_BASE : null) }
    ]
  }
).css

const ruleFor = (bannerClass) => {
  const body = new RegExp(`\\.${bannerClass}\\s*{([^}]*)}`).exec(bannerCss)?.[1]
  return Object.fromEntries(
    (body ?? '')
      .split(';')
      .map((declaration) => declaration.split(':').map((part) => part.trim()))
      .filter(([property]) => property)
  )
}

const luminance = (hex) => {
  const [red, green, blue] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

const contrastRatio = (first, second) => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a
  )
  return (lighter + 0.05) / (darker + 0.05)
}

const WCAG_AA_NORMAL_TEXT = 4.5

describe('page maturity levels', () => {
  it.each(Object.entries(TAG_CLASSES))(
    'Should give %s a tag colour that GOV.UK Frontend styles',
    (_, tagClass) => {
      expect(govukFrontendCss.includes(`.${tagClass}{`), tagClass).toBe(true)
    }
  )

  it.each(Object.values(LEVELS))(
    'Should give %s a tag colour, a banner modifier class and English copy',
    (level) => {
      expect(TAG_CLASSES[level]).toMatch(/^govuk-tag--/)
      expect(BANNER_CLASSES[level]).toMatch(/^app-page-maturity--/)
      expect(copy.levels[level].tag).toBeTruthy()
      expect(copy.levels[level].text).toBeTruthy()
    }
  )

  it('Should give every level its own banner modifier class', () => {
    const classes = Object.values(BANNER_CLASSES)

    expect(new Set(classes).size).toBe(Object.values(LEVELS).length)
  })

  it.each(Object.entries(BANNER_CLASSES))(
    'Should colour the %s banner row so its text meets WCAG AA contrast',
    (_, bannerClass) => {
      const { color, 'background-color': background } = ruleFor(bannerClass)

      expect(background, `${bannerClass} background`).toMatch(/^#[0-9a-f]{6}$/)
      expect(color, `${bannerClass} text`).toMatch(/^#[0-9a-f]{6}$/)
      expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT
      )
    }
  )
})

import { describe, expect, it } from 'vitest'

import {
  hubPath,
  newTemplatePath,
  pagePath,
  templateNamePath,
  templatePagePath
} from './paths.js'
import { withTemplateMode } from './template-mode.js'

const JOURNEY_ID = 'journey-1'

describe('journey paths', () => {
  it('Should point a page and the overview at the notification', () => {
    expect(pagePath(JOURNEY_ID, 'origin')).toBe(
      `/live-animals/notifications/${JOURNEY_ID}/origin`
    )
    expect(hubPath(JOURNEY_ID)).toBe(
      `/live-animals/notifications/${JOURNEY_ID}`
    )
  })

  it('Should point a page and the overview at the template in template mode', () => {
    withTemplateMode('2100010101', () => {
      expect(pagePath(JOURNEY_ID, 'origin')).toBe(
        `/live-animals/templates/${JOURNEY_ID}/origin`
      )
      expect(hubPath(JOURNEY_ID)).toBe(`/live-animals/templates/${JOURNEY_ID}`)
    })
  })
})

describe('template paths', () => {
  it('Should build the links to a new template and to a template page', () => {
    expect(newTemplatePath()).toBe('/live-animals/templates/new')
    expect(templateNamePath('abc')).toBe('/live-animals/templates/abc/name')
    expect(templatePagePath('abc', 'origin')).toBe(
      '/live-animals/templates/abc/origin'
    )
  })
})

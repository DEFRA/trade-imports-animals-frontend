import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedEn } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderActions = (args) =>
  environment.renderString(
    `{% from "shared/save-actions.njk" import saveActions %}{{ saveActions(${args}) }}`,
    { hubHref: '/notifications/journey-1/hub', copy: sharedEn.saveActions }
  )

const withReturnControls = 'hubHref, copy = copy'
const withoutReturnControls = 'hubHref, copy = copy, showReturnControls = false'

// The attribute the controllers read to tell a hub exit from a plain save.
const EXIT_NAME_ATTRIBUTE = 'name="exit"'

describe('#saveActions', () => {
  it('Should end a page the hub links to with the primary and both return controls', () => {
    const html = renderActions(withReturnControls)

    expect(html).toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).toContain('href="/notifications/journey-1/hub"')
  })

  it('Should submit the hub exit the controllers read from the secondary button', () => {
    const html = renderActions(withReturnControls)

    const secondary = html
      .split('<button')
      .find((fragment) =>
        fragment.includes(sharedEn.saveActions.saveAndReturnToHub)
      )

    expect(secondary).toContain(EXIT_NAME_ATTRIBUTE)
    expect(secondary).toContain('value="hub"')
  })

  it('Should end a page reached from another page with the primary alone', () => {
    const html = renderActions(withoutReturnControls)

    expect(html).toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).not.toContain(EXIT_NAME_ATTRIBUTE)
  })

  it('Should keep the button group so the primary sits with whatever follows it', () => {
    expect(renderActions(withoutReturnControls)).toContain(
      'class="govuk-button-group"'
    )
  })

  it('Should let a page reached from another page name its own primary and show it alone', () => {
    const html = renderActions(
      'hubHref, { text: "Save and finish", name: "action", value: "finish" }, copy, false'
    )

    expect(html).toContain('Save and finish')
    expect(html).not.toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
  })

  it('Should keep the return controls when a hub-linked page names its own primary', () => {
    const html = renderActions(
      'hubHref, { text: "Save and finish", name: "action", value: "finish" }, copy'
    )

    expect(html).toContain('Save and finish')
    expect(html).toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).toContain(EXIT_NAME_ATTRIBUTE)
  })
})

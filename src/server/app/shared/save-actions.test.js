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
const SECONDARY_BUTTON = 'govuk-button--secondary'
const BUTTON_GROUP = 'class="govuk-button-group"'

describe('#saveActions', () => {
  it('Should end a page the hub links to with the primary and both return controls', () => {
    const html = renderActions(withReturnControls)

    expect(html).toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).toContain('href="/notifications/journey-1/hub"')
  })

  it('Should put Cancel and return to overview on its own line below the two buttons', () => {
    const [group, afterGroup] =
      renderActions(withReturnControls).split('</div>')

    expect(group).toContain(BUTTON_GROUP)
    expect(group).toContain(sharedEn.saveActions.saveAndContinue)
    expect(group).toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(group).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(afterGroup).toContain(sharedEn.saveActions.cancelAndReturnToHub)
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
    expect(renderActions(withoutReturnControls)).toContain(BUTTON_GROUP)
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

describe('#saveActions while amending', () => {
  const RETURN_ACTION = '/n/j-1/origin?change=1'
  const CONTINUE_ACTION = '/n/j-1/origin'
  const amend = `{ returnAction: "${RETURN_ACTION}", continueAction: "${CONTINUE_ACTION}" }`
  const amending = `hubHref, copy = copy, amend = ${amend}`
  const namedPrimary =
    '{ text: "Save and finish", name: "action", value: "save" }'

  const buttons = (html) => html.split('<button').slice(1)

  it('Should end an overview-linked page with Save and return, Save and continue and a secondary Save and return to overview button, in that order', () => {
    const [first, second, third] = buttons(renderActions(amending))

    expect(first).toMatch(/>\s*Save and return\s*</)
    expect(second).toMatch(/>\s*Save and continue\s*</)
    expect(third).toMatch(/>\s*Save and return to overview\s*</)
    expect(third).toContain(SECONDARY_BUTTON)
    expect(third).toContain('data-module="govuk-button"')
    expect(third).toContain(EXIT_NAME_ATTRIBUTE)
    expect(third).toContain('value="hub"')
    expect(third).not.toContain('formaction')
  })

  it('Should put Save and return to overview on its own line below the two save buttons', () => {
    const html = renderActions(amending)
    const [group, afterGroup] = html.split('</div>')

    expect(group).toContain(BUTTON_GROUP)
    expect(group).toMatch(/>\s*Save and return\s*</)
    expect(group).toMatch(/>\s*Save and continue\s*</)
    expect(group).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(afterGroup).toMatch(/>\s*Save and return to overview\s*</)
  })

  it("Should send Save and return back to the review and Save and continue onwards through the button's own form action", () => {
    const [first, second] = buttons(renderActions(amending))

    expect(first).toContain(`formaction="${RETURN_ACTION}"`)
    expect(first).not.toContain(SECONDARY_BUTTON)
    expect(second).toContain(`formaction="${CONTINUE_ACTION}"`)
    expect(second).toContain(SECONDARY_BUTTON)
  })

  it('Should offer no cancel link while amending', () => {
    const html = renderActions(amending)

    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
    expect(html).not.toContain('href=')
  })

  it("Should carry the page's own primary name and value on both save buttons", () => {
    const html = renderActions(`hubHref, ${namedPrimary}, copy, true, ${amend}`)
    const [first, second] = buttons(html)

    for (const button of [first, second]) {
      expect(button).toContain('name="action"')
      expect(button).toContain('value="save"')
    }
    expect(html.match(/name="action"/g)).toHaveLength(2)
  })

  it("Should send no action field when the page's primary names none", () => {
    expect(renderActions(amending)).not.toContain('name="action"')
  })

  it('Should end a page reached from another page with Save and return and Save and continue only', () => {
    const html = renderActions(`${amending}, showReturnControls = false`)

    expect(buttons(html)).toHaveLength(2)
    expect(html).not.toContain(EXIT_NAME_ATTRIBUTE)
  })

  it('Should drop the overview exit on a picker while amending', () => {
    const html = renderActions(`${amending}, hubExitWhileAmending = false`)

    expect(buttons(html)).toHaveLength(2)
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
  })
})

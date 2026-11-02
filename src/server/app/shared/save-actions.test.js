import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { AMEND_RETURN_CHOICE } from './amend-form-actions.js'
import { copy as sharedEn } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderActions = (args) =>
  environment.renderString(
    `{% from "shared/save-actions.njk" import saveActions %}{{ saveActions(${args}) }}`,
    { hubHref: '/notifications/journey-1/hub', copy: sharedEn.saveActions }
  )

const withReturnControls = '{ hubHref: hubHref, copy: copy }'
const withoutReturnControls =
  '{ hubHref: hubHref, copy: copy, showReturnControls: false }'

const EXIT_NAME_ATTRIBUTE = 'name="exit"'
const HUB_VALUE_ATTRIBUTE = 'value="hub"'
const ACTION_NAME_ATTRIBUTE = 'name="action"'
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
    expect(secondary).toContain(HUB_VALUE_ATTRIBUTE)
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
      '{ hubHref: hubHref, primary: { text: "Save and finish", name: "action", value: "finish" }, copy: copy, showReturnControls: false }'
    )

    expect(html).toContain('Save and finish')
    expect(html).not.toContain(sharedEn.saveActions.saveAndContinue)
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
    expect(html).not.toContain(sharedEn.saveActions.cancelAndReturnToHub)
  })

  it('Should keep the return controls when a hub-linked page names its own primary', () => {
    const html = renderActions(
      '{ hubHref: hubHref, primary: { text: "Save and finish", name: "action", value: "finish" }, copy: copy }'
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
  const amendWithReturnChoice = `{ returnAction: "${RETURN_ACTION}", continueAction: "${CONTINUE_ACTION}", returnChoice: { name: "${AMEND_RETURN_CHOICE.name}", value: "${AMEND_RETURN_CHOICE.value}" } }`
  const amending = `{ hubHref: hubHref, copy: copy, amend: ${amend} }`
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
    expect(third).toContain(HUB_VALUE_ATTRIBUTE)
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

  it("Should carry the amend choice on Save and return and the page's own primary choice on Save and continue", () => {
    const [first, second] = buttons(
      renderActions(
        `{ hubHref: hubHref, primary: ${namedPrimary}, copy: copy, amend: ${amendWithReturnChoice} }`
      )
    )

    expect(first).toContain(`name="${AMEND_RETURN_CHOICE.name}"`)
    expect(first).toContain(`value="${AMEND_RETURN_CHOICE.value}"`)
    expect(second).toContain(ACTION_NAME_ATTRIBUTE)
    expect(second).toContain('value="save"')
  })

  it("Should send no action field when the page's primary names none", () => {
    expect(renderActions(amending)).not.toContain(ACTION_NAME_ATTRIBUTE)
  })

  it('Should end a page reached from another page with Save and return and Save and continue only', () => {
    const html = renderActions(
      `{ hubHref: hubHref, copy: copy, amend: ${amend}, showReturnControls: false }`
    )

    expect(buttons(html)).toHaveLength(2)
    expect(html).not.toContain(EXIT_NAME_ATTRIBUTE)
  })

  it('Should drop the overview exit on a picker while amending', () => {
    const html = renderActions(
      `{ hubHref: hubHref, copy: copy, amend: ${amend}, hubExitWhileAmending: false }`
    )

    expect(buttons(html)).toHaveLength(2)
    expect(html).not.toContain(sharedEn.saveActions.saveAndReturnToHub)
  })
})

describe('#saveActions posting the form to another service', () => {
  const UPLOAD_PATH = '/upload-and-scan/upload-1'
  const MULTIPART = 'multipart/form-data'
  const primary =
    '{ text: "Save and continue", name: "action", value: "continue" }'
  const amend = `{ returnAction: "/n/j-1/p?change=1", continueAction: "/n/j-1/p", returnChoice: { name: "${AMEND_RETURN_CHOICE.name}", value: "${AMEND_RETURN_CHOICE.value}" } }`
  const uploading = `{ hubHref: hubHref, primary: ${primary}, copy: copy, uploadPath: "${UPLOAD_PATH}" }`
  const amendingWhileUploading = `{ hubHref: hubHref, primary: ${primary}, copy: copy, amend: ${amend}, uploadPath: "${UPLOAD_PATH}" }`

  const buttons = (html) => html.split('<button').slice(1)

  it('Should post every save button to the path as multipart', () => {
    const all = buttons(renderActions(uploading))

    expect(all).toHaveLength(2)
    for (const button of all) {
      expect(button).toContain(`formaction="${UPLOAD_PATH}"`)
      expect(button).toContain(`formenctype="${MULTIPART}"`)
    }
  })

  it('Should carry the primary choice on Save and continue and the hub exit on Save and return to overview', () => {
    const [primaryButton, hubExit] = buttons(renderActions(uploading))

    expect(primaryButton).toContain(ACTION_NAME_ATTRIBUTE)
    expect(primaryButton).toContain('value="continue"')
    expect(hubExit).toContain(EXIT_NAME_ATTRIBUTE)
    expect(hubExit).toContain(HUB_VALUE_ATTRIBUTE)
  })

  it('Should carry the amend choice on the amend Save and return and the primary choice on the amend Save and continue', () => {
    const [saveAndReturn, saveAndContinue, hubExit] = buttons(
      renderActions(amendingWhileUploading)
    )

    expect(saveAndReturn).toMatch(/>\s*Save and return\s*</)
    expect(saveAndReturn).toContain('name="amendSave"')
    expect(saveAndReturn).toContain('value="return"')
    expect(saveAndContinue).toMatch(/>\s*Save and continue\s*</)
    expect(saveAndContinue).toContain(ACTION_NAME_ATTRIBUTE)
    expect(saveAndContinue).toContain('value="continue"')
    for (const button of [saveAndReturn, saveAndContinue, hubExit]) {
      expect(button).toContain(`formaction="${UPLOAD_PATH}"`)
      expect(button).toContain(`formenctype="${MULTIPART}"`)
    }
    expect(hubExit).toContain(EXIT_NAME_ATTRIBUTE)
    expect(hubExit).toContain(HUB_VALUE_ATTRIBUTE)
  })

  it("Should keep the page's own primary classes and attributes beside the upload attributes", () => {
    const [primaryButton] = buttons(
      renderActions(
        `{ hubHref: hubHref, copy: copy, uploadPath: "${UPLOAD_PATH}", primary: { text: "Save and continue", classes: "govuk-button--warning", attributes: { "data-qa": "primary" } } }`
      )
    )

    expect(primaryButton).toContain('govuk-button--warning')
    expect(primaryButton).toContain('data-qa="primary"')
    expect(primaryButton).toContain(`formaction="${UPLOAD_PATH}"`)
    expect(primaryButton).toContain(`formenctype="${MULTIPART}"`)
  })

  it('Should leave the form action off every button when no path is given', () => {
    const html = renderActions(withReturnControls)

    expect(html).not.toContain('formaction')
    expect(html).not.toContain('formenctype')
  })
})

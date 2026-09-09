import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerOriginEntry,
  expectPageEndsWithPrimaryAlone,
  selectSpecies
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const SUBMIT_BUTTON = 'form button[type="submit"]'

const partBoxes = (page) => ({
  county: page.getByLabel(copy.cph.county, { exact: true }),
  parish: page.getByLabel(copy.cph.parish, { exact: true }),
  holding: page.getByLabel(copy.cph.holding, { exact: true })
})

const fillCph = async (page, { county, parish, holding }) => {
  const boxes = partBoxes(page)
  await boxes.county.fill(county)
  await boxes.parish.fill(parish)
  await boxes.holding.fill(holding)
}

const expectNoSeriousAxeViolations = async (page, label) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${label} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const startAtCphNumber = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const commodityUrl = page.url().replace(/\/origin$/, '/commodities')
  await answerOriginEntry(page)

  await page.goto(commodityUrl)
  await selectSpecies(page, ['Bos taurus'])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/consignment-details$/)

  await page.goto(commodityUrl.replace(/\/commodities$/, '/cph-number'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('cph-number feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCphNumber(page)
  })

  test('renders the CPH copy', async ({ page }) => {
    // The page heading is an instruction in its own right, directly under the
    // caption — the group of boxes beneath it carries the shorter legend, so the
    // two are separate strings rather than one label doubling as the heading.
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.title)

    // The question's name is a legend, not the heading: a revert to
    // `isPageHeading: true` would put it back into a second h1.
    await expect(
      page.getByRole('heading', { name: copy.cph.legend })
    ).toHaveCount(0)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    await expect(
      page.getByRole('group', { name: copy.cph.legend })
    ).toHaveCount(1)
  })

  test('takes the number in three boxes sized to its parts', async ({
    page
  }) => {
    const boxes = partBoxes(page)

    // The widths and the maxlengths are what teach the 2/3/4 shape — they are
    // the reason the page needs no copy to explain how the digits divide up.
    await expect(boxes.county).toHaveClass(/govuk-input--width-2/)
    await expect(boxes.county).toHaveAttribute('maxlength', '2')
    await expect(boxes.parish).toHaveClass(/govuk-input--width-3/)
    await expect(boxes.parish).toHaveAttribute('maxlength', '3')
    await expect(boxes.holding).toHaveClass(/govuk-input--width-4/)
    await expect(boxes.holding).toHaveAttribute('maxlength', '4')

    for (const box of Object.values(boxes)) {
      await expect(box).toHaveAttribute('inputmode', 'numeric')
    }

    // Design release 1 clips its per-part labels out of sight with its own
    // stylesheet. The service takes DR1's labels, not its picture: three
    // unlabelled boxes under one legend would be worse than the single field
    // they replace, so the labels have to be on screen, not just announced.
    for (const [id, text] of [
      ['cphCounty', copy.cph.county],
      ['cphParish', copy.cph.parish],
      ['cphHolding', copy.cph.holding]
    ]) {
      const label = page.locator(`label[for="${id}"]`)
      await expect(label).toHaveText(text)
      await expect(label).toBeVisible()
      await expect(label).not.toHaveClass(/govuk-visually-hidden/)
      const box = await label.boundingBox()
      expect(
        box.width,
        `${text} label is clipped out of sight`
      ).toBeGreaterThan(1)
    }
  })

  test('describes the whole number once, in the real 2/3/4 grouping', async ({
    page
  }) => {
    // The hint sits on the group rather than on any one box, because it
    // explains the whole number. 123/456/789 is a grouping no CPH number uses.
    await expect(
      page.getByRole('group', { name: copy.cph.legend })
    ).toHaveAccessibleDescription(copy.cph.hint)
    await expect(page.getByText('123/456/789')).toHaveCount(0)
  })

  test('keeps the CPH help collapsed above the field until it is opened', async ({
    page
  }) => {
    const summary = page.getByText(copy.help.summary, { exact: true })
    await expect(summary).toBeVisible()

    // Collapsed by default: the help costs a trader who already knows what a
    // CPH number is nothing but a line of summary text.
    await expect(page.getByText(copy.help.definition)).toBeHidden()
    await expect(page.getByText(copy.help.whereToFind)).toBeHidden()

    // Above the input, not below it — the explanation has to arrive before the
    // question it explains.
    await expect(
      page.locator('details').filter({ hasText: copy.help.summary })
    ).toHaveCount(1)
    await expect(page.locator('details ~ form #cphCounty')).toHaveCount(1)

    await summary.click()

    await expect(page.getByText(copy.help.definition)).toBeVisible()
    await expect(page.getByText(copy.help.whereToFind)).toBeVisible()
  })

  test('ends with the primary alone, being reached from the addresses page', async ({
    page
  }) => {
    await expectPageEndsWithPrimaryAlone(page)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/cph-number$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('joins the parts, saves the nine digits, continues the run and comes back split', async ({
    page
  }) => {
    const cphUrl = page.url()

    await fillCph(page, { county: '12', parish: '345', holding: '6789' })
    await page.locator(SUBMIT_BUTTON).first().click()

    // The notification was created in this session, so the opening run is still
    // running and carries the page on to the next question rather than back to
    // the hub.
    await expect(page).toHaveURL(
      /\/notifications\/[^/]+\/consignment\/contact\/select$/
    )

    await page.goto(cphUrl)
    const boxes = partBoxes(page)
    await expect(boxes.county).toHaveValue('12')
    await expect(boxes.parish).toHaveValue('345')
    await expect(boxes.holding).toHaveValue('6789')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousAxeViolations(page, 'CPH number')
  })
})

test.describe('cph-number validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCphNumber(page)
  })

  test('CPH validation: an untouched page asks the whole question at the first box', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON).first().click()

    const requiredError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.cphRequired })
    await expect(requiredError).toBeVisible()
    await requiredError.click()

    const boxes = partBoxes(page)
    await expect(boxes.county).toBeFocused()
    await expect(boxes.county).toHaveValue('')
  })

  test('CPH validation: a short part names that part and keeps every value', async ({
    page
  }) => {
    await fillCph(page, { county: '12', parish: '34', holding: '6789' })
    await page.locator(SUBMIT_BUTTON).first().click()

    const parishError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.parishLength })
    await expect(parishError).toBeVisible()
    await parishError.click()

    const boxes = partBoxes(page)
    await expect(boxes.parish).toBeFocused()
    await expect(boxes.parish).toHaveValue('34')
    await expect(boxes.county).toHaveValue('12')
    await expect(boxes.holding).toHaveValue('6789')
  })

  test('CPH validation: a missing part names that part rather than the whole number', async ({
    page
  }) => {
    await fillCph(page, { county: '12', parish: '345', holding: '' })
    await page.locator(SUBMIT_BUTTON).first().click()

    const holdingError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.holdingRequired })
    await expect(holdingError).toBeVisible()
    await holdingError.click()
    await expect(partBoxes(page).holding).toBeFocused()
  })

  test('CPH validation: a non-digit part names that part and keeps what was typed', async ({
    page
  }) => {
    await fillCph(page, { county: '12', parish: '345', holding: '678a' })
    await page.locator(SUBMIT_BUTTON).first().click()

    const digitsError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.holdingDigitsOnly })
    await expect(digitsError).toBeVisible()
    await digitsError.click()

    const boxes = partBoxes(page)
    await expect(boxes.holding).toBeFocused()
    await expect(boxes.holding).toHaveValue('678a')
  })

  test('CPH validation: every wrong part is named at once', async ({
    page
  }) => {
    await fillCph(page, { county: '1', parish: '34', holding: '678' })
    await page.locator(SUBMIT_BUTTON).first().click()

    const summary = page.getByRole('alert')
    await expect(
      summary.getByRole('link', { name: copy.errors.countyLength })
    ).toBeVisible()
    await expect(
      summary.getByRole('link', { name: copy.errors.parishLength })
    ).toBeVisible()
    await expect(
      summary.getByRole('link', { name: copy.errors.holdingLength })
    ).toBeVisible()
  })

  test('CPH validation: the error marks the whole question, not the individual boxes', async ({
    page
  }) => {
    await fillCph(page, { county: '1', parish: '34', holding: '678' })
    await page.locator(SUBMIT_BUTTON).first().click()

    // One red bar on the question, not three inside the row of boxes — the
    // date-input pattern the layout is borrowed from keeps the boxes aligned.
    await expect(page.locator('form > .govuk-form-group--error')).toHaveCount(1)
    await expect(
      page.locator('.govuk-date-input__item .govuk-error-message')
    ).toHaveCount(0)
    await expect(page.locator('#cph-error')).toBeVisible()
    await expect(
      page.getByRole('group', { name: copy.cph.legend })
    ).toHaveAccessibleDescription(new RegExp(copy.errors.countyLength))

    const boxes = partBoxes(page)
    await expect(boxes.county).toHaveClass(/govuk-input--error/)
    await expect(boxes.parish).toHaveClass(/govuk-input--error/)
    await expect(boxes.holding).toHaveClass(/govuk-input--error/)
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await page.locator(SUBMIT_BUTTON).first().click()
    await expect(page.getByRole('alert')).toBeVisible()

    await expectNoSeriousAxeViolations(page, 'CPH number in its error state')
  })
})

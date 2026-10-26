import { expect, test } from '@playwright/test'

import {
  BOS_TAURUS,
  answerOriginEntry,
  expectNoSeriousOrCriticalViolations,
  expectPageEndsWithPrimaryAlone,
  openCphNumberFromAddLink,
  selectSpecies,
  startNotificationAtOrigin,
  urlUnderBase
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const SUBMIT_BUTTON = 'form button[type="submit"]'
const WHOLE_NUMBER = '123456789'
const SLASHED_NUMBER = '12/345/6789'

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

const saveAndExpectAddresses = async (page) => {
  await page.locator(SUBMIT_BUTTON).first().click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/addresses$/)
}

const expectSavedNumberSplit = async (page, cphUrl) => {
  await page.goto(cphUrl)
  const boxes = partBoxes(page)
  await expect(boxes.county).toHaveValue('12')
  await expect(boxes.parish).toHaveValue('345')
  await expect(boxes.holding).toHaveValue('6789')
}

const typeKeyByKey = (keyboard, text) => keyboard.type(text)
const insertInOneGo = (keyboard, text) => keyboard.insertText(text)

const enterInCountyAndExpectSavedSplit = async (page, number, enterText) => {
  const cphUrl = page.url()
  const { county } = partBoxes(page)
  await county.focus()
  await enterText(page.keyboard, number)
  await expect(county).toHaveValue(number)
  await expect(county).toBeFocused()
  await saveAndExpectAddresses(page)
  await expectSavedNumberSplit(page, cphUrl)
}

const startAtCphNumber = async (page) => {
  await startNotificationAtOrigin(page)

  const commodityUrl = page.url().replace(/\/origin$/, '/commodities')
  await answerOriginEntry(page)

  await page.goto(commodityUrl)
  await selectSpecies(page, [BOS_TAURUS])
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL(
    urlUnderBase('/notifications/[^/]+/import-reason')
  )

  await page.goto(commodityUrl.replace(/\/commodities$/, '/addresses'))
  await openCphNumberFromAddLink(page)
  await expect(page).toHaveURL(/\/cph-number\?return=addresses$/)
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('cph-number feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCphNumber(page)
  })

  test('renders the CPH copy', async ({ page }) => {
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(copy.title)

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

    await expect(boxes.county).toHaveClass(/govuk-input--width-2/)
    await expect(boxes.parish).toHaveClass(/govuk-input--width-3/)
    await expect(boxes.holding).toHaveClass(/govuk-input--width-4/)

    for (const box of Object.values(boxes)) {
      await expect(box).toHaveAttribute('inputmode', 'numeric')
    }

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

  test('describes the group with the hint', async ({ page }) => {
    await expect(
      page.getByRole('group', { name: copy.cph.legend })
    ).toHaveAccessibleDescription(copy.cph.hint)
  })

  test('keeps focus in an emptied box on Backspace, and every digit typed straight through the county box with focus in it', async ({
    page
  }) => {
    const { parish } = partBoxes(page)
    await parish.focus()
    await page.keyboard.press('Backspace')
    await expect(parish).toBeFocused()

    await enterInCountyAndExpectSavedSplit(page, WHOLE_NUMBER, typeKeyByKey)
  })

  test('saves a whole number inserted in one go into the county box', async ({
    page
  }) => {
    await enterInCountyAndExpectSavedSplit(page, SLASHED_NUMBER, insertInOneGo)
  })

  test('keeps the CPH help collapsed above the field until it is opened', async ({
    page
  }) => {
    const summary = page.getByText(copy.help.summary, { exact: true })
    await expect(summary).toBeVisible()

    await expect(page.getByText(copy.help.definition)).toBeHidden()
    await expect(page.getByText(copy.help.whereToFind)).toBeHidden()

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

  test('back link returns to the consignment addresses page', async ({
    page
  }) => {
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+\/addresses$/)
  })

  test('joins the parts, saves the nine digits, returns to the consignment addresses page and comes back split', async ({
    page
  }) => {
    const cphUrl = page.url()

    await fillCph(page, { county: '12', parish: '345', holding: '6789' })
    await saveAndExpectAddresses(page)
    await expectSavedNumberSplit(page, cphUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'CPH number')
  })

  test('has no serious or critical axe violations with the whole number typed into the county box', async ({
    page
  }) => {
    await partBoxes(page).county.fill(WHOLE_NUMBER)

    await expectNoSeriousOrCriticalViolations(
      page,
      'CPH number with the whole number in the county box'
    )
  })
})

test.describe('cph-number without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtCphNumber(page)
  })

  test('keeps all nine digits typed into the county box and saves them', async ({
    page
  }) => {
    await enterInCountyAndExpectSavedSplit(page, WHOLE_NUMBER, typeKeyByKey)
  })

  test('saves a whole number with slashes inserted into the county box', async ({
    page
  }) => {
    await enterInCountyAndExpectSavedSplit(page, SLASHED_NUMBER, insertInOneGo)
  })

  test('names each part and keeps what was typed when the county box holds fewer than nine digits', async ({
    page
  }) => {
    await partBoxes(page).county.fill('1234')
    await page.locator(SUBMIT_BUTTON).first().click()

    const summary = page.getByRole('alert')
    await expect(
      summary.getByRole('link', { name: copy.errors.countyLength })
    ).toBeVisible()
    await expect(
      summary.getByRole('link', { name: copy.errors.parishRequired })
    ).toBeVisible()
    await expect(
      summary.getByRole('link', { name: copy.errors.holdingRequired })
    ).toBeVisible()
    await expect(partBoxes(page).county).toHaveValue('1234')
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

    await expectNoSeriousOrCriticalViolations(
      page,
      'CPH number in its error state'
    )
  })
})

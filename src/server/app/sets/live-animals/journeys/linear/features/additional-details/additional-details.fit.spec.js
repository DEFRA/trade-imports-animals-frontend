import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  answerCountryOfOrigin,
  journeyUrl,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../fit/live-animals-journey.js'
import * as certification from '../../../../../../services/certification-purposes/index.js'
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'

// The species drives which questions the page asks, so it is the one thing
// the set-up varies: cattle are asked the unweaned-animals question and
// horses are not.
const startAtAdditionalDetails = async (page, species = 'Bos taurus') => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, [species])
  await page
    .getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
    .click()
  await page.getByLabel('Number of animals').fill('1')
  await page.getByLabel('Number of packages (when required)').fill('1')
  await page
    .getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
    .click()
  await page.goto(journeyUrl(page, 'additional-details'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('additional-details feature — rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtAdditionalDetails(page)
  })

  test('renders service-backed certification options and conditional copy', async ({
    page
  }) => {
    const certified = page.getByRole('group', { name: copy.certified.legend })
    await expect(certified).toContainText(copy.certified.hint)
    const renderedValues = await certified
      .getByRole('radio')
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedValues).toEqual(
      certification.certificationPurposes().map(({ value }) => value)
    )
    for (const option of certification.certificationPurposes()) {
      await expect(
        certified.getByRole('radio', { name: option.text, exact: true })
      ).toBeVisible()
    }

    const unweaned = page.getByRole('group', { name: copy.unweaned.legend })
    await expect(unweaned).toContainText(copy.unweaned.hint)
    await expect(
      unweaned.getByRole('radio', { name: copy.unweaned.yes })
    ).toBeVisible()
    await expect(
      unweaned.getByRole('radio', { name: copy.unweaned.no })
    ).toBeVisible()
  })

  // The page asks two questions under one h1, and the eighteen radios beneath
  // them only read as two groups if the legends outweigh the option labels —
  // the size class is the whole of the behaviour, so it is asserted directly
  // rather than through a rendered role.
  test('sets both question legends at the medium size', async ({ page }) => {
    await expect(
      page.getByRole('group', { name: copy.certified.legend }).locator('legend')
    ).toHaveClass(/govuk-fieldset__legend--m/)
    await expect(
      page.getByRole('group', { name: copy.unweaned.legend }).locator('legend')
    ).toHaveClass(/govuk-fieldset__legend--m/)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = journeyUrl(page)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })
})

// Design release 1 asks the unweaned-animals question only of a commodity
// that carries unweaned options — cattle, not horses — so a horses-only
// consignment is asked what the animals are certified for and nothing else.
test.describe('additional-details feature — the unweaned commodity gate', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtAdditionalDetails(page, 'Equus caballus')
  })

  test('does not ask a horses-only consignment about unweaned animals', async ({
    page
  }) => {
    await expect(
      page.getByRole('group', { name: copy.certified.legend })
    ).toBeVisible()
    await expect(
      page.getByRole('group', { name: copy.unweaned.legend })
    ).toHaveCount(0)
  })

  test('saves a horses-only consignment without an unweaned answer', async ({
    page
  }) => {
    const detailsUrl = page.url()

    await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
    await page
      .getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
      .click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(detailsUrl)
    await expect(
      page.getByRole('radio', { name: 'Slaughter', exact: true })
    ).toBeChecked()
    await expect(
      page.getByRole('group', { name: copy.unweaned.legend })
    ).toHaveCount(0)
  })
})

test.describe('additional-details feature — validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtAdditionalDetails(page)
  })

  test('certification validation: invalid option links to and focuses the group while preserving the valid unweaned answer', async ({
    page
  }) => {
    const certified = page.getByRole('group', { name: copy.certified.legend })
    const unweaned = page.getByRole('group', { name: copy.unweaned.legend })
    await unweaned.getByRole('radio', { name: copy.unweaned.no }).check()
    await certified
      .getByRole('radio')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-purpose'
        input.checked = true
      })

    await page
      .getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
      .click()

    const certificationError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(certificationError).toBeVisible()
    await certificationError.click()
    await expect(certified.getByRole('radio').first()).toBeFocused()
    await expect(certified.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(
      unweaned.getByRole('radio', { name: copy.unweaned.no })
    ).toBeChecked()
  })

  test('unweaned validation: invalid option links to and focuses the group while preserving the valid certification', async ({
    page
  }) => {
    const certified = page.getByRole('group', { name: copy.certified.legend })
    const unweaned = page.getByRole('group', { name: copy.unweaned.legend })
    await certified
      .getByRole('radio', { name: 'Slaughter', exact: true })
      .check()
    await unweaned
      .getByRole('radio')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-answer'
        input.checked = true
      })

    await page
      .getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
      .click()

    const unweanedError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(unweanedError).toBeVisible()
    await unweanedError.click()
    await expect(unweaned.getByRole('radio').first()).toBeFocused()
    await expect(unweaned.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(
      certified.getByRole('radio', { name: 'Slaughter', exact: true })
    ).toBeChecked()
  })
})

test.describe('additional-details feature — persistence and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtAdditionalDetails(page)
  })

  test('saves both answers, redirects and persists them', async ({ page }) => {
    const detailsUrl = page.url()

    await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
    await page.getByRole('radio', { name: copy.unweaned.no }).check()
    await page
      .getByRole('button', { name: SAVE_AND_CONTINUE, exact: true })
      .click()

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(detailsUrl)
    await expect(
      page.getByRole('radio', { name: 'Slaughter', exact: true })
    ).toBeChecked()
    await expect(
      page.getByRole('radio', { name: copy.unweaned.no })
    ).toBeChecked()
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
    await page.getByRole('radio', { name: copy.unweaned.no }).check()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Additional details has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})

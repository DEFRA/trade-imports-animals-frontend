import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  answerCountryOfOrigin,
  journeyUrl,
  searchAndSelect,
  startNotification
} from '../../../../../e2e/live-animals-journey.js'
import * as certification from '../../services/certification-purposes/index.js'
import { validatorDefaults } from '../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const saveAndContinue = (page) =>
  page.getByRole('button', { name: 'Save and continue', exact: true }).click()

const startAtAdditionalDetails = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await searchAndSelect(page, 'Cow', ['Bos taurus'])
  await saveAndContinue(page)
  await page.getByLabel('Number of animals').fill('1')
  await page.getByLabel('Number of packages (optional)').fill('1')
  await saveAndContinue(page)
  await page.goto(journeyUrl(page, 'additional-details'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const errorLinks = (page) =>
  page
    .locator('.govuk-error-summary')
    .getByRole('link', { name: validatorDefaults.oneOf })

test.describe('additional-details feature', () => {
  test('renders service-backed certification options, conditional copy and working back link', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)

    const certified = page.getByRole('group', { name: copy.certified.legend })
    await expect(certified).toContainText(copy.certified.hint)
    const renderedValues = await certified
      .locator('input[name="animalsCertifiedFor"]')
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

    const hubUrl = journeyUrl(page)
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('shows both controller validation rules and preserves the other valid value', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)

    await page
      .locator('input[name="animalsCertifiedFor"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-purpose'
        input.checked = true
      })
    await page
      .locator('input[name="containsUnweanedAnimals"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-answer'
        input.checked = true
      })
    await saveAndContinue(page)
    await expect(errorLinks(page)).toHaveCount(2)

    await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
    await page
      .locator('input[name="containsUnweanedAnimals"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-answer'
        input.checked = true
      })
    await saveAndContinue(page)
    await expect(errorLinks(page)).toHaveCount(1)
    await expect(
      page.getByRole('radio', { name: 'Slaughter', exact: true })
    ).toBeChecked()
    await expect(
      page.locator('input[name="containsUnweanedAnimals"]:checked')
    ).toHaveCount(0)

    await page.getByRole('radio', { name: copy.unweaned.no }).check()
    await page
      .locator('input[name="animalsCertifiedFor"]')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-purpose'
        input.checked = true
      })
    await saveAndContinue(page)
    await expect(errorLinks(page)).toHaveCount(1)
    await expect(
      page.getByRole('radio', { name: copy.unweaned.no })
    ).toBeChecked()
    await expect(
      page.locator('input[name="animalsCertifiedFor"]:checked')
    ).toHaveCount(0)
  })

  test('saves both answers, persists them and has no serious or critical axe violations', async ({
    page
  }) => {
    await startAtAdditionalDetails(page)
    const detailsUrl = page.url()

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

    await saveAndContinue(page)
    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(detailsUrl)
    await expect(
      page.getByRole('radio', { name: 'Slaughter', exact: true })
    ).toBeChecked()
    await expect(
      page.getByRole('radio', { name: copy.unweaned.no })
    ).toBeChecked()
  })
})

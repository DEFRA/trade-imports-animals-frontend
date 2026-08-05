import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../axe.e2e-helper.js'
import { purposeOptions } from '../../../../services/reference/purposes.js'
import { copy } from './copy/copy.en.js'

const SAVE_AND_CONTINUE = 'Save and continue'
const RADIO_ITEM_CLASS = 'govuk-radios__item'

const startAtPurpose = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/country-of-origin$/.test(
      url.pathname
    )
  )
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Purpose', exact: true }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/about-the-consignment$/.test(
      url.pathname
    )
  )
}

test.describe('plant-products purpose', () => {
  test.beforeEach(async ({ page }) => {
    await startAtPurpose(page)
  })

  test('renders the canonical normalised options with an accessible legend and correctly wired hints', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    const group = page.locator('fieldset')
    await expect(group).toHaveCount(1)
    await expect(group).toHaveAccessibleName(`${copy.caption} ${copy.legend}`)
    await expect(
      page.getByRole('heading', { level: 1, name: copy.legend })
    ).toBeVisible()

    const radios = group.locator('input[name="reasonForImport"]')
    await expect(radios).toHaveCount(3)
    expect(
      await radios.evaluateAll((inputs) => inputs.map(({ value }) => value))
    ).toEqual(purposeOptions.map(({ value }) => value))
    for (const wireValue of ['internalmarket', 'import', 'reconformity']) {
      await expect(
        group.locator(`input[name="reasonForImport"][value="${wireValue}"]`)
      ).toHaveCount(0)
    }

    const describedByIds = []
    for (const option of purposeOptions.slice(0, 2)) {
      const radio = group.locator(
        `input[name="reasonForImport"][value="${option.value}"]`
      )
      await expect(radio).toBeVisible()
      const describedBy = await radio.getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      describedByIds.push(describedBy)
      await expect(page.locator(`#${describedBy}`)).toHaveText(
        copy.reasonHints[option.value]
      )
    }
    expect(new Set(describedByIds).size).toBe(describedByIds.length)
    for (const option of purposeOptions) {
      await expect(
        group.locator(`input[name="reasonForImport"][value="${option.value}"]`)
      ).toHaveAccessibleName(option.text)
    }
    await expect(
      page.getByRole('radio', {
        name: purposeOptions[2].text,
        exact: true
      })
    ).not.toHaveAttribute('aria-describedby')
    await expect(group.locator('.govuk-hint')).toHaveCount(2)
    await expect(group.locator('.govuk-radios--conditional')).toHaveCount(0)
    expect(
      await group
        .locator('.govuk-radios__item')
        .evaluateAll((items) => items.map(({ className }) => className))
    ).toEqual([RADIO_ITEM_CLASS, RADIO_ITEM_CLASS, RADIO_ITEM_CLASS])
    expect(
      await group
        .locator('label')
        .evaluateAll((labels) =>
          labels.some(({ classList }) =>
            classList.contains('govuk-!-font-weight-bold')
          )
        )
    ).toBe(false)
  })

  test('saves a normalised reason, completes the hub row and persists it on reload', async ({
    page
  }) => {
    const purposeUrl = page.url()
    await page
      .getByRole('radio', { name: purposeOptions[0].text, exact: true })
      .check()
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    const purposeRow = page.getByRole('listitem').filter({
      has: page.getByText('Purpose', { exact: true })
    })
    await expect(purposeRow).toContainText('Completed')

    await page.goto(purposeUrl)
    const selected = page.locator('input[name="reasonForImport"]:checked')
    await expect(selected).toHaveValue('INTERNAL_MARKET')
    await expect(
      page.getByRole('radio', { name: purposeOptions[0].text, exact: true })
    ).toBeChecked()
  })

  test('rejects an empty reason, focuses the first radio and commits nothing', async ({
    page
  }) => {
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()

    await expect(page.getByRole('alert')).toContainText('There is a problem')
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.reasonForImportRequired })
    await expect(summaryLink).toHaveAttribute('href', '#reasonForImport')
    await summaryLink.click()
    await expect(page.locator('#reasonForImport')).toBeFocused()
    await expect(
      page.locator('input[name="reasonForImport"]:checked')
    ).toHaveCount(0)

    await page.getByRole('link', { name: 'Back' }).click()
    const purposeRow = page.getByRole('listitem').filter({
      has: page.getByText('Purpose', { exact: true })
    })
    await expect(purposeRow).toContainText('Not yet started')
  })

  test('back link returns to the notification hub through a real href', async ({
    page
  }) => {
    const hubUrl = page.url().replace('/about-the-consignment', '')
    const hubPath = new URL(hubUrl).pathname
    const backLink = page.getByRole('link', { name: 'Back', exact: true })
    await expect(backLink).toHaveAttribute('href', hubPath)

    await backLink.click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Purpose has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('error page has no serious or critical axe violations', async ({
    page
  }) => {
    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)

    expect(
      seriousOrCritical,
      `Purpose error state has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})

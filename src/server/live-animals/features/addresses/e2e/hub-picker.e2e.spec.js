import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  startNotification,
  unlockSections,
  values
} from '../../../../../../e2e/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'
import { PARTIES } from '../parties.js'

const rowFor = (page, title) =>
  page.locator('.govuk-summary-list__row', {
    has: page.getByText(title, { exact: true })
  })

const openAddresses = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Roles and addresses' }).click()
  await expect(
    page.getByRole('heading', { name: copy.hub.title })
  ).toBeVisible()
}

const seriousOrCritical = (violations) =>
  violations
    .filter(({ impact }) => ['serious', 'critical'].includes(impact))
    .filter(
      (violation) =>
        !(
          violation.id === 'aria-allowed-attr' &&
          violation.nodes.every((node) =>
            /govuk-(radios|checkboxes)__input/.test(node.html)
          )
        )
    )

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    seriousOrCritical(results.violations),
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('addresses hub and party picker', () => {
  test('renders all five party rows, feature copy and working back link', async ({
    page
  }) => {
    await openAddresses(page)

    await expect(page.getByText(copy.hub.warning)).toBeVisible()
    for (const party of PARTIES) {
      const row = rowFor(page, party.title)
      await expect(row).toContainText(party.hint)
      await expect(row).toContainText(copy.hub.notAddedYet)
      await expect(
        row.getByRole('link', {
          name: `${copy.hub.add} ${party.title.toLowerCase()}`
        })
      ).toBeVisible()
    }

    await expect(
      page.getByRole('button', { name: copy.hub.continueButton })
    ).toBeVisible()
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('each party picker validates, saves the role-specific selection and persists it', async ({
    page
  }) => {
    await openAddresses(page)

    for (const party of PARTIES) {
      const row = rowFor(page, party.title)
      await row.getByRole('link', { name: copy.hub.add }).click()

      await expect(
        page.getByRole('heading', { name: party.title })
      ).toBeVisible()
      await expect(page.getByText(party.hint)).toBeVisible()
      await expect(
        page.getByLabel(copy.picker.search.label)
      ).toHaveAccessibleDescription(copy.picker.search.hint)
      await expect(
        page.getByRole('columnheader', { name: copy.picker.table.name })
      ).toBeVisible()
      await expect(
        page.getByRole('columnheader', { name: copy.picker.table.address })
      ).toBeVisible()
      await expect(
        page.getByRole('columnheader', { name: copy.picker.table.country })
      ).toBeVisible()

      await page
        .getByRole('button', { name: copy.picker.saveAndContinue })
        .click()
      await expect(
        page.locator('.govuk-error-summary').getByRole('link', {
          name: party.error
        })
      ).toBeVisible()

      const selected = values[party.id]
      await page.getByRole('radio', { name: selected.name }).check()
      await page
        .getByRole('button', { name: copy.picker.saveAndContinue })
        .click()
      await expect(
        page.getByRole('heading', { name: copy.hub.title })
      ).toBeVisible()
      await expect(row).toContainText(selected.name)
      await expect(
        row.getByRole('link', { name: copy.hub.change })
      ).toBeVisible()

      await row.getByRole('link', { name: copy.hub.change }).click()
      await expect(
        page.getByText(`${copy.picker.selectedAddressPrefix} ${selected.name}`)
      ).toBeVisible()
      await page.locator('.govuk-back-link').click()
      await expect(
        page.getByRole('heading', { name: copy.hub.title })
      ).toBeVisible()
    }

    await page.getByRole('button', { name: copy.hub.continueButton }).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(
      page.locator('.govuk-task-list__item', {
        hasText: 'Roles and addresses'
      })
    ).toContainText('Completed')
  })

  test('searches the address book, expands details and carries a later-page selection', async ({
    page
  }) => {
    await openAddresses(page)
    const consignor = PARTIES.find(({ id }) => id === 'consignor')
    const row = rowFor(page, consignor.title)
    await row.getByRole('link', { name: copy.hub.add }).click()

    const showingFive = /Showing 5 of \d+ addresses/
    await expect(page.getByText(showingFive)).toBeVisible()
    const danishRow = page.locator('tr', { hasText: 'Danish Meat Export ApS' })
    await danishRow.locator('summary').click()
    await expect(danishRow.locator('.govuk-details__text')).toContainText(
      'Copenhagen'
    )

    await page.getByLabel(copy.picker.search.label).fill('Denmark')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await expect(page.getByText(copy.picker.resultsCaption(2, 2))).toBeVisible()
    await expect(
      page.getByRole('radio', { name: 'Jutland Swine ApS' })
    ).toBeVisible()

    await page.getByLabel(copy.picker.search.label).fill('no such address')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await expect(page.getByText(copy.picker.noMatches)).toBeVisible()

    await page.getByLabel(copy.picker.search.label).fill('')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await page.getByRole('link', { name: 'Page 2' }).click()
    await page.getByRole('link', { name: 'Page 3' }).click()
    await page.getByRole('radio', { name: 'Iberian Swine SA' }).check()
    await page
      .getByRole('button', { name: copy.picker.saveAndContinue })
      .click()

    await expect(row).toContainText('Iberian Swine SA')
    await row.getByRole('link', { name: copy.hub.change }).click()
    await expect(
      page.getByText(`${copy.picker.selectedAddressPrefix} Iberian Swine SA`)
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: 'Iberian Swine SA' })
    ).toHaveCount(0)
    await page
      .getByRole('button', { name: copy.picker.saveAndContinue })
      .click()
    await expect(row).toContainText('Iberian Swine SA')
  })

  test('hub and picker pages have no serious or critical axe violations', async ({
    page
  }) => {
    await openAddresses(page)
    await expectAxeClean(page, 'Addresses hub')

    await rowFor(page, copy.parties.consignor.title)
      .getByRole('link', { name: copy.hub.add })
      .click()
    await expect(
      page.getByRole('button', { name: copy.picker.search.button })
    ).toBeVisible()
    await expectAxeClean(page, 'Address party picker')
  })
})

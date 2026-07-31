import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  startNotification,
  unlockSections,
  values
} from '../../../../../../../../e2e/live-animals-journey.js'
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

const openPartyPicker = async (page, party) => {
  await rowFor(page, party.title)
    .getByRole('link', { name: copy.hub.add })
    .click()
  await expect(page.getByRole('heading', { name: party.title })).toBeVisible()
}

const pickerErrorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message })

test.describe('addresses hub and party picker', () => {
  test.beforeEach(async ({ page }) => {
    await openAddresses(page)
  })

  test('renders all five party rows and feature copy', async ({ page }) => {
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
  })

  test('hub back link returns to the overview', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  for (const party of PARTIES) {
    test(`${party.title} picker renders its role-specific copy and address table`, async ({
      page
    }) => {
      await openPartyPicker(page, party)

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
    })

    test(`${party.title} validation: no selection links to and focuses the first address`, async ({
      page
    }) => {
      await openPartyPicker(page, party)
      await page
        .getByRole('button', { name: copy.picker.saveAndContinue })
        .click()

      const link = pickerErrorLink(page, party.error)
      await expect(link).toBeVisible()
      await link.click()
      await expect(page.getByRole('radio').first()).toBeFocused()
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    })

    test(`${party.title} selection saves and persists`, async ({ page }) => {
      await openPartyPicker(page, party)
      const row = rowFor(page, party.title)
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
      await expect(
        page.getByRole('radio', { name: selected.name })
      ).toBeChecked()
    })
  }

  test('picker expands an address to show its full details', async ({
    page
  }) => {
    const consignor = PARTIES.find(({ id }) => id === 'consignor')
    await openPartyPicker(page, consignor)

    const showingFive = /Showing 5 of \d+ addresses/
    await expect(page.getByText(showingFive)).toBeVisible()
    const danishRow = page.getByRole('row', {
      name: /Danish Meat Export ApS/
    })
    await danishRow.getByText(copy.picker.viewDetails).click()
    await expect(danishRow).toContainText('Copenhagen')
  })

  test('picker search narrows the address book and preserves the query', async ({
    page
  }) => {
    const consignor = PARTIES.find(({ id }) => id === 'consignor')
    await openPartyPicker(page, consignor)

    await page.getByLabel(copy.picker.search.label).fill('Denmark')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await expect(page.getByText(copy.picker.resultsCaption(2, 2))).toBeVisible()
    await expect(
      page.getByRole('radio', { name: 'Jutland Swine ApS' })
    ).toBeVisible()
    await expect(page.getByLabel(copy.picker.search.label)).toHaveValue(
      'Denmark'
    )
  })

  test('picker search with no matches shows its empty state', async ({
    page
  }) => {
    const consignor = PARTIES.find(({ id }) => id === 'consignor')
    await openPartyPicker(page, consignor)

    await page.getByLabel(copy.picker.search.label).fill('no such address')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await expect(page.getByText(copy.picker.noMatches)).toBeVisible()
    await expect(page.getByLabel(copy.picker.search.label)).toHaveValue(
      'no such address'
    )
  })

  test('picker validation after no matches links to and focuses the preserved search', async ({
    page
  }) => {
    const consignor = PARTIES.find(({ id }) => id === 'consignor')
    await openPartyPicker(page, consignor)
    const search = page.getByLabel(copy.picker.search.label)
    await search.fill('no such address')
    await page
      .getByRole('button', { name: copy.picker.search.button, exact: true })
      .click()
    await page
      .getByRole('button', { name: copy.picker.saveAndContinue })
      .click()

    const link = pickerErrorLink(page, consignor.error)
    await expect(link).toBeVisible()
    await link.click()
    await expect(search).toBeFocused()
    await expect(search).toHaveValue('no such address')
  })

  test('picker carries a later-page selection and keeps it selected off-page', async ({
    page
  }) => {
    const consignor = PARTIES.find(({ id }) => id === 'consignor')
    const row = rowFor(page, consignor.title)
    await openPartyPicker(page, consignor)
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

  test('completing every party marks the hub task as completed', async ({
    page
  }) => {
    for (const party of PARTIES) {
      await openPartyPicker(page, party)
      await page.getByRole('radio', { name: values[party.id].name }).check()
      await page
        .getByRole('button', { name: copy.picker.saveAndContinue })
        .click()
    }
    await page.getByRole('button', { name: copy.hub.continueButton }).click()

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(
      page.locator('.govuk-task-list__item', {
        hasText: 'Roles and addresses'
      })
    ).toContainText('Completed')
  })

  test('hub page has no serious or critical axe violations', async ({
    page
  }) => {
    await expectAxeClean(page, 'Addresses hub')
  })

  test('picker page has no serious or critical axe violations', async ({
    page
  }) => {
    await rowFor(page, copy.parties.consignor.title)
      .getByRole('link', { name: copy.hub.add })
      .click()
    await expect(
      page.getByRole('button', { name: copy.picker.search.button })
    ).toBeVisible()
    await expectAxeClean(page, 'Address party picker')
  })
})

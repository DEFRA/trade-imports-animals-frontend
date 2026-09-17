import { expect, test } from '@playwright/test'
import {
  partyPickerName,
  signIn,
  startNotification,
  unlockSections,
  values
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'
import { PARTIES } from '../parties.js'

const NO_MATCH_QUERY = 'no such address'
const LATER_PAGE_ADDRESS = 'Iberian Swine SA'
const CONSIGNOR = PARTIES.find(({ id }) => id === 'consignor')
const ROLES_AND_ADDRESSES = 'Roles and addresses'

const rowFor = (page, title) =>
  page.locator('.govuk-summary-list__row', {
    has: page.getByText(title, { exact: true })
  })

const openAddresses = async (page, species) => {
  await startNotification(page)
  await unlockSections(page, species)
  await page.getByRole('link', { name: ROLES_AND_ADDRESSES }).click()
  await expect(
    page.getByRole('heading', { name: copy.hub.title })
  ).toBeVisible()
}

const openPartyPicker = async (page, party) => {
  await rowFor(page, party.title)
    .getByRole('link', { name: copy.hub.add })
    .click()
  await expect(page.getByRole('heading', { name: party.title })).toBeVisible()
}

const pickerErrorLink = (page, message) =>
  page.getByRole('alert').getByRole('link', { name: message })

const searchAddresses = async (page, query) => {
  await page.getByLabel(copy.picker.search.label).fill(query)
  await page
    .getByRole('button', { name: copy.picker.search.button, exact: true })
    .click()
}

const saveAndContinue = (page) =>
  page
    .getByRole('button', {
      name: sharedCopy.saveActions.saveAndContinue,
      exact: true
    })
    .click()

test.describe('addresses hub', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
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
      page.getByRole('button', {
        name: sharedCopy.saveActions.saveAndContinue,
        exact: true
      })
    ).toBeVisible()
  })

  test('hub back link returns to the overview', async ({ page }) => {
    await page.locator('.govuk-back-link').click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  })

  test('completing every party marks the hub task Complete', async ({
    page
  }) => {
    for (const party of PARTIES) {
      await openPartyPicker(page, party)
      await page
        .getByRole('radio', { name: partyPickerName(values[party.id]) })
        .check()
      await saveAndContinue(page)
    }
    await saveAndContinue(page)

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(
      page.locator('.govuk-task-list__item', {
        hasText: ROLES_AND_ADDRESSES
      })
    ).toContainText(hubCopy.statuses.complete)
  })

  test('hub page has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Addresses hub')
  })
})

// Design release 1 asks every consignment for a CPH number and names the
// commodity codes that escape the question, so the row is the default and its
// absence is the exception. Fish is the sharpest case: it is on no other
// commodity list at all, so if the rule were an allow-list of the commodities
// somebody remembered, fish would be let off.
test.describe('addresses hub — who is asked for a CPH number', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('asks a consignment of fish for a CPH number', async ({ page }) => {
    await openAddresses(page, 'Salmo salar')

    const row = rowFor(page, copy.hub.cph.title)
    await expect(row).toContainText(copy.hub.cph.hint)
    await expect(row).toContainText(copy.hub.notAddedYet)
    await expect(
      row.getByRole('link', {
        name: `${copy.hub.add} ${copy.hub.cph.title.toLowerCase()}`
      })
    ).toBeVisible()
  })

  // Commodity code 0101 is one of the two design release 1 lets off.
  test('does not ask a consignment of horses for a CPH number', async ({
    page
  }) => {
    await openAddresses(page, 'Equus caballus')

    await expect(rowFor(page, copy.hub.cph.title)).toHaveCount(0)
  })
})

test.describe('party picker per role', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
  })

  for (const party of PARTIES) {
    test(`${party.title} picker renders its role-specific copy and address table`, async ({
      page
    }) => {
      await openPartyPicker(page, party)

      // The selector pins placement: the section name is the element directly
      // above the role heading, not text floating elsewhere on the page.
      await expect(
        page.locator('span.govuk-caption-l + h1.govuk-heading-l')
      ).toHaveText(party.title)
      await expect(page.locator('span.govuk-caption-l')).toHaveText(
        copy.picker.caption
      )
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
      await saveAndContinue(page)

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
      const selectedName = partyPickerName(selected)
      await page.getByRole('radio', { name: selectedName }).check()
      await saveAndContinue(page)
      await expect(
        page.getByRole('heading', { name: copy.hub.title })
      ).toBeVisible()
      await expect(row).toContainText(selectedName)
      await expect(
        row.getByRole('link', { name: copy.hub.change })
      ).toBeVisible()
      await row.getByRole('link', { name: copy.hub.change }).click()
      await expect(
        page.getByText(`${copy.picker.selectedAddressPrefix} ${selectedName}`)
      ).toBeVisible()
      await expect(
        page.getByRole('radio', { name: selectedName })
      ).toBeChecked()
    })
  }
})

test.describe('party picker search', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
    await openPartyPicker(page, CONSIGNOR)
  })

  test('picker search narrows the address book and preserves the query', async ({
    page
  }) => {
    await searchAddresses(page, 'Denmark')
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
    await searchAddresses(page, NO_MATCH_QUERY)
    await expect(page.getByText(copy.picker.noMatches)).toBeVisible()
    await expect(page.getByLabel(copy.picker.search.label)).toHaveValue(
      NO_MATCH_QUERY
    )
  })

  test('picker validation after no matches links to and focuses the preserved search', async ({
    page
  }) => {
    const search = page.getByLabel(copy.picker.search.label)
    await searchAddresses(page, NO_MATCH_QUERY)
    await saveAndContinue(page)

    const link = pickerErrorLink(page, CONSIGNOR.error)
    await expect(link).toBeVisible()
    await link.click()
    await expect(search).toBeFocused()
    await expect(search).toHaveValue(NO_MATCH_QUERY)
  })
})

test.describe('party picker details and pagination', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
    await openPartyPicker(page, CONSIGNOR)
  })

  test('picker expands an address to show its full details', async ({
    page
  }) => {
    const showingFive = /Showing 5 of \d+ addresses/
    await expect(page.getByText(showingFive)).toBeVisible()
    const detailedRow = page.getByRole('row', {
      name: /Tech Imports Ltd/
    })
    await detailedRow.getByText(copy.picker.viewDetails).click()
    await expect(detailedRow).toContainText('London')
  })

  test('picker carries a later-page selection and keeps it selected off-page', async ({
    page
  }) => {
    const row = rowFor(page, CONSIGNOR.title)
    await page.getByRole('link', { name: 'Page 2' }).click()
    await page.getByRole('link', { name: 'Page 3' }).click()
    await page.getByRole('radio', { name: LATER_PAGE_ADDRESS }).check()
    await saveAndContinue(page)

    await expect(row).toContainText(LATER_PAGE_ADDRESS)
    await row.getByRole('link', { name: copy.hub.change }).click()
    await expect(
      page.getByText(
        `${copy.picker.selectedAddressPrefix} ${LATER_PAGE_ADDRESS}`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: LATER_PAGE_ADDRESS })
    ).toHaveCount(0)
    await saveAndContinue(page)
    await expect(row).toContainText(LATER_PAGE_ADDRESS)
  })

  test('picker page has no serious or critical axe violations', async ({
    page
  }) => {
    await expect(
      page.getByRole('button', { name: copy.picker.search.button })
    ).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'Address party picker')
  })
})

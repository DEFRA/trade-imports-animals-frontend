import { expect, test } from '@playwright/test'
import {
  addressBookInsetText,
  addressesSection,
  contentWidthOf,
  expectNoSeriousOrCriticalViolations,
  expectSubmittedSearchLook,
  journeyFormOf,
  partyPickerName,
  searchByPressingEnter,
  signIn,
  startNotification,
  unlockSections,
  values
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { copy as hubCopy } from '../../hub/copy/copy.en.js'
import { PAGE_SIZE } from '../../../../../../../services/address-book/index.js'
import { PARTIES } from '../parties.js'

const NO_MATCH_QUERY = 'no such address'
const LATER_PAGE_ADDRESS = 'Iberian Swine SA'
const NOT_IN_THE_BOOK = 'not-in-this-book'
const ADDRESS_BOOK_SIZE = 13
const CONSIGNOR = PARTIES.find(({ id }) => id === 'consignor')
const ROLES_AND_ADDRESSES = 'Roles and addresses'

const PHONE_VIEWPORT = { width: 375, height: 812 }
const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

const expectBackOnTheAddressesPage = async (page) => {
  await expect(
    page.getByRole('heading', { name: copy.hub.title })
  ).toBeVisible()
}

const expectConsignorOffersOnlyItsAddLink = async (page) => {
  await expectBackOnTheAddressesPage(page)
  await expect(
    addressesSection(page, CONSIGNOR.title).getByRole('link')
  ).toHaveText([CONSIGNOR.add])
}

const chosenLinkNames = ({ title }) => [
  `${copy.hub.change} ${title.toLowerCase()}`,
  `${copy.hub.editDetails} ${title.toLowerCase()}`
]

const partySectionTitles = (page) =>
  page.getByRole('main').getByRole('heading', { level: 2 })

const pickEveryParty = async (page) => {
  for (const party of PARTIES) {
    await openPartyPicker(page, party)
    await page
      .getByRole('radio', { name: partyPickerName(values[party.id]) })
      .check()
    await saveAndContinue(page)
  }
}

const openAddresses = async (page, species) => {
  await startNotification(page)
  await unlockSections(page, species)
  await page.getByRole('link', { name: ROLES_AND_ADDRESSES }).click()
  await expectBackOnTheAddressesPage(page)
}

const openPartyPicker = async (page, party) => {
  await page.getByRole('link', { name: party.add, exact: true }).click()
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

const resultsHeading = (page) =>
  page.getByRole('heading', { name: copy.picker.resultsHeading, level: 2 })

const resultsSummary = (page) =>
  resultsHeading(page).locator('xpath=following-sibling::*[1][self::p]')

const postAnIdNotInTheBook = async (page) => {
  await page
    .getByRole('radio')
    .first()
    .evaluate((input, id) => {
      input.value = id
      input.checked = true
    }, NOT_IN_THE_BOOK)
  await saveAndContinue(page)
}

const postAnIdNotInTheBookAfterASearchMatchingNothing = async (page) => {
  const fieldName = await page.getByRole('radio').first().getAttribute('name')
  await searchAddresses(page, NO_MATCH_QUERY)
  await expect(page.getByText(copy.picker.noMatches)).toBeVisible()
  await journeyFormOf(page).evaluate(
    (form, { name, id }) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = id
      form.append(input)
    },
    { name: fieldName, id: NOT_IN_THE_BOOK }
  )
  await saveAndContinue(page)
}

test.describe('addresses hub', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
  })

  test('renders the intro, the warning and a headed section per party with its hint and named add link', async ({
    page
  }) => {
    await expect(page.getByText(copy.hub.intro, { exact: true })).toBeVisible()
    await expect(page.locator('.govuk-warning-text__text')).toHaveText(
      `Warning ${copy.hub.warning}`
    )
    await expect(partySectionTitles(page)).toHaveText(
      PARTIES.map(({ title }) => title)
    )
    for (const party of PARTIES) {
      const section = addressesSection(page, party.title)
      await expect(section.locator('.govuk-hint')).toHaveText(party.hint)
      await expect(section.getByRole('link')).toHaveText([party.add])
      await expect(section.getByRole('link')).toHaveAccessibleName(party.add)
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
    await pickEveryParty(page)
    await saveAndContinue(page)

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
    await expect(
      page.locator('.govuk-task-list__item', {
        hasText: ROLES_AND_ADDRESSES
      })
    ).toContainText(hubCopy.statuses.complete)
  })

  test('shows each chosen party in its section as the bold name, its address lines and the country, with Change and Edit details naming the party', async ({
    page
  }) => {
    await pickEveryParty(page)

    for (const party of PARTIES) {
      const section = addressesSection(page, party.title)
      await expect(section.locator('.govuk-inset-text strong')).toHaveText(
        partyPickerName(values[party.id])
      )
      const [change, editDetails] = chosenLinkNames(party)
      await expect(section.getByRole('link')).toHaveText([change, editDetails])
      await expect(
        section.getByRole('link', { name: copy.hub.change })
      ).toHaveAccessibleName(change)
      await expect(
        section.getByRole('link', { name: copy.hub.editDetails })
      ).toHaveAccessibleName(editDetails)
    }
    await expect(
      addressesSection(page, CONSIGNOR.title).locator('.govuk-inset-text')
    ).toHaveText(addressBookInsetText(values.consignor), {
      useInnerText: true
    })
  })

  test('following the consignor add link opens the picker headed Consignor', async ({
    page
  }) => {
    await openPartyPicker(page, CONSIGNOR)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Consignor', exact: true })
    ).toBeVisible()
    await expect(page).toHaveTitle(
      `Consignor - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('hub page has no serious or critical axe violations empty and complete, at desktop and phone width', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Addresses empty')
    await page.setViewportSize(PHONE_VIEWPORT)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Addresses empty on a phone'
    )

    await page.setViewportSize(DESKTOP_VIEWPORT)
    await pickEveryParty(page)
    await expectNoSeriousOrCriticalViolations(page, 'Addresses complete')
    await page.setViewportSize(PHONE_VIEWPORT)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Addresses complete on a phone'
    )
  })
})

test.describe('addresses hub without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
  })

  test('renders its sections and opens the consignor picker from the add link', async ({
    page
  }) => {
    await expect(partySectionTitles(page)).toHaveText(
      PARTIES.map(({ title }) => title)
    )

    await openPartyPicker(page, CONSIGNOR)
  })
})

test.describe('addresses hub — who is asked for a CPH number', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('asks a consignment of fish for a CPH number', async ({ page }) => {
    await openAddresses(page, 'Salmo salar')

    const section = addressesSection(page, copy.hub.cph.title)
    await expect(section.locator('.govuk-hint')).toHaveText(copy.hub.cph.hint)
    await expect(section.getByRole('link')).toHaveText([copy.hub.cph.add])
  })

  test('does not ask a consignment of horses for a CPH number', async ({
    page
  }) => {
    await openAddresses(page, 'Equus caballus')

    await expect(partySectionTitles(page)).toHaveText(
      PARTIES.map(({ title }) => title)
    )
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

    test(`${party.title} picker offers no add-address control in stub mode`, async ({
      page
    }) => {
      await openPartyPicker(page, party)

      await expect(
        page.getByRole('link', { name: copy.picker.addNewAddress })
      ).toHaveCount(0)
      await expect(
        page.getByRole('button', { name: copy.picker.addNewAddress })
      ).toHaveCount(0)
    })

    test(`${party.title} selection saves and persists`, async ({ page }) => {
      await openPartyPicker(page, party)
      const section = addressesSection(page, party.title)
      const selected = values[party.id]
      const selectedName = partyPickerName(selected)
      await page.getByRole('radio', { name: selectedName }).check()
      await saveAndContinue(page)
      await expectBackOnTheAddressesPage(page)
      await expect(section.locator('.govuk-inset-text strong')).toHaveText(
        selectedName
      )
      await expect(section.getByRole('link')).toHaveText(chosenLinkNames(party))
      await section.getByRole('link', { name: copy.hub.change }).click()
      await expect(
        page.getByText(`${copy.picker.selectedAddressPrefix} ${selectedName}`)
      ).toBeVisible()
      await expect(
        page.getByRole('radio', { name: selectedName })
      ).toBeChecked()
    })
  }
})

test.describe('party picker layout', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
    await openPartyPicker(page, CONSIGNOR)
  })

  test('picker puts the results heading after the search box, with the count straight under it', async ({
    page
  }) => {
    const searchBox = await page
      .getByLabel(copy.picker.search.label)
      .boundingBox()
    const headingTop = (await resultsHeading(page).boundingBox()).y

    expect(headingTop).toBeGreaterThan(searchBox.y + searchBox.height)
    await expect(resultsSummary(page)).toHaveText(
      copy.picker.resultsCount(PAGE_SIZE, ADDRESS_BOOK_SIZE)
    )
  })

  test('picker offers its addresses as one group named by the results heading', async ({
    page
  }) => {
    const group = page.getByRole('group', { name: copy.picker.resultsHeading })

    await expect(group.getByRole('radio')).toHaveCount(PAGE_SIZE)
    await expect(page.getByRole('radio')).toHaveCount(PAGE_SIZE)
  })

  test('picker shows the no-matches message in the place of the count after a search that finds nothing', async ({
    page
  }) => {
    await searchAddresses(page, NO_MATCH_QUERY)

    await expect(resultsSummary(page)).toHaveText(copy.picker.noMatches)
  })
})

test.describe('party picker save', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
    await openPartyPicker(page, CONSIGNOR)
  })

  test('saving with nothing ticked returns to the addresses page with the consignor section offering only its add link', async ({
    page
  }) => {
    await saveAndContinue(page)

    await expectConsignorOffersOnlyItsAddLink(page)
  })

  test('saving with nothing ticked after a search that matched nothing returns to the addresses page with the consignor section offering only its add link', async ({
    page
  }) => {
    await searchAddresses(page, NO_MATCH_QUERY)
    await saveAndContinue(page)

    await expectConsignorOffersOnlyItsAddLink(page)
  })

  test('an address that is not in the book is refused, linking to and focusing the first address while the search stays', async ({
    page
  }) => {
    await searchAddresses(page, 'Denmark')
    await postAnIdNotInTheBook(page)

    const link = pickerErrorLink(page, CONSIGNOR.error)
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByRole('radio').first()).toBeFocused()
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByLabel(copy.picker.search.label)).toHaveValue(
      'Denmark'
    )
  })

  test('an address that is not in the book after a search that matched nothing is refused, linking to and focusing the search box, which keeps the term', async ({
    page
  }) => {
    await postAnIdNotInTheBookAfterASearchMatchingNothing(page)

    const link = pickerErrorLink(page, CONSIGNOR.error)
    await expect(link).toBeVisible()
    await link.click()
    const searchBox = page.getByLabel(copy.picker.search.label)
    await expect(searchBox).toBeFocused()
    await expect(searchBox).toHaveValue(NO_MATCH_QUERY)
  })
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
    await expect(resultsSummary(page)).toHaveText(
      copy.picker.resultsCount(2, 2)
    )
    await expect(
      page.getByRole('radio', { name: 'Jutland Swine ApS' })
    ).toBeVisible()
    await expect(page.getByLabel(copy.picker.search.label)).toHaveValue(
      'Denmark'
    )
  })

  test('clearing the search and searching with nothing entered lists the whole book again, paged as before', async ({
    page
  }) => {
    await searchAddresses(page, 'Denmark')
    await expect(resultsSummary(page)).toHaveText(
      copy.picker.resultsCount(2, 2)
    )

    await searchAddresses(page, '')

    await expect(resultsSummary(page)).toHaveText(
      copy.picker.resultsCount(PAGE_SIZE, ADDRESS_BOOK_SIZE)
    )
    await expect(page.getByRole('radio')).toHaveCount(PAGE_SIZE)
    await expect(page.getByRole('link', { name: 'Page 2' })).toBeVisible()
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

  test('picker search box is medium-labelled, hinted, half the column wide and joined to a blue icon button', async ({
    page
  }) => {
    const columnWidth = await contentWidthOf(journeyFormOf(page))

    await expectSubmittedSearchLook(page, {
      search: copy.picker.search,
      expectedWidth: columnWidth / 2
    })
  })

  test('picker has no serious or critical axe violations empty, searched and with no matches', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Address picker')
    await searchAddresses(page, 'Denmark')
    await expectNoSeriousOrCriticalViolations(page, 'Address picker searched')
    await searchAddresses(page, NO_MATCH_QUERY)
    await expectNoSeriousOrCriticalViolations(
      page,
      'Address picker with no matches'
    )
  })

  test('picker has no serious or critical axe violations once an address not in the book is refused', async ({
    page
  }) => {
    await postAnIdNotInTheBook(page)
    await expect(pickerErrorLink(page, CONSIGNOR.error)).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Address picker refused')
  })
})

test.describe('party picker search without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openAddresses(page)
    await openPartyPicker(page, CONSIGNOR)
  })

  test('pressing Enter in the search box narrows the address book on the server', async ({
    page
  }) => {
    await searchByPressingEnter(page, {
      search: copy.picker.search,
      term: 'Denmark'
    })

    await expect(resultsSummary(page)).toHaveText(
      copy.picker.resultsCount(2, 2)
    )
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
    await expect(resultsSummary(page)).toHaveText(
      copy.picker.resultsCount(PAGE_SIZE, ADDRESS_BOOK_SIZE)
    )
    const detailedRow = page.getByRole('row', {
      name: /Tech Imports Ltd/
    })
    await detailedRow.getByText(copy.picker.viewDetails).click()
    await expect(detailedRow).toContainText('London')
  })

  test('picker carries a later-page selection and keeps it selected off-page', async ({
    page
  }) => {
    const consignorSection = addressesSection(page, CONSIGNOR.title)
    await page.getByRole('link', { name: 'Page 2' }).click()
    await page.getByRole('link', { name: 'Page 3' }).click()
    await page.getByRole('radio', { name: LATER_PAGE_ADDRESS }).check()
    await saveAndContinue(page)

    await expect(consignorSection).toContainText(LATER_PAGE_ADDRESS)
    await consignorSection.getByRole('link', { name: copy.hub.change }).click()
    await expect(
      page.getByText(
        `${copy.picker.selectedAddressPrefix} ${LATER_PAGE_ADDRESS}`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: LATER_PAGE_ADDRESS })
    ).toHaveCount(0)
    await saveAndContinue(page)
    await expect(consignorSection).toContainText(LATER_PAGE_ADDRESS)
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

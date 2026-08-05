import { expect, test } from '@playwright/test'

import { axeViolations } from '../../axe.e2e-helper.js'
import { CANNED_CONSIGNORS } from '../../../../../services/address-book/canned-consignors.js'
import { copy } from '../copy/copy.en.js'

const pageCopy = copy.consignorPicker
const createCopy = copy.consignorCreate
const pickerUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-select$/.test(
    url.pathname
  )
const createUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-create$/.test(
    url.pathname
  )
const confirmationUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/consignor-confirmation$/.test(
    url.pathname
  )
const tradersUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/traders-addresses$/.test(
    url.pathname
  )

const [firstCanned] = CANNED_CONSIGNORS

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtPicker = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await rowByTitle(page, 'Commodity')
    .getByRole('link', { name: 'Commodity', exact: true })
    .click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Enter commodity code').fill('06011010')
  // Without client JavaScript both search groups render, so scope the submit.
  await page
    .getByRole('group', { name: /^Search commodities/ })
    .getByRole('button', { name: 'Search', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Add Albuca bracteata to commodity 06011010'
    })
    .click()
  await page.getByRole('button', { name: 'Save and continue' }).click()

  const notificationUrl = page.url().replace(/\/commodity-summary$/, '')
  await page.goto(notificationUrl)
  await rowByTitle(page, 'Traders')
    .getByRole('link', { name: 'Traders', exact: true })
    .click()
  await page
    .getByRole('link', {
      name: copy.tradersAddresses.consignor.addLink,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(pickerUrl)

  return { notificationUrl, pageUrl: page.url() }
}

const radioFor = (page, name) =>
  page.getByRole('radio', {
    name: `${pageCopy.selectRowPrefix} ${name}`,
    exact: true
  })

const saveAndContinue = (page) =>
  page
    .getByRole('button', { name: pageCopy.saveAndContinue, exact: true })
    .click()

const addConsignor = (page) =>
  page.getByRole('button', { name: pageCopy.addNew, exact: true }).click()

const paginationNav = (page) =>
  page.getByRole('navigation', { name: 'Pagination', exact: true })

const goToPage = (page, number) =>
  paginationNav(page)
    .getByRole('link', { name: `Page ${number}` })
    .click()

const searchFor = async (page, term) => {
  await page.getByLabel(pageCopy.search.label, { exact: true }).fill(term)
  await page
    .getByRole('button', { name: pageCopy.search.button, exact: true })
    .click()
}

const captionFor = (page, shown, total) =>
  page.getByText(pageCopy.resultsCaption(shown, total), { exact: true })

const enteredValues = {
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorAddressLine2: 'Building B',
  consignorAddressLine3: 'Export Quarter',
  consignorCity: 'Lyon',
  consignorPostcode: '69001',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

const fillCreateForm = async (page) => {
  for (const [field, value] of Object.entries(enteredValues)) {
    const control = page.getByLabel(createCopy.fields[field].label, {
      exact: true
    })
    if (field === 'consignorCountry') await control.selectOption(value)
    else await control.fill(value)
  }
}

const expectAxeClean = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Consignor picker ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products consignor picker', () => {
  test.beforeEach(async ({ page }) => {
    await startAtPicker(page)
  })

  test('opens from traders-addresses and lists the first page of five canned consignors as selectable rows', async ({
    page
  }) => {
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: pageCopy.pageTitle,
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByText(pageCopy.description, { exact: true })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(5)
    for (const record of CANNED_CONSIGNORS.slice(0, 5)) {
      await expect(radioFor(page, record.name)).not.toBeChecked()
    }
    await expect(captionFor(page, 5, CANNED_CONSIGNORS.length)).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'France', exact: true }).first()
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'FR', exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: pageCopy.addNew, exact: true })
    ).toBeVisible()
  })

  test('selecting a consignor and saving returns to traders-addresses showing that name', async ({
    page
  }) => {
    await radioFor(page, firstCanned.name).check()
    await saveAndContinue(page)

    await expect(page).toHaveURL(tradersUrl)
    await expect(
      page.getByText(firstCanned.name, { exact: true })
    ).toBeVisible()
  })

  test('the saved pick reloads into the consignor form as all nine values, telephone and email included', async ({
    page
  }) => {
    const pickerPageUrl = page.url()
    await radioFor(page, firstCanned.name).check()
    await saveAndContinue(page)
    await expect(page).toHaveURL(tradersUrl)

    await page.goto(
      pickerPageUrl.replace(/\/consignor-select$/, '/consignor-create?change=1')
    )
    await expect(page).toHaveURL(createUrl)
    for (const [field, value] of Object.entries({
      consignorName: firstCanned.name,
      consignorAddressLine1: firstCanned.address.addressLine1,
      consignorAddressLine2: firstCanned.address.addressLine2,
      consignorAddressLine3: firstCanned.address.addressLine3,
      consignorCity: firstCanned.address.city,
      consignorPostcode: firstCanned.address.postcode,
      consignorTelephone: firstCanned.telephone,
      consignorCountry: firstCanned.address.country,
      consignorEmail: firstCanned.email
    })) {
      await expect(
        page.getByLabel(createCopy.fields[field].label, { exact: true })
      ).toHaveValue(value)
    }
  })

  test('the saved pick re-opens the picker with that row checked', async ({
    page
  }) => {
    const pickerPageUrl = page.url()
    await radioFor(page, firstCanned.name).check()
    await saveAndContinue(page)
    await page.goto(pickerPageUrl)

    await expect(radioFor(page, firstCanned.name)).toBeChecked()
    await expect(
      page.getByText(`${pageCopy.selectedPrefix} ${firstCanned.name}`, {
        exact: true
      })
    ).toBeVisible()
  })

  test('saving with nothing selected re-renders the error and its summary link focuses the radio group', async ({
    page
  }) => {
    await saveAndContinue(page)

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('There is a problem')
    const link = alert.getByRole('link', {
      name: pageCopy.errors.required,
      exact: true
    })
    await expect(link).toHaveAttribute('href', '#party')
    await link.click()
    await expect(page.locator('#party')).toBeFocused()
    await expect(page.locator('#party-error')).toContainText(
      pageCopy.errors.required
    )
  })

  test('adds a consignor through the create form and returns to the picker with it pre-selected', async ({
    page
  }) => {
    await addConsignor(page)
    await expect(page).toHaveURL(createUrl)
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute(
      'href',
      /^\/plant-products\/notifications\/[^/]+\/consignor-select$/
    )
    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(pickerUrl)

    await addConsignor(page)
    await fillCreateForm(page)
    await page
      .getByRole('button', { name: createCopy.continueLabel, exact: true })
      .click()
    await expect(page).toHaveURL(confirmationUrl)
    await page
      .getByRole('button', {
        name: copy.consignorConfirmation.continueLabel,
        exact: true
      })
      .click()

    await expect(page).toHaveURL(pickerUrl)
    await expect(radioFor(page, enteredValues.consignorName)).toBeChecked()
    await saveAndContinue(page)
    await expect(page).toHaveURL(tradersUrl)
    await expect(
      page.getByText(enteredValues.consignorName, { exact: true })
    ).toBeVisible()
  })

  test('searching narrows the table to the matching records and reports the count', async ({
    page
  }) => {
    await searchFor(page, 'GB-')

    await expect(page.getByRole('radio')).toHaveCount(2)
    for (const record of CANNED_CONSIGNORS.slice(10)) {
      await expect(radioFor(page, record.name)).toBeVisible()
    }
    await expect(radioFor(page, firstCanned.name)).toHaveCount(0)
    await expect(captionFor(page, 2, 2)).toBeVisible()
    await expect(paginationNav(page)).toHaveCount(0)
    await expectAxeClean(page, 'search results')
  })

  test('a search that matches nothing replaces the table with the no-matches line', async ({
    page
  }) => {
    await searchFor(page, 'no such trader')

    await expect(
      page.getByText(pageCopy.noMatches, { exact: true })
    ).toBeVisible()
    await expect(page.getByText(pageCopy.noSaved, { exact: true })).toHaveCount(
      0
    )
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByRole('radio')).toHaveCount(0)
    await expectAxeClean(page, 'no matches')
  })

  test('pages through the twelve canned records five at a time', async ({
    page
  }) => {
    await expect(
      paginationNav(page).getByRole('link', { name: /^Page \d+$/ })
    ).toHaveCount(3)
    await expect(
      paginationNav(page).getByRole('link', { name: 'Page 1' })
    ).toHaveAttribute('aria-current', 'page')

    await goToPage(page, 2)
    await expect(captionFor(page, 5, CANNED_CONSIGNORS.length)).toBeVisible()
    for (const record of CANNED_CONSIGNORS.slice(5, 10)) {
      await expect(radioFor(page, record.name)).toBeVisible()
    }
    await expect(
      paginationNav(page).getByRole('link', { name: 'Page 2' })
    ).toHaveAttribute('aria-current', 'page')

    await goToPage(page, 3)
    await expect(captionFor(page, 2, CANNED_CONSIGNORS.length)).toBeVisible()
    for (const record of CANNED_CONSIGNORS.slice(10)) {
      await expect(radioFor(page, record.name)).toBeVisible()
    }
    await expect(
      paginationNav(page).getByRole('link', { name: 'Next page' })
    ).toHaveCount(0)
  })

  test('initial and error renders have no serious or critical axe violations', async ({
    page
  }) => {
    await expectAxeClean(page, 'initial render')
    await saveAndContinue(page)
    await expect(page.getByRole('alert')).toBeVisible()
    await expectAxeClean(page, 'error render')
  })
})

test.describe('plant-products consignor picker without client JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('completes the pick-and-save path', async ({ page }) => {
    await startAtPicker(page)
    await radioFor(page, firstCanned.name).check()
    await saveAndContinue(page)

    await expect(page).toHaveURL(tradersUrl)
    await expect(
      page.getByText(firstCanned.name, { exact: true })
    ).toBeVisible()
  })

  // With no client JavaScript a checked radio cannot reach a link's href, so
  // the choice reaches the server on the search submit; from there the hidden
  // field and every pagination link are what carry it across the pages.
  test('saves the record chosen on page 2 from a page-1 render it does not appear on', async ({
    page
  }) => {
    const offPage = CANNED_CONSIGNORS[6]
    await startAtPicker(page)

    await goToPage(page, 2)
    await radioFor(page, offPage.name).check()
    await searchFor(page, '')

    const selectedInset = page.getByText(
      `${pageCopy.selectedPrefix} ${offPage.name}`,
      { exact: true }
    )
    await expect(selectedInset).toBeVisible()
    await expect(radioFor(page, offPage.name)).toHaveCount(0)

    await goToPage(page, 3)
    await goToPage(page, 1)
    await expect(selectedInset).toBeVisible()
    await expect(radioFor(page, offPage.name)).toHaveCount(0)

    await saveAndContinue(page)
    await expect(page).toHaveURL(tradersUrl)
    await expect(page.getByText(offPage.name, { exact: true })).toBeVisible()
  })
})

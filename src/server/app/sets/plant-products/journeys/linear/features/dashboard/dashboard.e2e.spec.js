import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { copy } from './copy/copy.en.js'

const referenceFromUrl = (page) =>
  new URL(page.url()).pathname.split('/').at(-2)

const startDraft = async (page) => {
  await page.goto('/plant-products')
  const createRequest = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/plant-products/notifications'
  )
  await page.getByRole('button', { name: copy.createButton }).click()
  await createRequest
  const reference = referenceFromUrl(page)
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/GBN-PP-[^/]+\/import-type$/.test(
      url.pathname
    )
  )
  return reference
}

const enterPlantImport = async (page) => {
  const reference = await startDraft(page)
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  return reference
}

const createWithOrigin = async (page, countryCode) => {
  const reference = await enterPlantImport(page)
  await page.getByLabel('Country of origin').selectOption(countryCode)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.goto('/plant-products')
  return reference
}

const dateAt = (offset) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offset)
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear())
  }
}

const createWithOriginAndArrival = async (page, countryCode, arrivalOffset) => {
  const reference = await enterPlantImport(page)
  await page.getByLabel('Country of origin').selectOption(countryCode)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.goto(
    `/plant-products/notifications/${reference}/transport-before-bip`
  )

  await page.getByLabel('Entry border control post').selectOption('GBLHR4PP')
  await page
    .getByLabel('Means of transport to the BCP', { exact: true })
    .selectOption('ROAD_VEHICLE')
  await page.getByLabel('Transport identification').fill('AB12 CDE')
  await page.getByLabel('Transport document reference').fill('CMR-123')
  const arrival = dateAt(arrivalOffset)
  const arrivalGroup = page.getByRole('group', {
    name: 'Estimated arrival date at the BCP'
  })
  await arrivalGroup.getByLabel('Day', { exact: true }).fill(arrival.day)
  await arrivalGroup.getByLabel('Month', { exact: true }).fill(arrival.month)
  await arrivalGroup.getByLabel('Year', { exact: true }).fill(arrival.year)
  const timeGroup = page.getByRole('group', {
    name: 'Time of estimated arrival'
  })
  await timeGroup.getByLabel('Hour', { exact: true }).fill('14')
  await timeGroup.getByLabel('Minutes', { exact: true }).fill('50')
  await page
    .getByRole('radio', {
      name: 'No',
      exact: true
    })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.goto('/plant-products')
  return { reference, arrival }
}

const expectErrorFocus = async (page, message, id) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const link = alert.getByRole('link', { name: message, exact: true })
  await expect(link).toHaveAttribute('href', `#${id}`)
  await link.click()
  await expect(page.locator(`#${id}`)).toBeFocused()
}

const expectNoSeriousOrCriticalViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )
  expect(
    seriousOrCritical,
    `Serious/critical accessibility violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products dashboard', () => {
  test('serves both set dashboards and keeps the unowned root redirect', async ({
    page
  }) => {
    await page.goto('/plant-products')

    await expect(page).toHaveURL('/plant-products')
    await expect(
      page.getByRole('heading', { name: copy.heading })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.createButton })
    ).toBeVisible()
    await expect(page.getByLabel(copy.filters.keywords.label)).toBeVisible()
    await expect(page.getByLabel(copy.filters.status.label)).toBeVisible()
    await expect(page.getByLabel(copy.filters.country.label)).toBeVisible()
    await expect(page.getByText(copy.search.noResults)).toBeVisible()
    await expect(page.locator('#countryOfOrigin optgroup')).toHaveCount(2)
    await expect(
      page.locator('#countryOfOrigin optgroup').first()
    ).toHaveAttribute('label', copy.filters.country.groups.uk)
    await expect(
      page.locator('#countryOfOrigin optgroup').last()
    ).toHaveAttribute('label', copy.filters.country.groups.countries)
    await expect(
      page.getByLabel(copy.filters.country.label).getByRole('option', {
        name: 'Republic of Ireland'
      })
    ).toHaveAttribute('value', 'IE')

    await page.goto('/live-animals')
    await expect(page).toHaveURL('/live-animals')
    await expect(
      page.getByRole('heading', { name: 'Import notification service' })
    ).toBeVisible()

    const root = await page.request.get('/', { maxRedirects: 0 })
    expect(root.status()).toBe(302)
    expect(root.headers().location).toBe('/live-animals')
  })

  test('creates a plant journey at the plant import-type page', async ({
    page
  }) => {
    const reference = await startDraft(page)
    await page.goto('/plant-products')

    const row = page.getByRole('row', { name: new RegExp(reference) })
    await expect(row).toContainText(copy.statuses.draft)
    await expect(
      row.getByRole('link', {
        name: `${copy.actions.continue} ${copy.actions.forNotification(reference)}`,
        exact: true
      })
    ).toHaveAttribute('href', `/plant-products/notifications/${reference}`)
    await expect(page.getByText(copy.pagination.results.single)).toBeVisible()
  })

  test('search, no-match and Clear round-trip only inside the plant prefix', async ({
    page
  }) => {
    const firstReference = await startDraft(page)
    const secondReference = await startDraft(page)
    await page.goto('/plant-products')

    await page.getByLabel(copy.filters.keywords.label).fill(firstReference)
    await page.getByRole('button', { name: copy.filters.search }).click()
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/plant-products' &&
        url.searchParams.get('referenceNumber') === firstReference
    )
    await expect(
      page.getByRole('row', { name: new RegExp(firstReference) })
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(secondReference) })
    ).toHaveCount(0)

    await page.getByLabel(copy.filters.keywords.label).fill('GBN-PP-26-MISSING')
    await page.getByRole('button', { name: copy.filters.search }).click()
    await expect(page.getByText(copy.pagination.results.none)).toBeVisible()
    await expect(page.getByText(copy.search.noResults)).toBeVisible()

    await page.getByRole('link', { name: copy.filters.clear }).click()
    await expect(page).toHaveURL('/plant-products')
    await expect(
      page.getByRole('row', { name: new RegExp(firstReference) })
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(secondReference) })
    ).toBeVisible()
  })

  test('status and country filters narrow rows and combine', async ({
    page
  }) => {
    const irelandReference = await createWithOrigin(page, 'IE')
    const franceReference = await createWithOrigin(page, 'FR')
    await page.goto('/plant-products')

    await page.getByLabel(copy.filters.status.label).selectOption('draft')
    await page.getByLabel(copy.filters.country.label).selectOption('IE')
    await page.getByRole('button', { name: copy.filters.search }).click()

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/plant-products' &&
        url.searchParams.get('status') === 'draft' &&
        url.searchParams.get('countryOfOrigin') === 'IE'
    )
    await expect(
      page.getByRole('row', { name: new RegExp(irelandReference) })
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(franceReference) })
    ).toHaveCount(0)
  })

  test('arrival range filters use inclusive bounds', async ({ page }) => {
    const matching = await createWithOriginAndArrival(page, 'IE', 1)
    const later = await createWithOriginAndArrival(page, 'FR', 3)
    await page.goto('/plant-products')

    const start = page.getByRole('group', {
      name: copy.filters.startDate.label
    })
    const end = page.getByRole('group', { name: copy.filters.endDate.label })
    for (const group of [start, end]) {
      await group
        .getByLabel(copy.filters.date.day, { exact: true })
        .fill(matching.arrival.day)
      await group
        .getByLabel(copy.filters.date.month, { exact: true })
        .fill(matching.arrival.month)
      await group
        .getByLabel(copy.filters.date.year, { exact: true })
        .fill(matching.arrival.year)
    }
    await page.getByRole('button', { name: copy.filters.search }).click()

    await expect(
      page.getByRole('row', { name: new RegExp(matching.reference) })
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(later.reference) })
    ).toHaveCount(0)
  })

  test('pagination and sort preserve filters under the plant prefix', async ({
    page
  }) => {
    test.slow()
    for (let index = 0; index < 26; index += 1) {
      await startDraft(page)
    }
    await page.goto('/plant-products')
    await page.getByLabel(copy.filters.status.label).selectOption('draft')
    await page.getByRole('button', { name: copy.filters.search }).click()

    await page.getByRole('link', { name: copy.pagination.next }).click()
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/plant-products' &&
        url.searchParams.get('page') === '2' &&
        url.searchParams.get('status') === 'draft'
    )
    await page.getByLabel(copy.sort.label).selectOption('createdAt,asc')
    await page.getByRole('button', { name: copy.sort.apply }).click()
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/plant-products' &&
        url.searchParams.get('page') === '2' &&
        url.searchParams.get('status') === 'draft' &&
        url.searchParams.get('sort') === 'createdAt,asc'
    )
  })

  test('canonical validation messages preserve raw values and focus controls', async ({
    page
  }) => {
    await page.goto('/plant-products')

    const keywords = 'x'.repeat(256)
    await page.getByLabel(copy.filters.keywords.label).fill(keywords)
    await page.getByRole('button', { name: copy.filters.search }).click()
    await expectErrorFocus(page, copy.errors.keywordsMax, 'referenceNumber')
    await expect(page.getByLabel(copy.filters.keywords.label)).toHaveValue(
      keywords
    )

    await page.getByLabel(copy.filters.keywords.label).clear()
    const start = page.getByRole('group', {
      name: copy.filters.startDate.label
    })
    await start.getByLabel(copy.filters.date.day, { exact: true }).fill('31')
    await start.getByLabel(copy.filters.date.month, { exact: true }).fill('2')
    await start.getByLabel(copy.filters.date.year, { exact: true }).fill('2026')
    await page.getByRole('button', { name: copy.filters.search }).click()
    await expectErrorFocus(page, copy.errors.startDateReal, 'startDate-day')
    await expect(
      start.getByLabel(copy.filters.date.day, { exact: true })
    ).toHaveValue('31')

    await start.getByLabel(copy.filters.date.day, { exact: true }).fill('9')
    await start.getByLabel(copy.filters.date.month, { exact: true }).fill('3')
    const end = page.getByRole('group', { name: copy.filters.endDate.label })
    await end.getByLabel(copy.filters.date.day, { exact: true }).fill('8')
    await end.getByLabel(copy.filters.date.month, { exact: true }).fill('3')
    await end.getByLabel(copy.filters.date.year, { exact: true }).fill('2026')
    await page.getByRole('button', { name: copy.filters.search }).click()
    await expectErrorFocus(page, copy.errors.startBeforeEnd, 'startDate-day')
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    const firstReference = await startDraft(page)
    const secondReference = await startDraft(page)
    await page.goto('/plant-products')

    for (const heading of Object.values(copy.table.headings)) {
      await expect(
        page.getByRole('columnheader', { name: heading, exact: true })
      ).toBeVisible()
    }
    for (const reference of [firstReference, secondReference]) {
      await expect(
        page.getByRole('link', {
          name: `${copy.actions.continue} ${copy.actions.forNotification(reference)}`,
          exact: true
        })
      ).toBeVisible()
    }
    await expectNoSeriousOrCriticalViolations(page)
  })

  test('validation error state passes axe', async ({ page }) => {
    await page.goto('/plant-products')
    await page.getByLabel(copy.filters.keywords.label).fill('x'.repeat(256))
    await page.getByRole('button', { name: copy.filters.search }).click()
    await expect(page.getByRole('alert')).toContainText(copy.errors.keywordsMax)
    await expectNoSeriousOrCriticalViolations(page)
  })
})

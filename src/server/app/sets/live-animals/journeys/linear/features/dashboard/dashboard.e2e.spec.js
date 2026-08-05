import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  completeAnswerSections,
  journeyIdFromPage,
  startNotification,
  values
} from '../../../../../../../../../e2e/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'
const PAGE_SIZE = 20
const SEEDED_NOTIFICATIONS = PAGE_SIZE + 1

const submitNotification = async (page) => {
  await completeAnswerSections(page)
  await page.getByRole('link', { name: 'Check and submit' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page
    .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
    .check()
  await page.getByRole('button', { name: 'Continue' }).click()
}

const actionFor = (page, role, action, reference) =>
  page.getByRole(role, { name: `${action} ${copy.actionHidden(reference)}` })

const startTwoNotifications = async (page) => {
  await startNotification(page)
  const firstReference = journeyIdFromPage(page)
  await startNotification(page)
  const secondReference = journeyIdFromPage(page)
  await page.goto('/live-animals')
  return { firstReference, secondReference }
}

const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

test.describe('dashboard feature — empty state and start', () => {
  test('renders the empty notification list and default sort', async ({
    page
  }) => {
    await page.goto('/live-animals')

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    await expect(page.getByText(copy.body)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.notificationsHeading })
    ).toBeVisible()
    await expect(page.getByText(copy.pagination.results.none)).toBeVisible()
    await expect(page.getByText(copy.emptyText)).toBeVisible()
    await expect(page.getByLabel(copy.sort.label)).toHaveValue(
      'arrivalDate,desc'
    )
  })

  test('starts a new notification at the import-type filter', async ({
    page
  }) => {
    await page.goto('/live-animals')

    await page.getByRole('button', { name: copy.startButton }).click()

    await expect(
      page.getByRole('heading', { name: 'What are you importing?' })
    ).toBeVisible()
    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+\/import-type$/.test(url.pathname)
    )
  })
})

test.describe('dashboard feature — notification rows and actions', () => {
  test('submitted notification renders its row data and actions', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await submitNotification(page)
    const reference = journeyIdFromPage(page)

    await page.goto('/live-animals')

    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()
    await expect(page.getByText('Cow', { exact: true })).toBeVisible()
    await expect(page.getByText('France', { exact: true })).toBeVisible()
    await expect(page.getByText('12 Dec 2026', { exact: true })).toBeVisible()
    await expect(
      page.getByText(values.consignor.name, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(values.consignee.name, { exact: true })
    ).toBeVisible()
    await expect(page.getByText('Submitted', { exact: true })).toBeVisible()
    await expect(actionFor(page, 'link', 'View', reference)).toBeVisible()
    await expect(actionFor(page, 'button', 'Amend', reference)).toBeVisible()
    await expect(
      actionFor(page, 'button', 'Copy as new', reference)
    ).toBeVisible()
    await expect(actionFor(page, 'link', 'Delete', reference)).toBeVisible()
  })

  test('draft notification renders only its available actions', async ({
    page
  }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)

    await page.goto('/live-animals')

    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    await expect(actionFor(page, 'link', 'Resume', reference)).toBeVisible()
    await expect(
      actionFor(page, 'button', 'Copy as new', reference)
    ).toBeVisible()
    await expect(actionFor(page, 'link', 'Delete', reference)).toBeVisible()
    await expect(actionFor(page, 'link', 'View', reference)).toHaveCount(0)
    await expect(actionFor(page, 'button', 'Amend', reference)).toHaveCount(0)
  })

  test('amending notification renders resume and cancel-amend actions', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await submitNotification(page)
    const reference = journeyIdFromPage(page)
    await page.goto('/live-animals')
    await actionFor(page, 'button', 'Amend', reference).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto('/live-animals')

    await expect(page.getByText('Amending', { exact: true })).toBeVisible()
    await expect(actionFor(page, 'link', 'Resume', reference)).toBeVisible()
    await expect(
      actionFor(page, 'link', 'Cancel amendment', reference)
    ).toBeVisible()
  })
})

test.describe('dashboard feature — reference search', () => {
  test('reference search finds an exact notification and preserves sort', async ({
    page
  }) => {
    const { firstReference, secondReference } =
      await startTwoNotifications(page)

    await page
      .getByLabel(copy.sort.label)
      .selectOption(CREATED_AT_ASCENDING_SORT)
    await page.getByRole('button', { name: copy.sort.update }).click()
    await page.getByLabel(copy.search.label).fill(firstReference)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(page.getByLabel(copy.sort.label)).toHaveValue(
      CREATED_AT_ASCENDING_SORT
    )
    await expect(page.getByLabel(copy.search.label)).toHaveValue(firstReference)
    await expect(page).toHaveURL(
      `/live-animals?sort=createdAt%2Casc&referenceNumber=${firstReference}`
    )
    await expect(
      page.getByRole('heading', { name: firstReference, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: secondReference, exact: true })
    ).toHaveCount(0)
  })

  test('reference search with no match preserves the query and renders its empty state', async ({
    page
  }) => {
    await startNotification(page)
    const existingReference = journeyIdFromPage(page)
    const missingReference = 'GBN-AG-26-ZZZZZZ'
    await page.goto('/live-animals')

    await page.getByLabel(copy.search.label).fill(missingReference)
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(page.getByLabel(copy.search.label)).toHaveValue(
      missingReference
    )
    await expect(page.getByText(copy.search.noResults)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: existingReference, exact: true })
    ).toHaveCount(0)
  })

  test('empty reference search clears the filter and restores the full list', async ({
    page
  }) => {
    const { firstReference, secondReference } =
      await startTwoNotifications(page)
    await page
      .getByLabel(copy.sort.label)
      .selectOption(CREATED_AT_ASCENDING_SORT)
    await page.getByRole('button', { name: copy.sort.update }).click()
    await page.getByLabel(copy.search.label).fill(firstReference)
    await page.getByRole('button', { name: copy.search.button }).click()

    await page.getByLabel(copy.search.label).clear()
    await page.getByRole('button', { name: copy.search.button }).click()

    await expect(page).toHaveURL(
      '/live-animals?sort=createdAt%2Casc&referenceNumber='
    )
    await expect(page.getByLabel(copy.search.label)).toHaveValue('')
    await expect(page.getByLabel(copy.sort.label)).toHaveValue(
      CREATED_AT_ASCENDING_SORT
    )
    await expect(
      page.getByRole('heading', { name: firstReference, exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: secondReference, exact: true })
    ).toBeVisible()
  })
})

test.describe('dashboard feature — pagination', () => {
  test('paginates at the 20-row boundary and preserves the selected sort', async ({
    page
  }) => {
    test.slow()
    await page.goto('/live-animals')
    for (let index = 0; index < SEEDED_NOTIFICATIONS; index += 1) {
      await page.getByRole('button', { name: copy.startButton }).click()
      await page.goto('/live-animals')
    }

    await expect(
      page.getByRole('link', { name: /^Delete notification / })
    ).toHaveCount(PAGE_SIZE)
    await expect(
      page.getByText(
        copy.pagination.results.many(1, PAGE_SIZE, SEEDED_NOTIFICATIONS)
      )
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.pagination.previous })
    ).toHaveCount(0)

    await page.getByRole('link', { name: copy.pagination.next }).click()

    await expect(page).toHaveURL('/live-animals?page=2')
    await expect(
      page.getByRole('link', { name: /^Delete notification / })
    ).toHaveCount(1)
    await expect(
      page.getByText(
        copy.pagination.results.oneOf(
          SEEDED_NOTIFICATIONS,
          SEEDED_NOTIFICATIONS
        )
      )
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: copy.pagination.next })
    ).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: copy.pagination.previous })
    ).toBeVisible()

    await page
      .getByLabel(copy.sort.label)
      .selectOption(CREATED_AT_ASCENDING_SORT)
    await page.getByRole('button', { name: copy.sort.update }).click()

    await expect(page).toHaveURL('/live-animals?page=2&sort=createdAt%2Casc')
    await expect(page.getByLabel(copy.sort.label)).toHaveValue(
      CREATED_AT_ASCENDING_SORT
    )
    await expect(
      page.getByRole('link', { name: /^Delete notification / })
    ).toHaveCount(1)
  })
})

test.describe('dashboard feature — accessibility', () => {
  test('empty dashboard has no serious or critical axe violations', async ({
    page
  }) => {
    await page.goto('/live-animals')

    await expectNoSeriousOrCriticalViolations(page, 'Empty dashboard')
  })

  test('dashboard with a notification card has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto('/live-animals')

    await expectNoSeriousOrCriticalViolations(
      page,
      'Dashboard with notification cards'
    )
  })
})

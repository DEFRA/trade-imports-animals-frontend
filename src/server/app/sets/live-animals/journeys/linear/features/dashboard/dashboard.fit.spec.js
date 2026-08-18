import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  ARRIVAL_DATE_IN_WINDOW_DISPLAY,
  completeAnswerSections,
  journeyIdFromPage,
  startNotification,
  values
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy } from './copy/copy.en.js'

const CREATED_AT_ASCENDING_SORT = 'createdAt,asc'
const COPY_AS_NEW = 'Copy as new'
const PAGE_SIZE = 20
const SEEDED_NOTIFICATIONS = PAGE_SIZE + 1
const DESKTOP_BREAKPOINT_WIDTH = 769

const submitNotification = async (page) => {
  await completeAnswerSections(page)
  await page.getByRole('link', { name: 'Check and submit' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page
    .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
    .check()
  await page.getByRole('button', { name: 'Continue' }).click()
}

const stageSubmittedNotification = async (page) => {
  await startNotification(page)
  await submitNotification(page)
  const reference = journeyIdFromPage(page)
  await page.goto('/')
  return reference
}

const actionFor = (page, role, action, reference) =>
  page.getByRole(role, { name: `${action} ${copy.actionHidden(reference)}` })

const overflowReport = () => {
  const root = document.documentElement
  const offenders = [...document.querySelectorAll('body *')]
    .map((element) => ({
      selector: `${element.tagName.toLowerCase()}.${element.className || '(no class)'}`,
      right: Math.round(element.getBoundingClientRect().right)
    }))
    .filter(({ right }) => right > root.clientWidth)
    .slice(0, 10)
  return { overflow: root.scrollWidth - root.clientWidth, offenders }
}

const expectNoHorizontalOverflow = async (page) => {
  const { overflow, offenders } = await page.evaluate(overflowReport)

  expect(
    overflow,
    `Dashboard overflows at ${page.viewportSize().width}px: ${JSON.stringify(offenders)}`
  ).toBeLessThanOrEqual(0)
}

const startTwoNotifications = async (page) => {
  await startNotification(page)
  const firstReference = journeyIdFromPage(page)
  await startNotification(page)
  const secondReference = journeyIdFromPage(page)
  await page.goto('/')
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
    await page.goto('/')

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

  test('starts a new notification at the origin page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: copy.startButton }).click()

    await expect(
      page.getByRole('heading', { name: 'Origin of the import' })
    ).toBeVisible()
    await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)
  })
})

test.describe('dashboard feature — notification rows and actions', () => {
  test('submitted notification renders its row data and actions', async ({
    page
  }) => {
    test.slow()
    const reference = await stageSubmittedNotification(page)

    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()
    await expect(page.getByText('Cow', { exact: true })).toBeVisible()
    await expect(page.getByText('France', { exact: true })).toBeVisible()
    await expect(
      page.getByText(ARRIVAL_DATE_IN_WINDOW_DISPLAY, { exact: true })
    ).toBeVisible()
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
      actionFor(page, 'button', COPY_AS_NEW, reference)
    ).toBeVisible()
    await expect(actionFor(page, 'link', 'Delete', reference)).toBeVisible()
  })

  test('dashboard does not overflow horizontally at desktop', async ({
    page
  }) => {
    test.slow()
    const reference = await stageSubmittedNotification(page)
    await expect(
      page.getByRole('heading', { name: reference, exact: true })
    ).toBeVisible()

    await expectNoHorizontalOverflow(page)

    await page.setViewportSize({
      width: DESKTOP_BREAKPOINT_WIDTH,
      height: 900
    })
    await expectNoHorizontalOverflow(page)
  })

  test('draft notification renders only its available actions', async ({
    page
  }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)

    await page.goto('/')

    await expect(page.getByText('Draft', { exact: true })).toBeVisible()
    await expect(actionFor(page, 'link', 'Resume', reference)).toBeVisible()
    await expect(
      actionFor(page, 'button', COPY_AS_NEW, reference)
    ).toBeVisible()
    await expect(actionFor(page, 'link', 'Delete', reference)).toBeVisible()
    await expect(actionFor(page, 'link', 'View', reference)).toHaveCount(0)
    await expect(actionFor(page, 'button', 'Amend', reference)).toHaveCount(0)
  })

  test('copy as new renders in the same typeface as its neighbouring link actions', async ({
    page
  }) => {
    await startNotification(page)
    const reference = journeyIdFromPage(page)

    await page.goto('/')

    const fontFamilyOf = (locator) =>
      locator.evaluate((element) => getComputedStyle(element).fontFamily)
    const copyAsNew = actionFor(page, 'button', COPY_AS_NEW, reference)
    const deleteAction = actionFor(page, 'link', 'Delete', reference)
    const deleteFontFamily = await fontFamilyOf(deleteAction)

    await expect.poll(() => fontFamilyOf(copyAsNew)).toBe(deleteFontFamily)
    await expect.poll(() => fontFamilyOf(copyAsNew)).toMatch(/GDS Transport/)
  })

  test('amending notification renders resume and cancel-amend actions', async ({
    page
  }) => {
    test.slow()
    const reference = await stageSubmittedNotification(page)
    await actionFor(page, 'button', 'Amend', reference).click()
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

    await page.goto('/')

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
      `/?sort=createdAt%2Casc&referenceNumber=${firstReference}`
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
    await page.goto('/')

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

    await expect(page).toHaveURL('/?sort=createdAt%2Casc&referenceNumber=')
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
    await page.goto('/')
    for (let index = 0; index < SEEDED_NOTIFICATIONS; index += 1) {
      await page.getByRole('button', { name: copy.startButton }).click()
      await page.goto('/')
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

    await expect(page).toHaveURL('/?page=2')
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

    await expect(page).toHaveURL('/?page=2&sort=createdAt%2Casc')
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
    await page.goto('/')

    await expectNoSeriousOrCriticalViolations(page, 'Empty dashboard')
  })

  test('dashboard with a notification card has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)
    await page.goto('/')

    await expectNoSeriousOrCriticalViolations(
      page,
      'Dashboard with notification cards'
    )
  })
})

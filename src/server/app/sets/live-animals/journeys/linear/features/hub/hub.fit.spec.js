import { expect, test } from '@playwright/test'
import {
  BASE,
  BOS_TAURUS,
  PHONE_VIEWPORT,
  answerArrivalDetails,
  answerCountryOfOrigin,
  completeAnswerSections,
  expectNoHorizontalOverflow,
  expectNoSeriousOrCriticalViolations,
  openReviewFromHub,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../fit/live-animals-journey.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as transportCopy } from '../transport/copy/copy.en.js'
import { copy } from './copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'

const taskRow = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const groupTaskList = (page, groupId) =>
  page
    .locator('ul.govuk-task-list')
    .filter({ has: page.locator(`[id^="${groupId}-"]`) })

const taskRowTitles = (list) => list.locator('.govuk-task-list__link')

const ANIMALS = '25'
const PACKAGES = '5'
const TOTAL_BOX = '.app-commodity-total'
const SECTION_HEADING = 'h3.govuk-heading-m'
const SAVE_AND_CONTINUE = 'Save and continue'
const CANNOT_START_STATUS = '.govuk-task-list__status--cannot-start-yet'
const TASK_ROW_HINT = '.govuk-task-list__hint'

const selectCommodityAndOpenDetails = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: copy.rows.commodities.title }).click()
  await selectSpecies(page, [BOS_TAURUS])
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expectHub(page)
  await page
    .getByRole('link', {
      name: copy.rows.consignmentDetails.title,
      exact: true
    })
    .click()
  await expect(
    page.getByRole('heading', {
      name: commoditiesCopy.consignmentDetails.title
    })
  ).toBeVisible()
}

const expectHub = (page) =>
  expect(page.getByRole('heading', { name: copy.title })).toBeVisible()

const openHubWithCommodityTotals = async (page) => {
  await selectCommodityAndOpenDetails(page)
  await page.getByLabel('Number of animals').fill(ANIMALS)
  await page.getByLabel('Number of packages (when required)').fill(PACKAGES)
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
  await expectHub(page)
}

const openHubOwingTheCommodityNumbers = async (page) => {
  await selectCommodityAndOpenDetails(page)
  await page
    .getByRole('link', { name: sharedCopy.saveActions.cancelAndReturnToHub })
    .click()
  await expectHub(page)
}

const expectTotalBoxes = async (page, animals, packages) => {
  const boxes = page.locator(TOTAL_BOX)
  await expect(boxes).toHaveCount(2)
  await expect(boxes.nth(0).locator('> *')).toHaveText([
    animals,
    copy.commodityTotals.animalsLabel,
    copy.commodityTotals.animalsCaption
  ])
  await expect(boxes.nth(1).locator('> *')).toHaveText([
    packages,
    copy.commodityTotals.packagesLabel,
    copy.commodityTotals.packagesCaption
  ])
}

test.describe('hub feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders navigation copy and the task statuses of a newly entered journey', async ({
    page
  }) => {
    await startNotification(page)

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
    for (const caption of Object.values(copy.groups)) {
      await expect(page.getByRole('heading', { name: caption })).toBeVisible()
    }

    const origin = taskRow(page, copy.rows.origin.title)
    await expect(
      origin.getByRole('link', { name: copy.rows.origin.title })
    ).toBeVisible()
    await expect(origin).toContainText(copy.statuses.complete)

    const commodities = taskRow(page, copy.rows.commodities.title)
    await expect(commodities).toContainText(copy.statuses.toDo)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toBeVisible()

    const consignmentDetails = taskRow(page, copy.rows.consignmentDetails.title)
    await expect(consignmentDetails).toContainText(copy.statuses.toDo)
    await expect(
      consignmentDetails.getByRole('link', {
        name: copy.rows.consignmentDetails.title
      })
    ).toBeVisible()
  })

  test('the task list is headed "Notification tasklist" over the six numbered design sections in order, with nothing after them', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('heading', { level: 2, name: copy.taskListHeading })
    ).toBeVisible()

    await expect(page.locator(SECTION_HEADING)).toHaveText(
      Object.values(copy.groups)
    )
  })

  test('every task the hub shows opens before a commodity is chosen', async ({
    page
  }) => {
    await startNotification(page)

    const openFromTheStart = [
      copy.rows.origin,
      copy.rows.commodities,
      copy.rows.importReason,
      copy.rows.consignmentDetails,
      copy.rows.additionalDetails,
      copy.rows.arrivalDetails,
      copy.rows.transporter,
      copy.rows.addresses,
      copy.rows.contact,
      copy.rows.documents
    ]

    for (const row of openFromTheStart) {
      await expect(
        taskRow(page, row.title).getByRole('link', { name: row.title }),
        `"${row.title}" has no way in`
      ).toBeVisible()
    }

    await expect(page.locator(CANNOT_START_STATUS)).toHaveCount(0)
  })

  test('a task with nothing before it opens and saves before a commodity is chosen', async ({
    page
  }) => {
    await startNotification(page)

    await page
      .getByRole('link', { name: copy.rows.arrivalDetails.title, exact: true })
      .click()

    await expect(
      page.getByRole('heading', { name: transportCopy.portOfEntry.title })
    ).toBeVisible()

    await answerArrivalDetails(page)

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

  test('the commodity details task opens the commodity question while nothing is chosen', async ({
    page
  }) => {
    await startNotification(page)

    await page
      .getByRole('link', {
        name: copy.rows.consignmentDetails.title,
        exact: true
      })
      .click()

    await expect(
      page.getByRole('heading', { name: commoditiesCopy.search.title })
    ).toBeVisible()
  })

  test('overview: when no commodity is chosen, the animal identification row is absent', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      taskRow(page, copy.rows.animalIdentification.title)
    ).toHaveCount(0)
    await expect(
      page.getByRole('heading', {
        name: copy.groups['description-of-the-goods']
      })
    ).toBeVisible()
  })

  test('overview: when a commodity carrying identifiers is chosen, the animal identification row appears', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    const identification = taskRow(page, copy.rows.animalIdentification.title)
    await expect(identification).toHaveCount(1)
    await expect(
      identification.getByRole('link', {
        name: copy.rows.animalIdentification.title
      })
    ).toBeVisible()
  })

  test('overview: the second section lists identification above the additional details', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    await expect(
      taskRowTitles(groupTaskList(page, 'description-of-the-goods'))
    ).toHaveText([
      copy.rows.consignmentDetails.title,
      copy.rows.animalIdentification.title,
      copy.rows.additionalDetails.title
    ])
  })

  test('overview: only the roles and addresses row carries a hint', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    const hints = page.locator(TASK_ROW_HINT)
    await expect(hints).toHaveCount(1)
    await expect(hints).toHaveText(copy.rows.addresses.hint)
    await expect(
      taskRow(page, copy.rows.addresses.title).locator(TASK_ROW_HINT)
    ).toHaveText(
      'Consignor or Exporter, Consignee, Importer and Place of Destination'
    )
  })

  test('overview has no back link and returns to the dashboard', async ({
    page
  }) => {
    await startNotification(page)

    await expect(page.locator('.govuk-back-link')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.returnToDashboard })
    ).toHaveAttribute('href', BASE)

    await page.getByRole('button', { name: copy.returnToDashboard }).click()

    await expect(page).toHaveURL(BASE)
  })
})

test.describe('hub feature — the Commodity details row', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('stands as its own task, linking to the consignment-details page', async ({
    page
  }) => {
    await openHubOwingTheCommodityNumbers(page)

    const details = taskRow(page, copy.rows.consignmentDetails.title)
    await expect(
      details.getByRole('link', { name: copy.rows.consignmentDetails.title })
    ).toHaveAttribute('href', /\/consignment-details$/)
    await expect(details).toContainText(copy.statuses.toDo)
    await expect(taskRow(page, copy.rows.commodities.title)).toContainText(
      copy.statuses.complete
    )

    await expectNoSeriousOrCriticalViolations(page, 'Partly-complete hub')
  })

  test('reads Complete once the numbers are saved, leaving the other rows alone', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    await expect(
      taskRow(page, copy.rows.consignmentDetails.title)
    ).toContainText(copy.statuses.complete)
    await expect(taskRow(page, copy.rows.commodities.title)).toContainText(
      copy.statuses.complete
    )
    await expect(
      taskRow(page, copy.rows.additionalDetails.title)
    ).toContainText(copy.statuses.toDo)
  })
})

test.describe('hub feature — the Review and submit button', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('opens the review from a notification with only the origin answered', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('button', { name: copy.reviewAndSubmit })
    ).toHaveAttribute('href', /\/notifications\/[^/]+\/notification-view$/)

    await openReviewFromHub(page)

    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title })
    ).toBeVisible()
  })

  test('leads the secondary Return to dashboard button, with no task shut as Cannot start yet', async ({
    page
  }) => {
    await startNotification(page)

    await expect(page.locator('.govuk-button-group .govuk-button')).toHaveText([
      copy.reviewAndSubmit,
      copy.returnToDashboard
    ])
    await expect(
      page.getByRole('button', { name: copy.reviewAndSubmit })
    ).not.toHaveClass(/govuk-button--secondary/)
    await expect(page.locator(CANNOT_START_STATUS)).toHaveCount(0)
  })

  test('opens the review once every answer section is complete', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    await openReviewFromHub(page)

    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title })
    ).toBeVisible()
  })

  test('a single-species notification reaches the review with no identifier saved', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page, { skipAnimalIdentification: true })

    const identification = taskRow(page, copy.rows.animalIdentification.title)
    await expect(identification).toContainText(copy.statuses.complete)

    await openReviewFromHub(page)

    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title })
    ).toBeVisible()
  })

  test('hub with nothing but the origin answered has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('heading', { name: copy.commodityTotals.heading })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Hub')
  })
})

test.describe('hub feature — commodity totals', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('both boxes read 0 before a commodity is added', async ({ page }) => {
    await startNotification(page)

    await expect(
      page.getByRole('heading', {
        level: 2,
        name: copy.commodityTotals.heading
      })
    ).toBeVisible()

    await expectTotalBoxes(page, '0', '0')
  })

  test('each box reads as the number, then the label, then the caption', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    await expectTotalBoxes(page, ANIMALS, PACKAGES)

    await expect(
      page.getByRole('heading', {
        level: 2,
        name: copy.commodityTotals.heading
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: copy.commodityTotals.animalsLabel
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        level: 3,
        name: copy.commodityTotals.packagesLabel
      })
    ).toBeVisible()

    const captions = await page
      .locator(`${TOTAL_BOX}__caption`)
      .evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent,
          height: element.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(element).lineHeight)
        }))
      )

    expect(captions).toHaveLength(2)
    for (const { text, height, lineHeight } of captions) {
      expect(
        height,
        `"${text}" wraps to more than two lines`
      ).toBeLessThanOrEqual(lineHeight * 2 + 1)
    }
  })

  test('the boxes hold no link and no button', async ({ page }) => {
    await openHubWithCommodityTotals(page)

    const boxes = page.locator(TOTAL_BOX)
    await expect(boxes).toHaveCount(2)
    await expect(boxes.getByRole('link')).toHaveCount(0)
    await expect(boxes.getByRole('button')).toHaveCount(0)
  })

  test('the boxes stack with no horizontal overflow on a small screen', async ({
    page
  }) => {
    await page.setViewportSize(PHONE_VIEWPORT)
    await openHubWithCommodityTotals(page)

    const boxes = page.locator(TOTAL_BOX)
    await expect(boxes).toHaveCount(2)
    const first = await boxes.nth(0).boundingBox()
    const second = await boxes.nth(1).boundingBox()

    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)

    await expectNoHorizontalOverflow(page.locator('html'), 'Hub')
  })

  test('hub showing commodity totals has no serious or critical axe violations', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    await expect(
      page.getByRole('heading', { name: copy.commodityTotals.heading })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Hub with commodity totals')
  })
})

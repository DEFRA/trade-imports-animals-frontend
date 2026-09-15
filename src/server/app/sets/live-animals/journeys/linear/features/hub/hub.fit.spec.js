import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  answerArrivalDetails,
  answerCountryOfOrigin,
  completeAnswerSections,
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

const seriousOrCritical = (violations) =>
  violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))

const expectAxeClean = async (page, name) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    seriousOrCritical(results.violations),
    `${name} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const ANIMALS = '25'
const PACKAGES = '5'
const TOTAL_BOX = '.app-commodity-total'
const SAVE_AND_CONTINUE = 'Save and continue'

const selectCommodityAndOpenDetails = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: copy.rows.commodities.title }).click()
  await selectSpecies(page, ['Bos taurus'])
  await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
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

// The commodity is chosen but its numbers are not entered: the hub state the
// "Commodity details" row exists to report.
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
    await expect(origin).toContainText(copy.statuses.completed)

    const commodities = taskRow(page, copy.rows.commodities.title)
    await expect(commodities).toContainText(copy.statuses.notYetStarted)
    await expect(
      commodities.getByRole('link', { name: copy.rows.commodities.title })
    ).toBeVisible()

    // Nothing has been chosen to give details about yet, and the row is still
    // a link: the details page sends the trader on to the commodity question
    // rather than the hub refusing to open it.
    const consignmentDetails = taskRow(page, copy.rows.consignmentDetails.title)
    await expect(consignmentDetails).toContainText(copy.statuses.notYetStarted)
    await expect(
      consignmentDetails.getByRole('link', {
        name: copy.rows.consignmentDetails.title
      })
    ).toBeVisible()

    const review = taskRow(page, copy.rows.review.title)
    await expect(review).toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.rows.review.title })
    ).toHaveCount(0)
  })

  // Design release 1 lets a trader start any task on the notification in any
  // order, so every task the hub shows is a link before a commodity is
  // chosen — the arrival details, the documents and the contact address
  // included, none of which wait on an answer given anywhere else. Origin is
  // the journey's entry page and the entry guard holds a notification there
  // until it is answered, so the earliest hub a trader reaches already has
  // origin Completed; this is that hub.
  test('every task the hub shows but Check and submit opens before a commodity is chosen', async ({
    page
  }) => {
    await startNotification(page)

    // The eleventh row is Check and submit; identification and transit
    // countries do not apply to a notification with nothing chosen.
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

    await expect(page.getByText(copy.statuses.cannotStartYet)).toHaveCount(1)
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

    // Saving carries the trader on through the section, and with no commodity
    // chosen the rest of the transport section is out of scope — transit
    // countries and transporters both sit after the commodity selection in
    // flow order, so `nextInSection` finds no further page and returns the
    // hub. Landing back on Overview is the answer; pin it so a later change to
    // the gate chain cannot silently send the trader to a page whose questions
    // are out of scope.
    await answerArrivalDetails(page)

    await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
  })

  // Nothing has been chosen to give numbers for, so the consignment-details
  // page asks the commodity question rather than drawing an empty table.
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

  // Design release 1 inserts the identification task only once the chosen
  // commodities need identifiers, so before anything is chosen the hub has
  // nothing to say about identification and leaves the row off.
  test('overview: when no commodity is chosen, the animal identification row is absent', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      taskRow(page, copy.rows.animalIdentification.title)
    ).toHaveCount(0)
    await expect(
      page.getByRole('heading', { name: copy.groups['commodity-details'] })
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

  test('back link and return button navigate to the dashboard', async ({
    page
  }) => {
    await startNotification(page)

    await expect(
      page.getByRole('button', { name: copy.returnToDashboard })
    ).toHaveAttribute('href', '/')
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute('href', '/')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL('/')
  })
})

// Design release 1 gives the commodity details a task of their own, first
// under the second section, so the hub says whether the numbers have been
// entered rather than folding them into "What are you importing?".
test.describe('hub feature — the Commodity details row', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('stands as its own task, linking to the consignment-details page', async ({
    page
  }) => {
    // The hub links straight to the details page now, so that page carries
    // the return controls a trader needs to stop and leave.
    await openHubOwingTheCommodityNumbers(page)

    const details = taskRow(page, copy.rows.consignmentDetails.title)
    await expect(
      details.getByRole('link', { name: copy.rows.consignmentDetails.title })
    ).toHaveAttribute('href', /\/consignment-details$/)
    await expect(details).toContainText(copy.statuses.notYetStarted)
    await expect(taskRow(page, copy.rows.commodities.title)).toContainText(
      copy.statuses.completed
    )

    await expectAxeClean(page, 'Partly-complete hub')
  })

  test('reads Completed once the numbers are saved, leaving the other rows alone', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    await expect(
      taskRow(page, copy.rows.consignmentDetails.title)
    ).toContainText(copy.statuses.completed)
    await expect(taskRow(page, copy.rows.commodities.title)).toContainText(
      copy.statuses.completed
    )
    await expect(
      taskRow(page, copy.rows.additionalDetails.title)
    ).toContainText(copy.statuses.notYetStarted)
  })
})

test.describe('hub feature — review readiness', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('completed answers unlock Check and submit and open the review', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page)

    const review = taskRow(page, copy.rows.review.title)
    await expect(review).not.toContainText(copy.statuses.cannotStartYet)
    await expect(
      review.getByRole('link', { name: copy.rows.review.title })
    ).toHaveAttribute('href', /\/notifications\/[^/]+\/notification-view$/)

    await review.getByRole('link', { name: copy.rows.review.title }).click()

    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title })
    ).toBeVisible()
  })

  // Design release 1: "Animal identifiers are optional unless multiple species
  // are selected." A single-species consignment reaches the review page with
  // no identifier saved; what is outstanding is chased after submission.
  test('a single-species notification unlocks the review with no identifier saved', async ({
    page
  }) => {
    test.slow()
    await startNotification(page)
    await completeAnswerSections(page, { skipAnimalIdentification: true })

    const identification = taskRow(page, copy.rows.animalIdentification.title)
    await expect(identification).toContainText(copy.statuses.completed)

    const review = taskRow(page, copy.rows.review.title)
    await expect(review).not.toContainText(copy.statuses.cannotStartYet)

    await review.getByRole('link', { name: copy.rows.review.title }).click()

    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title })
    ).toBeVisible()
  })

  test('blocked review hub has no serious or critical axe violations', async ({
    page
  }) => {
    await startNotification(page)

    // The commodity summary shows from the first visit, so this run covers the
    // zero-total panels as well as the task list with Check and submit shut.
    await expect(
      page.getByRole('heading', { name: copy.commodityTotals.heading })
    ).toBeVisible()

    await expectAxeClean(page, 'Hub')
  })
})

test.describe('hub feature — commodity totals', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  // Design release 1 shows the summary from the first visit to the hub, with
  // both totals reading zero before any commodity line has been added.
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

  test('the boxes are static panels styled from govuk design tokens', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    const boxes = page.locator(TOTAL_BOX)
    await expect(boxes).toHaveCount(2)
    await expect(boxes.getByRole('link')).toHaveCount(0)
    await expect(boxes.getByRole('button')).toHaveCount(0)

    const box = boxes.first()

    const styles = await box.evaluate((panel) => {
      const value = panel.querySelector('.app-commodity-total__value')
      const label = panel.querySelector('.app-commodity-total__label')
      const caption = panel.querySelector('.app-commodity-total__caption')
      return {
        background: getComputedStyle(panel).backgroundColor,
        valueColour: getComputedStyle(value).color,
        valueFontSize: getComputedStyle(value).fontSize,
        valueFontWeight: getComputedStyle(value).fontWeight,
        labelColour: getComputedStyle(label).color,
        labelFontSize: getComputedStyle(label).fontSize,
        labelFontWeight: getComputedStyle(label).fontWeight,
        labelMarginTop: getComputedStyle(label).marginTop,
        captionFontSize: getComputedStyle(caption).fontSize,
        captionColour: getComputedStyle(caption).color
      }
    })

    expect(styles).toEqual({
      background: 'rgb(243, 243, 243)',
      valueColour: 'rgb(29, 112, 184)',
      valueFontSize: '48px',
      valueFontWeight: '700',
      labelColour: 'rgb(29, 112, 184)',
      labelFontSize: '24px',
      labelFontWeight: '700',
      labelMarginTop: '0px',
      captionFontSize: '19px',
      captionColour: 'rgb(11, 12, 12)'
    })
  })

  test('the boxes stack with no horizontal overflow on a small screen', async ({
    page
  }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await openHubWithCommodityTotals(page)

    const boxes = page.locator(TOTAL_BOX)
    await expect(boxes).toHaveCount(2)
    const first = await boxes.nth(0).boundingBox()
    const second = await boxes.nth(1).boundingBox()

    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )

    expect(horizontalOverflow).toBeLessThanOrEqual(0)
  })

  test('hub showing commodity totals has no serious or critical axe violations', async ({
    page
  }) => {
    await openHubWithCommodityTotals(page)

    await expect(
      page.getByRole('heading', { name: copy.commodityTotals.heading })
    ).toBeVisible()

    await expectAxeClean(page, 'Hub with commodity totals')
  })
})

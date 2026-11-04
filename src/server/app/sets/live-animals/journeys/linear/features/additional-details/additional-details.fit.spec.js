import { expect, test } from '@playwright/test'
import {
  BOS_TAURUS,
  EQUUS_CABALUS,
  FELIS_CATUS,
  answerCountryOfOrigin,
  expectNoSeriousOrCriticalViolations,
  expectOverview,
  journeyUrl,
  urlUnderBase,
  saveAndContinue,
  saveAndReturnToHub,
  selectSpecies,
  signIn,
  startNotification
} from '../../../../../../../../../fit/live-animals-journey.js'
import * as certification from '../../../../../../services/certification-purposes/index.js'
import { validatorDefaults } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const SAVED_NOTIFICATION_URL = urlUnderBase('/notifications/[^/]+')

const startAtAdditionalDetails = async (page, chosenSpecies = BOS_TAURUS) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, [chosenSpecies])
  await saveAndContinue(page).click()
  await expectOverview(page)
  await page.getByRole('link', { name: 'Commodity details' }).click()
  await page.getByLabel('Number of animals').fill('1')
  await page.getByLabel('Number of packages (when required)').fill('1')
  await saveAndContinue(page).click()
  await page.goto(journeyUrl(page, 'additional-details'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const answerUnweanedAndTamperCertificationOutOfList = async (page) => {
  const certified = page.getByRole('group', { name: copy.certified.legend })
  const unweaned = page.getByRole('group', { name: copy.unweaned.legend })
  await unweaned.getByRole('radio', { name: copy.unweaned.no }).check()
  await certified
    .getByRole('radio')
    .first()
    .evaluate((input) => {
      input.value = 'not-a-real-purpose'
      input.checked = true
    })
  return { certified, unweaned }
}

const clickCertificationErrorAndExpectRefusalKeepingUnweanedAnswer = async (
  page,
  { certified, unweaned }
) => {
  const certificationError = page
    .getByRole('alert')
    .getByRole('link', { name: validatorDefaults.oneOf })
  await expect(certificationError).toBeVisible()
  await certificationError.click()
  await expect(certified.getByRole('radio').first()).toBeFocused()
  await expect(certified.getByRole('radio', { checked: true })).toHaveCount(0)
  await expect(
    unweaned.getByRole('radio', { name: copy.unweaned.no })
  ).toBeChecked()
}

const expectUnweanedQuestionVisible = async (page) => {
  const unweaned = page.getByRole('group', { name: copy.unweaned.legend })
  await expect(unweaned).toContainText(copy.unweaned.hint)
  await expect(
    unweaned.getByRole('radio', { name: copy.unweaned.yes })
  ).toBeVisible()
  await expect(
    unweaned.getByRole('radio', { name: copy.unweaned.no })
  ).toBeVisible()
}

const saveSlaughterAndUnweanedNoThenReopen = async (page, detailsUrl) => {
  await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
  await page.getByRole('radio', { name: copy.unweaned.no }).check()
  await saveAndContinue(page).click()

  await expect(page).toHaveURL(SAVED_NOTIFICATION_URL)
  await page.goto(detailsUrl)
}

const expectSlaughterAndUnweanedNoChecked = async (page) => {
  await expect(
    page.getByRole('radio', { name: 'Slaughter', exact: true })
  ).toBeChecked()
  await expect(
    page.getByRole('radio', { name: copy.unweaned.no })
  ).toBeChecked()
}

test.describe('additional-details feature — rendering', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtAdditionalDetails(page)
  })

  test('renders service-backed certification options and conditional copy', async ({
    page
  }) => {
    const certified = page.getByRole('group', { name: copy.certified.legend })
    await expect(certified).toContainText(copy.certified.hint)
    const renderedValues = await certified
      .getByRole('radio')
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedValues).toEqual(
      certification.certificationPurposes().map(({ value }) => value)
    )
    for (const option of certification.certificationPurposes()) {
      await expect(
        certified.getByRole('radio', { name: option.text, exact: true })
      ).toBeVisible()
    }

    await expectUnweanedQuestionVisible(page)
  })

  test('sets both question legends at the medium size', async ({ page }) => {
    await expect(
      page.getByRole('group', { name: copy.certified.legend }).locator('legend')
    ).toHaveClass(/govuk-fieldset__legend--m/)
    await expect(
      page.getByRole('group', { name: copy.unweaned.legend }).locator('legend')
    ).toHaveClass(/govuk-fieldset__legend--m/)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = journeyUrl(page)

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })
})

test.describe('additional-details feature — the unweaned commodity gate', () => {
  test.describe('an equine consignment', () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await startAtAdditionalDetails(page, EQUUS_CABALUS)
    })

    test('asks the unweaned question alongside certification, with its hint and both options', async ({
      page
    }) => {
      await expect(
        page.getByRole('group', { name: copy.certified.legend })
      ).toBeVisible()
      await expectUnweanedQuestionVisible(page)
    })

    test('saves the unweaned answer and shows it chosen when the page is reopened', async ({
      page
    }) => {
      const detailsUrl = page.url()

      await saveSlaughterAndUnweanedNoThenReopen(page, detailsUrl)
      await expectSlaughterAndUnweanedNoChecked(page)
    })
  })

  test.describe('a commodity the unweaned list excludes', () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await startAtAdditionalDetails(page, FELIS_CATUS)
    })

    test('asks only the certification question', async ({ page }) => {
      await expect(
        page.getByRole('group', { name: copy.certified.legend })
      ).toBeVisible()
      await expect(
        page.getByRole('group', { name: copy.unweaned.legend })
      ).toHaveCount(0)
    })

    test('saves without an unweaned answer and reopens with the certification answer alone', async ({
      page
    }) => {
      const detailsUrl = page.url()

      await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
      await saveAndContinue(page).click()

      await expect(page).toHaveURL(SAVED_NOTIFICATION_URL)
      await page.goto(detailsUrl)
      await expect(
        page.getByRole('radio', { name: 'Slaughter', exact: true })
      ).toBeChecked()
      await expect(
        page.getByRole('group', { name: copy.unweaned.legend })
      ).toHaveCount(0)
    })
  })
})

test.describe('additional-details feature — validation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtAdditionalDetails(page)
  })

  test('certification validation: invalid option links to and focuses the group while preserving the valid unweaned answer', async ({
    page
  }) => {
    const { certified, unweaned } =
      await answerUnweanedAndTamperCertificationOutOfList(page)

    await saveAndContinue(page).click()

    await clickCertificationErrorAndExpectRefusalKeepingUnweanedAnswer(page, {
      certified,
      unweaned
    })
  })

  test('certification validation: the same refusal holds Save and return to overview, keeping the valid unweaned answer checked', async ({
    page
  }) => {
    const { certified, unweaned } =
      await answerUnweanedAndTamperCertificationOutOfList(page)

    await saveAndReturnToHub(page).click()

    await clickCertificationErrorAndExpectRefusalKeepingUnweanedAnswer(page, {
      certified,
      unweaned
    })
  })

  test('unweaned validation: invalid option links to and focuses the group while preserving the valid certification', async ({
    page
  }) => {
    const certified = page.getByRole('group', { name: copy.certified.legend })
    const unweaned = page.getByRole('group', { name: copy.unweaned.legend })
    await certified
      .getByRole('radio', { name: 'Slaughter', exact: true })
      .check()
    await unweaned
      .getByRole('radio')
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-answer'
        input.checked = true
      })

    await saveAndContinue(page).click()

    const unweanedError = page
      .getByRole('alert')
      .getByRole('link', { name: validatorDefaults.oneOf })
    await expect(unweanedError).toBeVisible()
    await unweanedError.click()
    await expect(unweaned.getByRole('radio').first()).toBeFocused()
    await expect(unweaned.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(
      certified.getByRole('radio', { name: 'Slaughter', exact: true })
    ).toBeChecked()
  })
})

test.describe('additional-details feature — persistence and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtAdditionalDetails(page)
  })

  test('saves both answers, redirects and persists them', async ({ page }) => {
    const detailsUrl = page.url()

    await saveSlaughterAndUnweanedNoThenReopen(page, detailsUrl)
    await expectSlaughterAndUnweanedNoChecked(page)
  })

  test('saves both questions blank on Save and return to overview and persists the blank state', async ({
    page
  }) => {
    const detailsUrl = page.url()

    await saveAndReturnToHub(page).click()
    await expectOverview(page)

    await page.goto(detailsUrl)
    const certified = page.getByRole('group', { name: copy.certified.legend })
    const unweaned = page.getByRole('group', { name: copy.unweaned.legend })
    await expect(certified.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(unweaned.getByRole('radio', { checked: true })).toHaveCount(0)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await page.getByRole('radio', { name: 'Slaughter', exact: true }).check()
    await page.getByRole('radio', { name: copy.unweaned.no }).check()

    await expectNoSeriousOrCriticalViolations(page, 'Additional details')
  })
})

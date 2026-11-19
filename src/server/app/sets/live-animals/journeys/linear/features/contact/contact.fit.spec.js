import { expect, test } from '@playwright/test'

import {
  answerOriginEntry,
  expectNoSeriousOrCriticalViolations,
  expectStyle,
  expectThreeSaveControls,
  govukVisuallyHiddenStyleOf,
  startNotificationAtOrigin,
  urlUnderBase,
  errorSummaryLinks,
  paragraphFollowing,
  saveAndContinue,
  saveAndReturnToHub
} from '../../../../../../../../../fit/live-animals-journey.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { recordsHoldingRole } from '../../../../../../services/address-book/stub/test-support.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { copy } from './copy/copy.en.js'
import { copy as addressesCopy } from '../addresses/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'

const { serviceName, govukSuffix, errorTitlePrefix } = sharedCopy.layout
const resultsHeadingText = addressesCopy.picker.resultsHeading

const CONTACT_ADDRESS_INPUT = 'input[name="contactAddress"]'

const pageHeading = (page) =>
  page.getByRole('heading', { name: copy.title, level: 1 })

const intro = (page) => paragraphFollowing(pageHeading(page))

const addressLineEndingAtPostcode = ({ addressLine1, townOrCity, postcode }) =>
  [addressLine1, townOrCity, postcode].join(', ')

const startAtContact = async (page) => {
  await startNotificationAtOrigin(page)

  const contactUrl = page
    .url()
    .replace(/\/origin(?:\?.*)?$/, '/consignment/contact/select')
  await answerOriginEntry(page)

  await page.goto(contactUrl)
  await expect(pageHeading(page)).toBeVisible()
}

test.describe('contact feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtContact(page)
  })

  test('heads the page with its own title, shows the intro directly below it, and puts the choice under a sub-heading with a hidden legend', async ({
    page
  }) => {
    await expect(page.getByRole('main').getByRole('heading')).toHaveText([
      copy.title,
      resultsHeadingText
    ])
    await expect(intro(page)).toHaveText(copy.intro)

    await expectStyle(
      page.locator('legend').filter({ hasText: resultsHeadingText }),
      await govukVisuallyHiddenStyleOf(page)
    )
    await expect(
      page.getByRole('group', { name: resultsHeadingText })
    ).toBeVisible()
  })

  test('renders the branch-listed address-book contacts, each hinted with its address ending at the postcode, and offers no other party from the book', async ({
    page
  }) => {
    const branchRecords = recordsHoldingRole(CONTACT_PARTY.addressBookRole)
    const group = page.getByRole('group', { name: resultsHeadingText })
    const renderedValues = await group
      .locator(CONTACT_ADDRESS_INPUT)
      .evaluateAll((inputs) => inputs.map((input) => input.value))
    expect(renderedValues).toEqual(branchRecords.map(({ id }) => id))
    for (const option of branchRecords) {
      const radio = page.getByRole('radio', { name: option.name, exact: true })
      await expect(radio).toBeVisible()
      await expect(radio).toHaveAccessibleDescription(
        addressLineEndingAtPostcode(option.address)
      )
    }

    const consignmentRoleRecord = STUB_BOOK.find(
      (record) =>
        record.roles.length > 0 &&
        !record.roles.includes(CONTACT_PARTY.addressBookRole)
    )
    await expect(
      page.getByRole('radio', { name: consignmentRoleRecord.name })
    ).toHaveCount(0)
  })

  test('offers no way to add an address', async ({ page }) => {
    await expect(page.getByRole('link', { name: /add.*address/i })).toHaveCount(
      0
    )
  })

  test('contact validation: when the submitted option is invalid, links to and focuses the group without preserving an invalid selection', async ({
    page
  }) => {
    await page
      .locator(CONTACT_ADDRESS_INPUT)
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-contact'
        input.checked = true
      })
    await saveAndContinue(page).click()

    const contactError = errorSummaryLinks(page, copy.errors.contactRequired)
    await expect(contactError).toBeVisible()
    await contactError.click()
    await expect(page.locator(CONTACT_ADDRESS_INPUT).first()).toBeFocused()
    await expect(page.locator(`${CONTACT_ADDRESS_INPUT}:checked`)).toHaveCount(
      0
    )
    await expect(page).toHaveTitle(
      `${errorTitlePrefix}${copy.title} - ${serviceName} - ${govukSuffix}`
    )
  })

  test('Save and continue with nothing chosen keeps the trader on the page, naming the choice in the error summary and against the options', async ({
    page
  }) => {
    await saveAndContinue(page).click()

    const contactError = errorSummaryLinks(page, copy.errors.contactRequired)
    await expect(contactError).toBeVisible()
    await contactError.click()
    await expect(page.locator(CONTACT_ADDRESS_INPUT).first()).toBeFocused()
    await expect(
      page.getByRole('group', { name: resultsHeadingText })
    ).toContainText(copy.errors.contactRequired)
    await expect(page).toHaveTitle(
      `${errorTitlePrefix}${copy.title} - ${serviceName} - ${govukSuffix}`
    )
  })

  test('ends with Save and continue, Save and return to hub side by side and Cancel and return to hub on its own line below them', async ({
    page
  }) => {
    await expectThreeSaveControls(page, {
      saveAndReturnToHubLabel: copy.saveActions.saveAndReturnToHub,
      cancelAndReturnToHubLabel: copy.saveActions.cancelAndReturnToHub
    })
  })

  test('Save and return to hub with nothing chosen does the same and goes nowhere', async ({
    page
  }) => {
    const contactUrl = page.url()

    await saveAndReturnToHub(page, copy.saveActions.saveAndReturnToHub).click()

    await expect(
      errorSummaryLinks(page, copy.errors.contactRequired)
    ).toBeVisible()
    await expect(
      page.getByRole('group', { name: resultsHeadingText })
    ).toContainText(copy.errors.contactRequired)
    await expect(page).toHaveURL(contactUrl)
  })

  test('Save and return to hub with a value the book does not hold is refused the same way, with no option left chosen', async ({
    page
  }) => {
    await page
      .locator(CONTACT_ADDRESS_INPUT)
      .first()
      .evaluate((input) => {
        input.value = 'not-a-real-contact'
        input.checked = true
      })
    await saveAndReturnToHub(page, copy.saveActions.saveAndReturnToHub).click()

    const contactError = errorSummaryLinks(page, copy.errors.contactRequired)
    await expect(contactError).toBeVisible()
    await contactError.click()
    await expect(page.locator(CONTACT_ADDRESS_INPUT).first()).toBeFocused()
    await expect(page.locator(`${CONTACT_ADDRESS_INPUT}:checked`)).toHaveCount(
      0
    )
  })

  test('selects a valid contact, redirects and shows it chosen on return, with the page headings still exactly the two', async ({
    page
  }) => {
    const contactUrl = page.url()
    const selected = recordsHoldingRole(CONTACT_PARTY.addressBookRole)[0]

    await page.getByRole('radio', { name: selected.name, exact: true }).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(
      urlUnderBase('/notifications/[^/]+/notification-view')
    )
    await page.goto(contactUrl)
    await expect(
      page.getByRole('radio', { name: selected.name, exact: true })
    ).toBeChecked()
    await expect(page.getByRole('main').getByRole('heading')).toHaveText([
      copy.title,
      resultsHeadingText
    ])
  })
})

test.describe('contact feature — navigation and accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startAtContact(page)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/consignment\/contact\/select$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Contact')
  })
})

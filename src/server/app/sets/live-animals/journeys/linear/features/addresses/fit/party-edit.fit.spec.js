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
import { copy as editCopy } from '../party-edit/copy/copy.en.js'
import { PARTIES } from '../parties.js'

const CONSIGNOR = PARTIES.find(({ id }) => id === 'consignor')
const ROLES_AND_ADDRESSES = 'Roles and addresses'
const EDITED_NAME = 'Edited Consignor Ltd'

const rowFor = (page, title) =>
  page.locator('.govuk-summary-list__row', {
    has: page.getByText(title, { exact: true })
  })

const saveAndContinue = (page) =>
  page
    .getByRole('button', {
      name: sharedCopy.saveActions.saveAndContinue,
      exact: true
    })
    .click()

/** Picks the consignor from the book, then opens its Edit details link. */
const openConsignorEdit = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: ROLES_AND_ADDRESSES }).click()
  await rowFor(page, CONSIGNOR.title)
    .getByRole('link', { name: copy.hub.add })
    .click()
  await page
    .getByRole('radio', { name: partyPickerName(values.consignor) })
    .check()
  await saveAndContinue(page)
  await rowFor(page, CONSIGNOR.title)
    .getByRole('link', { name: copy.hub.editDetails })
    .click()
  await expect(
    page.getByRole('heading', { name: editCopy.title })
  ).toBeVisible()
}

test.describe('edit a copied address', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openConsignorEdit(page)
  })

  test('opens pre-filled from the copy, captioned with the role', async ({
    page
  }) => {
    await expect(
      page.locator('span.govuk-caption-l + h1.govuk-heading-l')
    ).toHaveText(editCopy.title)
    await expect(page.locator('span.govuk-caption-l')).toHaveText(
      CONSIGNOR.title
    )
    await expect(page.getByLabel(editCopy.fields.name)).toHaveValue(
      partyPickerName(values.consignor)
    )
    await expect(page.getByLabel(editCopy.fields.county)).toBeVisible()
  })

  test('saves the edit to this notification and returns to the hub', async ({
    page
  }) => {
    await page.getByLabel(editCopy.fields.name).fill(EDITED_NAME)
    await page.getByRole('button', { name: editCopy.save }).click()

    await expect(
      page.getByRole('heading', { name: copy.hub.title })
    ).toBeVisible()
    await expect(rowFor(page, CONSIGNOR.title)).toContainText(EDITED_NAME)
  })

  test('shows the address-book messages for a field that breaks the rules', async ({
    page
  }) => {
    await page.getByLabel(editCopy.fields.postcode).fill('')
    await page.getByRole('button', { name: editCopy.save }).click()

    const link = page
      .getByRole('alert')
      .getByRole('link', { name: editCopy.errors.postcode.required })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page.getByLabel(editCopy.fields.postcode)).toBeFocused()
  })

  test('cancel leaves the copy as it was', async ({ page }) => {
    await page.getByLabel(editCopy.fields.name).fill(EDITED_NAME)
    await page.getByRole('button', { name: editCopy.cancel }).click()

    await expect(
      page.getByRole('heading', { name: copy.hub.title })
    ).toBeVisible()
    await expect(rowFor(page, CONSIGNOR.title)).toContainText(
      partyPickerName(values.consignor)
    )
  })

  test('edit page has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Edit address details')
  })
})

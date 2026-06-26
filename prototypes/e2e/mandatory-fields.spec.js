import { test, expect } from '@playwright/test'
import * as j from './journey.js'

const click = (page, name) => page.getByRole('button', { name }).click()
const task = (page, name) => page.getByRole('link', { name }).click()

// Walk just far enough to reach About you. Mirrors the email-gate detection in
// journey.js so the same spec drives both the hand-written prototype (pre-hub
// redirect) and the spike variants (Email shown as the first hub task).
async function reachAboutYou(page) {
  await page.goto(j.base.grouped)
  await click(page, 'Start now')

  const emailHeading = page.getByRole('heading', {
    name: 'Give us your email to begin'
  })
  const hubHeading = page.getByRole('heading', {
    name: 'Get a car insurance quote'
  })
  await emailHeading.or(hubHeading).first().waitFor()
  if (await hubHeading.isVisible()) {
    await task(page, 'Email')
  }
  await j.fillEmail(page)
  await click(page, j.SAVE)

  // Back on the hub — open the About you task.
  await expect(hubHeading).toBeVisible()
  await task(page, 'About you and your vehicle')
  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible()
}

test('About you blocks Save and continue when Full name is blank', async ({
  page
}) => {
  await reachAboutYou(page)

  // Submit blank. We expect to stay on About you with a GDS error summary +
  // an inline error against #fullName. The exact wording can vary by
  // implementation (hand-written uses Joi messages; spikes derive their own
  // from the model) — assert the GDS structure, not the copy.
  await click(page, j.SAVE)

  await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible()
  const errorSummary = page.locator('.govuk-error-summary')
  await expect(errorSummary).toBeVisible()
  // Regex tolerates "Full name" / "fullName" / "full name" — wording varies
  // by implementation (hand-written uses bespoke copy; spikes derive from Joi).
  await expect(errorSummary).toContainText(/full ?name/i)
  await expect(page.locator('#fullName-error')).toBeVisible()
  await expect(page.locator('a[href="#fullName"]').first()).toBeVisible()

  // Fill the name and submit — should now progress to Your vehicle.
  await page.getByLabel('Full name').fill('Alex Driver')
  await click(page, j.SAVE)
  await expect(
    page.getByRole('heading', { name: 'Your vehicle' })
  ).toBeVisible()
})

test('About you progresses with only Full name — preferredName is optional', async ({
  page
}) => {
  await reachAboutYou(page)

  // Fill only the one mandatory field; deliberately leave preferredName,
  // phone, postcode, country and DOB blank. The section's isComplete check
  // (hand-written) and the model's required-field check (spikes) both turn
  // on fullName alone, so save & continue must route forward to the next
  // section in the group.
  await page.getByLabel('Full name').fill('Alex Driver')
  await expect(page.getByLabel('What should we call you?')).toHaveValue('')
  await click(page, j.SAVE)

  // Forward navigation IS the e2e signal that the section is considered
  // complete enough to leave — if preferredName were required-at-save we'd
  // be re-rendering About you with an error here, not arriving at Your vehicle.
  await expect(
    page.getByRole('heading', { name: 'Your vehicle' })
  ).toBeVisible()
})

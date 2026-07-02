import { test, expect } from '@playwright/test'
import * as j from '../journey.js'
import * as o from './obligations-journey.js'

/**
 * Rulings item 3 — MANDATES (Outcome B, fullName-only page-hard).
 * fullName is the ONLY field that blocks a page save with a GDS error;
 * every other field is page-soft — blank saves advance, the hub shows
 * In progress, and the engine-mandatory gaps block at the CYA POST with
 * soft prompts naming them. The email gate saves blank freely too. Plus
 * the composition probes: hub-complete-with-zero-claims still blocks
 * the CYA submit with 'Add at least one claim' (the page-soft ×
 * engine-mandatory cell), and no `required` attribute renders anywhere
 * (the round trip is server-side only). The full-required_at_save
 * Outcome A is dead.
 */

const click = (page, name) => page.getByRole('button', { name }).click()
const task = (page, name) => page.getByRole('link', { name }).click()
const hubHeading = (page) =>
  page.getByRole('heading', { name: 'Get a car insurance quote' })
const hubStatus = (page, title) =>
  page
    .locator('.govuk-task-list__item')
    .filter({ hasText: title })
    .locator('.govuk-task-list__status')

test.describe(o.OBLIGATIONS.label, () => {
  test('the email gate saves blank freely, blocking only at CYA', async ({
    page
  }) => {
    await o.reachHub(page)
    await task(page, 'Email')
    await click(page, j.SAVE) // blank — page-soft, no error round trip
    await expect(hubHeading(page)).toBeVisible()
    await expect(page.locator('.govuk-error-summary')).toHaveCount(0)

    // The gap surfaces at the CYA POST instead, named in the summary.
    await page.goto(o.pagePath('check-your-answers'))
    await click(page, 'Accept and get quote')
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    await expect(page.locator('.govuk-error-summary')).toContainText(
      'Email is required'
    )
  })

  test('fullName blocks the save; a blank vehicle save advances and the hub shows In progress', async ({
    page
  }) => {
    await o.reachHub(page)
    await task(page, 'Email')
    await j.fillEmail(page)
    await click(page, j.SAVE)

    // fullName is the one page-hard field: blank About you blocks with
    // the GDS structure (summary + inline error + anchor link).
    await task(page, 'About you and your vehicle')
    await click(page, j.SAVE)
    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible()
    await o.expectGdsFieldError(page, 'fullName')

    // fullName alone advances; a fully blank vehicle save advances too
    // (registration is engine-mandatory, never page-hard).
    await page.getByLabel('Full name').fill('Alex Driver')
    await click(page, j.SAVE)
    await expect(
      page.getByRole('heading', { name: 'Your vehicle' })
    ).toBeVisible()
    await click(page, j.SAVE)
    await expect(hubHeading(page)).toBeVisible()
    await expect(hubStatus(page, 'About you and your vehicle')).toHaveText(
      'In progress'
    )

    // The vehicle gap blocks at CYA POST, named in the summary.
    await page.goto(o.pagePath('check-your-answers'))
    await click(page, 'Accept and get quote')
    await expect(page.locator('.govuk-error-summary')).toContainText(
      'Registration is required'
    )
  })

  test('hub-complete with zero claims still blocks the CYA submit with Add at least one claim', async ({
    page
  }) => {
    // Walk every task with hadClaims=yes but NO claim added: Continue on
    // the empty manage list counts complete on the hub (spike-a parity)…
    await o.reachHub(page)
    await task(page, 'Email')
    await j.fillEmail(page)
    await click(page, j.SAVE)
    await task(page, 'About you and your vehicle')
    await j.fillAboutYou(page)
    await click(page, j.SAVE)
    await j.fillVehicle(page)
    await click(page, j.SAVE)
    await task(page, 'Your driving and cover')
    await j.fillDriving(page, { hadClaims: true })
    await click(page, j.SAVE)
    await expect(
      page.getByRole('heading', { name: 'Claims you have added' })
    ).toBeVisible()
    await click(page, j.CONTINUE) // zero claims
    // Cover-type probes use getByLabel — the single-'Yes' reveal trap.
    await j.fillCoverType(page)
    await click(page, j.SAVE)
    await j.fillExtras(page)
    await click(page, j.SAVE)
    await task(page, 'Add to your policy')
    await click(page, j.CONTINUE) // no add-ons

    await expect(hubStatus(page, 'Your driving and cover')).toHaveText(
      'Completed'
    )

    // …and the quote row goes live — the gap is invisible until the POST.
    await task(page, 'Get your quote')
    await expect(
      page.getByRole('heading', { name: 'Your quote' })
    ).toBeVisible()
    await click(page, 'Accept and continue')
    await click(page, 'Accept and get quote')
    await expect(
      page.getByRole('heading', { name: 'Check your answers' })
    ).toBeVisible()
    await expect(page.locator('.govuk-error-summary')).toContainText(
      'Add at least one claim'
    )
    await expect(
      page.getByRole('heading', { name: 'Quote confirmed' })
    ).toHaveCount(0)
  })

  test('no required attribute renders anywhere — the round trip is server-side only', async ({
    page
  }) => {
    await o.reachHub(page)
    // Answer hadClaims=yes so the claims pages are in scope (a Not
    // Applicable deep link resolves away rather than rendering a form).
    await task(page, 'Your driving and cover')
    await j.fillDriving(page, { hadClaims: true })
    await click(page, j.SAVE)

    const slugs = [
      'email',
      'about-you',
      'your-vehicle',
      'driving-history',
      'claims/add',
      'cover-type',
      'optional-extras',
      'addons'
    ]
    for (const slug of slugs) {
      const response = await page.goto(o.pagePath(slug))
      expect(response.ok()).toBe(true)
      await expect(page.locator('form')).toBeVisible()
      await expect(page.locator('[required]')).toHaveCount(0)
    }
  })
})

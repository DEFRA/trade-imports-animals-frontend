import { test, expect } from '@playwright/test'
import * as journey from '../journey.js'
import * as obligations from './obligations-journey.js'

/**
 * Rulings item 2 — EARLY CYA (Outcome A, open access). Pre-submit,
 * direct-URL access is open: a mid-journey CYA renders soft "you still
 * need to…" prompts (with scope provenance), a direct-URL quote-summary
 * prices a half-empty journey, and the one hard gate lives at the CYA
 * POST — including the stale-recheck branch, which re-renders CYA as a
 * 200 calling the gap out, never an error page. The guarded Outcome B
 * (early-CYA redirect to the first applicable page) is dead.
 */

const cyaHeading = (page) =>
  page.getByRole('heading', { name: 'Check your answers' })

/** Fresh journey with ONLY the email task completed. */
const reachHubWithEmailOnly = async (page) => {
  await obligations.reachHub(page)
  await page.getByRole('link', { name: 'Email' }).click()
  await journey.fillEmail(page)
  await page.getByRole('button', { name: journey.SAVE }).click()
  await expect(
    page.getByRole('heading', { name: 'Get a car insurance quote' })
  ).toBeVisible()
}

test.describe(obligations.OBLIGATIONS.label, () => {
  test('direct-URL CYA mid-journey renders soft prompts, not a redirect', async ({
    page
  }) => {
    await reachHubWithEmailOnly(page)

    await page.goto(obligations.pagePath('check-your-answers'))
    await expect(cyaHeading(page)).toBeVisible()
    expect(page.url()).toContain('/check-your-answers')

    // The soft prompts name the engine-mandatory gaps…
    const banner = page.locator('.govuk-notification-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(
      'You still need to complete some sections'
    )
    await expect(banner).toContainText('Full name is required')
    await expect(banner).toContainText('Registration is required')

    // …but nothing is hard-gated: the send form still renders (the gate
    // is the POST) and there is no error summary on a GET.
    await expect(
      page.getByRole('button', { name: 'Accept and get quote' })
    ).toBeVisible()
    await expect(page.locator('.govuk-error-summary')).toHaveCount(0)
  })

  test('direct-URL quote-summary prices a partial journey', async ({
    page
  }) => {
    await reachHubWithEmailOnly(page)

    await page.goto(obligations.pagePath('quote-summary'))
    await expect(
      page.getByRole('heading', { name: 'Your quote' })
    ).toBeVisible()
    // The system quote handler fires on scope entry during the request's
    // fixed-point pass, so even a half-empty journey carries a premium.
    await expect(page.locator('.govuk-body-l')).toContainText(/£\d+/)
  })

  test('an incomplete CYA POST re-renders CYA with the gaps — never Quote confirmed', async ({
    page
  }) => {
    await reachHubWithEmailOnly(page)

    await page.goto(obligations.pagePath('check-your-answers'))
    await page.getByRole('button', { name: 'Accept and get quote' }).click()

    await expect(cyaHeading(page)).toBeVisible()
    const summary = page.locator('.govuk-error-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('There is a problem')
    await expect(summary).toContainText('Full name is required')
    await expect(
      page.getByRole('heading', { name: 'Quote confirmed' })
    ).toHaveCount(0)
  })

  test('stale-recheck: state invalidated between CYA render and POST calls out the gap', async ({
    page
  }) => {
    // Reach a submittable CYA with one claim declared…
    await journey.walkGroupedToCheckAnswers(
      page,
      obligations.OBLIGATIONS.grouped,
      {
        hadClaims: true
      }
    )
    await expect(cyaHeading(page)).toBeVisible()
    await expect(
      page.locator('.govuk-summary-list__key').filter({ hasText: 'Claim 1' })
    ).toBeVisible()

    // …then remove that claim behind the rendered page (same cookie jar),
    // so the POST below carries a stale canSubmit.
    const removed = await page.request.get(
      obligations.pagePath('claims/0/remove')
    )
    expect(removed.ok()).toBe(true)

    // The server re-checks and re-renders CYA as a 200 naming the gap —
    // never a 500, never a redirect elsewhere, never the panel.
    await page.getByRole('button', { name: 'Accept and get quote' }).click()
    await expect(cyaHeading(page)).toBeVisible()
    const summary = page.locator('.govuk-error-summary')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText('Add at least one claim')
    await expect(
      page.getByRole('heading', { name: 'Quote confirmed' })
    ).toHaveCount(0)
  })
})

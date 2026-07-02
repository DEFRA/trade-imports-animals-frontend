import { expect } from '@playwright/test'
import * as j from '../journey.js'

/**
 * Support for the obligations edge specs. Each spec in this folder
 * asserts one of the three human parity rulings (recorded 2026-07-02 in
 * the spike PLAN) that the shared specs leave unobserved. Everything
 * here drives ONLY the obligations journey — never the whole JOURNEYS
 * array — so these specs can never gate the other spikes.
 */

const registered = j.JOURNEYS.find(
  (journey) => journey.id === 'obligations-standalone-spike'
)
if (!registered) {
  throw new Error(
    "JOURNEYS has no 'obligations-standalone-spike' entry — register the " +
      'journey in prototypes/e2e/journey.js before running the obligations ' +
      'edge specs'
  )
}

/** The one journey these specs drive; `grouped` is the BASE mount path. */
export const OBLIGATIONS = registered

/** Page URL from a Flow slug (slugs may nest, e.g. claims/add). */
export const pagePath = (slug) => `${OBLIGATIONS.grouped}/${slug}`

/**
 * The journeyId rides in a BASE-scoped cookie — there is no {id} URL
 * segment anywhere. Reading it back lets specs pin the deterministic
 * quote reference ('CI-' + first 6 hex of the journeyId, uppercased).
 */
export async function journeyIdFrom(context) {
  const cookies = await context.cookies()
  const cookie = cookies.find(({ name }) => name === 'obligationsJourneyId')
  if (!cookie) {
    throw new Error(
      'No obligationsJourneyId cookie in the browser context — has the ' +
        'journey been started?'
    )
  }
  return cookie.value
}

/** Start a fresh journey and land on the task-list hub. */
export async function reachHub(page) {
  await page.goto(OBLIGATIONS.grouped)
  await page.getByRole('button', { name: 'Start now' }).click()
  await expect(
    page.getByRole('heading', { name: 'Get a car insurance quote' })
  ).toBeVisible()
}

/**
 * Full happy-path walk (one claim, no add-ons) ending on the 'Quote
 * confirmed' panel — the launch pad for every post-submit assertion.
 */
export async function submitToQuoteConfirmed(page) {
  await j.walkGroupedToCheckAnswers(page, OBLIGATIONS.grouped, {
    hadClaims: true
  })
  await page.getByRole('button', { name: 'Accept and get quote' }).click()
  await expect(
    page.getByRole('heading', { name: 'Quote confirmed' })
  ).toBeVisible()
}

/**
 * The GDS error round trip for one blocked field — structure, not copy
 * (mirrors the shared mandatory-fields spec): summary box, inline error
 * and an anchor link targeting the field.
 */
export async function expectGdsFieldError(page, fieldId) {
  await expect(page.locator('.govuk-error-summary')).toBeVisible()
  await expect(page.locator(`#${fieldId}-error`)).toBeVisible()
  await expect(page.locator(`a[href="#${fieldId}"]`).first()).toBeVisible()
}

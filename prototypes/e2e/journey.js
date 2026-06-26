/**
 * Shared helpers for the prototype demo specs. Each `fill*` fills the fields on
 * the page it is given (it does not submit); the spec drives navigation.
 *
 * The suite is reusable across the model-spikes: set `SPIKE_BASE` (e.g.
 * `/spike-a`) to point the journey at a spike's variant. Default (unset)
 * exercises the original hand-written journey, so both must stay green.
 */
const SPIKE_BASE = process.env.SPIKE_BASE ?? ''

export const base = {
  grouped: `/prototype${SPIKE_BASE}/task-list-with-linear-tasks`
}

export async function fillEmail(page) {
  await page.getByLabel('Email address').fill('alex@example.com')
}

export async function fillAboutYou(page) {
  await page.getByLabel('Full name').fill('Alex Driver')
  await page.getByLabel('What should we call you?').fill('Al')
  await page.getByLabel('UK telephone number').fill('07700 900123')
  await page.getByLabel('Postcode').fill('SW1A 1AA')
  await page.getByLabel('Country of residence').selectOption('england')
  await page.getByLabel('Day').fill('27')
  await page.getByLabel('Month').fill('3')
  await page.getByLabel('Year').fill('1985')
}

export async function fillVehicle(page) {
  await page.getByLabel('Registration number').fill('AB12 CDE')
  await page.getByLabel('Make').fill('Ford')
  await page.getByLabel('Model').fill('Focus')
  await page.getByLabel('Year of manufacture').fill('2018')
  await page.getByLabel('Estimated value').fill('8000')
}

export async function fillDriving(page, { hadClaims }) {
  await page.getByLabel('Years of no-claims discount').fill('5')
  await page
    .getByRole('radio', { name: hadClaims ? 'Yes' : 'No', exact: true })
    .check()
  await page.getByLabel('Penalty points').fill('0')
}

export async function addOneClaim(page) {
  // From the claims manage list: add a single claim, returning to the list.
  await page
    .getByRole('button', { name: /Add a claim|Add another claim/ })
    .click()
  await page.getByLabel('Accident').check()
  await page.getByLabel('Approximate claim amount').fill('500')
  await page.getByRole('button', { name: 'Add claim' }).click()
}

export async function fillCoverType(page) {
  await page.getByLabel('Comprehensive').check()
  await page.getByLabel('Yes').check() // voluntary excess conditional reveal
  await page.getByLabel('Voluntary excess amount').fill('250')
}

export async function fillExtras(page) {
  await page.getByLabel('Breakdown cover').check()
  await page.getByLabel('Courtesy car').check()
}

export async function selectAddons(page) {
  await page.getByLabel('Add a named driver').check()
  await page.getByLabel('Declare vehicle modifications').check()
}

export async function fillNamedDriverWho(page) {
  await page.getByLabel('Full name').fill('Sam Passenger')
  await page.getByLabel('Day').fill('1')
  await page.getByLabel('Month').fill('1')
  await page.getByLabel('Year').fill('1990')
}

export async function pickRelationship(page) {
  await page.getByLabel('Spouse or partner').check()
}

export async function fillModificationsDescribe(page) {
  await page.getByLabel('Describe the modifications').fill('Alloy wheels')
}

export async function fillModificationsValue(page) {
  await page.getByLabel('Approximate value added').fill('600')
}

export const SAVE = 'Save and continue'
export const CONTINUE = 'Continue'

/** Walk the grouped journey up to (and stopping on) check-your-answers. */
export async function walkGroupedToCheckAnswers(page, { hadClaims }) {
  const click = (name) => page.getByRole('button', { name }).click()
  const task = (name) => page.getByRole('link', { name }).click()

  await page.goto(base.grouped)
  await click('Start now')

  // Email gate. The hand-written prototype redirects here automatically after
  // Start now; the spikes show 'Email' as the first hub task. Race the two
  // possible headings, then dispatch.
  const emailHeading = page.getByRole('heading', {
    name: 'Give us your email to begin'
  })
  const hubHeading = page.getByRole('heading', {
    name: 'Get a car insurance quote'
  })
  await emailHeading.or(hubHeading).first().waitFor()
  if (await hubHeading.isVisible()) {
    await task('Email')
  }
  await fillEmail(page)
  await click(SAVE)

  await task('About you and your vehicle')
  await fillAboutYou(page)
  await click(SAVE)
  await fillVehicle(page)
  await click(SAVE)

  await task('Your driving and cover')
  await fillDriving(page, { hadClaims })
  await click(SAVE)
  if (hadClaims) {
    await addOneClaim(page)
    await click(CONTINUE)
  }
  await fillCoverType(page)
  await click(SAVE)
  await fillExtras(page)
  await click(SAVE)

  await task('Add to your policy')
  await click(CONTINUE) // choose no addons

  await task('Get your quote')
  await click('Accept and continue') // quote-summary → check-your-answers
}

// Demo pacing: how long to dwell on each page so the video is watchable.
// Override with DEMO_PACE_MS (e.g. DEMO_PACE_MS=0 for a fast run).
export const PACE =
  process.env.DEMO_PACE_MS !== undefined
    ? Number(process.env.DEMO_PACE_MS)
    : 1500

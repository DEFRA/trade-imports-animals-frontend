/**
 * Shared helpers for the prototype demo specs. Each `fill*` fills the fields on
 * the page it is given (it does not submit); the spec drives navigation.
 *
 * The suite is data-driven: the same specs walk every journey in `JOURNEYS`, so
 * the hand-written prototype, the model-spikes and the flattened standalone
 * copies are all proven behaviourally identical. Playwright discovers one test
 * per journey and runs them in parallel against a single server — there is no
 * per-run SPIKE_BASE env var.
 */
const groupedPath = (tree, spike) =>
  `/${tree}${spike ? `/${spike}` : ''}/task-list-with-linear-tasks`

export const JOURNEYS = [
  {
    id: 'base',
    label: 'base (hand-written)',
    grouped: groupedPath('prototype')
  },
  // Model-spikes — one shared variant builder, four paradigms.
  {
    id: 'spike-a',
    label: 'spike-a (declarative selectors)',
    grouped: groupedPath('prototype', 'spike-a')
  },
  {
    id: 'spike-b',
    label: 'spike-b (statechart / FSM)',
    grouped: groupedPath('prototype', 'spike-b')
  },
  {
    id: 'spike-c',
    label: 'spike-c (rules engine)',
    grouped: groupedPath('prototype', 'spike-c')
  },
  {
    id: 'spike-d',
    label: 'spike-d (schema-first)',
    grouped: groupedPath('prototype', 'spike-d')
  },
  // Standalone — each model flattened into its own self-contained copy.
  {
    id: 'standalone-spike-a',
    label: 'standalone spike-a (declarative selectors)',
    grouped: groupedPath('prototype-standalone', 'spike-a')
  },
  {
    id: 'standalone-spike-b',
    label: 'standalone spike-b (statechart / FSM)',
    grouped: groupedPath('prototype-standalone', 'spike-b')
  },
  {
    id: 'standalone-spike-c',
    label: 'standalone spike-c (rules engine)',
    grouped: groupedPath('prototype-standalone', 'spike-c')
  },
  {
    id: 'standalone-spike-d',
    label: 'standalone spike-d (schema-first)',
    grouped: groupedPath('prototype-standalone', 'spike-d')
  },
  {
    id: 'obligations-standalone-spike',
    label: 'standalone obligations (obligations engine)',
    grouped: groupedPath('prototype-standalone', 'obligations-standalone-spike')
  },
  {
    id: 'obligations-v2-spike',
    label: 'standalone obligations v2 (page-owned spine)',
    grouped: groupedPath('prototype-standalone', 'obligations-v2-spike')
  }
]

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

/**
 * Walk the "Add a named driver" add-on from the hub. Journey-conditional: the
 * obligations-v2 spike models this as a NESTED indexed collection (drivers,
 * each owning its own claims — DISCUSSION-LOG entry 6b), so it walks a
 * loop-inside-a-loop (add a driver, then add a claim UNDER that driver); every
 * other journey keeps the original single named-driver two-page flow. Both
 * leave the same completed add-on behind, so the rest of the walk is shared.
 */
export async function walkNamedDriver(page, journey) {
  await page.getByRole('link', { name: 'Add a named driver' }).click()

  if (journey.id === 'obligations-v2-spike') {
    await page.getByRole('button', { name: 'Add a driver' }).click()
    await fillNamedDriverWho(page)
    await page.getByLabel('Spouse or partner').check()
    await page.getByRole('button', { name: SAVE }).click()
    // Driver detail → add a claim UNDER this driver (the nested inner loop).
    await page.getByRole('button', { name: 'Add a claim' }).click()
    await page.getByLabel('Accident').check()
    await page.getByLabel('Approximate claim amount').fill('300')
    await page.getByRole('button', { name: 'Add claim' }).click()
    await page.getByRole('button', { name: CONTINUE }).click() // detail → drivers hub
    await page.getByRole('button', { name: CONTINUE }).click() // hub → back to hub
    return
  }

  await fillNamedDriverWho(page)
  await page.getByRole('button', { name: SAVE }).click()
  await pickRelationship(page)
  await page.getByRole('button', { name: SAVE }).click()
}

/** Walk to the top-level claims "Add a claim" entry page: start → email →
 * about-you+vehicle → driving history (hadClaims = yes) → claims hub → Add.
 * Used by the item-scoped windscreen-conditionality spec. */
export async function reachClaimEntry(page, grouped) {
  await page.goto(grouped)
  await page.getByRole('button', { name: 'Start now' }).click()
  const emailHeading = page.getByRole('heading', {
    name: 'Give us your email to begin'
  })
  const hubHeading = page.getByRole('heading', {
    name: 'Get a car insurance quote'
  })
  await emailHeading.or(hubHeading).first().waitFor()
  if (await hubHeading.isVisible()) {
    await page.getByRole('link', { name: 'Email' }).click()
  }
  await fillEmail(page)
  await page.getByRole('button', { name: SAVE }).click()

  await page.getByRole('link', { name: 'About you and your vehicle' }).click()
  await fillAboutYou(page)
  await page.getByRole('button', { name: SAVE }).click()
  await fillVehicle(page)
  await page.getByRole('button', { name: SAVE }).click()

  await page.getByRole('link', { name: 'Your driving and cover' }).click()
  await fillDriving(page, { hadClaims: true })
  await page.getByRole('button', { name: SAVE }).click()
  // Now on the claims hub ("Claims you have added").
  await page
    .getByRole('button', { name: /Add a claim|Add another claim/ })
    .click()
}

/** Short path to the v2 drivers hub: start → email → select the named-driver
 * add-on → open its hub. Used by the nested drivers/claims property spec. */
export async function reachDriversHub(page, grouped) {
  await page.goto(grouped)
  await page.getByRole('button', { name: 'Start now' }).click()
  const emailHeading = page.getByRole('heading', {
    name: 'Give us your email to begin'
  })
  const hubHeading = page.getByRole('heading', {
    name: 'Get a car insurance quote'
  })
  await emailHeading.or(hubHeading).first().waitFor()
  if (await hubHeading.isVisible()) {
    await page.getByRole('link', { name: 'Email' }).click()
  }
  await fillEmail(page)
  await page.getByRole('button', { name: SAVE }).click()
  await page.getByRole('link', { name: 'Add to your policy' }).click()
  await page.getByLabel('Add a named driver').check()
  await page.getByRole('button', { name: CONTINUE }).click()
  await page.getByRole('link', { name: 'Add a named driver' }).click()
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
export async function walkGroupedToCheckAnswers(page, grouped, { hadClaims }) {
  const click = (name) => page.getByRole('button', { name }).click()
  const task = (name) => page.getByRole('link', { name }).click()

  await page.goto(grouped)
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

import {
  journeyIdFromLocation,
  resolveSeedFields,
  seedSteps,
  values
} from './seed-notification.js'
import { sleep } from './retry.js'

const NAVIGATION_TIMEOUT_MS = 60_000
const STEP_ATTEMPTS = 3
const STEP_RETRY_DELAY_MS = 2000
const START_BUTTON = 'Start a new notification'
const SUBMIT_BUTTON =
  'form button.govuk-button, form input.govuk-button[type="submit"]'

const pageUrl = (origin, journeyId, slug) =>
  new URL(`/notifications/${journeyId}/${slug}`, origin).toString()

const stepPath = (journeyId, slug) => `/notifications/${journeyId}/${slug}`

export { stepPath }

/** Wait until the browser has landed on the step the seed expects — follow
 * redirects from the previous submit instead of deep-linking each slug. */
const waitForStep = async (page, expectedPath) => {
  await page.waitForFunction(
    (expected) => window.location.pathname === expected,
    { timeout: NAVIGATION_TIMEOUT_MS },
    expectedPath
  )
}

const fillField = async (page, name, rawValue) => {
  for (const one of [rawValue].flat()) {
    const value = String(one)
    const radio = await page.$(
      `input[type="radio"][name="${name}"][value="${value}"]`
    )
    if (radio) {
      await radio.click()
      continue
    }

    const checkbox = await page.$(
      `input[type="checkbox"][name="${name}"][value="${value}"]`
    )
    if (checkbox) {
      await checkbox.click()
      continue
    }

    const select = await page.$(`select[name="${name}"]`)
    if (select) {
      await select.select(value)
      continue
    }

    const text = await page.$(`input[name="${name}"]`)
    if (text) {
      await text.click({ clickCount: 3 })
      await text.type(value)
      continue
    }

    const actionButton = await page.$(
      `button[name="${name}"][value="${value}"], input[name="${name}"][value="${value}"]`
    )
    if (actionButton) {
      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: NAVIGATION_TIMEOUT_MS
        }),
        actionButton.click()
      ])
    }
  }
}

const fillForm = async (page, fields) => {
  for (const [name, value] of Object.entries(fields)) {
    await fillField(page, name, value)
  }
}

const submitForm = async (page) => {
  await Promise.all([
    page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: NAVIGATION_TIMEOUT_MS
    }),
    page.click(SUBMIT_BUTTON)
  ])
}

const clickStartNotification = async (page) => {
  const clicked = await page.evaluate((label) => {
    const button = [...document.querySelectorAll('button.govuk-button')].find(
      (candidate) => candidate.textContent.trim() === label
    )
    if (!button) {
      return false
    }
    button.click()
    return true
  }, START_BUTTON)
  if (!clicked) {
    throw new Error(`Could not find "${START_BUTTON}" on the dashboard`)
  }
  await page.waitForNavigation({
    waitUntil: 'networkidle0',
    timeout: NAVIGATION_TIMEOUT_MS
  })
}

export const createNotificationInBrowser = async (page, origin) => {
  const response = await page.goto(origin, {
    waitUntil: 'networkidle0',
    timeout: NAVIGATION_TIMEOUT_MS
  })
  if (!response || response.status() !== 200) {
    throw new Error(`Dashboard did not render (${response?.status() ?? 0})`)
  }
  await clickStartNotification(page)
  const journeyId = journeyIdFromLocation(page.url())
  if (!journeyId) {
    throw new Error(`Could not create a notification (location ${page.url()})`)
  }
  return journeyId
}

export const fillNotificationInBrowser = async (
  page,
  origin,
  journeyId,
  shape
) => {
  for (const step of seedSteps(shape)) {
    const expectedPath = stepPath(journeyId, step.slug)
    let lastError

    for (let attempt = 0; attempt < STEP_ATTEMPTS; attempt++) {
      try {
        await waitForStep(page, expectedPath)
        await page.waitForSelector('h1', { timeout: NAVIGATION_TIMEOUT_MS })
        const fields = await resolveSeedFields(step, page)
        await fillForm(page, fields)
        if (!('action' in fields)) {
          await submitForm(page)
        }
        lastError = undefined
        break
      } catch (error) {
        lastError = error
        if (attempt + 1 < STEP_ATTEMPTS) {
          await sleep(STEP_RETRY_DELAY_MS * (attempt + 1))
        }
      }
    }

    if (lastError) {
      const status = await page.evaluate(() => document.title)
      throw new Error(
        `Seed step ${step.slug} failed at ${page.url()} (${status}): ${lastError.message}`
      )
    }
  }
}

export const submitNotificationInBrowser = async (page, origin, journeyId) => {
  const response = await page.goto(pageUrl(origin, journeyId, 'declaration'), {
    waitUntil: 'networkidle0',
    timeout: NAVIGATION_TIMEOUT_MS
  })
  if (!response || response.status() !== 200) {
    throw new Error(`Declaration did not render (${response?.status() ?? 0})`)
  }
  await fillForm(page, { declaration: values.declaration })
  await submitForm(page)
  const confirmation = pageUrl(origin, journeyId, 'confirmation')
  if (!page.url().startsWith(confirmation)) {
    throw new Error(
      `Declaration did not submit the notification (went to ${page.url()}, ` +
        `expected ${confirmation})`
    )
  }
}

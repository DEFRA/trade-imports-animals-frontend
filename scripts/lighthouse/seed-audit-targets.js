import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'

import puppeteer from 'puppeteer'

import signIn from '../../tests/lighthouse/auth-setup.cjs'
import { auditUrls, reportNames, TARGETS_FILE } from './audit-targets.js'
import {
  createNotificationInBrowser,
  fillNotificationInBrowser,
  submitNotificationInBrowser
} from './browser-journey.js'
import { createJourneyClient } from './journey-client.js'
import { ensureAddressBookHasAnAddress } from './seed-address-book.js'
import { SEED_SHAPES } from './seed-notification.js'
import { waitForStack } from './wait-for-stack.js'

const HTTP_OK = 200

const origin = process.env.LIGHTHOUSE_BASE_URL ?? 'http://localhost:3000'

const launchBrowser = () =>
  puppeteer.launch({
    args: ['--no-sandbox', '--disable-gpu']
  })

const signedInCookies = async () => {
  const browser = await launchBrowser()
  try {
    await signIn(browser, { url: origin })
    const { hostname } = new URL(origin)
    return (await browser.cookies()).filter(({ domain }) =>
      hostname.endsWith(domain.replace(/^\./, ''))
    )
  } finally {
    await browser.close()
  }
}

/** Walk each shape in a real browser so redirects, session cookies and the
 * opening run match production — the fetch client deep-linked pages and hit
 * intermittent 404s at import-purpose in CI. */
const seedNotifications = async () => {
  const browser = await launchBrowser()
  try {
    await signIn(browser, { url: origin })
    const page = await browser.newPage()
    const journeyIds = {}
    for (const [name, shape] of Object.entries(SEED_SHAPES)) {
      const journeyId = await createNotificationInBrowser(page, origin)
      await fillNotificationInBrowser(page, origin, journeyId, shape)
      if (shape.submit) {
        await submitNotificationInBrowser(page, origin, journeyId)
      }
      journeyIds[name] = journeyId
    }
    return journeyIds
  } finally {
    await browser.close()
  }
}

/** A page whose prerequisites are unmet redirects to the hub, so every URL is
 * re-fetched in a session that has NOT walked the journey — the same standing
 * Lighthouse itself has. */
const assertUrlsRenderTheirOwnPage = async (urls, cookies) => {
  const client = createJourneyClient(origin, cookies)
  const failures = []
  for (const url of urls) {
    const page = await client.document(url)
    if (page.status !== HTTP_OK) {
      failures.push(`${url} -> ${page.status} ${page.location ?? ''}`.trim())
    } else if (!page.heading) {
      failures.push(`${url} -> 200 but no heading`)
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Lighthouse targets do not render their own page:\n  ${failures.join('\n  ')}`
    )
  }
}

const write = (payload) => {
  mkdirSync(dirname(TARGETS_FILE.pathname), { recursive: true })
  writeFileSync(TARGETS_FILE, `${JSON.stringify(payload, null, 2)}\n`)
}

await waitForStack()
await ensureAddressBookHasAnAddress()
const journeyIds = await seedNotifications()
const urls = auditUrls(origin, journeyIds)
await assertUrlsRenderTheirOwnPage(urls, await signedInCookies())
write({ origin, journeyIds, urls, reports: reportNames(urls, journeyIds) })

const seeded = Object.entries(journeyIds)
  .map(([name, journeyId]) => `${name} ${journeyId}`)
  .join(', ')
process.stdout.write(
  `Lighthouse will audit ${urls.length} URLs on ${origin} (${seeded})\n`
)

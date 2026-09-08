import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'

import puppeteer from 'puppeteer'

import signIn from '../../tests/lighthouse/auth-setup.cjs'
import { auditUrls, reportNames, TARGETS_FILE } from './audit-targets.js'
import { createJourneyClient } from './journey-client.js'
import { ensureAddressBookHasAnAddress } from './seed-address-book.js'
import {
  createNotification,
  fillNotification,
  SEED_SHAPES,
  submitNotification
} from './seed-notification.js'

const HTTP_OK = 200

const origin = process.env.LIGHTHOUSE_BASE_URL ?? 'http://localhost:3000'

const signedInCookies = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-gpu']
  })
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

const seedNotifications = async (cookies) => {
  const client = createJourneyClient(origin, cookies)
  const journeyIds = {}
  for (const [name, shape] of Object.entries(SEED_SHAPES)) {
    const journeyId = await createNotification(client)
    await fillNotification(client, journeyId, shape)
    if (shape.submit) {
      await submitNotification(client, journeyId)
    }
    journeyIds[name] = journeyId
  }
  return journeyIds
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

await ensureAddressBookHasAnAddress()
const journeyIds = await seedNotifications(await signedInCookies())
const urls = auditUrls(origin, journeyIds)
await assertUrlsRenderTheirOwnPage(urls, await signedInCookies())
write({ origin, journeyIds, urls, reports: reportNames(urls, journeyIds) })

const seeded = Object.entries(journeyIds)
  .map(([name, journeyId]) => `${name} ${journeyId}`)
  .join(', ')
process.stdout.write(
  `Lighthouse will audit ${urls.length} URLs on ${origin} (${seeded})\n`
)

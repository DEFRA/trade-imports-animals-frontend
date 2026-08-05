import { expect, test } from '@playwright/test'

import { axeViolations } from '../../axe.e2e-helper.js'
import { copy } from '../copy/copy.en.js'
import {
  addDocument,
  documentsUrl,
  pdfFile,
  rowFor,
  settleScan,
  startAtDocuments
} from '../documents.e2e-helper.js'

const SAVE_AND_CONTINUE = 'Save and continue'
const PHYTO_STUCK = 'PHYTO-STUCK'
const PHYTO_CLEAN = 'PHYTO-CLEAN'
const PHYTO_INFECTED = 'PHYTO-INFECTED'
const PHYTO_POLLED = 'PHYTO-POLLED'
const PHYTO_POLLED_VIRUS = 'PHYTO-POLLED-VIRUS'
const PHYTO_SETTLED = 'PHYTO-SETTLED'
const PHYTO_OFFLINE = 'PHYTO-OFFLINE'

const announcer = (page) => page.locator('#js-scan-status-announcer')

const viewFileLink = (row, reference) =>
  row.getByRole('link', {
    name: `${copy.actions.viewFile} Phytosanitary certificate ${reference}`
  })

// A row whose file never settles keeps the poll alive, so the browser's own
// in-place update can be observed before the settled-page navigation replaces
// it with the server's rendering.
const addStuckRow = (page) =>
  addDocument(page, {
    reference: PHYTO_STUCK,
    file: pdfFile('never-scans.pdf')
  })

test.describe('plant-products document scan lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await startAtDocuments(page)
  })

  test('blocks continue while a scan is pending and releases it once clean', async ({
    page
  }) => {
    await addDocument(page, {
      reference: PHYTO_CLEAN,
      file: pdfFile('phyto.pdf')
    })
    await expect(rowFor(page, PHYTO_CLEAN)).toContainText(copy.status.checking)

    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).toHaveURL((url) => documentsUrl.test(url.pathname))
    await expect(page.getByRole('alert')).toContainText(
      copy.errors.cannotContinue
    )

    await settleScan(page, PHYTO_CLEAN, copy.status.safe)

    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))
  })

  test('names the infected file, keeps its bytes hidden and allows removal', async ({
    page
  }) => {
    const filename = 'virus.pdf'
    await addDocument(page, {
      reference: PHYTO_INFECTED,
      file: pdfFile(filename)
    })
    await settleScan(page, PHYTO_INFECTED, copy.status.virus)

    const alert = page.getByRole('alert')
    await expect(alert).toContainText(copy.errors.virus(filename))
    await alert.getByRole('link', { name: copy.errors.virus(filename) }).click()
    await expect(page.locator('#documents-added')).toBeFocused()

    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).toHaveURL((url) => documentsUrl.test(url.pathname))

    await page
      .getByRole('button', {
        name: `${copy.actions.remove} Phytosanitary certificate PHYTO-INFECTED`
      })
      .click()
    await expect(rowFor(page, PHYTO_INFECTED)).toHaveCount(0)

    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))
  })

  test('a row with no file is never presented as a scan verdict', async ({
    page
  }) => {
    await addDocument(page, { type: 'AIR_WAYBILL', reference: 'AIR-NOFILE' })

    const row = rowFor(page, 'AIR-NOFILE')
    await expect(row).toContainText(copy.status.noFile)
    await expect(row).not.toContainText(copy.status.safe)
    await expect(row).not.toContainText(copy.status.checking)
    await expect(
      page.getByRole('link', { name: copy.actions.refresh })
    ).toHaveCount(0)
  })

  test('settles one checking row in place, announces it and leaves the other checking', async ({
    page
  }) => {
    test.slow()
    await addDocument(page, {
      reference: PHYTO_POLLED,
      file: pdfFile('phyto.pdf')
    })
    await addStuckRow(page)

    const settling = rowFor(page, PHYTO_POLLED)
    const stuck = rowFor(page, PHYTO_STUCK)
    await expect(settling).toContainText(copy.status.checking)

    const remove = settling.getByRole('button', {
      name: `${copy.actions.remove} Phytosanitary certificate PHYTO-POLLED`
    })
    await remove.focus()
    await expect(settling).toContainText(copy.status.safe)
    await expect(remove).toBeFocused()
    await expect(
      page.getByRole('link', { name: copy.actions.refresh })
    ).toBeHidden()

    await expect(stuck).toContainText(copy.status.checking)
    await expect(viewFileLink(settling, PHYTO_POLLED)).toBeVisible()
    await expect(announcer(page)).toHaveText(copy.announcements.safe)
  })

  test('never offers a file the scan rejected, however the row settled', async ({
    page
  }) => {
    test.slow()
    await addDocument(page, {
      reference: PHYTO_POLLED_VIRUS,
      file: pdfFile('virus.pdf')
    })
    await addStuckRow(page)

    const rejected = rowFor(page, PHYTO_POLLED_VIRUS)
    await expect(rejected).toContainText(copy.status.checking)

    await expect(rejected).toContainText(copy.status.virus)
    await expect(viewFileLink(rejected, PHYTO_POLLED_VIRUS)).toHaveCount(0)
    await expect(announcer(page)).toHaveText(copy.announcements.virus)
    await expect(
      page.getByRole('button', {
        name: `${copy.actions.remove} Phytosanitary certificate PHYTO-POLLED-VIRUS`
      })
    ).toBeVisible()
  })

  test('re-renders from the server once every scan has settled', async ({
    page
  }) => {
    test.slow()
    await addDocument(page, {
      reference: PHYTO_SETTLED,
      file: pdfFile('phyto.pdf')
    })
    await expect(rowFor(page, PHYTO_SETTLED)).toContainText(
      copy.status.checking
    )

    await page.waitForURL(/[?&]attempt=1(&|$)/)
    await expect(page).toHaveURL((url) => documentsUrl.test(url.pathname))
    await expect(rowFor(page, PHYTO_SETTLED)).toContainText(copy.status.safe)

    await page.getByRole('button', { name: SAVE_AND_CONTINUE }).click()
    await expect(page).not.toHaveURL((url) => documentsUrl.test(url.pathname))
  })

  // 10 attempts at 3 seconds is the shared ceiling from scan-poll.js. Once the
  // script stops working on the user's behalf, the manual link it borrowed has
  // to come back — a page that says "refresh" with nothing to click is a dead end.
  test('hands the manual refresh link back when polling times out', async ({
    page
  }) => {
    test.slow()
    await addStuckRow(page)

    const stuck = rowFor(page, PHYTO_STUCK)
    await expect(stuck).toContainText(copy.status.checking)
    const refresh = page.getByRole('link', { name: copy.actions.refresh })
    await expect(refresh).toBeHidden()

    const timeoutHint = page.locator('#js-timeout-message')
    await expect(timeoutHint).toHaveCount(1)
    await expect(timeoutHint).toBeVisible({ timeout: 45_000 })
    await expect(timeoutHint).toHaveText(copy.refreshTimeout)
    await expect(refresh).toBeVisible()

    await refresh.click()
    await expect(page).toHaveURL(/[?&]attempt=/)
    await expect(rowFor(page, PHYTO_STUCK)).toContainText(copy.status.checking)
  })

  test('polls from a trailing-slash URL the server still serves', async ({
    page
  }) => {
    test.slow()
    await addDocument(page, {
      reference: 'PHYTO-SLASH',
      file: pdfFile('phyto.pdf')
    })
    await addStuckRow(page)
    const [pathname] = page.url().split('?')
    await page.goto(`${pathname}/`)
    const settling = rowFor(page, 'PHYTO-SLASH')
    await expect(settling).toContainText(copy.status.checking)
    await expect(settling).toContainText(copy.status.safe)
  })

  // A read that fails is not evidence that a scan finished. hasSettled() is
  // vacuously true for an empty list, so a reader that answered [] instead of
  // null would reload the page every three seconds with the scan still running.
  const countStatusReads = async (page, handler) => {
    let reads = 0
    await page.route('**/accompanying-documents/status', (route) => {
      reads += 1
      return handler(route)
    })
    return () => reads
  }

  test('retries a refused status read and never settles the row on it', async ({
    page
  }) => {
    const reads = await countStatusReads(page, (route) => route.abort())
    await addDocument(page, {
      reference: PHYTO_OFFLINE,
      file: pdfFile('phyto.pdf')
    })

    await expect.poll(reads, { timeout: 20_000 }).toBeGreaterThanOrEqual(2)
    await expect(rowFor(page, PHYTO_OFFLINE)).toContainText(
      copy.status.checking
    )
    await expect(rowFor(page, PHYTO_OFFLINE)).not.toContainText(
      copy.status.safe
    )
    await expect(page).toHaveURL((url) => !url.search.includes('attempt='))
  })

  test('retries an unusable status response and never settles the row on it', async ({
    page
  }) => {
    const reads = await countStatusReads(page, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{}'
      })
    )
    await addDocument(page, {
      reference: 'PHYTO-BROKEN',
      file: pdfFile('phyto.pdf')
    })

    await expect.poll(reads, { timeout: 20_000 }).toBeGreaterThanOrEqual(2)
    await expect(rowFor(page, 'PHYTO-BROKEN')).toContainText(
      copy.status.checking
    )
    await expect(page).toHaveURL((url) => !url.search.includes('attempt='))
  })

  test('announces every verdict when two rows settle in the same poll', async ({
    page
  }) => {
    test.slow()
    await addDocument(page, {
      reference: 'PHYTO-BATCH-CLEAN',
      file: pdfFile('phyto.pdf')
    })
    await addDocument(page, {
      reference: 'PHYTO-BATCH-VIRUS',
      file: pdfFile('virus.pdf')
    })
    await addStuckRow(page)

    await expect(rowFor(page, 'PHYTO-BATCH-CLEAN')).toContainText(
      copy.status.safe
    )
    await expect(rowFor(page, 'PHYTO-BATCH-VIRUS')).toContainText(
      copy.status.virus
    )
    await expect(announcer(page)).toContainText(copy.announcements.safe)
    await expect(announcer(page)).toContainText(copy.announcements.virus)
  })

  test('a polling page has no serious or critical axe violations', async ({
    page
  }) => {
    test.slow()
    await addDocument(page, {
      reference: 'PHYTO-AXE',
      file: pdfFile('phyto.pdf')
    })
    await addStuckRow(page)
    await expect(rowFor(page, 'PHYTO-AXE')).toContainText(copy.status.safe)

    const { all, seriousOrCritical } = await axeViolations(page)

    expect(
      seriousOrCritical,
      `Accompanying documents polling page has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
    await expect(announcer(page)).not.toBeFocused()
  })
})

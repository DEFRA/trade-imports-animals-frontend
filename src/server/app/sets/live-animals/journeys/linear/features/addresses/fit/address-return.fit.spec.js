import { expect, test } from '@playwright/test'

import {
  BASE,
  journeyUrl,
  signIn,
  startNotification,
  unlockSections
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { STUB_BOOK } from '../../../../../../../services/address-book/stub/index.js'
import { SESSION_COOKIE_NAMES } from '../../../config.js'
import { consignor } from '../../../../../obligations/index.js'
import { ADDRESS_LANDING } from '../ins-handshake.js'
import { copy } from '../copy/copy.en.js'

const HANDSHAKE_TOKEN = 'fit-handshake-token'

const returnFromTheAddressBookWith = async (
  page,
  { fulfilmentId, addressId, landing }
) => {
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAMES.addressHandshakeTokens,
      value: Buffer.from(
        JSON.stringify({ [fulfilmentId]: HANDSHAKE_TOKEN })
      ).toString('base64'),
      domain: new URL(page.url()).hostname,
      path: BASE
    }
  ])
  const query = new URLSearchParams({
    'fulfilment-id': fulfilmentId,
    'handshake-token': HANDSHAKE_TOKEN,
    addressId,
    landing
  })
  await page.goto(`${journeyUrl(page, 'address-return')}?${query}`)
}

test('the added address banner on the Consignment addresses page is still shown ten seconds later and is gone after a reload', async ({
  page
}) => {
  const added = STUB_BOOK[1]
  const { title, text } = sharedCopy.addressHandshake.addedBanner
  const addressesHeading = page.getByRole('heading', { name: copy.hub.title })
  const addedBanner = page.getByRole('alert', { name: title })
  await page.clock.install()
  await signIn(page)
  await startNotification(page)
  await unlockSections(page)

  await returnFromTheAddressBookWith(page, {
    fulfilmentId: consignor.id,
    addressId: added.id,
    landing: ADDRESS_LANDING.SELECT
  })
  await expect(addressesHeading).toBeVisible()
  await expect(addedBanner).toContainText(text(added.name))

  await page.clock.runFor(10_000)
  await expect(addedBanner).toBeVisible()

  await page.reload()
  await expect(addressesHeading).toBeVisible()
  await expect(addedBanner).toHaveCount(0)
})

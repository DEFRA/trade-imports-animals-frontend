import { expect } from 'vitest'

import { addedAddressBannerCookie } from '../../../../../../engine/persistence/session.js'
import { driveHandler } from '../../../../../../engine/test-support.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'

const addedBannerCopy = () =>
  copyFor({ en: sharedEn, cy: sharedCy }).addressHandshake.addedBanner

export const addedAddressBannerState = (addressName) => ({
  [addedAddressBannerCookie()]: { name: addressName }
})

export const expectAddedAddressBannerShownOnce = async (getHandler) => {
  const addressName = 'New Farm'
  const afterAdding = await driveHandler(getHandler, {
    state: addedAddressBannerState(addressName),
    cookies: addedAddressBannerState(addressName)
  })
  const afterwards = await driveHandler(getHandler)

  expect(afterAdding.view.context.successBanner).toEqual({
    titleText: addedBannerCopy().title,
    text: addedBannerCopy().text.replace('{name}', addressName)
  })
  expect(afterAdding.cookies).not.toHaveProperty(addedAddressBannerCookie())
  expect(afterwards.view.context.successBanner).toBeNull()
}

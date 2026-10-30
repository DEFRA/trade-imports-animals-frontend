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

const cookiesLeftBy = (requestState, { cookies, unstated }) => ({
  ...Object.fromEntries(
    Object.entries(requestState).filter(([name]) => !unstated.includes(name))
  ),
  ...cookies
})

export const expectAddedAddressBannerShownOnce = async (getHandler) => {
  const addressName = 'New Farm'
  const firstState = addedAddressBannerState(addressName)
  const first = await driveHandler(getHandler, { state: firstState })
  const second = await driveHandler(getHandler, {
    journeyId: first.journeyId,
    state: cookiesLeftBy(firstState, first)
  })

  expect(first.view.context.successBanner).toEqual({
    titleText: addedBannerCopy().title,
    text: addedBannerCopy().text.replace('{name}', addressName)
  })
  expect(first.unstated).toEqual([addedAddressBannerCookie()])
  expect(second.view.context.successBanner).toBeNull()
}

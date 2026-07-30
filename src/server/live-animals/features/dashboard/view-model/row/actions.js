import { randomUUID } from 'node:crypto'
import { hubPath, pagePath } from '../../../../config.js'
import { AMEND, DRAFT, SUBMITTED } from '../../../../engine/index.js'
import { CYA_SLUG } from '../../../../shared/kit.js'
import { copyFor } from '../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as sharedEn } from '../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../shared/copy.cy.js'

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

export const rowActions = (journey) => {
  const copyAction = {
    text: sharedCopy.notificationActions.copy.text,
    postAction: pagePath(journey.journeyId, 'copy'),
    idempotencyKey: randomUUID(),
    copyOrigin: 'dashboard'
  }
  const deleteAction = {
    text: sharedCopy.notificationActions.delete.text,
    href: pagePath(journey.journeyId, 'delete')
  }
  if (journey.status === SUBMITTED) {
    return [
      {
        text: copy.actions.view,
        href: pagePath(journey.journeyId, CYA_SLUG)
      },
      {
        text: copy.actions.amend,
        postAction: pagePath(journey.journeyId, 'amend')
      },
      copyAction,
      deleteAction
    ]
  }
  if (journey.status === DRAFT) {
    return [
      {
        text: copy.actions.resume,
        href: hubPath(journey.journeyId)
      },
      copyAction,
      deleteAction
    ]
  }
  if (journey.status === AMEND) {
    return [
      {
        text: copy.actions.resume,
        href: hubPath(journey.journeyId)
      },
      copyAction,
      {
        text: copy.actions.cancelAmend,
        href: pagePath(journey.journeyId, 'cancel-amend')
      },
      deleteAction
    ]
  }
  return []
}

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import {
  driveHandler,
  postHandlerEndingWith
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as documentsEntry from './entry.controller.js'

const postAdd = postHandlerEndingWith(
  documentsEntry,
  'accompanying-documents/add'
)

describe('POST documents/entry — invalid payload', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render an unreal date of issue with its message and append nothing', () => {
    const result = driveHandler(postAdd, {
      payload: {
        'accompanyingDocumentDateOfIssue-day': '31',
        'accompanyingDocumentDateOfIssue-month': '2',
        'accompanyingDocumentDateOfIssue-year': '2000'
      }
    })
    expect(
      result.view.context.errors['accompanyingDocumentDateOfIssue-day']
    ).toBe('Enter a real date of issue')
    expect(result.after).toEqual(result.before)
  })
})

import { SET_ID } from '../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../config/nunjucks/nunjucks.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { store } from '../../../../../engine/store.js'
import { configureRecords } from '../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../engine/persistence/session.js'
import { configureReadyForCheckYourAnswers } from '../../../../../engine/read.js'
import { records as recordsStub } from '../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../services/persistence/session/stub.js'
import {
  amendmentOpened,
  driveHandler
} from '../../../../../engine/test-support.js'
import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { copy as sharedEn } from '../../../../../shared/copy.en.js'
import { characterisationCorpus } from '../fixtures/characterisation-corpus.js'
import { taskRows } from '../flow/task-rows.js'
import { allRoutes, dispatchPages } from './index.js'
import { originPage } from './origin/page.js'
import { cphNumberPage } from './cph-number/page.js'
import { additionalDetailsPage } from './additional-details/page.js'

const environment = nunjucksConfig.options.compileOptions.environment

const requestWideContext = {
  assetPath: '/public/assets',
  getAssetPath: (asset) => `/public/${asset}`,
  userSession: { isAuthenticated: true, displayName: 'Andrew Farmer' }
}

const comprehensive = characterisationCorpus.find(
  ({ name }) => name === 'comprehensive'
).answers

const taskRowPages = taskRows.flatMap((row) => row.pages)

const pageGetHandler = (page) =>
  allRoutes.find(
    (route) =>
      route.method === 'GET' &&
      route.path.endsWith(`/notifications/{journeyId}/${page.slug}`)
  ).handler

const renderPage = async (page, startingFrom) => {
  const { journeyId, view } = await driveHandler(pageGetHandler(page), {
    seed: comprehensive,
    startingFrom,
    pathOf: (id) => pagePath(id, page.slug)
  })
  return {
    journeyId,
    html: environment.render(`${view.view}.njk`, {
      ...requestWideContext,
      ...view.context
    })
  }
}

const JOURNEY_PLACEHOLDER = 'JOURNEY'
const UPLOAD_PLACEHOLDER = '/upload'
const UPLOAD_PATH = /\/stub-upload-and-scan\/[0-9a-f-]+/g

const SAVE_CONTROLS = new RegExp(
  '<div class="govuk-button-group">[\\s\\S]*?</div>' +
    '(\\s*<p class="govuk-body">\\s*<a class="govuk-link"[^>]*>[^<]*</a>\\s*</p>)?',
  'g'
)

const saveControlsOf = ({ html, journeyId }) =>
  [...html.matchAll(SAVE_CONTROLS)]
    .map(([controls]) =>
      controls
        .replaceAll(journeyId, JOURNEY_PLACEHOLDER)
        .replaceAll(UPLOAD_PATH, UPLOAD_PLACEHOLDER)
    )
    .join('\n')

const buttonLabelsOf = (controls) =>
  [...controls.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map(([, label]) =>
    label.trim()
  )

describe('save controls on task-row pages while amending', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
    configureReadyForCheckYourAnswers(SET_ID, () => true)
  })
  beforeEach(() => store.clear())

  it.each(taskRowPages.map((page) => [page.id, page]))(
    'Should end the %s page with exactly the controls it shows on a draft',
    async (_id, page) => {
      const draft = await renderPage(page, [])
      const amending = await renderPage(page, [amendmentOpened()])

      expect(saveControlsOf(amending)).toBe(saveControlsOf(draft))
    }
  )

  it('Should offer Save and continue, Save and return to overview and a link to cancel back to the overview', async () => {
    const amending = await renderPage(additionalDetailsPage, [
      amendmentOpened()
    ])
    const controls = saveControlsOf(amending)

    expect(buttonLabelsOf(controls)).toEqual([
      sharedEn.saveActions.saveAndContinue,
      sharedEn.saveActions.saveAndReturnToHub
    ])
    expect(controls).toContain('value="hub" name="exit"')
    expect(controls).toContain(
      `<a class="govuk-link" href="${hubPath(JOURNEY_PLACEHOLDER)}">${sharedEn.saveActions.cancelAndReturnToHub}</a>`
    )
  })

  it.each([originPage, cphNumberPage])(
    'Should end the $id page with Save and continue alone',
    async (page) => {
      const amending = await renderPage(page, [amendmentOpened()])
      const controls = saveControlsOf(amending)

      expect(buttonLabelsOf(controls)).toEqual([
        sharedEn.saveActions.saveAndContinue
      ])
      expect(controls).not.toContain('<a ')
    }
  )
})

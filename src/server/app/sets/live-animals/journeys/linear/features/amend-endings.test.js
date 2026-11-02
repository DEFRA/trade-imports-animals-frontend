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
import { driveHandler } from '../../../../../engine/test-support.js'
import { pagePath } from '../../../../../shared/paths.js'
import { characterisationCorpus } from '../fixtures/characterisation-corpus.js'
import { taskRows } from '../flow/task-rows.js'
import { allRoutes, dispatchPages } from './index.js'
import { documentsPage } from './documents/page.js'

const environment = nunjucksConfig.options.compileOptions.environment

// What the global Nunjucks context adds to every rendered page.
const requestWideContext = {
  assetPath: '/public/assets',
  getAssetPath: (asset) => `/public/${asset}`,
  userSession: { isAuthenticated: true, displayName: 'Andrew Farmer' }
}

const comprehensive = characterisationCorpus.find(
  ({ name }) => name === 'comprehensive'
).answers

const taskRowPages = taskRows.flatMap((row) => row.pages)
const pagesPostingToThemselves = taskRowPages.filter(
  (page) => page.id !== documentsPage.id
)

const pageGetHandler = (page) =>
  allRoutes.find(
    (route) =>
      route.method === 'GET' &&
      route.path.endsWith(`/notifications/{journeyId}/${page.slug}`)
  ).handler

const renderAmending = async (page) => {
  const { journeyId, view } = await driveHandler(pageGetHandler(page), {
    seed: comprehensive,
    amend: true,
    pathOf: (id) => pagePath(id, page.slug)
  })
  return {
    path: pagePath(journeyId, page.slug),
    html: environment.render(`${view.view}.njk`, {
      ...requestWideContext,
      ...view.context
    })
  }
}

describe('amend endings on task-row pages that post to themselves', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
    configureReadyForCheckYourAnswers(SET_ID, () => true)
  })
  beforeEach(() => store.clear())

  it.each(pagesPostingToThemselves.map((page) => [page.id, page]))(
    'Should end the %s page with Save and return to the review while amending',
    async (_id, page) => {
      const { path, html } = await renderAmending(page)

      expect(html).toContain(`formaction="${path}?change=1"`)
      expect(html).toContain(`formaction="${path}"`)
    }
  )

  it('Should end the accompanying-documents page with the amend Save and return posting its choice to the upload service', async () => {
    const { path, html } = await renderAmending(documentsPage)

    const saveAndReturn = html
      .split('<button')
      .find((fragment) => />\s*Save and return\s*</.test(fragment))

    expect(saveAndReturn).toContain('name="amendSave"')
    expect(saveAndReturn).toContain('value="return"')
    expect(saveAndReturn).toContain('formenctype="multipart/form-data"')
    expect(saveAndReturn).not.toContain(`formaction="${path}?change=1"`)
  })
})

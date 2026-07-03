import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluate, pageViewModel } from '../../contract/index.js'
import { loadJourneyModel } from '../../engine/index.js'
import { LAYOUT } from '../../journey/config.js'
import { slotViews } from '../../lib/fields/index.js'
import { render } from '../../templates/test-helpers.js'

/**
 * The walker's rendering seam (TEST-2/7/12): a fixture journey goes
 * through the REAL contract projection (`evaluate` + `pageViewModel`)
 * into the REAL nunjucks environment (templates/test-helpers.js mirrors
 * src/config/nunjucks roots), so the alignment walker sees the exact
 * markup the app serves. Fixtures are name-keyed value maps, dump.js
 * style; `$comment` keys are documentation, not data.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const statesDir = path.join(dirname, '..', 'fixtures', 'states')
const TEST_CRUMB = 'test-crumb'
const FIXTURE_JOURNEY_ID = '00000000-0000-4000-8000-000000000000'

/** Parse one tests/fixtures/states fixture, dropping `$comment`. */
export const readStateFixture = (name) => {
  const { $comment, ...values } = JSON.parse(
    fs.readFileSync(path.join(statesDir, name), 'utf8')
  )
  return values
}

/** Name-keyed fixture values -> a synthetic Journey envelope. */
export const journeyFrom = (values = {}) => {
  const { identifiers } = loadJourneyModel()
  const fulfilments = Object.fromEntries(
    Object.entries(values).map(([name, value]) => {
      const record = identifiers.recordOfName(name)
      return [record.id, record.cardinality === 'indexed' ? value : { value }]
    })
  )
  return {
    journeyId: FIXTURE_JOURNEY_ID,
    status: 'in-progress',
    submittedAt: null,
    fulfilments
  }
}

/** Contract evaluation over a name-keyed fixture. */
export const evaluationFor = (values) => evaluate(journeyFrom(values))

/**
 * Render one Flow Page exactly as the route would: contract view-model
 * plus the layout, error summary and crumb. Returns the html AND the
 * view-model so the walker can assert on both sides of the render.
 */
export const renderFlowPage = (pageId, evaluation, options = {}) => {
  const { fieldErrors = null, errorSummary = [] } = options
  const viewModel = pageViewModel(pageId, evaluation, fieldErrors)
  const html = render(`${viewModel.template}.njk`, {
    ...viewModel,
    layout: LAYOUT,
    errorSummary,
    crumb: TEST_CRUMB
  })
  return { html, viewModel }
}

/**
 * Render the claims add sub-page the way routes/claims.js does: the
 * page's presentsForEach entries projected as plain-named slots (the add
 * form posts bare obligation names — orchestrator addFulfilment reads
 * values keyed by name, no fulfilment id yet).
 */
export const renderClaimsAdd = (page) => {
  const { identifiers } = loadJourneyModel()
  const slots = (page.presentsForEach ?? []).map((entry) => {
    const record = identifiers.recordOfId(entry.obligation)
    return {
      inputName: record.name,
      type: record.type,
      constraints: record.constraints,
      label: entry.label,
      hint: entry.hint,
      options: entry.options
    }
  })
  const html = render(`${page.addPage.template}.njk`, {
    layout: LAYOUT,
    heading: page.addPage.heading,
    buttonText: page.addPage.buttonText,
    crumb: TEST_CRUMB,
    fields: slotViews(slots)
  })
  return { html, slots }
}

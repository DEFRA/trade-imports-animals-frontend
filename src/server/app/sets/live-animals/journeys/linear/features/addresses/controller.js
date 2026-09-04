import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { isCphApplicable } from '../cph-number/controller.js'
import { addressesPage as page } from './page.js'
import { PARTIES } from './parties.js'
import { resolveParties } from './resolve-parties.js'
import { frozenPartiesOf } from './frozen-parties.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = {
  ...page,
  collects: [
    'consignor',
    'placeOfDestination',
    'placeOfOrigin',
    'consignee',
    'importer'
  ]
}
const view = `${TEMPLATES}/features/addresses/template`

const copy = copyFor({ en, cy }).hub

const CPH_ROW = {
  ...copy.cph,
  slug: 'cph-number?return=addresses'
}

const hubRow = (href, { title, hint }, valueText) => ({
  key: {
    html: `<span>${title}</span><span class="govuk-hint govuk-!-display-block govuk-!-margin-bottom-0">${hint}</span>`
  },
  value: { text: valueText ?? copy.notAddedYet },
  actions: {
    items: [
      {
        href,
        text: valueText ? copy.change : copy.add,
        visuallyHiddenText: title.toLowerCase()
      }
    ]
  }
})

// A party row keeps change context so the picker can hand the trader back here
// and this page's Continue can return them to check your answers. The CPH row
// does not: its slug already carries `?return=addresses`, and it is a different
// obligation reached by its own route.
const rows = (request, journeyId, answers, parties) => [
  ...PARTIES.map((party) =>
    hubRow(
      kit.withChangeContext(request, pagePath(journeyId, party.slug)),
      party,
      parties[party.id]?.name
    )
  ),
  ...(isCphApplicable(answers)
    ? [
        hubRow(
          pagePath(journeyId, CPH_ROW.slug),
          CPH_ROW,
          answers.countyParishHoldingCph
        )
      ]
    : [])
]

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const parties = journey.frozenParties
    ? frozenPartiesOf(journey.frozenParties)
    : await resolveParties(request, answers)
  // Reached from a Change link, Back has to return to the summary that sent the
  // trader here rather than dropping them on the task list.
  const backLink = kit.changeContext(request)
    ? pagePath(journey.journeyId, kit.CYA_SLUG)
    : hubPath(journey.journeyId)
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink,
      journey,
      page
    }),
    copy,
    rows: rows(request, journey.journeyId, answers, parties)
  })
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

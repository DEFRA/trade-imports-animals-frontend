import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { addressesPage as page } from './page.js'
import { PARTIES } from './parties.js'
import { partiesFromStoredAnswers } from './frozen-parties.js'
import { partyEditHref } from './party-edit/edit-href.js'
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

const CPH_OBLIGATION = 'countyParishHoldingCph'

const CPH_ROW = {
  ...copy.cph,
  slug: 'cph-number?return=addresses'
}

const hubRow = (href, { title, hint }, valueText, editHref) => ({
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
      },
      ...(valueText && editHref
        ? [
            {
              href: editHref,
              text: copy.editDetails,
              visuallyHiddenText: title.toLowerCase()
            }
          ]
        : [])
    ]
  }
})

const rows = (request, journeyId, answers, scope, parties) => [
  ...PARTIES.map((party) =>
    hubRow(
      kit.withChangeContext(request, pagePath(journeyId, party.slug)),
      party,
      parties[party.id]?.name,
      partyEditHref(journeyId, party, 'addresses', {
        change: kit.changeContext(request)
      })
    )
  ),
  ...(scope.has(CPH_OBLIGATION)
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
  const { journey, answers, scope } = await state.get(request, h)
  const parties = await partiesFromStoredAnswers(answers)
  const backLink =
    kit.changeContext(request) && journey.status !== state.AMEND
      ? pagePath(journey.journeyId, kit.CYA_SLUG)
      : hubPath(journey.journeyId)
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink,
      journey,
      page
    }),
    copy,
    rows: rows(request, journey.journeyId, answers, scope, parties)
  })
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

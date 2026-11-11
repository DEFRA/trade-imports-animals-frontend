import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { addressesPage as page } from './page.js'
import { cphNumberPage } from '../cph-number/page.js'
import { PARTIES } from './parties.js'
import { partiesFromStoredAnswers } from './frozen-parties.js'
import { partyEditHref } from './party-edit/edit-href.js'
import { insetAddressLines } from './party-picker/view-model/address-lines.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { takeAddedAddressBanner } from './ins-handshake.js'

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

const hubSection = ({ id, title, hint, add, chosen }) => ({
  id,
  title,
  hint,
  hiddenSuffix: title.toLowerCase(),
  ...(chosen ? { chosen } : { addLink: add })
})

const partySectionBuilder = (request, journeyId, parties) => (party) => {
  const held = parties[party.id]
  const href = kit.carryTrail(request, pagePath(journeyId, party.slug))
  return hubSection({
    id: party.id,
    title: party.title,
    hint: party.hint,
    add: { href, text: party.add },
    chosen: held && {
      name: held.name,
      lines: insetAddressLines(held),
      changeHref: href,
      editDetailsHref: partyEditHref(
        journeyId,
        party,
        'addresses',
        kit.requestTrail(request)
      )
    }
  })
}

const cphSection = (request, journeyId, answers) => {
  const href = kit.carryTrail(
    request,
    kit.withReturnMarker(pagePath(journeyId, cphNumberPage.slug), page.slug)
  )
  const cphNumber = answers.countyParishHoldingCph
  return hubSection({
    id: 'cph',
    title: copy.cph.title,
    hint: copy.cph.hint,
    add: { href, text: copy.cph.add },
    chosen: cphNumber && { lines: [cphNumber], changeHref: href }
  })
}

const sections = (request, journeyId, answers, scope, parties) => [
  ...PARTIES.map(partySectionBuilder(request, journeyId, parties)),
  ...(scope.has('countyParishHoldingCph')
    ? [cphSection(request, journeyId, answers)]
    : [])
]

const get = async (request, h) => {
  const { journey, answers, scope } = await state.get(request, h)
  const parties = await partiesFromStoredAnswers(answers)
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: kit.trailBackLink(request),
      journey,
      page,
      successBanner: takeAddedAddressBanner(request, h)
    }),
    copy,
    sections: sections(request, journey.journeyId, answers, scope, parties)
  })
}

const post = async (request, h) => {
  const { scope } = await state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

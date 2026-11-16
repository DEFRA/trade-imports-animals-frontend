import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { addressesPage as page } from './page.js'
import { cphNumberPage } from '../cph-number/page.js'
import { permanentAddressPage } from '../permanent-address/page.js'
import {
  anyLineNeedsPermanentAddress,
  PLACE_OF_DESTINATION
} from '../permanent-address/cards.js'
import { permanentAddressesFromStoredAnswers } from '../permanent-address/saved-addresses.js'
import { PARTIES } from './parties.js'
import { partiesFromStoredAnswers } from './frozen-parties.js'
import { copyOfStoredParty } from './party-inline.js'
import { partyEditHref } from './party-edit/edit-href.js'
import { insetAddressLines } from './party-picker/view-model/address-lines.js'
import {
  isSameAsAction,
  sameAsActionFor,
  sameAsTargetIdOf,
  sourcePartyIdFor
} from './same-as-action.js'
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

const hubSection = ({ id, title, hint, bullets, add, chosen, sameAs }) => ({
  id,
  title,
  hint,
  bullets,
  hiddenSuffix: title.toLowerCase(),
  ...(chosen ? { chosen } : { addLink: add, ...(sameAs && { sameAs }) })
})

const sameAsControl = (party, parties) => {
  const sourcePartyId = sourcePartyIdFor(party.id)
  const sourceParty = sourcePartyId && parties[sourcePartyId]
  return (
    sourceParty && {
      label: copy.sameAs[sourcePartyId],
      value: sameAsActionFor(party.id)
    }
  )
}

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
    },
    sameAs: sameAsControl(party, parties)
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

const oneAddressCoversEveryAddressableAnimal = (permanentAddresses) =>
  permanentAddresses.length === 1 ||
  permanentAddresses.every(
    ({ permanentAddressOrigin }) =>
      permanentAddressOrigin === PLACE_OF_DESTINATION
  )

const oneAddressChosen = (permanentAddress, href) => ({
  name: permanentAddress.name,
  lines: insetAddressLines(permanentAddress),
  changeHref: href
})

const countOfAnimalsChosen = (count, href) => ({
  lines: [copy.permanentAddress.addedForAnimals(count)],
  changeHref: href
})

const permanentAddressSection = (
  request,
  journeyId,
  answers,
  evaluation,
  permanentAddresses
) => {
  if (!anyLineNeedsPermanentAddress(answers, evaluation)) {
    return null
  }
  const href = kit.carryTrail(
    request,
    kit.withReturnMarker(
      pagePath(journeyId, permanentAddressPage.slug),
      page.slug
    )
  )
  const everyAnimalAnswered =
    permanentAddresses.length > 0 &&
    permanentAddresses.every(({ permanentAddress }) => permanentAddress)
  return hubSection({
    id: 'permanentAddress',
    title: copy.permanentAddress.title,
    hint: copy.permanentAddress.leadIn,
    bullets: copy.permanentAddress.bullets,
    add: { href, text: copy.permanentAddress.add },
    chosen:
      everyAnimalAnswered &&
      (oneAddressCoversEveryAddressableAnimal(permanentAddresses)
        ? oneAddressChosen(permanentAddresses[0].permanentAddress, href)
        : countOfAnimalsChosen(permanentAddresses.length, href))
  })
}

const sections = (
  request,
  journeyId,
  answers,
  scope,
  parties,
  evaluation,
  permanentAddresses
) => [
  ...PARTIES.map(partySectionBuilder(request, journeyId, parties)),
  ...(scope.has('countyParishHoldingCph')
    ? [cphSection(request, journeyId, answers)]
    : []),
  ...[
    permanentAddressSection(
      request,
      journeyId,
      answers,
      evaluation,
      permanentAddresses
    )
  ].filter(Boolean)
]

const renderAddresses = async (
  request,
  h,
  { recoverableError = false, successBanner = null } = {}
) => {
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  const [parties, permanentAddresses] = await Promise.all([
    partiesFromStoredAnswers(answers),
    permanentAddressesFromStoredAnswers(answers, evaluation)
  ])
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: kit.trailBackLink(request),
      journey,
      page,
      recoverableError,
      successBanner
    }),
    copy,
    sections: sections(
      request,
      journey.journeyId,
      answers,
      scope,
      parties,
      evaluation,
      permanentAddresses
    )
  })
}

const get = (request, h) =>
  renderAddresses(request, h, {
    successBanner: takeAddedAddressBanner(request, h)
  })

const addressesHref = (request) =>
  kit.carryTrail(request, pagePath(request.params.journeyId, page.slug))

export const SAME_AS_REFUSAL = Object.freeze({
  pairNotOffered: 'same-as-pair-not-offered',
  sourceEmpty: 'same-as-source-empty',
  targetAlreadyHeld: 'same-as-target-already-held'
})

const refuseSameAs = (request, h, { targetPartyId, sourcePartyId, reason }) => {
  kit.logRefusal(request, { reason, targetPartyId, sourcePartyId })
  return h.redirect(addressesHref(request))
}

const postSameAs = async (request, h, targetPartyId) => {
  const sourcePartyId = sourcePartyIdFor(targetPartyId)
  if (!sourcePartyId) {
    return refuseSameAs(request, h, {
      targetPartyId,
      reason: SAME_AS_REFUSAL.pairNotOffered
    })
  }

  const { answers } = await state.get(request, h)
  const sourceAnswer = answers[sourcePartyId]
  if (!sourceAnswer?.name) {
    return refuseSameAs(request, h, {
      targetPartyId,
      sourcePartyId,
      reason: SAME_AS_REFUSAL.sourceEmpty
    })
  }
  if (answers[targetPartyId]?.name) {
    return refuseSameAs(request, h, {
      targetPartyId,
      sourcePartyId,
      reason: SAME_AS_REFUSAL.targetAlreadyHeld
    })
  }

  const { failure } = await kit.recoverableSave(
    request,
    () =>
      state.commit(request, h, {
        [targetPartyId]: copyOfStoredParty(sourceAnswer)
      }),
    async () =>
      (await renderAddresses(request, h, { recoverableError: true })).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      ),
    { targetPartyId, sourcePartyId }
  )
  if (failure) {
    return failure
  }

  return h.redirect(addressesHref(request))
}

const post = async (request, h) => {
  const action = String(request.payload?.action ?? '')
  if (isSameAsAction(action)) {
    return postSameAs(request, h, sameAsTargetIdOf(action))
  }
  const { scope } = await state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })

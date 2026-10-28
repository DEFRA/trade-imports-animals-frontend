import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
import {
  CYA_SLUG,
  errorSummary,
  journeyStrip,
  pageRoutes
} from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../shared/copy.cy.js'
import { buildSections } from './view-model/index.js'
import { changeHref } from './view-model/rows/change-link.js'
import { invalidPartyErrors } from './view-model/invalid-parties.js'
import {
  cardAnchorHref,
  incompleteCardErrors,
  REVIEW_CARDS,
  withCardErrors
} from './view-model/incomplete-cards.js'
import { cardStoredErrors } from '../../flow/stored-answers.js'
import { partiesFromStoredAnswers } from '../addresses/frozen-parties.js'
import { partyOf } from '../addresses/parties.js'
import { partyEditHref } from '../addresses/party-edit/edit-href.js'
import { documentScanCardErrors, speciesCardErrors } from './refusal.js'
import { recordReviewed } from './reviewed.js'
import { declarationPage } from '../declaration/page.js'

const view = `${TEMPLATES}/features/check-answers/template`

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const PARTY_KEY_PREFIX = 'party:'

const reviewErrorSummary = (
  journeyId,
  cardErrors,
  partyErrors,
  disableAutoFocus
) =>
  errorSummary(
    {
      ...Object.fromEntries(
        Object.entries(partyErrors).map(([id, text]) => [
          `${PARTY_KEY_PREFIX}${id}`,
          text
        ])
      ),
      ...cardErrors
    },
    {
      href: (key) =>
        key.startsWith(PARTY_KEY_PREFIX)
          ? partyEditHref(
              journeyId,
              partyOf(key.slice(PARTY_KEY_PREFIX.length)),
              CYA_SLUG
            )
          : (cardAnchorHref(key) ?? changeHref(journeyId, key)),
      disableAutoFocus
    }
  )

const backLinkFor = (journey) =>
  journey.status === state.SUBMITTED
    ? dashboardPath()
    : hubPath(journey.journeyId)

const renderCya = async (
  h,
  journey,
  {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled,
    recoverableError = false,
    parties = answers,
    partyErrors = {},
    cardErrors = {},
    disableAutoFocus = true
  }
) => {
  const sections = withCardErrors(
    await buildSections(
      answers,
      scope,
      evaluation,
      journey.journeyId,
      readOnly,
      parties,
      partyErrors
    ),
    cardErrors
  )
  return h.view(view, {
    pageTitle: copy.title,
    heading: copy.title,
    copy,
    sharedCopy,
    concurrencyToken: journey.concurrencyToken,
    declarationHref: pagePath(journey.journeyId, declarationPage.slug),
    journeyStrip: journeyStrip(journey),
    errorSummary: reviewErrorSummary(
      journey.journeyId,
      cardErrors,
      partyErrors,
      disableAutoFocus
    ),
    sections,
    readOnly,
    amendmentCancelled,
    recoverableError,
    copyAction: readOnly ? { href: pagePath(journey.journeyId, 'copy') } : null,
    deleteHref:
      readOnly && journey.status === state.SUBMITTED
        ? pagePath(journey.journeyId, 'delete')
        : null,
    backLink: backLinkFor(journey)
  })
}

const mergeCardErrorsByPrecedence = ({
  invalid,
  scan,
  species,
  incomplete
}) => ({
  ...invalid,
  ...scan,
  ...species,
  ...incomplete
})

export const renderNotificationView = async (
  request,
  h,
  { recoverableError = false } = {}
) => {
  const { journey, answers, storedAnswers, scope, evaluation } =
    await state.get(request, h)
  const readOnly = journey.status === state.SUBMITTED
  const refused = request.query.refused === '1'
  const hidesAnswerErrors =
    readOnly || (journey.status === state.AMEND && !refused)
  const parties = await partiesFromStoredAnswers(answers)
  const invalidCardErrors = hidesAnswerErrors
    ? {}
    : await cardStoredErrors(REVIEW_CARDS, answers, { request, storedAnswers })
  const scanDocErrors = hidesAnswerErrors
    ? {}
    : await documentScanCardErrors(request, answers, {
        includePending: refused
      })
  const speciesErrors =
    hidesAnswerErrors || !refused
      ? {}
      : await speciesCardErrors(journey, answers)
  return renderCya(h, journey, {
    answers,
    scope,
    evaluation,
    readOnly,
    amendmentCancelled: readOnly && request.query.cancelled === '1',
    recoverableError,
    parties,
    partyErrors: hidesAnswerErrors ? {} : await invalidPartyErrors(answers),
    cardErrors: hidesAnswerErrors
      ? {}
      : mergeCardErrorsByPrecedence({
          invalid: invalidCardErrors,
          scan: scanDocErrors,
          species: speciesErrors,
          incomplete: incompleteCardErrors(answers, scope, evaluation)
        }),
    disableAutoFocus: !refused
  })
}

const get = async (request, h) => {
  await completeOpeningRun(request, h, request.params.journeyId)
  const response = await renderNotificationView(request, h)
  const { journey } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    await recordReviewed(request, h, journey)
  }
  return response
}

export const routes = pageRoutes(page, { get })

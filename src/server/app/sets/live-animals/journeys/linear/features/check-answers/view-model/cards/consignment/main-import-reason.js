import * as countries from '../../../../../../../../../services/countries/index.js'
import * as importReasonPurpose from '../../../../../../../../../services/import-reason-purpose/index.js'
import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { importReasonPage } from '../../../../import-reason/page.js'
import {
  destinationCountryApplies,
  exitDateApplies,
  exitsAsTransit,
  portOfExitApplies,
  purposeApplies
} from '../../applicability.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

const destinationCountryRows = async (answers, scope) =>
  destinationCountryApplies(answers, scope)
    ? [
        row(
          copy.rows.destinationCountry,
          await countries.countryDisplayLabel(answers.destinationCountry)
        )
      ]
    : []

const exitDateRows = (answers, scope) =>
  exitDateApplies(answers, scope)
    ? [row(copy.rows.exitDate, dateText(answers.exitDate))]
    : []

const portLabelOf = async (answers) =>
  (await ports.label(answers.portOfExit)) ?? answers.portOfExit

const portRows = async (answers, scope, label) =>
  portOfExitApplies(answers, scope)
    ? [row(label, await portLabelOf(answers))]
    : []

const transitExitRows = async (answers, scope) => [
  ...(await portRows(answers, scope, copy.rows.exitBorderControlPost)),
  ...(await destinationCountryRows(answers, scope))
]

const otherExitRows = async (answers, scope) => [
  ...(await destinationCountryRows(answers, scope)),
  ...exitDateRows(answers, scope),
  ...(await portRows(answers, scope, copy.rows.portOfExit))
]

const exitRows = (answers, scope) =>
  exitsAsTransit(answers)
    ? transitExitRows(answers, scope)
    : otherExitRows(answers, scope)

export const mainImportReasonCard = async ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
  readOnly
}) => ({
  id: 'mainImportReason',
  title: copy.cards.mainImportReason,
  ...editableActions({
    readOnly,
    actions: changeAction(
      { journeyId, changeLinkTrail },
      importReasonPage.slug,
      copy.hidden.cards.mainImportReason
    )
  }),
  rows: [
    row(
      copy.rows.reasonForImport,
      importReasonPurpose.reasonLabel(answers.reasonForImport) ?? ''
    ),
    ...(purposeApplies(answers, scope)
      ? [
          row(
            copy.rows.purpose,
            importReasonPurpose.purposeLabel(answers.purposeInInternalMarket) ??
              ''
          )
        ]
      : []),
    ...(await exitRows(answers, scope))
  ]
})

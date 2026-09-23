import * as dashboard from './dashboard/controller.js'
import * as hub from './hub/controller.js'
import * as origin from './origin/controller.js'
import { validateStoredAnswers as originValidateStored } from './origin/validate-stored.js'
import * as commoditiesSearch from './commodities/search/search.controller.js'
import * as consignmentDetails from './commodities/consignment-details/consignment-details.controller.js'
import * as animalIdentification from './commodities/animal-identification/animal-identification.controller.js'
import * as importReason from './import-reason/controller.js'
import { validateStoredAnswers as importReasonValidateStored } from './import-reason/validate-stored.js'
import * as additionalDetails from './additional-details/controller.js'
import * as documents from './documents/controller.js'
import * as addresses from './addresses/controller.js'
import * as partyPicker from './addresses/party-picker/party-picker.controller.js'
import * as addressReturn from './addresses/address-return/controller.js'
import * as cphNumber from './cph-number/controller.js'
import * as portOfEntry from './transport/port-of-entry/port-of-entry.controller.js'
import { validateStoredAnswers as portOfEntryValidateStored } from './transport/port-of-entry/validate-stored.js'
import * as transitCountries from './transport/transit-countries/transit-countries.controller.js'
import { validateStoredAnswers as transitCountriesValidateStored } from './transport/transit-countries/validate-stored.js'
import * as transporters from './transport/transporters/transporters.controller.js'
import * as transporterAdd from './transport/transporter-add/transporter-add.controller.js'
import * as transportersSelect from './transport/transporters-select/transporters-select.controller.js'
import * as commercialTransporterDetails from './transport/commercial-transporter-details/commercial-transporter-details.controller.js'
import * as privateTransporterDetails from './transport/private-transporter-details/private-transporter-details.controller.js'
import * as contactSelect from './contact/controller.js'
import { validateStoredAnswers as contactValidateStored } from './contact/validate-stored.js'
import * as cya from './check-answers/controller.js'
import * as cancelAmend from './cancel-amend/controller.js'
import * as notificationActions from './notification-actions/controller.js'
import * as deleteNotification from './delete-notification/controller.js'
import * as declaration from './declaration/controller.js'
import * as confirmation from './confirmation/controller.js'

/** The pages whose page-side `collects` build the obligation->page index. */
const pageModules = [
  dashboard,
  hub,
  { ...origin, validateStoredAnswers: originValidateStored },
  commoditiesSearch,
  consignmentDetails,
  animalIdentification,
  { ...importReason, validateStoredAnswers: importReasonValidateStored },
  additionalDetails,
  documents,
  addresses,
  partyPicker,
  addressReturn,
  cphNumber,
  { ...portOfEntry, validateStoredAnswers: portOfEntryValidateStored },
  {
    ...transitCountries,
    validateStoredAnswers: transitCountriesValidateStored
  },
  transporters,
  transporterAdd,
  transportersSelect,
  commercialTransporterDetails,
  privateTransporterDetails,
  { ...contactSelect, validateStoredAnswers: contactValidateStored },
  cya,
  cancelAmend,
  notificationActions,
  deleteNotification,
  declaration,
  confirmation
]

/** The pages whose page-side `collects` build the obligation->page index. A
 * module contributes when it exports `meta` — read-only pages (hub, dashboard,
 * CYA and friends) collect no obligations and export no `meta`, so they fall
 * out of this list without an explicit opt-out. */
export const dispatchPages = pageModules
  .filter((module) => module.meta)
  .map((module) => module.meta)

export const allRoutes = pageModules.flatMap((module) => module.routes)

/** The pages that opt into re-running their rules against stored answers. */
export const revalidators = pageModules
  .filter((module) => typeof module.validateStoredAnswers === 'function')
  .map((module) => ({
    id: module.meta.id,
    run: module.validateStoredAnswers
  }))

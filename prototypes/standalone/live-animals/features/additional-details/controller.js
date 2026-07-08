import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { additionalDetailsPage as page } from './page.js'
import { obligations, UNWEANED_ANIMAL_COMMODITIES } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/additional-details/template`

/**
 * Mirrors the model's containsUnweanedAnimals anyItem activation for page-side
 * rendering (the check-your-answers row): true when any commodity line's
 * selection is one of the unweaned-animal commodities.
 */
export const unweanedApplies = (answers) =>
  []
    .concat(answers.commodityLines ?? [])
    .some((line) =>
      UNWEANED_ANIMAL_COMMODITIES.includes(line?.commoditySelection)
    )

/** V4 sixteen-value animals-certified-for value set (spec ruling c-009). */
export const ANIMALS_CERTIFIED_FOR_LABEL = {
  'further-keeping': 'Further keeping',
  slaughter: 'Slaughter',
  'confined-establishment': 'Confined establishment',
  'germinal-products': 'Germinal products',
  'registered-equine-animal': 'Registered equine animal',
  'travelling-circus-animal-act': 'Travelling circus/animal act',
  exhibition: 'Exhibition',
  'event-or-activity-near-borders': 'Event or activity near borders',
  'release-into-the-wild': 'Release into the wild',
  'dispatch-centre': 'Dispatch centre',
  'relaying-area-purification-centre': 'Relaying area / purification centre',
  'ornamental-aquaculture-establishment':
    'Ornamental aquaculture establishment',
  'technical-use': 'Technical use',
  'quarantine-or-similar-establishment': 'Quarantine or similar establishment',
  'live-aquatic-animals-for-human-consumption':
    'Live aquatic animals for human consumption',
  other: 'Other'
}

const UNWEANED_LABEL = { yes: 'Yes', no: 'No' }

// Both fields are enforcedAt=submit: blank passes validation and each stays an
// open requirement for the status roll-up (In progress, not a validation
// error). Only an out-of-domain value blocks the save. containsUnweanedAnimals
// is validated only when it is in scope — out of scope it is neither rendered
// nor committed.
const certifiedField = oneOf(
  'animalsCertifiedFor',
  Object.keys(ANIMALS_CERTIFIED_FOR_LABEL)
)
const unweanedField = oneOf(
  'containsUnweanedAnimals',
  Object.keys(UNWEANED_LABEL)
)

const render = (h, values, showUnweaned, errors = {}) =>
  h.view(view, {
    ...kit.base('Additional animal details', { backLink: hubPath() }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    showUnweaned,
    certifiedOptions: Object.entries(ANIMALS_CERTIFIED_FOR_LABEL).map(
      ([value, text]) => ({
        value,
        text,
        checked: value === values.animalsCertifiedFor
      })
    ),
    unweanedOptions: Object.entries(UNWEANED_LABEL).map(([value, text]) => ({
      value,
      text,
      checked: value === values.containsUnweanedAnimals
    }))
  })

const get = (request, h) => {
  const { answers, scope } = state.get(request, h)
  return render(
    h,
    {
      animalsCertifiedFor: answers.animalsCertifiedFor ?? '',
      containsUnweanedAnimals: answers.containsUnweanedAnimals ?? ''
    },
    scope.has('containsUnweanedAnimals')
  )
}

const post = (request, h) => {
  const { scope } = state.get(request, h)
  const showUnweaned = scope.has('containsUnweanedAnimals')
  const payload = request.payload ?? {}
  const values = {
    animalsCertifiedFor: payload.animalsCertifiedFor ?? '',
    containsUnweanedAnimals: payload.containsUnweanedAnimals ?? ''
  }
  const fields = showUnweaned
    ? compose(certifiedField, unweanedField)
    : compose(certifiedField)
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, showUnweaned, errors)

  // containsUnweanedAnimals is only owed (and only written) when a triggering
  // commodity line keeps it in scope — never write one out of scope.
  const { scope: committed } = state.commit(request, h, {
    animalsCertifiedFor: values.animalsCertifiedFor,
    ...(showUnweaned
      ? { containsUnweanedAnimals: values.containsUnweanedAnimals }
      : {})
  })
  return h.redirect(kit.nextTarget(request, page, committed))
}

export const routes = kit.pageRoutes(page, { get, post })

import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { ANIMAL_IDENTIFIERS_STEP } from '../../flow/run.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

const view = `${TEMPLATES}/features/commodities/animal-identifiers-list`

export const IDENTIFIER_LABELS = {
  animalIdentifierPassport: 'Passport',
  animalIdentifierTattoo: 'Tattoo',
  animalIdentifierEarTag: 'Ear tag',
  horseName: 'Horse name',
  animalIdentifierIdentificationDetails: 'Identification details',
  animalIdentifierDescription: 'Description'
}

export const animalIdentifierSummary = (unit) => {
  const parts = Object.entries(IDENTIFIER_LABELS)
    .filter(([id]) => (unit[id] ?? '').toString().trim() !== '')
    .map(([id, label]) => `${label}: ${unit[id]}`)
  if (unit.permanentAddress?.name) {
    parts.push(`Permanent address: ${unit.permanentAddress.name}`)
  }
  return parts.length ? parts.join(', ') : 'No identifier provided'
}

const lineIndexOf = (request, answers) => {
  const index = Number(request.params.index)
  const lines = answers.commodityLines ?? []
  return Number.isInteger(index) && index >= 0 && index < lines.length
    ? index
    : null
}

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const index = lineIndexOf(request, answers)
  if (index === null) {
    return h.redirect(
      kit.withChangeContext(request, pagePath('consignment-details'))
    )
  }
  const commodity = answers.commodityLines[index].commoditySelection
  const rows = state
    .collectionView(answers, ['commodityLines', index, 'animalIdentifiers'])
    .map(({ index: unitIndex, entry }) => ({
      key: { text: `Animal ${unitIndex + 1}` },
      value: { text: animalIdentifierSummary(entry) },
      actions: {
        items: [
          {
            href: kit.withChangeContext(
              request,
              pagePath(`commodities/${index}/identifiers/${unitIndex}/remove`)
            ),
            text: 'Remove',
            visuallyHiddenText: `animal ${unitIndex + 1}`
          }
        ]
      }
    }))
  return h.view(view, {
    ...kit.base('Animal identifiers', {
      backLink: kit.withChangeContext(request, pagePath('consignment-details')),
      journey
    }),
    heading: 'Animal identifiers for this commodity',
    commodity,
    rows,
    hasUnits: rows.length > 0,
    addButtonText: rows.length ? 'Add another animal' : 'Add an animal',
    emptyText: 'You have not added any animals yet.'
  })
}

const post = async (request, h) => {
  const { answers, scope } = await state.get(request, h)
  const index = lineIndexOf(request, answers)
  if (index === null) {
    return h.redirect(
      kit.withChangeContext(request, pagePath('consignment-details'))
    )
  }
  if ((request.payload ?? {}).action === 'add') {
    return h.redirect(
      kit.withChangeContext(
        request,
        pagePath(`commodities/${index}/identifiers/add`)
      )
    )
  }
  return h.redirect(
    kit.exitTarget(
      request,
      (await kit.runTarget(request, ANIMAL_IDENTIFIERS_STEP, scope)) ??
        pagePath('consignment-details')
    )
  )
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('commodities/{index}/identifiers'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('commodities/{index}/identifiers'),
    options: open,
    handler: post
  }
]

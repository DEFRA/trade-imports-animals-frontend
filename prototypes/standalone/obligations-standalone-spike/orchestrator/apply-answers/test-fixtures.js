import { createScopeRegistry, evaluateObligations } from '../../engine/index.js'

/**
 * Shared fixtures for the apply-answers folder-module tests: a small
 * catalogue covering every writable type, one page presenting the single
 * slots, one page presenting the indexed claims pair, and a neutral
 * evaluate over them.
 */

export const obligations = [
  { id: 'id-full-name', name: 'fullName', type: 'text', cardinality: 'single' },
  { id: 'id-dob', name: 'dateOfBirth', type: 'date', cardinality: 'single' },
  {
    id: 'id-extras',
    name: 'extras',
    type: 'multi-select',
    cardinality: 'single'
  },
  {
    id: 'id-value',
    name: 'estimatedValue',
    type: 'currency',
    cardinality: 'single'
  },
  { id: 'id-photo', name: 'vehiclePhoto', type: 'file', cardinality: 'single' },
  {
    id: 'id-excess',
    name: 'voluntaryExcess',
    type: 'boolean',
    cardinality: 'single'
  },
  {
    id: 'id-amount',
    name: 'excessAmount',
    type: 'currency',
    cardinality: 'single'
  },
  {
    id: 'id-claim-type',
    name: 'claimType',
    type: 'radio',
    cardinality: 'indexed',
    indexedBy: { source: 'user', mutability: 'edit-add-remove' }
  },
  {
    id: 'id-claim-amount',
    name: 'claimAmount',
    type: 'currency',
    cardinality: 'indexed',
    indexedBy: { source: 'user', mutability: 'edit-add-remove' }
  }
]

export const page = {
  kind: 'page',
  id: 'test-page',
  presents: [
    { obligation: 'id-full-name' },
    { obligation: 'id-dob' },
    { obligation: 'id-extras' },
    { obligation: 'id-value' },
    { obligation: 'id-photo' },
    { obligation: 'id-excess' },
    { obligation: 'id-amount' }
  ]
}

export const claimsPage = {
  kind: 'page',
  id: 'claims',
  presentsForEach: [
    { obligation: 'id-claim-type' },
    { obligation: 'id-claim-amount' }
  ]
}

/** Neutral registry — the journey rules do not fit this fixture catalogue. */
export const evaluate = (fulfilments = {}, options = {}) =>
  evaluateObligations(obligations, fulfilments, {
    scopeRegistry: createScopeRegistry(),
    ...options
  })

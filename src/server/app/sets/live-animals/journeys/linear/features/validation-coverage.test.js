import { describe, expect, it } from 'vitest'

import { dispatchPages } from './index.js'

// Pages without a `validation` on their `meta` — one line per opt-out saying
// why the page does not carry a `pageValidation`. A new dispatch page added
// without either wiring one or landing here will fail this test.
const VALIDATION_OPT_OUTS = new Map([
  [
    'commodities',
    'Own model. Commodity picking, consignment details and animal identification are validated by their commodity-lines domain rather than one pageValidation per page.'
  ],
  [
    'consignmentDetails',
    'Collects nothing directly. It aggregates commodityLines added elsewhere.'
  ],
  [
    'animalIdentification',
    'Collects nothing directly. It aggregates identification rows added elsewhere.'
  ],
  [
    'accompanying-documents',
    'Uploads are validated at upload time (size, type, virus scan) rather than through pageValidation. Deferred to a follow-up ticket.'
  ],
  [
    'addresses',
    'The addresses hub. Per-role errors surface through outstandingPartyErrors on the review page rather than through this page.'
  ],
  [
    'declaration',
    'Submit page. Its single required-checkbox rule lives inline in the controller; not part of the cross-journey stored-answers surface.'
  ]
])

describe('#validation coverage across dispatch pages', () => {
  it.each(dispatchPages.map((meta) => [meta.id, meta]))(
    'Should either carry a validation on meta or be documented on the opt-out list — %s',
    (id, meta) => {
      if (meta.validation) {
        expect(meta.validation).toHaveProperty('onSubmit')
        expect(meta.validation).toHaveProperty('onStored')
        return
      }
      expect(
        VALIDATION_OPT_OUTS.get(id),
        `Dispatch page "${id}" carries no validation. Attach one via pageValidation on its controller.meta, or add it to VALIDATION_OPT_OUTS with a reason.`
      ).toBeTruthy()
    }
  )

  it('Should not carry opt-outs for pages that are no longer dispatched', () => {
    const dispatchIds = new Set(dispatchPages.map((meta) => meta.id))
    const stale = [...VALIDATION_OPT_OUTS.keys()].filter(
      (id) => !dispatchIds.has(id)
    )
    expect(stale).toEqual([])
  })
})

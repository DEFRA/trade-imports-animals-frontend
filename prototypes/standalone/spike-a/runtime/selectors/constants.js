/** Status / kind / field-type enums shared across the selector modules. */

export const STATUS = Object.freeze({
  NOT_APPLICABLE: 'not-applicable',
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  NOT_STARTED: 'not-started'
})
export const STEP_KIND = Object.freeze({ LOOP: 'loop', SUBTASKS: 'subtasks' })
export const FIELD_TYPE = Object.freeze({
  DATE: 'date',
  MULTI_SELECT: 'multi-select'
})
export const HUB_TERMINAL = Object.freeze({ terminal: 'hub' })

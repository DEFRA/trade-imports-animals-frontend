import { machine } from './model.js'
import { stepIds, stepKind, stepTitle, fieldsFor } from './steps.js'
import { viewItems } from './view.js'
import { applicableSteps, next, prev } from './navigation.js'
import { status, allComplete } from './status.js'
import { collect, applyAnswer } from './mutation.js'
import { missingRequired, validate, assembleQuote } from './assembly.js'
import { getSelectedAddons } from '../lib/addons/index.js'

/**
 * Option B runtime adapter — the common contract built on the statechart
 * interpreter. `next` / `prev` come from machine transitions and a reverse
 * index; `applicableSteps` is the realised path (reachability under guards);
 * status/validation are layered on `context.fields` (the FSM does not give those
 * for free — see ../README.md). This is a thin assembler that composes the
 * concern modules in this folder into the one `contract` object the journey
 * shell and routes consume.
 */
export const contract = {
  steps: stepIds,
  firstStep: machine.initial,
  stepTitle,
  stepKind,
  fieldsFor,
  viewItems,
  applicableSteps,
  status,
  allComplete,
  next,
  prev,
  missingRequired,
  collect,
  applyAnswer,
  validate,
  assembleQuote,
  getSelectedAddons
}

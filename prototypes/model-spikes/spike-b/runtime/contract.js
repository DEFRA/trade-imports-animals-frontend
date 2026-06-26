import { machine } from './model.js'
import {
  realizedPath,
  transition,
  prevState,
  incomingGuard,
  reverseIndex
} from './interpreter.js'
import { provenance, evalCondition } from '../../shared/conditions.js'
import { isSatisfied } from '../../shared/fieldutil.js'
import {
  getSelectedAddons,
  allSelectedAddonsComplete
} from '../../../shared/addons.js'
import { makePageValidator } from '../../shared/joi.js'
import { makeAssembler } from '../../shared/domain.js'

/**
 * Option B runtime adapter — the common contract built on the statechart
 * interpreter. `next` / `prev` come from machine transitions and a reverse
 * index; `applicableSteps` is the realised path (reachability under guards);
 * status/validation are layered on `context.fields` (the FSM does not give those
 * for free — see ../README.md).
 */

const REVERSE = reverseIndex(machine)
const stepIds = Object.keys(machine.states).filter(
  (id) => machine.states[id].type !== 'final'
)

const stepKind = (id) => machine.states[id]?.kind
const stepTitle = (id) => machine.states[id]?.title
const fieldSpec = (id) => ({ id, ...machine.context.fields[id] })
const fieldsFor = (stepId) =>
  (machine.states[stepId]?.fields ?? []).map(fieldSpec)

const applicableSteps = (answers) => realizedPath(machine, answers)

function requiredFields(stepId, answers) {
  return fieldsFor(stepId).filter(
    (field) =>
      field.required ||
      (field.requiredWhen && evalCondition(field.requiredWhen, answers))
  )
}

function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return 'not-applicable'
  }
  const state = machine.states[stepId]
  if (state.kind === 'loop') {
    if (answers[state.done] === true) {
      return 'complete'
    }
    return (answers[state.arrayKey] ?? []).length ? 'partial' : 'not-started'
  }
  if (state.kind === 'subtasks') {
    if (answers.selectedAddons === undefined) {
      return 'not-started'
    }
    return allSelectedAddonsComplete(answers) ? 'complete' : 'partial'
  }
  const required = requiredFields(stepId, answers)
  const allRequired = required.every((field) =>
    isSatisfied(field, answers[field.id])
  )
  if (required.length && allRequired) {
    return 'complete'
  }
  const anyAnswered = fieldsFor(stepId).some((field) =>
    isSatisfied(field, answers[field.id])
  )
  return anyAnswered ? 'partial' : 'not-started'
}

const allComplete = (answers) =>
  applicableSteps(answers).every(
    (stepId) => status(answers, stepId) === 'complete'
  )

const groupOf = (shape, stepId) =>
  shape.groups?.find((group) => group.stepIds.includes(stepId))

function next(answers, stepId, shape) {
  const target = transition(machine, stepId, answers)
  // A transition into the machine's `final` state means the journey is over.
  const atEnd = !target || machine.states[target]?.type === 'final'
  const group = groupOf(shape, stepId)
  return !atEnd && group?.stepIds.includes(target)
    ? target
    : { terminal: 'hub' }
}

function prev(answers, stepId, shape) {
  const source = prevState(machine, stepId, answers, REVERSE)
  const group = groupOf(shape, stepId)
  return source && group?.stepIds.includes(source)
    ? source
    : { terminal: 'hub' }
}

const provenanceForStep = (stepId, answers) =>
  provenance(incomingGuard(machine, stepId, answers, REVERSE))

const getStep = (stepId) => ({
  id: stepId,
  kind: machine.states[stepId].kind,
  fields: fieldsFor(stepId),
  done: machine.states[stepId].done,
  arrayKey: machine.states[stepId].arrayKey
})

const assembler = makeAssembler({
  getApplicableSteps: applicableSteps,
  getStep,
  provenanceForStep,
  rules: machine.rules
})

const validateStep = makePageValidator({
  getFields: fieldsFor,
  patterns: machine.patterns
})

function missingRequired(answers) {
  return assembler
    .missingRequiredErrors(answers)
    .map(({ stepId, fieldId, because }) => ({ stepId, fieldId, because }))
}

function collect(stepId, payload) {
  const patch = {}
  for (const field of fieldsFor(stepId)) {
    if (field.type === 'date') {
      const day = payload[`${field.id}-day`]
      const month = payload[`${field.id}-month`]
      const year = payload[`${field.id}-year`]
      const anyPart = [day, month, year].some(
        (part) => part !== undefined && String(part).trim() !== ''
      )
      patch[field.id] = anyPart ? { day, month, year } : undefined
    } else if (field.type === 'multi-select') {
      const raw = payload[field.id]
      patch[field.id] = raw === undefined ? [] : [].concat(raw)
    } else {
      patch[field.id] = payload[field.id]
    }
  }
  return patch
}

function clearStep(answers, stepId) {
  const state = machine.states[stepId]
  for (const fieldId of state.fields ?? []) {
    answers[fieldId] = undefined
  }
  if (state.kind === 'loop') {
    answers[state.done] = false
    answers[state.arrayKey] = []
  }
}

function applyAnswer(answers, stepId, payload) {
  const before = applicableSteps(answers)
  const merged = { ...answers, ...collect(stepId, payload) }
  const after = applicableSteps(merged)
  for (const goneId of before.filter((id) => !after.includes(id))) {
    clearStep(merged, goneId)
  }
  return merged
}

function viewItems(stepId, answers = {}) {
  const state = machine.states[stepId]
  if (!state?.itemsFrom) {
    return undefined
  }
  const field = fieldSpec(state.itemsFrom)
  if (field.type === 'multi-select') {
    const selected = answers[field.id] ?? []
    return field.options.map((option) => ({
      value: option.value,
      text: option.text,
      checked: selected.includes(option.value)
    }))
  }
  return field.options.map((option) => ({
    value: option.value,
    text: option.text,
    hint: option.hint ? { text: option.hint } : undefined,
    checked: answers[field.id] === option.value
  }))
}

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
  validate: validateStep,
  assembleQuote: assembler.assembleQuote,
  getSelectedAddons
}

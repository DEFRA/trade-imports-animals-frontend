import { steps, fields, rules, patterns, stepById } from './model.js'
import {
  evaluate,
  applicableSteps,
  requiredFieldsOfStep,
  missingRequired,
  missingRequiredErrors,
  assertionErrors
} from './engine.js'
import { isSatisfied } from '../../shared/fieldutil.js'
import {
  getSelectedAddons,
  allSelectedAddonsComplete
} from '../../../shared/addons.js'
import { makePageValidator } from '../../shared/joi.js'
import { makeAssembler } from '../../shared/domain.js'

/**
 * Option C runtime adapter — the common contract as thin reads over the
 * requirement-graph snapshot (`engine.evaluate`). Navigation is a thin
 * consequence of step order + applicability; the value is that required-ness and
 * `because` come from the rules layer with **authored** reasons.
 */

const stepOrder = steps.map((step) => step.id)
const stepKind = (id) => stepById.get(id)?.kind
const stepTitle = (id) => stepById.get(id)?.title

// A `require` rule's `when` becomes a field's requiredWhen, so the shared
// page-slice validator enforces the within-page conditional from the same data.
const requiredWhenFor = (fieldId) => {
  const rule = rules.find(
    (r) => r.kind === 'require' && (r.require ?? []).includes(fieldId)
  )
  return rule?.when
}

function fieldsFor(stepId) {
  return Object.entries(fields)
    .filter(([, field]) => field.step === stepId)
    .map(([id, field]) => ({
      id,
      type: field.type,
      min: field.min,
      max: field.max,
      pattern: field.pattern,
      options: field.options,
      required: field.required === 'always',
      requiredWhen: requiredWhenFor(id)
    }))
}

function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return 'not-applicable'
  }
  const step = stepById.get(stepId)
  if (step.kind === 'loop') {
    if (answers[step.done] === true) {
      return 'complete'
    }
    return (answers[step.arrayKey] ?? []).length ? 'partial' : 'not-started'
  }
  if (step.kind === 'subtasks') {
    if (answers.selectedAddons === undefined) {
      return 'not-started'
    }
    return allSelectedAddonsComplete(answers) ? 'complete' : 'partial'
  }
  const snapshot = evaluate(answers)
  const required = requiredFieldsOfStep(stepId, snapshot)
  const allRequired = required.every((id) => snapshot.satisfied.has(id))
  if (required.length && allRequired) {
    return 'complete'
  }
  const anyAnswered = Object.keys(fields).some(
    (id) => fields[id].step === stepId && isSatisfied(fields[id], answers[id])
  )
  return anyAnswered ? 'partial' : 'not-started'
}

const allComplete = (answers) =>
  applicableSteps(answers).every((id) => status(answers, id) === 'complete')

const groupOf = (shape, stepId) =>
  shape.groups?.find((group) => group.stepIds.includes(stepId))

function liveGroupSteps(shape, stepId, answers) {
  const group = groupOf(shape, stepId)
  if (!group) {
    return null
  }
  const live = applicableSteps(answers)
  return group.stepIds.filter((id) => live.includes(id))
}

function next(answers, stepId, shape) {
  if (shape.kind === 'hub') {
    return { terminal: 'hub' }
  }
  if (shape.kind === 'grouped') {
    const live = liveGroupSteps(shape, stepId, answers)
    return live?.[live.indexOf(stepId) + 1] ?? { terminal: 'hub' }
  }
  const live = applicableSteps(answers)
  return live[live.indexOf(stepId) + 1] ?? { terminal: 'summary' }
}

function prev(answers, stepId, shape) {
  if (shape.kind === 'hub') {
    return { terminal: 'hub' }
  }
  if (shape.kind === 'grouped') {
    const live = liveGroupSteps(shape, stepId, answers)
    return live?.[live.indexOf(stepId) - 1] ?? { terminal: 'hub' }
  }
  const live = applicableSteps(answers)
  return live[live.indexOf(stepId) - 1] ?? { terminal: 'start' }
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
  const step = stepById.get(stepId)
  for (const field of fieldsFor(stepId)) {
    answers[field.id] = undefined
  }
  if (step.kind === 'loop') {
    answers[step.done] = false
    answers[step.arrayKey] = []
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
  const step = stepById.get(stepId)
  if (!step?.itemsFrom) {
    return undefined
  }
  const field = fields[step.itemsFrom]
  if (field.type === 'multi-select') {
    const selected = answers[step.itemsFrom] ?? []
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
    checked: answers[step.itemsFrom] === option.value
  }))
}

// Reuse the shared transform; C supplies its own authored-reason errors.
const transformer = makeAssembler({
  getApplicableSteps: applicableSteps,
  getStep: (stepId) => ({
    id: stepId,
    kind: stepById.get(stepId).kind,
    fields: fieldsFor(stepId),
    done: stepById.get(stepId).done,
    arrayKey: stepById.get(stepId).arrayKey
  }),
  provenanceForStep: () => [],
  rules: []
})

function assembleQuote(answers) {
  const errors = [
    ...missingRequiredErrors(answers),
    ...assertionErrors(answers)
  ]
  return {
    ok: errors.length === 0,
    quote: transformer.toDomain(answers),
    errors
  }
}

const validateStep = makePageValidator({ getFields: fieldsFor, patterns })

export const contract = {
  steps: stepOrder,
  firstStep: stepOrder[0],
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
  assembleQuote,
  getSelectedAddons
}

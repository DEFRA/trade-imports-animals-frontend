import { model, stepById, stepOrder } from './model.js'
import { evalCondition } from './conditions.js'
import { isSatisfied } from './util.js'
import { getSelectedAddons, allSelectedAddonsComplete } from '../lib/addons.js'
import { validateStep } from '../validation/compile.js'
import { assembleQuote, missingRequiredErrors } from '../validation/assemble.js'

/**
 * Option A runtime adapter — the **common contract**, implemented as pure
 * selector functions over the declarative model. Nothing here knows about njk,
 * routes or GDS tags. Status/navigation/applicability/completeness are all
 * *derived* from the model data: `isComplete` is gone (derived from each field's
 * `required`), and `appliesWhen` is a condition object so provenance falls out.
 */

const stepKind = (id) => stepById.get(id)?.kind
const stepTitle = (id) => stepById.get(id)?.title

function applicableStepIds(answers) {
  return model.steps
    .filter((step) => evalCondition(step.appliesWhen, answers))
    .map((step) => step.id)
}

function requiredFields(step, answers) {
  return (step.fields ?? []).filter(
    (field) =>
      field.required ||
      (field.requiredWhen && evalCondition(field.requiredWhen, answers))
  )
}

function status(answers, stepId) {
  if (!applicableStepIds(answers).includes(stepId)) {
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
  const required = requiredFields(step, answers)
  const allRequired = required.every((field) =>
    isSatisfied(field, answers[field.id])
  )
  if (required.length && allRequired) {
    return 'complete'
  }
  const anyAnswered = (step.fields ?? []).some((field) =>
    isSatisfied(field, answers[field.id])
  )
  return anyAnswered ? 'partial' : 'not-started'
}

function allComplete(answers) {
  return applicableStepIds(answers).every(
    (stepId) => status(answers, stepId) === 'complete'
  )
}

const groupOf = (shape, stepId) =>
  shape.groups?.find((group) => group.stepIds.includes(stepId))

function liveGroupSteps(shape, stepId, answers) {
  const group = groupOf(shape, stepId)
  if (!group) {
    return null
  }
  const live = applicableStepIds(answers)
  return group.stepIds.filter((id) => live.includes(id))
}

function next(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  if (!live) {
    return { terminal: 'hub' }
  }
  const nextStep = live[live.indexOf(stepId) + 1]
  return nextStep ?? { terminal: 'hub' }
}

function prev(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  if (!live) {
    return { terminal: 'hub' }
  }
  const prevStep = live[live.indexOf(stepId) - 1]
  return prevStep ?? { terminal: 'hub' }
}

function missingRequired(answers) {
  return missingRequiredErrors(answers).map(({ stepId, fieldId, because }) => ({
    stepId,
    fieldId,
    because
  }))
}

/** Normalise a step's own fields from the raw form payload (no cascade). */
function collect(stepId, payload) {
  const step = stepById.get(stepId)
  const patch = {}
  for (const field of step.fields ?? []) {
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

function clearStep(answers, step) {
  for (const field of step.fields ?? []) {
    answers[field.id] = undefined
  }
  if (step.kind === 'loop') {
    answers[step.done] = false
    answers[step.arrayKey] = []
  }
}

/** Merge the patch, then cascade-clear any step that stopped applying. */
function applyAnswer(answers, stepId, payload) {
  const before = applicableStepIds(answers)
  const merged = { ...answers, ...collect(stepId, payload) }
  const after = applicableStepIds(merged)
  for (const goneId of before.filter((id) => !after.includes(id))) {
    clearStep(merged, stepById.get(goneId))
  }
  return merged
}

function fieldsFor(stepId) {
  const step = stepById.get(stepId)
  return (step.fields ?? []).map((field) => ({
    id: field.id,
    type: field.type,
    constraints: {
      required: Boolean(field.required),
      requiredWhen: field.requiredWhen,
      min: field.min,
      max: field.max,
      pattern: field.pattern,
      options: field.options
    }
  }))
}

function viewItems(stepId, answers = {}) {
  const step = stepById.get(stepId)
  if (!step?.itemsFrom) {
    return undefined
  }
  const field = (step.fields ?? []).find((f) => f.id === step.itemsFrom)
  if (!field) {
    return undefined
  }
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
  steps: stepOrder,
  firstStep: stepOrder[0],
  stepTitle,
  stepKind,
  fieldsFor,
  viewItems,
  applicableSteps: applicableStepIds,
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

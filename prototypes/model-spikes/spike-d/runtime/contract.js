import { annotations } from './model.js'
import {
  schema,
  check,
  validateValue,
  ifHolds,
  ifProvenance,
  activeBranches
} from '../validation/schema.js'
import { evalCondition } from '../../shared/conditions.js'
import { isEmpty, humanize, ageInYears } from '../../shared/fieldutil.js'
import {
  getSelectedAddons,
  allSelectedAddonsComplete
} from '../../../shared/addons.js'
import { makeAssembler } from '../../shared/domain.js'

/**
 * Option D runtime adapter. The JSON Schema owns validity; the annotations own
 * flow (steps/order/groups/types). Completeness is **partial validation** of the
 * answers; applicability comes from the active if/then; provenance is
 * **reconstructed** from the schema keyword that fired (the paradigm's weak
 * spot, vs Option C's authored reasons). A thin sequencer over annotations adds
 * the ordering JSON Schema has no concept of.
 */

const { steps, titles, stepMeta, fieldStep, fieldType, options } = annotations

const stepKind = (id) => stepMeta[id]?.kind
const stepTitle = (id) => titles[id]
const stepFields = (stepId) =>
  Object.keys(fieldStep).filter((f) => fieldStep[f] === stepId)

const fieldSpec = (id) => {
  const node = schema.properties[id] ?? {}
  return {
    id,
    type: fieldType[id],
    pattern: node.pattern,
    options: options[id],
    schemaNode: node
  }
}
const fieldsFor = (stepId) => stepFields(stepId).map(fieldSpec)

// The set of fields required right now: schema.required + active if/then.required.
function requiredNow(answers) {
  const set = new Set(schema.required)
  for (const branch of activeBranches(answers)) {
    for (const req of branch.then.required ?? []) {
      set.add(req)
    }
  }
  return set
}

// Why a field is required now: [] if base-required, else the if-condition that fired.
function requiredBecause(fieldId, answers) {
  if (schema.required.includes(fieldId)) {
    return []
  }
  for (const branch of activeBranches(answers)) {
    if ((branch.then.required ?? []).includes(fieldId)) {
      return ifProvenance(branch.if)
    }
  }
  return []
}

function applicableSteps(answers) {
  const required = requiredNow(answers)
  return steps.filter((stepId) => {
    if (stepMeta[stepId]?.kind === 'subtasks') {
      return true
    }
    // Required-ness alone — every normal step has a base-required field, and the
    // conditional `claims` step is live exactly when its if/then makes `claims`
    // required. (Using "answered" here would keep claims live after its data is
    // cleared, breaking the cascade.)
    return stepFields(stepId).some((f) => required.has(f))
  })
}

function fieldPresentAndValid(fieldId, answers) {
  if (isEmpty(answers[fieldId])) {
    return false
  }
  return (
    validateValue(schema.properties[fieldId], answers[fieldId], fieldId)
      .length === 0
  )
}

function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return 'not-applicable'
  }
  const meta = stepMeta[stepId] ?? {}
  if (meta.kind === 'loop') {
    if (answers[meta.done] === true) {
      return 'complete'
    }
    return (answers[meta.arrayKey] ?? []).length ? 'partial' : 'not-started'
  }
  if (meta.kind === 'subtasks') {
    if (answers.selectedAddons === undefined) {
      return 'not-started'
    }
    return allSelectedAddonsComplete(answers) ? 'complete' : 'partial'
  }
  const required = requiredNow(answers)
  const requiredOfStep = stepFields(stepId).filter((f) => required.has(f))
  const allOk = requiredOfStep.every((f) => fieldPresentAndValid(f, answers))
  if (requiredOfStep.length && allOk) {
    return 'complete'
  }
  const anyAnswered = stepFields(stepId).some((f) => !isEmpty(answers[f]))
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

// Thin sequencer — JSON Schema has no ordering, so this adds it over annotations.
function next(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  return live?.[live.indexOf(stepId) + 1] ?? { terminal: 'hub' }
}

function prev(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  return live?.[live.indexOf(stepId) - 1] ?? { terminal: 'hub' }
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
  for (const field of fieldsFor(stepId)) {
    answers[field.id] = undefined
  }
  const meta = stepMeta[stepId] ?? {}
  if (meta.kind === 'loop') {
    answers[meta.done] = false
    answers[meta.arrayKey] = []
  }
}

// Flipping the if-condition strips the keys the schema no longer requires.
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
  const from = stepMeta[stepId]?.itemsFrom
  if (!from) {
    return undefined
  }
  const opts = options[from] ?? []
  if (fieldType[from] === 'multi-select') {
    const selected = answers[from] ?? []
    return opts.map((option) => ({
      value: option.value,
      text: option.text,
      checked: selected.includes(option.value)
    }))
  }
  return opts.map((option) => ({
    value: option.value,
    text: option.text,
    hint: option.hint ? { text: option.hint } : undefined,
    checked: answers[from] === option.value
  }))
}

function missingRequired(answers) {
  const out = []
  for (const stepId of applicableSteps(answers)) {
    const meta = stepMeta[stepId] ?? {}
    if (meta.kind === 'loop') {
      if (answers[meta.done] !== true) {
        out.push({
          stepId,
          fieldId: meta.arrayKey,
          because: requiredBecause(meta.arrayKey, answers)
        })
      }
      continue
    }
    if (meta.kind === 'subtasks') {
      if (!allSelectedAddonsComplete(answers)) {
        out.push({ stepId, fieldId: 'selectedAddons', because: [] })
      }
      continue
    }
    const required = requiredNow(answers)
    for (const fieldId of stepFields(stepId)) {
      if (required.has(fieldId) && isEmpty(answers[fieldId])) {
        out.push({
          stepId,
          fieldId,
          because: requiredBecause(fieldId, answers)
        })
      }
    }
  }
  return out
}

// Page-slice: pick the step's fields, validate the raw payload, plus the
// within-page if/then (excessAmount required when voluntaryExcess = yes).
function validateStep(stepId, payload = {}) {
  const fields = stepFields(stepId)
  const errors = {}
  const errorSummary = []
  const addError = (name, message) => {
    if (errors[name] === undefined) {
      errors[name] = message
      errorSummary.push({ text: message, href: `#${name}` })
    }
  }
  for (const field of fields) {
    const node = schema.properties[field]
    if (!node || node.type === 'object') {
      continue
    }
    const value =
      fieldType[field] === 'multi-select'
        ? [].concat(payload[field] ?? [])
        : payload[field]
    if (schema.required.includes(field) && isEmpty(value)) {
      addError(field, `${humanize(field)} is required`)
    } else if (!isEmpty(value)) {
      const errs = validateValue(node, value, field)
      if (errs.length) {
        addError(field, errs[0])
      }
    }
  }
  for (const branch of schema.allOf ?? []) {
    const condFields = Object.keys(branch.if.properties ?? {})
    if (!condFields.every((f) => fields.includes(f))) {
      continue
    }
    if (ifHolds(branch.if, payload)) {
      for (const req of branch.then.required ?? []) {
        if (fields.includes(req) && isEmpty(payload[req])) {
          addError(req, `${humanize(req)} is required`)
        }
      }
    }
  }
  return errorSummary.length === 0
    ? { ok: true, value: payload }
    : { ok: false, errors, errorSummary }
}

// Transform reuses the shared core; D supplies its schema-derived field types.
const transformer = makeAssembler({
  getApplicableSteps: applicableSteps,
  getStep: (stepId) => ({
    id: stepId,
    kind: stepMeta[stepId]?.kind,
    fields: fieldsFor(stepId),
    done: stepMeta[stepId]?.done,
    arrayKey: stepMeta[stepId]?.arrayKey
  }),
  provenanceForStep: () => [],
  rules: []
})

function businessRuleErrors(answers) {
  const out = []
  for (const rule of annotations.businessRules ?? []) {
    if (rule.when && !evalCondition(rule.when, answers)) {
      continue
    }
    if (rule.kind === 'min-age') {
      const age = ageInYears(answers[rule.field])
      if (age !== undefined && age < rule.min) {
        out.push({
          stepId: rule.stepId,
          fieldId: rule.fieldId,
          message: rule.reason,
          because: []
        })
      }
    }
    if (rule.kind === 'lte') {
      const left = Number(answers[rule.left])
      const right = Number(answers[rule.right])
      if (!Number.isNaN(left) && !Number.isNaN(right) && left > right) {
        out.push({
          stepId: rule.stepId,
          fieldId: rule.fieldId,
          message: rule.reason,
          because: []
        })
      }
    }
  }
  return out
}

function assembleQuote(answers) {
  const { missing, invalid } = check(answers)
  const errors = [
    ...missing
      .filter((m) => m.path !== 'claims') // the loop owns its own completeness
      .map((m) => ({
        stepId: fieldStep[m.path] ?? m.path,
        fieldId: m.path,
        message: `${humanize(m.path)} is required`,
        because: m.because
      })),
    ...invalid.map((i) => ({
      stepId: fieldStep[i.path] ?? i.path,
      fieldId: i.path,
      message: i.message,
      because: []
    })),
    ...businessRuleErrors(answers)
  ]
  if (!allSelectedAddonsComplete(answers)) {
    errors.push({
      stepId: 'addons',
      fieldId: 'selectedAddons',
      message: 'Finish every add-on you selected',
      because: []
    })
  }
  // hadClaims = yes still needs at least one claim (schema minItems on the array)
  if (answers.hadClaims === 'yes' && !(answers.claims ?? []).length) {
    errors.push({
      stepId: 'claims',
      fieldId: 'claims',
      message: 'Add at least one claim',
      because: requiredBecause('claims', answers)
    })
  }
  return {
    ok: errors.length === 0,
    quote: transformer.toDomain(answers),
    errors
  }
}

export const contract = {
  steps,
  firstStep: steps[0],
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

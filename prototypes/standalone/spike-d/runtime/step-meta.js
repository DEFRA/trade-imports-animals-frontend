import { annotations } from './annotations.js'
import { schema } from '../validation/index.js'

/**
 * Step and field metadata accessors. The annotations own ordering/grouping/
 * types; the JSON Schema owns each field's shape (pattern/enum). Every other
 * runtime concern reads its step/field facts through these accessors.
 */

export const { steps, titles, stepMeta, fieldStep, fieldType, options } =
  annotations

export const stepKind = (id) => stepMeta[id]?.kind
export const stepTitle = (id) => titles[id]
export const stepFields = (stepId) =>
  Object.keys(fieldStep).filter((field) => fieldStep[field] === stepId)

export const fieldSpec = (id) => {
  const node = schema.properties[id] ?? {}
  return {
    id,
    type: fieldType[id],
    pattern: node.pattern,
    options: options[id],
    schemaNode: node
  }
}

export const fieldsFor = (stepId) => stepFields(stepId).map(fieldSpec)

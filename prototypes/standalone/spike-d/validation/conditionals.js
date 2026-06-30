import { schema } from './schema-document.js'

/** Does an if-subschema's const conditions all hold against the answers? */
export const ifHolds = (ifSchema, answers) =>
  Object.entries(ifSchema.properties ?? {}).every(
    ([field, subschema]) => answers[field] === subschema.const
  )

/** The provenance of an if-subschema — its `{ field, eq }` const conditions. */
export const ifProvenance = (ifSchema) =>
  Object.entries(ifSchema.properties ?? {}).map(([field, subschema]) => ({
    field,
    eq: subschema.const
  }))

/** The currently-active if/then branches (their `if` holds). */
export const activeBranches = (answers) =>
  (schema.allOf ?? []).filter((branch) => ifHolds(branch.if, answers))

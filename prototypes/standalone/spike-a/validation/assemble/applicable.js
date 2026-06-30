import { model } from '../../runtime/model.js'
import { evalCondition } from '../../runtime/conditions.js'

/** The model steps that apply given the current answers. */
export const applicableSteps = (answers) =>
  model.steps.filter((step) => evalCondition(step.appliesWhen, answers))

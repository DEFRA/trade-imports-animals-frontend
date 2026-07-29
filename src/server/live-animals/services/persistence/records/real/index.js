import { create, copy } from './lifecycle/create.js'
import { load, list, has } from './lifecycle/read.js'
import { replaceFulfilment, clear } from './lifecycle/mutate.js'
import {
  finalise,
  amend,
  cancelAmend,
  softDelete
} from './lifecycle/transition.js'

export const records = {
  create,
  load,
  list,
  has,
  replaceFulfilment,
  finalise,
  amend,
  cancelAmend,
  copy,
  softDelete,
  clear
}

export { mapStatus } from './status.js'

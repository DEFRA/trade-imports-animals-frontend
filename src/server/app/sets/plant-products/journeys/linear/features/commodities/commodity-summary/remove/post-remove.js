import * as state from '../../../../../../../../engine/index.js'

export const REMOVE_ACTION_PREFIX = 'remove:'

const REMOVE_TARGET_PART_COUNT = 2

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const indicesOf = (action) => {
  if (!isRemoveAction(action)) {
    return null
  }
  const parts = action.slice(REMOVE_ACTION_PREFIX.length).split(':')
  if (
    parts.length !== REMOVE_TARGET_PART_COUNT ||
    parts.some((part) => part === '')
  ) {
    return null
  }
  return parts.map(Number)
}

export const validRemoveTarget = (answers, lineIndex, speciesIndex) => {
  const lines = answers.commodityLines ?? []
  if (
    !Number.isInteger(lineIndex) ||
    lineIndex < 0 ||
    lineIndex >= lines.length
  ) {
    return false
  }

  const species = lines[lineIndex]?.species ?? []
  return (
    Number.isInteger(speciesIndex) &&
    speciesIndex >= 0 &&
    speciesIndex < species.length &&
    species.length > 1
  )
}

export const postRemove = async (request, h, answers, target) => {
  const [lineIndex, speciesIndex] = target ?? []
  if (!validRemoveTarget(answers, lineIndex, speciesIndex)) {
    return null
  }

  await state.removeEntryAt(
    request,
    h,
    ['commodityLines', lineIndex, 'species'],
    speciesIndex
  )
  return target
}

import * as state from '../../../../../../engine/index.js'

export const TRANSPORTER_ADD_IN_PROGRESS = 'transporterAddInProgress'
export const JUST_ADDED_TRANSPORTER_NAME = 'justAddedTransporterName'

export const storedEnteredTransporter = (flowOnlyAnswers, transporterType) =>
  flowOnlyAnswers?.[TRANSPORTER_ADD_IN_PROGRESS]?.[transporterType]

const enteredTransportersOfOtherTypes = (flowOnlyAnswers, transporterType) =>
  Object.fromEntries(
    Object.entries(flowOnlyAnswers?.[TRANSPORTER_ADD_IN_PROGRESS] ?? {}).filter(
      ([type]) => type !== transporterType
    )
  )

export const storeEnteredTransporter = (
  request,
  h,
  flowOnlyAnswers,
  transporterType,
  values
) =>
  state.commit(request, h, {
    [TRANSPORTER_ADD_IN_PROGRESS]: {
      ...enteredTransportersOfOtherTypes(flowOnlyAnswers, transporterType),
      [transporterType]: values
    }
  })

export const clearedEnteredTransporterPatch = (
  flowOnlyAnswers,
  transporterType
) => ({
  [TRANSPORTER_ADD_IN_PROGRESS]: enteredTransportersOfOtherTypes(
    flowOnlyAnswers,
    transporterType
  )
})

export const clearEnteredTransporter = (
  request,
  h,
  flowOnlyAnswers,
  transporterType
) =>
  state.commit(
    request,
    h,
    clearedEnteredTransporterPatch(flowOnlyAnswers, transporterType)
  )

export const justAddedTransporterNamePatch = (name) => ({
  [JUST_ADDED_TRANSPORTER_NAME]: name
})

const sentenceCasedTransporterName = (name) =>
  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()

export const addedTransporterBanner = (name, copy) => ({
  titleText: copy.title,
  text: copy.text(sentenceCasedTransporterName(name))
})

export const takeAddedTransporterBanner = async (
  request,
  h,
  flowOnlyAnswers,
  copy
) => {
  const name = flowOnlyAnswers?.[JUST_ADDED_TRANSPORTER_NAME]
  if (!name) {
    return null
  }
  await state.commit(request, h, { [JUST_ADDED_TRANSPORTER_NAME]: null })
  return addedTransporterBanner(name, copy)
}

/**
 * The scope-determining flags whose cross-product spans the conditional
 * obligations moving into and out of scope: the region-code requirement, the
 * import reason, the means of transport and the transporter type. The reason
 * axis carries transit and temporary-admission values so the reason-gated
 * destinationCountry / portOfExit / exitDate obligations are exercised.
 * 2×4×2×3 = 48 states.
 *
 * @returns {Array<object>} 48 partial answer states.
 */
export const enumerateScopeStates = () =>
  ['no', 'yes'].flatMap((regionOfOriginCodeRequirement) =>
    ['', 'internalMarket', 'transit', 'temporaryAdmissionHorses'].flatMap(
      (reasonForImport) =>
        ['', 'ROAD_VEHICLE'].flatMap((meansOfTransport) =>
          ['', 'Commercial', 'Private'].map((transporterType) => ({
            regionOfOriginCodeRequirement,
            reasonForImport,
            meansOfTransport,
            transporterType
          }))
        )
    )
  )

export const withoutBlanks = (state) =>
  Object.fromEntries(Object.entries(state).filter(([, value]) => value !== ''))

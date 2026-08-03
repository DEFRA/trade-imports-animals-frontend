import { presentGate } from '../../../../model/obligations/helpers/index.js'

const grossVolumeUnitReason = {
  code: 'obligation.grossVolumeUnit.applicable.becauseGrossVolumePresent',
  explanation: 'grossVolumeUnit applies when grossVolume is present'
}

export const totalGrossWeight = {
  id: '777f0744-af76-4b00-9784-af5ea2b3acbf',
  name: 'totalGrossWeight',
  status: 'mandatory'
}

export const grossVolume = {
  id: '34dafe4b-e4d2-4b38-984e-6393e89165f5',
  name: 'grossVolume',
  status: 'optional'
}

export const grossVolumeUnit = {
  id: '6ef610c7-ed59-4ce9-bd45-045f5cd31353',
  name: 'grossVolumeUnit',
  applyTo: presentGate(
    grossVolume,
    {
      inScope: true,
      status: 'mandatory',
      reasons: [grossVolumeUnitReason]
    },
    { inScope: false }
  )
}

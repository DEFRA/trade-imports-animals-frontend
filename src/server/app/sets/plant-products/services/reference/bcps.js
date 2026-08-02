const NO_CONTROL_POINTS = Object.freeze([])

const controlPoint = (code, name) => Object.freeze({ code, name })

const bcp = (code, name, controlPoints = NO_CONTROL_POINTS) =>
  Object.freeze({ code, name, controlPoints })

// Repository source: workareas/shared/trace-requirements/ched-pp/pages/
// transport-before-bip.json. Its bcp field captures these 25 code/name pairs;
// its control-point field confirms the two CONPNT premises below. The source
// is explicitly partial, so no unobserved BCP or premises identifier is added.
const BCPS = Object.freeze([
  bcp('UK6N3IVF', 'ABC Legal'),
  bcp('UKVTZOI8', 'ABC Legal'),
  bcp('UK9M301K', 'ABC Legal'),
  bcp('UK0ICKBR', 'ABC Legal'),
  bcp('UKU6G5N1', 'ABC Legal'),
  bcp('UKXZDFMB', 'ABC Legal'),
  bcp('UKK4X46Z', 'ABC Legal'),
  bcp('UKPAK5PR', 'ABC Legal'),
  bcp('UKARBQVP', 'ABC Legal'),
  bcp('UKVO3L92', 'ABC Legal'),
  bcp('WQ9z7', 'ABCD'),
  bcp('NiKTZ', 'ABCD'),
  bcp('GBAHB4PP', 'Aberdeen Harbour Board'),
  bcp('GBABP4PP', 'Associated British Ports - Ayr'),
  bcp('GBHLL4PP', 'Associated British Ports - Hull'),
  bcp('GBPLP4PP', 'Associated British Ports - Plymouth'),
  bcp('GBPOS4PP', 'Associated British Ports - Silloth'),
  bcp('TEST123', 'Automation9 Testing'),
  bcp('CHEDPP1', 'Belfast Pharmaceuticals'),
  bcp('GBBXH4PP', 'Birmingham International Airport'),
  bcp(
    'CONPNT',
    'Control Point',
    Object.freeze([
      controlPoint('INSPBAR1', 'Barfoots of Botley (Chichester)'),
      controlPoint('INSPBER1', 'Berryplants Ltd')
    ])
  ),
  bcp('GBLHR4PP', 'Heathrow Airport'),
  bcp('GBDOV1PP', 'Port of Dover (Western)'),
  bcp('GBFXT1PP', 'Port of Felixstowe'),
  bcp('GBFOL4PP', 'Folkestone')
])

const toBcpOption = ({ code, name }) =>
  Object.freeze({ value: code, text: `${name} - ${code}` })

const toControlPointOption = ({ code, name }) =>
  Object.freeze({ value: code, text: name })

const BCP_OPTIONS = Object.freeze(BCPS.map(toBcpOption))

const BCP_BY_CODE = Object.freeze(
  Object.fromEntries(BCPS.map((entry) => [entry.code, entry]))
)

const BCP_LABELS = Object.freeze(
  Object.fromEntries(
    BCP_OPTIONS.map(({ value, text: label }) => [value, label])
  )
)

const CONTROL_POINT_OPTIONS_BY_BCP = Object.freeze(
  Object.fromEntries(
    BCPS.map(({ code, controlPoints }) => [
      code,
      Object.freeze(controlPoints.map(toControlPointOption))
    ])
  )
)

const CONTROL_POINT_CODES_BY_BCP = Object.freeze(
  Object.fromEntries(
    BCPS.map(({ code, controlPoints }) => [
      code,
      Object.freeze(
        controlPoints.map(({ code: controlPointCode }) => controlPointCode)
      )
    ])
  )
)

const CONTROL_POINT_LABELS = Object.freeze(
  Object.fromEntries(
    BCPS.flatMap(({ controlPoints }) =>
      controlPoints.map(({ code, name }) => [code, name])
    )
  )
)

export const list = () => BCP_OPTIONS

export const bcpLabel = (code) => BCP_LABELS[code]

export const hasControlPoints = (bcpCode) =>
  (BCP_BY_CODE[bcpCode]?.controlPoints.length ?? 0) > 0

export const controlPointsFor = (bcpCode) =>
  CONTROL_POINT_OPTIONS_BY_BCP[bcpCode] ?? NO_CONTROL_POINTS

export const controlPointCodesFor = (bcpCode) =>
  CONTROL_POINT_CODES_BY_BCP[bcpCode] ?? NO_CONTROL_POINTS

export const controlPointLabel = (code) => CONTROL_POINT_LABELS[code]

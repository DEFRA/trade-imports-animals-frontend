import * as commodities from '../../../../../../services/commodities/index.js'

// The declared count is a number once the line is saved and the entered string
// on a re-render, so the summary reads it as text either way. A line the user
// has not counted yet shows nothing rather than "undefined".
const countText = (value) => String(value ?? '')

// One summary row per commodity line, so the table pairs one-for-one with the
// identification cards below it: commodity code, the species' common name and
// the number of animals the line declares. The consignment-details page shows
// the same code/common-name pairing without the count and with a Remove
// action; here the row action is a Change link back to the commodity question,
// which is where the commodity list is answered.
export const buildSelectedCommodities = (lines) =>
  lines.map(({ entry }) => ({
    code: commodities.commodityCodeFor(entry.commoditySelection) ?? '',
    name: commodities.speciesCommonName(
      entry.commoditySelection,
      entry.speciesSelection
    ),
    animals: countText(entry.numberOfAnimalsQuantity)
  }))

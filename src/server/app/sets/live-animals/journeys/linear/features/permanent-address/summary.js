/**
 * The error summary's ordered entries for a page of refused cards: one entry
 * per refused control, in card order then each card's own field order. An
 * address field's entry names its card's animal; a place-of-destination
 * refusal does not.
 *
 * @param {object[]} cards - the built card view models, as `buildCards`
 * gives them.
 * @param {object} copy - the feature's copy.
 * @returns {object} map of field key to summary text, empty when no card is
 * refused.
 */
export const summaryTextFor = (cards, copy) =>
  Object.fromEntries(
    cards.flatMap((card) => [
      ...(card.optionError ? [[card.optionName, card.optionError]] : []),
      ...card.addressFields
        .filter((field) => field.error)
        .map((field) => [
          field.id,
          copy.errors.forAnimal(field.error, card.title)
        ])
    ])
  )

/**
 * How a species is labelled wherever it is offered on this page — what the
 * animal is called in English first, so a trader who does not read Latin can
 * tell the tick boxes apart, with the scientific name in brackets after it. A
 * species the catalogue holds no common name for is labelled with the name of
 * the commodity it sits under instead.
 *
 * @param {string} name - the commodity the species sits under.
 * @param {{text: string, commonName?: string}} option - the species option.
 * @returns {string} the label shown against the species.
 */
export const speciesLabelFor = (name, option) =>
  `${option.commonName ?? name} (${option.text})`

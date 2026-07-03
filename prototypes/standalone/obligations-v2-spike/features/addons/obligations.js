/**
 * Add to your policy — the add-on picker obligation this feature owns. Pure
 * data; imports nothing outward.
 *
 * Selecting an add-on activates that add-on's derived detail obligations
 * (driverName, modDescription, ncdYears, …). Those relationships are declared
 * on the detail defs in the named-driver / modifications / protected-ncd
 * features, which import `addons` from here — this feature is the shared
 * activation source for three downstream slices.
 */
export const addons = { id: 'addons' }

export const defs = [addons]

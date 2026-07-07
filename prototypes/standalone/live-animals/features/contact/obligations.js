/**
 * The consignment's contact address. V4 carries TWO variants sharing the
 * one #contact_address anchor (conflict c-001, deliberately UNRESOLVED):
 * one consumed from gov.identity ("if more than one address exists the
 * user must select one before continuing") and one created by the user via
 * the Standard address block ("Mandatory to proceed"). The spec models
 * them as ONE select-or-create obligation; this prototype builds only the
 * select-from-gov.identity side — the create-new form is the unresolved
 * variant and stays unbuilt until c-001 is ruled on.
 *
 * required feeds the status roll-up; blank never blocks Save and Continue
 * (enforcedAt=submit). The answer is a copied { name, address } party
 * record (c-020).
 */
export const contactAddress = { id: 'contactAddress', required: true }

export const obligations = [contactAddress]

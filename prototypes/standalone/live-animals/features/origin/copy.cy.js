// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Tarddiad y mewnforyn',
  country: {
    label: 'Gwlad tarddiad',
    placeholder: 'Dewiswch wlad'
  },
  regionRequirement: {
    legend: 'A oes gan y llwyth god rhanbarth tarddiad?',
    hint: 'Os oes angen cod rhanbarth tarddiad, bydd yn cael ei ddangos ar eich tystysgrif iechyd.',
    yes: 'Oes',
    no: 'Nac oes'
  },
  regionCode: {
    label: 'Cod rhanbarth tarddiad',
    hint: 'Er enghraifft, FR-75'
  },
  internalReference: {
    label: 'Eich cyfeirnod mewnol ar gyfer y llwyth hwn (dewisol)',
    hint: 'Rhowch unrhyw gyfeirnod mewnol yr hoffech ei ddefnyddio i adnabod y llwyth hwn, neu gadewch yn wag.'
  },
  errors: {
    countryRequired: "Dewiswch y wlad y mae'r anifail yn tarddu ohoni",
    regionCodeMaxLength:
      "Rhaid i'r cod rhanbarth tarddiad fod yn 5 nod neu lai",
    internalReferenceMaxLength:
      "Rhaid i'r cyfeirnod mewnol fod yn 58 nod neu lai",
    internalReferencePattern:
      "Rhaid i'r cyfeirnod mewnol gynnwys llythrennau a rhifau yn unig"
  }
}

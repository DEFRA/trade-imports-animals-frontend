import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Array.isArray(value)
    ? value.map(shape)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [key, shape(nested)])
        )
      : typeof value

// pp-090 deliberately differs from live IPAFFS after delegated content/legal
// judgment: the Scotland clause has a subject, the duplicated "issued" is
// removed, and the legal declaration quotes are balanced. The legal-string
// word choice is one word to reverse if the content owner disagrees.
describe('plant-products declaration copy', () => {
  it('keeps English and Welsh bundles structurally identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('pins the terminal action and validation copy', () => {
    expect(en.title).toBe('Declaration')
    expect(en.declarationLabel).toBe(
      'I/We have read and understood the Conditions, Data Protection Statement and Legal Declarations'
    )
    expect(en.submitButton).toBe('Submit notification')
    expect(en.errors.declarationRequired).toBe(
      'You must confirm that you have read and understood the Conditions, Data Protection Statement and Legal Declarations'
    )
  })

  it('pins the English declaration intro literally', () => {
    expect(en.intro).toEqual([
      'By clicking on the check box at the bottom of the page you are declaring that you have read and understood, accept and agree to the terms and conditions of the declaration.',
      'Submission of the form will not be allowed until all fields have been completed and the check box has been ticked.'
    ])
  })

  it('pins the English Scotland controls literally', () => {
    expect(en.scotland.controls).toBe(
      'Plants, plant products and other objects entering into Scotland or destined for a Control Point registered in Scotland will be subject to control verification procedures by SASA.'
    )
  })

  it('pins the Welsh Scotland controls literally', () => {
    expect(cy.scotland.controls).toBe(
      "Planhigion, cynhyrchion planhigion a gwrthrychau eraill sy'n dod i mewn i'r Alban neu sydd wedi'u bwriadu ar gyfer Pwynt Rheoli sydd wedi'i gofrestru yn yr Alban byddant yn destun gweithdrefnau gwirio rheolaethau gan SASA."
    )
  })

  it('pins the corrected Welsh declaration term literally', () => {
    expect(cy.terms.items[2]).toBe(
      "Ni chaiff unrhyw CHED derfynol ei defnyddio mewn perthynas ag unrhyw blanhigion, cynhyrchion planhigion neu wrthrychau eraill ac eithrio'r rhai y mae'n berthnasol iddynt."
    )
  })

  it('pins every English declaration term literally', () => {
    expect(en.terms).toEqual({
      heading: 'Statement of terms and conditions for applications',
      aphaDefinition:
        'For the purposes of the declaration "APHA" refers to the HMI and the PHSI.',
      items: [
        'No liability shall attach to the APHA/SASA for any delay in granting or failure to grant a finalised Common Health Entry Document (CHED), nor any delay in inspecting or failure to inspect, delayed or non-delivery of any document.',
        'The APHA/SASA shall be entitled to rely upon the accuracy of all documentation and information supplied by the operator responsible, for the inspection or for the issuance of a finalised CHED.',
        'No finalised CHED shall be used in respect of any plants, plant products or other objects except those to which it applies.',
        'Inspections will be carried out and finalised CHEDs will be issued only on the understanding that no liability shall attach to the APHA/SASA in any circumstance in respect of any inspection carried out or the issue of or contents of any CHED and that the APHA/SASA accepts no responsibility for any resulting loss however caused.',
        'The responsibility for charges incurred in such inspections must be borne by the operator responsible for the consignment. Including payment for official controls, as well as for re-dispatching consignments, quarantine or isolation of consignments, or costs of destruction and disposal where necessary.',
        'The APHA/SASA will not issue a finalised CHED in respect of plants, plant products or other objects, which in their opinion is incorrect or inaccurate.'
      ]
    })
  })

  it('pins every English regulation literally', () => {
    expect(en.legal.regulations).toEqual([
      'Regulation (EU) 2016/2031, (retained EU legislation)',
      'Regulation (EU) 2017/625, (retained EU legislation)',
      'Regulation (EU) 543/2011, (retained EU legislation)',
      'Regulation (EU) 1333/2011, (retained EU legislation)'
    ])
  })

  it('pins every English APHA address line literally', () => {
    expect(en.enquiries.aphaAddressLines).toEqual([
      'Animal and Plant Health Agency,',
      'Foss House',
      'Kings Pool, 1-2 Peasholme Green,',
      'York,',
      'YO1 7PX',
      'Tel: 0300 1000 313',
      'Email: phsi-importers@apha.gov.uk'
    ])
  })

  it('pins every English external-link label literally', () => {
    expect([
      en.englandWales.enforcementPolicyLinkText,
      en.dataProtection.aphaPrivacyLinkText,
      en.dataProtection.sasaPrivacyLinkText
    ]).toEqual([
      'DEFRA enforcement policy (PDF)',
      'APHA privacy notice (PDF)',
      'SASA privacy statement'
    ])
  })
})

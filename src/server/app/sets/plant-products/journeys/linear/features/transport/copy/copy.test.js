import { describe, expect, it } from 'vitest'

import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

describe('plant-products transport copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
  })

  it('uses visible field labels in every canonical English error', () => {
    expect(en.errors).toMatchObject({
      bcpRequired: 'Select the entry border control post',
      premisesRequired: 'Select the inspection premises',
      meansRequired: 'Select the means of transport to the BCP',
      identificationRequired: 'Enter the transport identification',
      documentReferenceRequired: 'Enter the transport document reference',
      containerOrSealRequired:
        'Enter a container or trailer number, or a seal number'
    })
    expect(Object.values(en.errors).join(' ')).not.toMatch(
      /Add (identification|document|.*details)/
    )
  })

  it('provides the accessible fieldset and checkbox labels', () => {
    expect(en.means.label).toBe('Means of transport to the BCP')
    expect(en.arrivalTime.legend).toBe('Time of estimated arrival')
    expect(en.containers.officialSeal.label).toBe('This is an official seal')
  })
})

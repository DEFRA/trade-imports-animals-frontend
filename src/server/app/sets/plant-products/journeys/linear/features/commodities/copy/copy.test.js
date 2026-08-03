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

const leaves = (value) =>
  typeof value === 'object' && value !== null
    ? Object.values(value).flatMap(leaves)
    : [value]

describe('plant-products commodities copy', () => {
  it('keeps English and Welsh structure-identical with translated leaves', () => {
    expect(shape(cy)).toEqual(shape(en))
    expect(leaves(cy)).not.toEqual(leaves(en))
  })

  it('provides every commodities key with non-empty copy', () => {
    expect(en).toEqual({
      inputMethod: {
        title: expect.any(String),
        caption: expect.any(String),
        heading: expect.any(String),
        options: {
          MANUAL: { label: expect.any(String), hint: expect.any(String) },
          CSV: { label: expect.any(String), hint: expect.any(String) }
        },
        errors: { required: expect.any(String) }
      },
      commoditySearch: {
        title: expect.any(String),
        caption: expect.any(String),
        heading: expect.any(String),
        tabs: {
          codeSearch: expect.any(String),
          speciesSearch: expect.any(String)
        },
        codeSearch: {
          legend: expect.any(String),
          label: expect.any(String),
          hint: expect.any(String),
          button: expect.any(String),
          noResults: expect.any(String)
        },
        tree: {
          heading: expect.any(String),
          allCommodities: expect.any(String),
          select: expect.any(String)
        },
        speciesSearch: {
          legend: expect.any(String),
          label: expect.any(String),
          hint: expect.any(String),
          button: expect.any(String),
          add: expect.any(String),
          noResults: expect.any(String)
        },
        errors: {
          codeRequired: expect.any(String),
          codeNumeric: expect.any(String),
          codeDuplicate: expect.any(String),
          speciesRequired: expect.any(String)
        }
      },
      basicDescription: {
        caption: expect.any(String),
        heading: expect.any(String),
        commoditySummary: {
          caption: expect.any(String),
          codeHeader: expect.any(String),
          descriptionHeader: expect.any(String)
        },
        legend: expect.any(String),
        hint: expect.any(String),
        added: {
          caption: expect.any(String),
          genusHeader: expect.any(String),
          eppoHeader: expect.any(String),
          removeLabel: expect.any(String),
          removeHidden: expect.any(String)
        },
        filter: {
          legend: expect.any(String),
          genusLabel: expect.any(String),
          eppoLabel: expect.any(String),
          searchLabel: expect.any(String),
          clearLabel: expect.any(String)
        },
        results: {
          caption: expect.any(String),
          genusHeader: expect.any(String),
          eppoHeader: expect.any(String),
          addLabel: expect.any(String),
          addHidden: expect.any(String),
          noResults: expect.any(String)
        },
        errors: { selectAtLeastOne: expect.any(String) }
      },
      varietyOfGenusAndSpecies: {
        title: expect.any(String),
        caption: expect.any(String),
        heading: expect.any(String),
        speciesHeading: expect.any(String),
        repeatedControlContext: expect.any(String),
        removeContext: expect.any(String),
        varietyLabel: expect.any(String),
        varietyPlaceholder: expect.any(String),
        otherOption: expect.any(String),
        otherVarietyLabel: expect.any(String),
        otherVarietyHint: expect.any(String),
        classLabel: expect.any(String),
        classPlaceholder: expect.any(String),
        classOptions: {
          CLASS_I: expect.any(String),
          CLASS_II: expect.any(String),
          EXTRA_CLASS: expect.any(String)
        },
        table: {
          caption: expect.any(String),
          variety: expect.any(String),
          class: expect.any(String),
          remove: expect.any(String)
        },
        addAnotherVariety: expect.any(String),
        addAnotherSpecies: expect.any(String),
        remove: expect.any(String),
        errors: {
          varietyRequired: expect.any(String),
          classRequired: expect.any(String),
          atLeastOneVariety: expect.any(String),
          duplicatePair: expect.any(String),
          otherVarietyRequired: expect.any(String),
          otherVarietyLength: expect.any(String)
        }
      },
      commoditySummary: {
        caption: expect.any(String),
        heading: expect.any(String),
        tableCaption: expect.any(String),
        columns: {
          commodityCode: expect.any(String),
          genusAndSpecies: expect.any(String),
          eppoCode: expect.any(String),
          variety: expect.any(String),
          class: expect.any(String),
          actions: expect.any(String)
        },
        remove: expect.any(String),
        removeContext: expect.any(String),
        addAnotherSpecies: expect.any(String),
        addAnotherCommodity: expect.any(String),
        continue: expect.any(String)
      },
      commodityBulkDetails: {
        title: expect.any(String),
        caption: expect.any(String),
        heading: expect.any(String),
        controlContext: expect.any(String),
        optionContext: expect.any(String),
        bulk: {
          heading: expect.any(String),
          selectLines: expect.any(String),
          selectAll: expect.any(String),
          apply: expect.any(String),
          clear: expect.any(String)
        },
        fields: {
          numberOfPackages: { label: expect.any(String) },
          packageType: {
            label: expect.any(String),
            placeholder: expect.any(String)
          },
          quantity: { label: expect.any(String) },
          quantityType: {
            label: expect.any(String),
            placeholder: expect.any(String)
          },
          netWeight: { label: expect.any(String) },
          controlledAtmosphereContainer: {
            legend: expect.any(String),
            options: { yes: expect.any(String), no: expect.any(String) }
          },
          finishedOrPropagated: {
            legend: expect.any(String),
            options: {
              finished: expect.any(String),
              propagated: expect.any(String)
            }
          },
          intendedForFinalUsers: {
            legend: expect.any(String),
            options: { yes: expect.any(String), no: expect.any(String) }
          },
          testAndTrial: { label: expect.any(String) }
        },
        totals: {
          lineHeading: expect.any(String),
          consignmentHeading: expect.any(String),
          packages: expect.any(String),
          netWeight: expect.any(String)
        },
        errors: {
          selectLine: expect.any(String),
          fillOneField: expect.any(String),
          numberOfPackagesRequired: expect.any(String),
          numberOfPackagesWhole: expect.any(String),
          packageTypeRequired: expect.any(String),
          quantityRequired: expect.any(String),
          quantityFormat: expect.any(String),
          quantityTypeRequired: expect.any(String),
          netWeightRequired: expect.any(String),
          netWeightMin: expect.any(String),
          netWeightDecimals: expect.any(String),
          netWeightDigits: expect.any(String),
          finishedOrPropagatedRequired: expect.any(String)
        }
      }
    })
    for (const leaf of leaves(en)) {
      expect(leaf.trim().length).toBeGreaterThan(0)
    }
  })
})

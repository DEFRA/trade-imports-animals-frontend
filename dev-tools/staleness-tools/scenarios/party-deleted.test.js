import { describe, expect, it } from 'vitest'

import { obligations } from '../../../src/server/app/sets/live-animals/obligations/index.js'
import {
  CONTACT_PARTY,
  PARTIES
} from '../../../src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js'

describe('#partyDeleted', () => {
  // Pin: the scenario reads its role list from PARTIES + CONTACT_PARTY, and
  // resolves each name to an obligation id. If a role is added to those
  // sources without a matching entry in the obligations manifest, the scenario
  // would silently ignore it — this fails first, on main CI, before anyone
  // runs the tool. Everything else the scenario does is verified end-to-end
  // in the integration test.
  it('Should resolve every role name in PARTIES + CONTACT_PARTY to an obligation', () => {
    const names = [...PARTIES.map((p) => p.id), CONTACT_PARTY.id]
    for (const name of names) {
      expect(obligations.find((o) => o.name === name)).toBeTruthy()
    }
  })
})

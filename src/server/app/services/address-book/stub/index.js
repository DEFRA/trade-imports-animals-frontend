import { fromRow } from './from-row.js'

/** The address book for `STUB_MODE=true` — local development and the
 * frontend Playwright suite without the address-book service running.
 *
 * Mirrors `trade-imports-animals-tests/seeds/mongodb/30-seed-address-book.js`
 * record-for-record and in the same page order (five per page): rows 1–5 are
 * the happy-path parties, then contact plus the Danish/pagination records.
 * Country is the display name `client.js` would resolve from the seed's
 * `countryCode` (or the literal "United Kingdom" the seed stores as-is). */
export const STUB_BOOK = [
  'astra-rosales|Astra Rosales|43 East Hague Extension|Bern|30055|Switzerland',
  'tech-imports-ltd|Tech Imports Ltd|18 Dockside Road|London|E14 9GE|United Kingdom',
  'origin-farm|Origin Farm|1 Farm Lane|Ennis|V95 X7P2|Ireland',
  'british-livestock-ltd|British Livestock Ltd|10 Market Street|Leeds|LS1 6HB|United Kingdom',
  'import-co-uk|Import Co UK|20 Trade Road|London|EC1A 1BB|United Kingdom',
  'animal-and-plant-health-agency|Animal and Plant Health Agency|Woodham Lane|Addlestone|KT15 3NB|United Kingdom',
  'danish-meat-export-aps|Danish Meat Export ApS|Havnegade 21|Copenhagen|1058|Denmark',
  'jutland-swine-aps|Jutland Swine ApS|Sondergade 4|Aarhus|8000|Denmark',
  'laiterie-du-nord|Laiterie du Nord SARL|12 Rue de la Gare|Lille|59000|France',
  'nordvik-seafood|Nordvik Seafood AS|Havnegata 8|Alesund|6002|Norway',
  'alpine-dairy|Alpine Dairy GmbH|Bahnhofstrasse 17|Innsbruck|6020|Austria',
  'irish-beef-traders-ltd|Irish Beef Traders Ltd|Castle Road 9|Kilkenny|R95 F2X8|Ireland',
  'iberian-swine-sa|Iberian Swine SA|Calle Mayor 44|Huesca|22001|Spain'
].map(fromRow)

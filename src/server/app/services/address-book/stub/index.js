import { fromRow } from './from-row.js'

/** The address book for `STUB_MODE=true` — local development and the
 * frontend Playwright suite without the address-book service running.
 *
 * Each record carries the roles the tests repo's shared e2e fixture gives
 * the record with the same address, so a picker lists the same records in
 * stub mode as it would read from a live book carrying that fixture. One
 * further record, `unclassified-traders-ltd`, carries no role at all — the
 * address book refuses to create a record with an empty roles list, so this
 * is the only way to exercise the pre-roles state every picker must still
 * list. Country is the display name `client.js` would resolve from the
 * seed's `countryCode` (or the literal "United Kingdom" the seed stores
 * as-is). */
export const STUB_BOOK = [
  'astra-rosales|Astra Rosales|43 East Hague Extension|Bern|30055|Switzerland|CH|CONSIGNOR',
  'tech-imports-ltd|Tech Imports Ltd|18 Dockside Road|London|E14 9GE|United Kingdom|GB|PLACE_OF_DESTINATION',
  'origin-farm|Origin Farm|1 Farm Lane|Ennis|V95 X7P2|Ireland|IE|PLACE_OF_ORIGIN',
  'british-livestock-ltd|British Livestock Ltd|10 Market Street|Leeds|LS1 6HB|United Kingdom|GB|CONSIGNEE',
  'import-co-uk|Import Co UK|20 Trade Road|London|EC1A 1BB|United Kingdom|GB|IMPORTER',
  'animal-and-plant-health-agency|Animal and Plant Health Agency|Woodham Lane|Addlestone|KT15 3NB|United Kingdom|GB|BRANCH_ADDRESS',
  'danish-meat-export-aps|Danish Meat Export ApS|Havnegade 21|Copenhagen|1058|Denmark|DK|CONSIGNOR',
  'jutland-swine-aps|Jutland Swine ApS|Sondergade 4|Aarhus|8000|Denmark|DK|CONSIGNOR',
  'laiterie-du-nord|Laiterie du Nord SARL|12 Rue de la Gare|Lille|59000|France|FR|CONSIGNOR',
  'nordvik-seafood|Nordvik Seafood AS|Havnegata 8|Alesund|6002|Norway|NO|CONSIGNOR',
  'alpine-dairy|Alpine Dairy GmbH|Bahnhofstrasse 17|Innsbruck|6020|Austria|AT|CONSIGNOR',
  'irish-beef-traders-ltd|Irish Beef Traders Ltd|Castle Road 9|Kilkenny|R95 F2X8|Ireland|IE|CONSIGNOR',
  'iberian-swine-sa|Iberian Swine SA|Calle Mayor 44|Huesca|22001|Spain|ES|CONSIGNOR',
  'unclassified-traders-ltd|Unclassified Traders Ltd|9 Quayside|Hull|HU1 1TQ|United Kingdom|GB|'
].map(fromRow)

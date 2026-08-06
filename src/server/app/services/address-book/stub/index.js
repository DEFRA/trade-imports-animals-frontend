import { fromRow } from './from-row.js'

/** A small untyped book for `LIVE_ANIMALS_MODE=stub` — local development
 * without the address book running.
 *
 * EUDPA-294 deleted the placeholder operators the journey used to seed itself
 * from (six role-keyed lists of 40). This is not those: nothing here is offered
 * in real mode, and it exists only so the pickers have something to page
 * through offline. Addresses have no type (D3), so there is one book, not one
 * per role. Keep it long enough to paginate and no longer — tests build their
 * own fixtures rather than leaning on these records. */
export const STUB_BOOK = [
  'astra-rosales|Astra Rosales|43 East Hague Extension|Bern|30055|Switzerland',
  'eurostore-services|EuroStore Services|Rue de la Loi 200|Brussels|1040|Belgium',
  'laiterie-du-nord|Laiterie du Nord SARL|12 Rue de la Gare|Lille|59000|France',
  'nordvik-seafood|Nordvik Seafood AS|Havnegata 8|Ålesund|6002|Norway',
  'pyrenean-livestock|Pyrenean Livestock SL|Calle Mayor 44|Huesca|22001|Spain',
  'alpine-dairy|Alpine Dairy GmbH|Bahnhofstrasse 17|Innsbruck|6020|Austria',
  'de-vries-veehandel|De Vries Veehandel BV|Marktplein 3|Utrecht|3511|Netherlands',
  'kilkenny-agri|Kilkenny Agri Supplies|Castle Road 9|Kilkenny|R95|Ireland',
  'baltic-freight|Baltic Freight OU|Sadama 12|Tallinn|10111|Estonia',
  'lombardia-carni|Lombardia Carni SpA|Via Roma 88|Brescia|25121|Italy',
  'copenhagen-provisions|Copenhagen Provisions ApS|Havnegade 21|Copenhagen|1058|Denmark',
  'warsaw-agrimport|Warsaw AgriImport Sp z oo|Ulica Polna 5|Warsaw|00-625|Poland'
].map(fromRow)

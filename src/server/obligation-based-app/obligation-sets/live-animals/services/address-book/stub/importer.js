import { fromRow } from './from-row.js'

export const IMPORTER_OPTIONS = [
  {
    id: 'import-co-uk',
    name: 'Import Co UK',
    address: {
      addressLine1: '20 Trade Road',
      addressLine2: 'London EC1A 1BB',
      country: 'United Kingdom'
    }
  },
  {
    id: 'gb-animal-imports',
    name: 'GB Animal Imports',
    address: {
      addressLine1: '5 Port Way',
      addressLine2: 'Dover CT16 3AQ',
      country: 'United Kingdom'
    }
  },
  {
    id: 'highland-import-services',
    name: 'Highland Import Services',
    address: {
      addressLine1: '12 Glen Road',
      addressLine2: 'Inverness IV1 1JN',
      country: 'United Kingdom'
    }
  },
  ...[
    'albion-import-agency|Albion Import Agency|2 Custom House Quay|London|EC3R 6AN|United Kingdom',
    'dover-trade-services|Dover Trade Services|9 Snargate Street|Dover|CT17 9BZ|United Kingdom',
    'holyhead-import-bureau|Holyhead Import Bureau|4 Newry Street|Holyhead|LL65 1HN|United Kingdom',
    'felixstowe-agents|Felixstowe Agents Ltd|11 Dock Approach|Felixstowe|IP11 3SY|United Kingdom',
    'tilbury-livestock-imports|Tilbury Livestock Imports|6 Ferry Road|Tilbury|RM18 7NG|United Kingdom',
    'immingham-trade|Immingham Trade Ltd|18 Kings Road|Immingham|DN40 2LZ|United Kingdom',
    'portsmouth-agri-imports|Portsmouth Agri Imports|23 The Hard|Portsmouth|PO1 3PT|United Kingdom',
    'cairnryan-imports|Cairnryan Imports Ltd|3 Loch View|Stranraer|DG9 8RF|United Kingdom',
    'larne-import-partners|Larne Import Partners|15 Harbour Road|Larne|BT40 1AW|United Kingdom',
    'hull-livestock-brokers|Hull Livestock Brokers|27 Ferensway|Hull|HU2 8LB|United Kingdom',
    'teesside-import-group|Teesside Import Group|8 Riverside Way|Middlesbrough|TS2 1RT|United Kingdom',
    'bristol-channel-imports|Bristol Channel Imports|14 Prince Street|Bristol|BS1 4QD|United Kingdom',
    'clydeport-agri|Clydeport Agri Ltd|5 Greenock Road|Greenock|PA15 1LY|United Kingdom',
    'thamesport-brokers|Thamesport Brokers Ltd|21 Medway Road|Rochester|ME1 1DZ|United Kingdom',
    'harwich-import-services|Harwich Import Services|7 Quay Street|Harwich|CO12 3HH|United Kingdom',
    'newhaven-agri|Newhaven Agri Ltd|10 Beach Road|Newhaven|BN9 9BY|United Kingdom',
    'poole-trade-imports|Poole Trade Imports|16 Quay Road|Poole|BH15 1HJ|United Kingdom',
    'grangemouth-imports|Grangemouth Imports Ltd|4 Dock Street|Grangemouth|FK3 8UG|United Kingdom',
    'seaforth-livestock|Seaforth Livestock Ltd|12 Regent Road|Bootle|L20 1AA|United Kingdom',
    'medway-animal-trade|Medway Animal Trade|9 Pier Road|Gillingham|ME7 1RX|United Kingdom',
    'anglo-continental-imports|Anglo Continental Imports|30 Cannon Street|London|EC4M 6XH|United Kingdom',
    'caledonian-import-co|Caledonian Import Co|22 Commercial Street|Aberdeen|AB11 5AA|United Kingdom',
    'severnside-brokers|Severnside Brokers Ltd|6 Avonmouth Way|Avonmouth|BS11 9DQ|United Kingdom',
    'eastern-counties-imports|Eastern Counties Imports|13 Norwich Road|Ipswich|IP1 2ET|United Kingdom',
    'pentland-trade|Pentland Trade Ltd|2 Shore Street|Leith|EH6 6QN|United Kingdom',
    'mersey-animal-imports|Mersey Animal Imports|19 Strand Street|Liverpool|L1 8LT|United Kingdom',
    'wessex-import-bureau|Wessex Import Bureau|5 Castle Street|Salisbury|SP1 1BE|United Kingdom',
    'northgate-livestock|Northgate Livestock Ltd|24 Northgate|Chester|CH1 2HQ|United Kingdom',
    'solway-import-agency|Solway Import Agency|11 Shore Road|Annan|DG12 5DL|United Kingdom',
    'weald-agri-imports|Weald Agri Imports|8 Station Road|Ashford|TN23 1PP|United Kingdom',
    'tamar-trade-services|Tamar Trade Services|17 Union Street|Plymouth|PL1 3HQ|United Kingdom',
    'don-valley-imports|Don Valley Imports Ltd|26 Sheffield Road|Rotherham|S60 1DX|United Kingdom',
    'trent-livestock-imports|Trent Livestock Imports|3 Canal Street|Nottingham|NG1 7EH|United Kingdom',
    'borderway-imports|Borderway Imports Ltd|14 Rosehill|Carlisle|CA1 2RS|United Kingdom',
    'deeside-animal-trade|Deeside Animal Trade|7 Welsh Road|Deeside|CH5 2LR|United Kingdom',
    'ouse-valley-imports|Ouse Valley Imports|20 Foss Bank|York|YO31 7UT|United Kingdom',
    'hafren-import-cyf|Hafren Import Cyf|9 Bridge Street|Newtown|SY16 2AB|United Kingdom'
  ].map(fromRow)
]

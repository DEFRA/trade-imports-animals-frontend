import { fromRow } from './from-row.js'

export const CONSIGNEE_OPTIONS = [
  {
    id: 'british-livestock',
    name: 'British Livestock Ltd',
    address: {
      addressLine1: '10 Market Street',
      addressLine2: 'Leeds LS1 6HB',
      country: 'United Kingdom'
    }
  },
  {
    id: 'northern-farms',
    name: 'Northern Farms Co',
    address: {
      addressLine1: '22 Barn Road',
      addressLine2: 'York YO1 8AB',
      country: 'United Kingdom'
    }
  },
  {
    id: 'agri-imports',
    name: 'Agri Imports PLC',
    address: {
      addressLine1: '88 Grain Wharf',
      addressLine2: 'Bristol BS1 4RQ',
      country: 'United Kingdom'
    }
  },
  ...[
    'midlands-cattle-market|Midlands Cattle Market Ltd|18 Smithfield Way|Birmingham|B5 6QF|United Kingdom',
    'wessex-dairy|Wessex Dairy Holdings|3 Abbey Road|Salisbury|SP1 2EY|United Kingdom',
    'borders-livestock|Borders Livestock Group|7 Tweed Street|Berwick-upon-Tweed|TD15 1AB|United Kingdom',
    'anglia-poultry|Anglia Poultry Ltd|22 Fen Lane|Norwich|NR1 3HG|United Kingdom',
    'severn-valley-farms|Severn Valley Farms|9 Bridge Street|Gloucester|GL1 2QB|United Kingdom',
    'cheshire-herds|Cheshire Herds Ltd|41 Watling Street|Chester|CH1 1AA|United Kingdom',
    'pennine-sheep|Pennine Sheep Co|5 Moor Road|Halifax|HX1 4TY|United Kingdom',
    'kent-orchard-livestock|Kent Orchard Livestock|12 Hop Lane|Maidstone|ME14 1XX|United Kingdom',
    'cornish-breeders|Cornish Breeders Ltd|8 Harbour View|Truro|TR1 2QQ|United Kingdom',
    'lothian-agri|Lothian Agri Ltd|30 Princes Street|Edinburgh|EH2 2ER|United Kingdom',
    'clyde-cattle|Clyde Cattle Co|15 Argyle Street|Glasgow|G2 8BH|United Kingdom',
    'snowdonia-flocks|Snowdonia Flocks Cyf|2 Bangor Road|Caernarfon|LL55 1AS|United Kingdom',
    'ulster-livestock|Ulster Livestock Ltd|44 Antrim Road|Belfast|BT15 2AB|United Kingdom',
    'fenland-swine|Fenland Swine Ltd|6 Drove Road|Peterborough|PE1 1QA|United Kingdom',
    'cotswold-equine|Cotswold Equine Centre|11 Stable Yard|Cirencester|GL7 1XL|United Kingdom',
    'mersey-import-partners|Mersey Import Partners|27 Dock Road|Liverpool|L3 4BQ|United Kingdom',
    'humber-agri-supplies|Humber Agri Supplies|19 Wharf Street|Hull|HU1 1UU|United Kingdom',
    'tyne-livestock|Tyne Livestock Ltd|33 Quayside|Newcastle upon Tyne|NE1 3DX|United Kingdom',
    'solent-farm-imports|Solent Farm Imports|4 Marine Parade|Southampton|SO14 5JA|United Kingdom',
    'thames-valley-stock|Thames Valley Stock Ltd|21 Mill Lane|Reading|RG1 8DR|United Kingdom',
    'peak-district-herds|Peak District Herds|10 Dale View|Buxton|SK17 6AA|United Kingdom',
    'norfolk-turkey|Norfolk Turkey Farms|17 Church Road|Thetford|IP24 1BQ|United Kingdom',
    'devon-red-cattle|Devon Red Cattle Ltd|1 Moorland Road|Exeter|EX1 1QQ|United Kingdom',
    'yorkshire-pig|Yorkshire Pig Co|25 Market Place|Doncaster|DN1 1NE|United Kingdom',
    'galloway-beef|Galloway Beef Ltd|13 Castle Street|Dumfries|DG1 1DR|United Kingdom',
    'brecon-livestock|Brecon Livestock Cyf|9 High Street|Brecon|LD3 7AL|United Kingdom',
    'fife-poultry|Fife Poultry Ltd|14 Mill Road|Kirkcaldy|KY1 1QW|United Kingdom',
    'essex-farm-group|Essex Farm Group|38 Baddow Road|Chelmsford|CM2 0DG|United Kingdom',
    'shropshire-sheep|Shropshire Sheep Co|7 Wyle Cop|Shrewsbury|SY1 1UT|United Kingdom',
    'lincoln-longwool|Lincoln Longwool Ltd|16 Steep Hill|Lincoln|LN2 1LT|United Kingdom',
    'dorset-downs|Dorset Downs Farms|3 West Street|Dorchester|DT1 1UP|United Kingdom',
    'cumbria-fell-stock|Cumbria Fell Stock|20 Lake Road|Kendal|LA9 4AB|United Kingdom',
    'suffolk-punch|Suffolk Punch Stables|5 Bury Road|Ipswich|IP1 1RT|United Kingdom',
    'angus-beef-traders|Angus Beef Traders|29 Union Street|Dundee|DD1 4BQ|United Kingdom',
    'gower-livestock|Gower Livestock Ltd|12 Wind Street|Swansea|SA1 1DR|United Kingdom',
    'chiltern-dairy|Chiltern Dairy Ltd|8 Aylesbury Road|High Wycombe|HP11 2BX|United Kingdom',
    'wirral-imports|Wirral Imports Ltd|31 Grange Road|Birkenhead|CH41 2AB|United Kingdom'
  ].map(fromRow)
]

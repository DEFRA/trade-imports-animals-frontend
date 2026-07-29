import { fromRow } from './from-row.js'

export const DESTINATION_OPTIONS = [
  {
    id: 'tech-imports',
    name: 'Tech Imports Ltd',
    address: {
      addressLine1: '643 Main Street',
      addressLine2: 'Birmingham G1 3AZ',
      country: 'United Kingdom'
    }
  },
  {
    id: 'united-commerce',
    name: 'United Commerce',
    address: {
      addressLine1: '446 Church Lane',
      addressLine2: 'Manchester S1 2JE',
      country: 'United Kingdom'
    }
  },
  {
    id: 'global-trading',
    name: 'Global Trading Co',
    address: {
      addressLine1: '945 Main Street',
      addressLine2: 'London LS1 5AB',
      country: 'United Kingdom'
    }
  },
  ...[
    'ashfield-quarantine|Ashfield Quarantine Centre|1 Kennel Lane|Mansfield|NG18 1AB|United Kingdom',
    'eastbrook-farm|Eastbrook Farm|Brook Lane|Swindon|SN6 8DR|United Kingdom',
    'willow-tree-holding|Willow Tree Holding|Willow Road|Taunton|TA1 4QP|United Kingdom',
    'redhills-abattoir|Redhills Abattoir|Redhills Industrial Estate|Penrith|CA11 0DT|United Kingdom',
    'moorside-quarantine|Moorside Quarantine Unit|Moor Lane|Skipton|BD23 1RT|United Kingdom',
    'greenacres-stables|Greenacres Stables|Paddock Way|Newmarket|CB8 8EL|United Kingdom',
    'blackthorn-kennels|Blackthorn Kennels|Thorn Lane|Guildford|GU2 7XH|United Kingdom',
    'northfield-dairy|Northfield Dairy Unit|Northfield Road|Preston|PR1 5TT|United Kingdom',
    'hillcrest-holding|Hillcrest Holding|Hill Road|Bakewell|DE45 1BX|United Kingdom',
    'sandybank-farm|Sandybank Farm|Sandy Lane|Wrexham|LL13 9BA|United Kingdom',
    'glenmore-estate|Glenmore Estate|Glen Road|Aviemore|PH22 1QU|United Kingdom',
    'oakwood-livestock-centre|Oakwood Livestock Centre|Oak Drive|Northampton|NN1 3AB|United Kingdom',
    'brackenhill-farm|Brackenhill Farm|Bracken Way|Durham|DH1 5RQ|United Kingdom',
    'seaview-quarantine|Seaview Quarantine Station|Coast Road|Great Yarmouth|NR30 3AH|United Kingdom',
    'millbrook-holding|Millbrook Holding|Mill Lane|Bedford|MK40 1AA|United Kingdom',
    'ferndale-poultry-unit|Ferndale Poultry Unit|Fern Road|Merthyr Tydfil|CF47 8UT|United Kingdom',
    'stonebridge-farm|Stonebridge Farm|Bridge Road|Stafford|ST16 2QA|United Kingdom',
    'larchfield-stud|Larchfield Stud|Larch Avenue|Lambourn|RG17 7LL|United Kingdom',
    'beechwood-holding|Beechwood Holding|Beech Lane|Hereford|HR1 2QT|United Kingdom',
    'cairnhill-abattoir|Cairnhill Abattoir|Cairn Road|Inverurie|AB51 4AA|United Kingdom',
    'westgate-livestock-market|Westgate Livestock Market|Westgate|Louth|LN11 9YD|United Kingdom',
    'elmtree-farm|Elmtree Farm|Elm Lane|Chippenham|SN15 1AB|United Kingdom',
    'harbourside-quarantine|Harbourside Quarantine|Harbour Road|Fishguard|SA65 9BQ|United Kingdom',
    'brookvale-dairy|Brookvale Dairy|Vale Road|Yeovil|BA20 1AA|United Kingdom',
    'highfield-kennels|Highfield Kennels|High Road|Basingstoke|RG21 4BB|United Kingdom',
    'ravenscourt-stables|Ravenscourt Stables|Raven Lane|Malton|YO17 7BQ|United Kingdom',
    'clover-hill-farm|Clover Hill Farm|Clover Lane|Armagh|BT61 7AA|United Kingdom',
    'springfield-holding|Springfield Holding|Spring Road|Kilmarnock|KA1 1AA|United Kingdom',
    'lakeside-poultry|Lakeside Poultry Ltd|Lake Road|Windermere|LA23 1AA|United Kingdom',
    'thornbury-abattoir|Thornbury Abattoir|Thorn Street|Thornbury|BS35 1AA|United Kingdom',
    'crossgates-market|Crossgates Livestock Market|Cross Road|Llandrindod Wells|LD1 6RF|United Kingdom',
    'birchgrove-farm|Birchgrove Farm|Birch Lane|Colchester|CO1 1AA|United Kingdom',
    'dunmore-holding|Dunmore Holding|Dunmore Road|Falkirk|FK2 7AA|United Kingdom',
    'wheatfield-stud|Wheatfield Stud|Wheat Lane|Cheltenham|GL50 1AA|United Kingdom',
    'saltmarsh-quarantine|Saltmarsh Quarantine Unit|Marsh Road|Boston|PE21 6AA|United Kingdom',
    'pinewood-kennels|Pinewood Kennels|Pine Avenue|Farnham|GU9 8AA|United Kingdom',
    'abbeyfield-farm|Abbeyfield Farm|Abbey Road|Bury St Edmunds|IP33 1AA|United Kingdom'
  ].map(fromRow)
]

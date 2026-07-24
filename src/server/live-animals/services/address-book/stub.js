/** A canned address-book record, one per line:
 * `id|name|address line 1|town or city|postal or zip code|country`. The ids
 * are stable — the picker's radio values and its carried selection are the id,
 * never a row index. */
const fromRow = (row) => {
  const [id, name, addressLine1, townOrCity, postalOrZipCode, country] =
    row.split('|')
  return {
    id,
    name,
    address: { addressLine1, townOrCity, postalOrZipCode, country }
  }
}

export const CONSIGNOR_OPTIONS = [
  {
    id: 'astra-rosales',
    name: 'Astra Rosales',
    address: {
      addressLine1: '43 East Hague Extension',
      addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
      addressLine3: 'Quasoccaecat ut ear, 30055',
      country: 'Switzerland'
    }
  },
  {
    id: 'eurostore-services',
    name: 'EuroStore Services',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '1040 Brussels',
      country: 'Belgium'
    }
  },
  {
    id: 'laiterie-du-nord',
    name: 'Laiterie du Nord SARL',
    address: {
      addressLine1: '12 Rue de la Gare',
      addressLine2: '59000 Lille',
      country: 'France'
    }
  },
  ...[
    'danish-meat-export|Danish Meat Export ApS|Vesterbrogade 12|Copenhagen|1620|Denmark',
    'portuguese-livestock|Portuguese Livestock Lda|Rua Augusta 250|Lisbon|1100-053|Portugal',
    'romanian-agri-exports|Romanian Agri Exports SRL|Bulevardul Unirii 22|Bucharest|030833|Romania',
    'slovak-farm-export|Slovak Farm Export|Obchodna 2|Bratislava|811 06|Slovakia',
    'finnish-livestock|Finnish Livestock Oy|Mannerheimintie 10|Helsinki|00100|Finland',
    'bavarian-cattle|Bavarian Cattle GmbH|Maximilianstrasse 8|Munich|80539|Germany',
    'dutch-dairy-export|Dutch Dairy Export BV|Keizersgracht 62|Amsterdam|1015 CS|Netherlands',
    'irish-beef-traders|Irish Beef Traders Ltd|14 Merrion Row|Dublin|D02 XY45|Ireland',
    'polska-hodowla|Polska Hodowla Sp z oo|Ulica Marszalkowska 76|Warsaw|00-517|Poland',
    'iberian-swine|Iberian Swine SA|Calle Gran Via 31|Madrid|28013|Spain',
    'lombardia-bovini|Lombardia Bovini Srl|Via Manzoni 9|Milan|20121|Italy',
    'baltic-agri|Baltic Agri UAB|Gedimino Prospektas 5|Vilnius|01103|Lithuania',
    'hellenic-goat-export|Hellenic Goat Export AE|Ermou 44|Athens|105 63|Greece',
    'czech-poultry|Czech Poultry AS|Narodni 20|Prague|110 00|Czechia',
    'austrian-alpine-stock|Austrian Alpine Stock GmbH|Kaerntner Strasse 15|Vienna|1010|Austria',
    'swedish-herd|Swedish Herd AB|Drottninggatan 55|Stockholm|111 21|Sweden',
    'norsk-husdyr|Norsk Husdyr AS|Karl Johans Gate 18|Oslo|0159|Norway',
    'hungarian-stud|Hungarian Stud Kft|Andrassy Ut 27|Budapest|1061|Hungary',
    'bulgarian-flocks|Bulgarian Flocks EOOD|Vitosha Boulevard 40|Sofia|1000|Bulgaria',
    'croatian-livestock|Croatian Livestock doo|Ilica 102|Zagreb|10000|Croatia',
    'estonian-farm-group|Estonian Farm Group OU|Viru Valjak 4|Tallinn|10111|Estonia',
    'latvian-agro|Latvian Agro SIA|Brivibas Iela 60|Riga|LV-1011|Latvia',
    'slovenian-breeders|Slovenian Breeders doo|Slovenska Cesta 30|Ljubljana|1000|Slovenia',
    'luxembourg-trade|Luxembourg Trade Sarl|Rue du Fort 9|Luxembourg|L-1528|Luxembourg',
    'brittany-porc|Brittany Porc SAS|Rue de Brest 21|Rennes|35000|France',
    'andalusian-equine|Andalusian Equine SL|Avenida de la Constitucion 5|Seville|41004|Spain',
    'tuscan-ovine|Tuscan Ovine Srl|Via Roma 12|Florence|50123|Italy',
    'rhine-valley-farms|Rhine Valley Farms GmbH|Rheinstrasse 44|Cologne|50667|Germany',
    'flanders-poultry|Flanders Poultry NV|Grote Markt 7|Ghent|9000|Belgium',
    'jutland-swine|Jutland Swine ApS|Havnegade 3|Aarhus|8000|Denmark',
    'algarve-caprine|Algarve Caprine Lda|Rua do Comercio 18|Faro|8000-078|Portugal',
    'carpathian-herds|Carpathian Herds SRL|Strada Republicii 8|Cluj-Napoca|400015|Romania',
    'tatra-livestock|Tatra Livestock sro|Hlavna 44|Kosice|040 01|Slovakia',
    'lapland-reindeer|Lapland Reindeer Oy|Koskikatu 9|Rovaniemi|96200|Finland',
    'limousin-cattle|Limousin Cattle SAS|Place de la Republique 3|Limoges|87000|France',
    'zeeland-goats|Zeeland Goats BV|Havenweg 11|Vlissingen|4381 AA|Netherlands',
    'alentejo-bovine|Alentejo Bovine SA|Praca do Giraldo 6|Evora|7000-508|Portugal'
  ].map(fromRow)
]

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

export const PLACE_OF_ORIGIN_OPTIONS = [
  {
    id: 'origin-farm',
    name: 'Origin Farm',
    address: {
      addressLine1: '1 Farm Lane',
      addressLine2: 'County Clare',
      country: 'Ireland'
    }
  },
  {
    id: 'nordic-livestock',
    name: 'Nordic Livestock AS',
    address: {
      addressLine1: 'Fjordveien 12',
      addressLine2: '4010 Stavanger',
      country: 'Norway'
    }
  },
  {
    id: 'ferme-des-alpes',
    name: 'Ferme des Alpes SARL',
    address: {
      addressLine1: 'Route des Alpes 45',
      addressLine2: '74000 Annecy',
      country: 'France'
    }
  },
  ...[
    'hof-lindenberg|Hof Lindenberg|Dorfstrasse 3|Rosenheim|83022|Germany',
    'ferme-du-perche|Ferme du Perche|Route de Nogent 8|Mortagne-au-Perche|61400|France',
    'finca-la-dehesa|Finca La Dehesa|Camino Real 12|Caceres|10001|Spain',
    'cascina-verde|Cascina Verde|Strada Provinciale 4|Cremona|26100|Italy',
    'boerderij-de-vaart|Boerderij De Vaart|Polderweg 22|Lelystad|8221 RA|Netherlands',
    'gaard-solheim|Gaard Solheim|Fjellveien 6|Voss|5700|Norway',
    'quinta-do-vale|Quinta do Vale|Estrada Nacional 9|Santarem|2000-100|Portugal',
    'gospodarstwo-zielone|Gospodarstwo Zielone|Ulica Wiejska 14|Lublin|20-001|Poland',
    'statek-vysocina|Statek Vysocina|Polni 7|Jihlava|586 01|Czechia',
    'tanya-alfold|Tanya Alfold|Kossuth Utca 5|Kecskemet|6000|Hungary',
    'ferma-dunarea|Ferma Dunarea|Strada Garii 11|Braila|810001|Romania',
    'gard-osterlen|Gard Osterlen|Byvagen 9|Simrishamn|272 31|Sweden',
    'maatila-koivula|Maatila Koivula|Peltotie 4|Seinajoki|60100|Finland',
    'landbrug-vestjylland|Landbrug Vestjylland|Markvej 18|Holstebro|7500|Denmark',
    'hoeve-de-kempen|Hoeve De Kempen|Kempenlaan 5|Turnhout|2300|Belgium',
    'bauernhof-tirol|Bauernhof Tirol|Bergweg 2|Innsbruck|6020|Austria',
    'ktima-thessalia|Ktima Thessalia|Odos Larisis 16|Larissa|412 22|Greece',
    'ukis-zemaitija|Ukis Zemaitija|Sodu Gatve 3|Telsiai|87101|Lithuania',
    'saimnieciba-kurzeme|Saimnieciba Kurzeme|Lauku Iela 7|Kuldiga|LV-3301|Latvia',
    'talu-laane|Talu Laane|Metsa Tee 9|Parnu|80010|Estonia',
    'kmetija-savinja|Kmetija Savinja|Cesta Zmage 4|Celje|3000|Slovenia',
    'gazdovstvo-nitra|Gazdovstvo Nitra|Polna 6|Nitra|949 01|Slovakia',
    'farma-slavonija|Farma Slavonija|Osjecka 21|Osijek|31000|Croatia',
    'ferma-rodopi|Ferma Rodopi|Ulitsa Trakiya 5|Plovdiv|4000|Bulgaria',
    'ferme-de-la-loire|Ferme de la Loire|Chemin des Vignes 3|Tours|37000|France',
    'masseria-puglia|Masseria Puglia|Via Appia 30|Bari|70121|Italy',
    'granja-el-encinar|Granja El Encinar|Carretera de Toledo 15|Talavera de la Reina|45600|Spain',
    'gutshof-mecklenburg|Gutshof Mecklenburg|Seestrasse 11|Schwerin|19053|Germany',
    'herdade-do-sobral|Herdade do Sobral|Rua da Fonte 4|Beja|7800-000|Portugal',
    'bondegard-fyn|Bondegard Fyn|Landevejen 24|Odense|5000|Denmark',
    'gospodarstwo-mazury|Gospodarstwo Mazury|Ulica Lesna 8|Olsztyn|10-001|Poland',
    'maatila-savo|Maatila Savo|Jarvitie 12|Kuopio|70100|Finland',
    'gard-jaeren|Gard Jaeren|Sandveien 7|Sandnes|4306|Norway',
    'boerderij-friesland|Boerderij Friesland|Terpweg 2|Leeuwarden|8911 AA|Netherlands',
    'ferme-des-ardennes|Ferme des Ardennes|Rue du Bois 6|Bastogne|6600|Belgium',
    'statok-liptov|Statok Liptov|Hlavna 19|Liptovsky Mikulas|031 01|Slovakia',
    'ktima-peloponnisos|Ktima Peloponnisos|Odos Korinthou 8|Tripoli|221 00|Greece'
  ].map(fromRow)
]

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

export const CONTACT_OPTIONS = [
  {
    id: 'animal-and-plant-health-agency',
    name: 'Animal and Plant Health Agency',
    address: {
      addressLine1: 'Woodham Lane',
      addressLine2: 'New Haw',
      addressLine3: 'Addlestone, KT15 3NB',
      country: 'United Kingdom'
    }
  },
  {
    id: 'eurostore-services',
    name: 'EuroStore Services',
    address: {
      addressLine1: '8448 Gleason Creek',
      addressLine2: 'Apt. 221',
      addressLine3: 'Hyattmouth, 72183',
      country: 'France'
    }
  },
  {
    id: 'laiterie-du-nord',
    name: 'Laiterie du Nord SARL',
    address: {
      addressLine1: '4295 Michele Courts',
      addressLine2: 'Suite 479',
      addressLine3: 'Kesslerbury, 528272',
      country: 'Albania'
    }
  }
]

export const COMMERCIAL_TRANSPORTER_OPTIONS = [
  {
    id: 'garcia-livestock-transport',
    name: 'García Livestock Transport SL',
    approvalNumber: 'ES-T2-45001294',
    address: {
      addressLine1: '43 East Hague Extension',
      addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
      addressLine3: 'Quasoccaecat ut ear, 30055',
      country: 'Switzerland'
    }
  },
  {
    id: 'j-and-g-campbell',
    name: 'J & G Campbell LTD',
    approvalNumber: 'UK/BURY/T2/00104115',
    address: {
      addressLine1: 'Rue de la Loi 200',
      addressLine2: '1040 Brussels',
      country: 'Belgium'
    }
  }
]

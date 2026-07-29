import { fromRow } from './from-row.js'

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

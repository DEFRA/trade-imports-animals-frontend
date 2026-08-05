import { fromRow } from './from-row.js'

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

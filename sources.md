# Sources & credits

## Base layers
- World countries: Natural Earth 1:50m admin-0 (public domain), simplified.
- US counties: U.S. Census Bureau cartographic boundary file cb_2023_us_county_5m (public domain), TopoJSON simplified.
- US states / 13 Nations regions: dissolved from the same county file. Regions = the 13 groupings used on the 13 Nations posters.
- Canada provinces; Malaysia & Indonesia ADM1: Natural Earth 1:10m admin-1 (public domain) / geoBoundaries gbOpen ADM1.
- Worldwide admin units: geoBoundaries gbOpen (Runfola et al. 2020, PLoS ONE 15(4): e0231866; www.geoboundaries.org), ADM2 for 180 countries, ADM1 fallback for 21. Licences vary by country (listed per country in base/adm/index.json): Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO) (48); Open Data Commons Open Database License 1.0 (42); Public Domain (33); Creative Commons Attribution 4.0 International (CC BY 4.0) (26); Creative Commons Attribution 4.0 (CC BY 4.0) (13); Creative Commons Attribution-ShareAlike 2.0 (9); Creative Commons Attribution 3.0 License (7); Creative Commons Attribution-ShareAlike 3.0 Unported (6); CC0 1.0 Universal (CC0 1.0) Public Domain Dedication (5); Creative Commons Attribution 2.5 Generic (3); Open Government Canada 2.0 (1); Federal Office of Topography swisstopo License (1); Open Data Commons Public Domain Dedication and License (PDDL) v1.0 (1); Data license Germany - Attribution - Version 2.0 (1); National Institute of Statistics (INE) Data License (1); Etalab Open License 2.0 (1); Open Government Licence v3.0 (1); Other - Direct Permission (1); Singapore Open Data License Version 1.0 (1)
- Flags: Wikimedia Commons national flags (public domain).
- Libraries: Leaflet 1.9.4 (BSD-2), topojson-client 3.1.0 (ISC), vendored in lib/.

## Datasets
### After English & Spanish, what does each US county speak? (`us_county_language`)
- U.S. Census Bureau ACS 2020-24 5-yr C16001 via Census Reporter — https://censusreporter.org/tables/C16001/
- ACS 2009-13 detailed county language tables — https://www.census.gov/data/tables/2013/demo/2009-2013-lang-tables.html
- Census 2000 STP 224 (language detail by county) — https://www.census.gov/data/tables/2000/dec/phc-t-37.html
- Census cartographic boundary files 2023 (public domain) — https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html
- Note: Language = county's leading ACS C16001 group after English & Spanish, named with the finest detail available. Small counties have large margins of error. Family groups: see palette.json family_note.
### What is each country's second language? (`world_second_language`)
- Compulsory-language rules per country (see proxy_v3_sources.csv URLs in each popup)
- Eurostat educ_uoe_lang01 (ISCED 3) — https://ec.europa.eu/eurostat/databrowser/view/educ_uoe_lang01/default/table
- American Councils K-12 Foreign Language Enrollment Survey 2017 — https://www.americancouncils.org/sites/default/files/FLE-report-June17.pdf
- UNESCO UIS EA.3T8.AG25T99 — https://api.uis.unesco.org/
- Natural Earth 1:50m (public domain) — https://www.naturalearthdata.com/
- Note: Second language = compulsory or most-studied school language (world v8 rules). Grey = no source found. Canada is split: Quebec English, rest French (overlay).
### Which official language is the second one in each Canadian province? (`canada_second_language`)
- Statistics Canada, 2021 Census, The Daily 17 Aug 2022 — https://www150.statcan.gc.ca/n1/daily-quotidien/220817/dq220817a-eng.htm
- Natural Earth admin-1 (public domain) — https://www.naturalearthdata.com/
### Which of the 13 US regions is each state in? (`regions13_outline`)
- Regions as used on the 13 Nations posters; state boundaries Census 2023
### What share of each US county is Hispanic or Black? (`us_county_hispanic_black_2020`)
- U.S. Census Bureau 2020 Census Redistricting Data (P.L. 94-171) — https://www.census.gov/programs-surveys/decennial-census/about/rdo/summary-files.html
- Note: Connecticut uses the 8 old counties in 2020 data, so CT's 2023 planning regions show no data.
### How many private schools does each US county have? (`us_county_private_schools`)
- NCES Private School Universe Survey 2023-24 (public-use file) — https://nces.ed.gov/surveys/pss/
- Note: Weighted survey estimates; counties with no sampled school show no data.
### What share of each state's private schools are religious? (`us_state_private_schools`)
- NCES Private School Universe Survey 2023-24 — https://nces.ed.gov/surveys/pss/
### Where do America's Amish live? (`us_amish_2026`)
- Young Center for Anabaptist and Pietist Studies, Elizabethtown College: Amish Population 2026 — https://groups.etown.edu/amishstudies/amish-population-2026
### What share of each Malaysian district is Chinese, Malay or Indian? (`mys_district_ethnicity`)
- Department of Statistics Malaysia, population by district (OpenDOSM population_district) — https://open.dosm.gov.my/
- Boundaries: geoBoundaries MYS ADM2 — https://www.geoboundaries.org/
- Note: Gedong, Lingga, Pantu, Sebuyau, Siburan, Membakut and Putrajaya have no matching boundary and are not shown.
### How has each Malaysian state's ethnic mix changed since 1970? (`mys_state_ethnicity`)
- Department of Statistics Malaysia, population by state (OpenDOSM population_state) — https://open.dosm.gov.my/
- Boundaries: geoBoundaries MYS ADM1 — https://www.geoboundaries.org/
### What share of each Singapore planning area is Chinese, Malay or Indian? (`sgp_planning_area_ethnicity`)
- Singapore Department of Statistics, Census of Population 2020, resident population by planning area and ethnic group (data.gov.sg) — https://data.gov.sg/
- Boundaries: geoBoundaries SGP ADM2 (URA planning areas) — https://www.geoboundaries.org/
### What share of each Indonesian province was Chinese in 2010? (`idn_province_chinese_2010`)
- BPS Population Census 2010 (SP2010 table L2.6); Arifin, Hasbullah & Pramono (2016); Ananta et al. (2015)
- Boundaries: geoBoundaries IDN ADM1 — https://www.geoboundaries.org/
- Note: North Kalimantan split from East Kalimantan in 2012; 2010 figure sits in East Kalimantan.
### Which Indonesian cities had the most Chinese residents in 2010? (`idn_district_chinese_2010`)
- Arifin et al. 2016 top-10 table (BPS Census 2010)
- Note: Only the published top districts; all others show no data.
### What share of pupils in each French département go to private school? (`fra_dept_private_school`)
- MEN open data, pupils by sector 2025: écoles — https://data.education.gouv.fr/explore/dataset/fr-en-ecoles-effectifs-nb_classes/
- collèges — https://data.education.gouv.fr/explore/dataset/fr-en-college-effectifs-niveau-sexe-lv/
- lycées GT — https://data.education.gouv.fr/explore/dataset/fr-en-lycee_gt-effectifs-niveau-sexe-lv/
- lycées pro — https://data.education.gouv.fr/explore/dataset/fr-en-lycee_pro-effectifs-niveau-sexe-lv/
- Annuaire de l'éducation (school counts) — https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/
- Boundaries: geoBoundaries FRA ADM2 — https://www.geoboundaries.org/
- Note: Overseas départements are not in the geoBoundaries FRA ADM2 file and are not drawn.

## Aviation — "Where does the A380 still fly?" (data/a380_routes_nw26.json, data/a380_airports.json), accessed 2 Nov 2026
- Business Insider / Cirium, "Where you can still fly the A380" (Nov 2026 schedule), 20 Sep 2026: https://www.businessinsider.com/airbus-a380-routes-destinations-airlines-2026-9
- Flightradar24 Blog, "Emirates A380 routes in 2026" (Jan 2026 flight list; used as frequency reference only): https://www.flightradar24.com/blog/aviation-news/airline-news/airline-routes/emirates-a380-routes-in-2026-where-the-superjumbo-flies/
- AeroRoutes, Emirates NW26 London Gatwick, 23 Dec 2025: https://www.aeroroutes.com/eng/251223-eknw26lgw
- AeroRoutes, Emirates NW26 Beijing A380, 10 Sep 2026: https://www.aeroroutes.com/eng/260910-eknw26pe
- AeroRoutes, Emirates NW26 Dusseldorf, 3 Oct 2026: https://www.aeroroutes.com/eng/261003-eknw26dus
- AeroRoutes, Emirates NW26 Washington (777-300ER, not A380), 15 Sep 2026: https://www.aeroroutes.com/eng/260915-eknw26iad
- AeroRoutes, Qatar Airways NW26 A380 operations, 21 Jul 2026: https://www.aeroroutes.com/eng/260721-qrnw26380
- MainlyMiles, "Where is Singapore Airlines flying its A380s?", 28 Sep 2026: https://mainlymiles.com/2026/09/28/where-is-sia-flying-airbus-a380s/
- AeroRoutes, Lufthansa NW26 intercontinental changes, 20 May 2026: https://www.aeroroutes.com/eng/260520-lhnw26inc
- AeroRoutes, British Airways Sep 2026–Mar 2027 A380 changes, 27 Apr 2026: https://www.aeroroutes.com/eng/260427-banw26388
- Simple Flying / Cirium, "British Airways cuts A380 Heathrow routes to just 4": https://simpleflying.com/british-airways-cuts-a380-heathrow-routes-to-just-4/
- AeroRoutes, Etihad A380 Bangkok in NW26, 25 Feb 2026: https://www.aeroroutes.com/eng/260225-eynw26bkk
- AeroRoutes, Etihad NW26 Europe changes, 16 Aug 2026: https://www.aeroroutes.com/eng/260816-eynw26eu
- AeroRoutes, Etihad Jun 2026 A380 Singapore, 16 Jun 2026: https://www.aeroroutes.com/eng/260616-eyjun26sin
- AeroRoutes, Etihad A380 Tokyo from Jun 2026, 24 Nov 2025: https://www.aeroroutes.com/eng/251124-eyns26nrt
- AeroRoutes, Korean Air–Asiana NW26 international changes, 3 Sep 2026: https://www.aeroroutes.com/eng/260902-keoznw26int
- AeroRoutes, Asiana 4Q26 A380 regional revisions, 19 Oct 2026: https://www.aeroroutes.com/eng/261019-oz4q26388
- AeroRoutes, Qantas reduces Sydney–Los Angeles in NW26, 3 Mar 2026: https://www.aeroroutes.com/eng/260303-qfnw26sydlax
- AeroRoutes, Qantas expands A380 Sydney–Singapore from Dec 2026, 26 Feb 2026: https://www.aeroroutes.com/eng/260226-qfnw26sydsin
- AeroRoutes, Qantas NW26 Sydney–Johannesburg, 21 Jul 2026: https://www.aeroroutes.com/eng/260721-qfnw26jnb
- AeroRoutes, Qantas removes A380 Melbourne–Los Angeles in NW26, 26 Feb 2026: https://www.aeroroutes.com/eng/260226-qfnw26mellax
- ANA, FLYING HONU (A380) Narita–Honolulu schedule: https://www.ana.co.jp/en/jp/international/area/hawaii/a380/
- Wikipedia, List of Airbus A380 operators (fleet, June 2026): https://en.wikipedia.org/wiki/List_of_Airbus_A380_operators
- Wikipedia airline fleet tables (cabin layouts): Emirates/BA/SQ/QR/EY/LH/Korean Air/Asiana/ANA: https://en.wikipedia.org/wiki/List_of_Airbus_A380_operators
- OurAirports airports.csv (public domain): https://ourairports.com/data/
### Where does America actually commute? (`us_megaregions`)
- Nelson, G.D. & Rae, A. (2016). An Economic Geography of the United States: From Commutes to Megaregions. PLOS ONE 11(11): e0166083 — https://doi.org/10.1371/journal.pone.0166083
- Rae, A. & Nelson, G.D. United States Commutes and Megaregions data for GIS, v5, University of Sheffield (Figshare), doi:10.15131/shef.data.4110156.v5, CC BY 4.0 — mosaic-regions (detailed) tract-built regions; counties assigned by largest area share (/workspace/maps/megaregions/build.py, build2.py)
### Where do America's Amish live? (by county) (`us_amish_2026`)
- 2020 U.S. Religion Census, Group Detail Data by County, ASARB — https://www.usreligioncensus.org/interactive-tables (Amish Groups, undifferentiated)

## How did the world's airline network grow? (`airline_timeline`)
- Milestone routes 1914–2018 (22 segments): each verified against its Wikipedia article (link in each route's popup), accessed 2 Nov 2026. Milestones only, not complete networks.
- 2014 network: OpenFlights routes.dat/airlines.dat (June 2014 snapshot, ODbL) https://openflights.org/data.php — 67,663 records → 18,763 undirected airport pairs; 1,460 records skipped (airport not matched).
- Airport positions: OurAirports (public domain), incl. closed Croydon (GB-1268) and Kemayoran (ID-0231).
- Gap: no open complete network for 1915–2013 or 2015–2026.
- Update (backwards dating): every 2014 pair placed at its earliest possible year = max(both airports' Wikidata opening/inception, earliest Wikidata founding year among its airlines). 12,156 lower-bound dated, 6,607 undated (shown 2014 only), 0 confirmed; 22 milestones confirmed.
- Airliners counter: ICAO Annual Report 2015 App. 1 Table 10 (2006–2014), ICAO Annual Report 1997 (1988, 1997), Skybrary Global Aviation Safety Study (1960 <3,000); other years 1961–2013 linearly interpolated and labelled.

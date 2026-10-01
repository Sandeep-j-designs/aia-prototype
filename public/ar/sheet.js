/* GENERATED from public/ar/index.html by scripts/build-ar-sheet.cjs — the sheet engine, wrapped in one function scope per evaluation.
   Edit index.html and re-run; changes here are overwritten. */
(function(){

"use strict";
/* ============================================================================
   0. PARAMS
   ----------------------------------------------------------------------------
   Opened standalone, this file is configured by its query string — ?embed=1,
   ?item=…, ?inboxv2=1, ?dev. Loaded into the inbox's own document there is no
   query string to read: the URL is /inbox/<id>. So the host may instead declare
   the same values on window.AR_PARAMS before this script runs, and the URL
   still wins when both are present.

   Read through this everywhere rather than touching location.search directly,
   or the engine half-configures itself under a host.

   Named AR_PARAMS rather than AP_PARAMS deliberately: both sheets now run in
   the same document, and one shared global would have the bill's config
   answering the invoice's questions the moment an accountant paged from an AP
   item to an AR one.
   ==========================================================================*/
const AR_PARAMS = (() => {
  const query = new URLSearchParams(location.search);
  const host = (typeof window !== "undefined" && window.AR_PARAMS) || null;
  return {
    get: (key) => query.get(key) ?? (host && key in host ? host[key] : null),
    has: (key) => query.has(key) || !!(host && key in host),
  };
})();

/* ----------------------------------------------------------------------------
   Is this evaluation still the one driving the sheet?

   The inbox evaluates this script again for every invoice it opens, and an
   evaluation cannot be taken back: removing the <script> element drops the tag,
   not the listeners and observers it registered. So a superseded engine is
   still running, and its nodes have been unmounted — anything of its own that
   fires late reaches for a document that is no longer there.

   The host stamps a generation before each evaluation. Async entry points that
   can outlive theirs check this and return. Standalone there is no stamp, the
   generation is 0 on both sides, and this is always true.
   -------------------------------------------------------------------------- */
const AR_GEN = (typeof window !== "undefined" && window.__AR_GEN__) || 0;
const arLive = () =>
  ((typeof window !== "undefined" && window.__AR_GEN__) || 0) === AR_GEN;
/* ============================================================================
   1. MASTERS
   ==========================================================================*/
const STATES = [
  ['AN','Andaman & Nicobar','35'],['AP','Andhra Pradesh','37'],['AR','Arunachal Pradesh','12'],
  ['AS','Assam','18'],['BR','Bihar','10'],['CH','Chandigarh','04'],['CG','Chhattisgarh','22'],
  ['DL','Delhi','07'],['GA','Goa','30'],['GJ','Gujarat','24'],['HR','Haryana','06'],
  ['HP','Himachal Pradesh','02'],['JK','Jammu & Kashmir','01'],['JH','Jharkhand','20'],
  ['KA','Karnataka','29'],['KL','Kerala','32'],['LA','Ladakh','38'],['MP','Madhya Pradesh','23'],
  ['MH','Maharashtra','27'],['MN','Manipur','14'],['ML','Meghalaya','17'],['MZ','Mizoram','15'],
  ['NL','Nagaland','13'],['OD','Odisha','21'],['PY','Puducherry','34'],['PB','Punjab','03'],
  ['RJ','Rajasthan','08'],['SK','Sikkim','11'],['TN','Tamil Nadu','33'],['TG','Telangana','36'],
  ['TR','Tripura','16'],['UP','Uttar Pradesh','09'],['UK','Uttarakhand','05'],['WB','West Bengal','19'],
  ['OT','Other Territory / Overseas','97']
].map(([code,name,gst])=>({id:code,name:`(${code}) ${name}`,plain:name,gst}));

/* --- Reference masters from the COA workbook --------------------------------
   The long lists are packed one-per-record into a single string and split on
   read: eleven hundred HSN codes written as object literals cost more to ship
   than the whole rest of the sheet, and nothing here is edited at runtime.
   `~` separates records, `|` separates fields. */
const unpack = (s, keys) => s.split('~').map(r => {
  const p = r.split('|'), o = {};
  keys.forEach((k, i) => o[k] = p[i] || '');
  return o;
});
/* A list whose id and name are the same string — most of them. */
const plainList = s => s.split('~').map(v => ({id:v, name:v}));

/* Every currency the book can hold. Hidden behind the Multi-Currency flag but
   stored either way — a ledger created while the flag is off is still an INR
   ledger, not a ledger with no currency on it. */
const CURRENCIES = unpack(
    'AED|UAE Dirham~AFN|Afghan Afghani~ALL|Albanian Lek~AMD|Armenian Dram~ANG|Netherlands Antillian ' +
    'Guilder~AOA|Angolan Kwanza~ARS|Argentine Peso~AUD|Australian Dollar~AWG|Aruban ' +
    'Guilder~AZN|Azerbaijanian Manat~BAM|Bosnia and Herzegovina Convertible Marks~BBD|Barbadian ' +
    'Dollar~BDT|Bangladeshi Taka~BGN|Bulgarian Lev~BHD|Bahraini Dinar~BIF|Burundian ' +
    'Franc~BMD|Bermudian Dollar (Bermuda Dollar)~BND|Brunei Dollar~BOB|Bolivian ' +
    'Boliviano~BOV|Mvdol~BRL|Brazilian Real~BSD|Bahamian Dollar~BTN|Bhutanese Ngultrum~BWP|Botswana ' +
    'Pula~BYN|Belarussian Ruble~BZD|Belize Dollar~CAD|Canadian Dollar~CDF|Congolese franc~CHE|WIR ' +
    'Euro~CHW|WIR Franc~CLF|Chilean Unidades de formento~CLP|Chilean Peso~CNY|Yuan ' +
    'Renminbi~COP|Colombian Peso~COU|Unidad de Valor Real~CRC|Costa Rican Colon~CUC|Cuban Convertible' +
    ' Peso~CUP|Cuban Peso~CVE|Cape Verdean Escudo~CZK|Czech Koruna~DJF|Djiboutian Franc~DKK|Danish ' +
    'Krone~DOP|Dominican Peso~DZD|Algerian Dinar~EGP|Egyptian Pound~ERN|Eritrean Nakfa~ETB|Ethiopian ' +
    'Birr~EUR|Euro~FJD|Fijian Dollar~FKP|Falkland Islands Pound~GBP|Pound Sterling~GEL|Georgian ' +
    'Lari~GGP|Guernsey Pound~GHS|Ghanaian Cedi~GIP|Gibraltar Pound~GMD|Gambian Dalasi~GNF|Guinean ' +
    'Franc~GTQ|Guatemalan Quetzal~GYD|Guyanese Dollar~HKD|Hong Kong Dollar~HNL|Honduran ' +
    'Lempira~HRK|Croatian Kuna~HTG|Haitian Gourde~HUF|Hungarian Forint~IDR|Indonesian ' +
    'Rupiah~ILS|Israeli new shekel~IMP|Manx Pound~INR|Indian Rupee~IQD|Iraqi Dinar~IRR|Iranian ' +
    'Rial~ISK|Icelandic Krona~JEP|Jersey Pound~JMD|Jamaican Dollar~JOD|Jordanian Dinar~JPY|Japanese ' +
    'Yen~KES|Kenyan Shilling~KGS|Kyrgyzstani Som~KHR|Cambodian Riel~KMF|Comorian Franc~KPW|North ' +
    'Korean Won~KRW|South Korean Won~KWD|Kuwaiti Dinar~KYD|Cayman Islands Dollar~KZT|Kazakhstani ' +
    'Tenge~LAK|Lao Kip~LBP|Lebanese Pound~LKR|Sri Lankan Rupee~LRD|Liberian Dollar~LSL|Lesotho ' +
    'Loti~LYD|Libyan Dinar~MAD|Moroccan Dirham~MDL|Moldovan Leu~MGA|Malagascy Ariary~MKD|Macedonian ' +
    'Denar~MMK|Burmese Kyat~MNT|Mongolian Tugrik~MOP|Macanese ' +
    'Pataca~MRO|Ouguiya~MRU|Ouguiya~MUR|Mauritian Rupee~MVR|Maldivian Rufiyaa~MWK|Malawian ' +
    'Kwacha~MXN|Mexican Peso~MXV|Mexican Unidad de Inversion (UID)~MYR|Malaysian ' +
    'Ringgit~MZN|Mozambican Metical~NAD|Namibian Dollar~NGN|Nigerian Naira~NIO|Nicaraguan Cordoba ' +
    'Oro~NOK|Norwegian Krone~NPR|Nepalese Rupee~NZD|New Zealand Dollar~OMR|Omani rial~PAB|Panamanian ' +
    'Balboa~PEN|Peruvian Nuevo Sol~PGK|Papua New Guinean Kina~PHP|Philippine Peso~PKR|Pakistani ' +
    'Rupee~PLN|Polish Zloty~PYG|Paraguayan Guarani~QAR|Qatari Riyal~RON|Romanian Leu~RSD|Serbian ' +
    'Dinar~RUB|Russian Ruble~RWF|Rwandan Franc~SAR|Saudi Riyal~SBD|Solomon Islands ' +
    'Dollar~SCR|Seychellois Rupee~SDG|Sudanese Pound~SEK|Swedish Krona~SGD|Singapore Dollar~SHP|Saint' +
    ' Helena Pound~SLE|Sierra Leonean Leone~SLL|Sierra Leonean Leone~SOS|Somali ' +
    'Shilling~SRD|Surinamese Dollar~SSP|South Sudanese Pound~STD|Sao Tomean Dobra~STN|Sao Tome and ' +
    'Principe Dobra~SVC|El Salvador Colon~SYP|Syrian Pound~SZL|Swazi Lilangeni~THB|Thai ' +
    'Baht~TJS|Tajikistani Somoni~TMT|Turkmenistan Manat~TND|Tunisian Dinar~TOP|Tongan ' +
    'Paanga~TRY|Turkish Lira~TTD|Trinidad and Tobago Dollar~TVD|Tuvaluan Dollar~TWD|New Taiwan ' +
    'Dollar~TZS|Tanzanian Shilling~UAH|Ukrainian Hryvnia~UGX|Ugandan Shilling~USD|United States ' +
    'Dollar~UYI|Uruguay Peso en Unidades Indexadas~UYU|Uruguayan peso~UZS|Uzbekistani ' +
    'Sum~VED|Venezuelan Bolivar Digital~VEF|Venezuelan Bolivar Fuerte~VES|Venezuelan Bolivar ' +
    'Soberano~VND|Vietnamese Dong~VUV|Vanuatu Vatu~WST|Samoan Tala~XAF|Central African CFA ' +
    'Franc~XCD|Eastern Caribbean Dollar~XCG|Caribbean Guilder~XDR|SDR~XOF|CFA Franc BCEAO~XPF|CFP ' +
    'Franc~YER|Yemeni Rial~ZAR|South African Rand~ZMW|Zambian Kwacha~ZWG|Zimbabwe Gold~ZWL|Zimbabwe ' +
    'Dollar'
  , ['id','cname']).map(c => ({id:c.id, name:`${c.id} — ${c.cname}`}));

/* Bank names as the sheet lists them, India and international in one list. The
   (India)/(UAE) suffix the source carries stays on the name — it is the only
   thing telling two Standard Chartereds apart. */
const BANK_NAMES = [{id:'na', name:'Not Applicable'}].concat(plainList(
    'Abhyudaya Co-Op. Bank Ltd. (India)~RAK Bank (UAE)~Adarsh Co-Operative Bank (India)~Mashreq Bank ' +
    '(UAE)~Ahmednagar Shahar Sahakari Bank Maryadit (India)~National Bank of Abu Dhabi (UAE)~Airtel ' +
    'Payments Bank (India)~ADCB (UAE)~Alavi Co-Operative Bank Ltd. (India)~Arab Bank (UAE)~Ambarnath ' +
    'Jai-Hind Co-Op Bank Ltd (India)~Commercial Bank of Dubai (UAE)~ANZ Bank (India)~Emirates NBD ' +
    '(UAE)~Apna Sahakari Bank Ltd. (India)~Habib Bank AG Zurich (UAE)~Arvind Sahakari Bank Ltd. ' +
    '(India)~National Bank of Fujairah (UAE)~Associate Co-Operative Bank Ltd (India)~Standard ' +
    'Chartered Bank (UAE)~AU Small Finance Bank (India)~Bank of Baroda (UAE)~Axis Bank~HSBC Bank ' +
    '(UAE)~Bandhan Bank~Union National Bank (UAE)~Bank of Baroda~Standard Chartered Bank (BGD)~Bank ' +
    'of India~Bharat Co-Operative Bank Ltd. (Mumbai)~Bank of Maharashtra~Standard Chartered Bank ' +
    '(Hongkong)~Bapuji Co-Operative Bank Ltd (India)~DBS (Hongkong)~Bassein Catholic Co-Op Bank Ltd. ' +
    '(India)~Social Islami Bank Limited (Bangladesh)~Bhagini Nivedita Sahakari Bank Ltd. ' +
    '(India)~Premier Bank (Bangladesh)~Commercial Bank of Ceylon PLC (Bangladesh)~Bharati Sahakari ' +
    'Bank Limited, Pune (India)~Islami Bank Bangladesh Limited (Bangladesh)~Bhavani Sahakari Bank ' +
    'Limited (India)~United Bank of Africa (Ghana)~Bombay Mercantile Co-Operative Bank Limited ' +
    '(India)~Guaranty Trust Bank (Nigeria)~Brahmadeodada Mane Sahakari Bank Ltd (India)~Zenith Bank ' +
    'Plc (Nigeria)~Canara Bank~Union Bank of Nigeria Plc (Nigeria)~Capital Small Finance Bank ' +
    'Ltd.(India)~ONE Bank (Bangladesh)~Central Bank of India~United Commercial Bank Ltd ' +
    '(Bangladesh)~Citizen Co-Op Bank Ltd. (India)~HSBC Bank (Bangladesh)~Citizen Credit Co-Op. Bank ' +
    'Ltd. (India)~HSBC Bank (Hongkong)~City Co-Operative Bank Limited (India)~Jamuna Bank Limited ' +
    '(Bangladesh)~City Union Bank Limited (India)~BRAC Bank (Bangladesh)~DBS (India)~NCC Bank ' +
    '(Bangladesh)~DCB Bank~Dutch-Bangla Bank Limited (Bangladesh)~Deogiri Nagari Sahakari Bank Ltd ' +
    '(India)~Trust Bank Limited (Bangladesh)~Dhanlaxmi Bank~Bank Asia Limited (Bangladesh)~Dharmaveer' +
    ' Sambhaji Urban Co-Op. Bank Ltd. (India)~Dhaka Bank Limited (Bangladesh)~DNS BANK (India)~First ' +
    'Bank of Nigeria Plc. (Nigeria)~Dr Annasaheb Chougule Urban Co-Operative Bank Ltd ' +
    '(India)~Standard Chartered Bank (Nigeria)~Equitas Small Finance Bank (India)~Standard Bank of ' +
    'Malawi (Malawi)~ESAF Small Finance Bank (India)~NBS (Malawi)~Excellent Co-Operative Bank Ltd. ' +
    '(India)~RHB (Malaysia)~Federal Bank~Affin Bank (Malaysia)~Fincare Small Finance Bank ' +
    '(India)~CIMB Bank (Malaysia)~Fino Payments Bank (India)~Hatton National Bank PLC (Sri ' +
    'Lanka)~GMCB (India)~Sampath Bank (Colombo)~Gopinath Patil Parsik Janata Sahakari Bank Ltd. ' +
    '(India)~Bank of Bahrain & Kuwait (Bahrain)~Gujarat Ambuja Co-Op Bank Ltd (India)~HSBC Bank Oman ' +
    'S A O G (Oman)~Haryana Gramin Bank (India)~National Bank of Commerce (Tanzania)~HDFC Bank~Bank ' +
    'of Baroda (Ghana)~HDFC Citizen Co-Operative Bank Ltd (Noida)~Guaranty Trust Bank ' +
    '(Ghana)~Himachal Pradesh Gramin Bank(India)~Eco Bank(Ghana)~Himatnagar Nagrik Sahakari Bank Ltd ' +
    '(India)~Access Bank (Ghana)~Hindusthan Bank(India)~Seylan Bank Plc (Colombo)~Hutatma Sahakari ' +
    'Bank Ltd (India)~NDB Bank (Colombo)~ICICI Bank~Bank of Ceylon (Colombo)~IDBI Bank~People\'s Bank ' +
    '(Colombo)~IDFC FIRST Bank~Nations Trust Bank Plc (Colombo)~India Post Payments Bank ' +
    '(India)~Commercial Bank of Ceylon PLC (Colombo)~Indian Bank~Everest Bank Ltd. (Nepal)~Indian ' +
    'Overseas Bank~Kumari Bank Ltd. (Nepal)~Indraprastha Sehkari Bank Ltd. (India)~NABIL Bank Ltd. ' +
    '(Nepal)~IndusInd Bank~Nepal Invt. Bank Ltd. (Nepal)~Industrial Bank of Korea (India)~NIC Bank ' +
    'Ltd. (Nepal)~ING Vysya (Now Kotak) (India)~Sanima Bank Ltd. (Nepal)~Jalgaon Janata Sahakari Bank' +
    ' Ltd.(India)~Arab Bank (Bahrain)~Jamia Co-operative Bank (India)~HBL (Bahrain)~Jammu and Kashmir' +
    ' Bank (India)~BBK (Bahrain)~Jana Small Finance Bank (India)~UBL (Bahrain)~Janakalyan Sahakari ' +
    'Bank Ltd. (India)~Khaleeji Commercial Bank (Bahrain)~Janaseva Sahakari Bank Ltd Pune ' +
    '(India)~Alsalam Bank (Bahrain)~Janata Sahakari Bank Ltd (India)~Standard Chartered Bank ' +
    '(Bahrain)~Jijau Commercial Co-Op Bank Ltd (India)~Ahli United Bank (Bahrain)~Jivan Commercial ' +
    'Co-Op. Bank Ltd. (India)~BMI (Bahrain)~JNS Bank (India)~HSBC (Bahrain)~Kallappanna Awade ' +
    'Ichalkaranji Janata Sahakari Bank Ltd (India)~State Bank of India (Bahrain)~Kankaria Maninagar ' +
    'Nagrik Sahakari Bank Ltd.(India)~United Arab Bank (UAE)~Karnataka Bank Ltd. (India)~Chase Bank ' +
    '(Kenya)~Karnataka State Co-Op Apex Bank Ltd. (India)~I & M Bank (Kenya)~Karur Vysya Bank~Equity ' +
    'Bank (Kenya)~Kashipur Urban Co-Operative Bank Ltd (India)~Bank of Baroda (Kenya)~KEB Hana Bank ' +
    '(India)~Co-Operative Bank of Kenya (Kenya)~Kokan Mercantile Co-Operative Bank Ltd ' +
    '(India)~Diamond Bank (Nigeria)~Kotak Mahindra Bank~Bank of India (Kenya)~Kutch Co-Operative Bank' +
    ' Ltd (India)~Standard Chartered Bank (Singapore)~LATUR URBAN CO-OP BANK LTD (India)~HSBC ' +
    '(Singapore)~Lokmangal Co-Op Bank Ltd. Solapur (India)~United Overseas Bank Ltd. ' +
    '(Singapore)~Lokseva Sahakari Bank Ltd., Pune (India)~DBS (Singapore)~M.D.Pawar People\'s ' +
    'Co-Operative Bank Ltd., Urun (India)~Exim Bank (Tanzania)~Madhya Pradesh Gramin Bank~CRDB Bank ' +
    '(Tanzania)~Maharashtra Gramin Bank (India)~Diamond Trust Bank (Tanzania)~Mahesh Sahakari Bank ' +
    'Ltd, Pune (India)~First National Bank (Tanzania)~Malviya Urban Co-Operative Bank Ltd. ' +
    '(India)~Bank of Africa (Tanzania)~Maninagar Co-Operative Bank Ltd. (India)~Banc ABC ' +
    '(Tanzania)~Manorama Co-Op. Bank Ltd. (India)~Bank M (Tanzania)~Marketyard Commercial Co-Op Bank ' +
    'Ltd (India)~NMB (Tanzania)~Model Co-Op. Bank Ltd. (India)~I & M Bank (Tanzania)~Mumbai District ' +
    'Central Co-Op Bank Ltd. (India)~Equity Bank (Tanzania)~Nagar Urban Co-Op. Bank Ltd ' +
    '(India)~Standard Chartered Bank (Ghana)~Nagpur Nagarik Sahakari Bank Ltd. (India)~UniBank ' +
    '(Ghana)~Neelkanth Co-Op. Bank Ltd. (India)~First Atlantic Bank (Ghana)~New India Co-Op Bank Ltd ' +
    '(India)~Agricultural Development Bank (Ghana)~NKGSB Co-Op Bank Ltd (India)~Zenith Bank ' +
    '(Ghana)~Noble Co-Operative Bank Ltd.Noida (India)~BSIC Ltd. (Ghana)~Nutan Nagarik Sahakari Bank ' +
    'Ltd. (India)~CAL Bank Limited (Ghana)~Osmanabad Janata Sahakari Bank Ltd (India)~Bank of Africa ' +
    '(Ghana)~Pali Urban Co-Operative Bank Ltd.(India)~SG-SSB (Ghana)~Pallavan Grama Bank ' +
    '(India)~Fidelity Bank (Ghana)~Parshwanath Co-Op Bank Ltd (India)~Energy Bank (Ghana)~Pavana ' +
    'Sahakari Bank Limited, Pune (India)~Ghana Commercial Bank (Ghana)~People\'s Co-Operative Bank ' +
    'Ltd., Hingoli (India)~UT Bank (Ghana)~Pimpri - Chinchwad Sahakari Bank, Maryadit, ' +
    'Pimpri~International Commercial Bank (Ghana)~Prime Cooperative Bank Limited (India)~KCB Bank ' +
    '(Tanzania)~Progressive Co-Op. Bank Ltd.(India)~Wema Bank (Nigeria)~Pune Cantonment Sahakari Bank' +
    ' Ltd.(India)~United Bank for Africa Plc (Nigeria)~Pune District Central Co-Op Bank Ltd ' +
    '(India)~Access Bank Plc (Nigeria)~Pune Merchant\'s Co-Op.Bank Ltd. (India)~Bank of Bhutan Ltd. ' +
    '(Bhutan)~Pune People\'s Co-Op Bank Ltd. (India)~Commercial Bank of Kuwait (Kuwait)~Pune Urban ' +
    'Co-Operative Bank Ltd (India)~Al Ahli Bank of Kuwait (UAE)~Punjab and Sind Bank~Riyad Bank ' +
    '(Saudi Arabia)~Punjab National Bank~Noor Islamic Bank (UAE)~Purvanchal Bank (India)~Arab ' +
    'National Bank (Saudi Arabia)~Pusad Urban Co-Op. Bank Ltd.(India)~Emirates Bank (UAE)~Rajarambapu' +
    ' Sahakari Bank Ltd.,Peth. (India)~Banque Saudi Fransi (Saudi Arabia)~Rajarshi Shahu Sahakari ' +
    'Bank Ltd.Pune (India)~Emirates Islamic Bank (UAE)~Rajkot Nagarik Sahakari Bank Ltd. ' +
    '(India)~Samba Financial Group (Saudi Arabia)~Rajkot Peoples Co-Operative Bank Ltd (India)~Saudi ' +
    'Hollandi Bank (Saudi Arabia)~Rajlakshmi Urban Co-Operative Bank Ltd.(India)~United Bank Ltd. ' +
    '(UAE)~Ratnagiri District Central Co-Op. Bank Ltd. (India)~Byblos Bank Africa (Sudan)~RazorpayX ' +
    '(India)~National Bank of Sudan (Sudan)~RBL Bank~Faisal Islamic Bank (Sudan)~Rupee Co-Op. Bank ' +
    'Ltd. (India)~Qatar National Bank (Sudan)~Sadguru Nagrik Sahakari Bank Mydt.(India)~Blue Nile ' +
    'Mashreq Bank (Sudan)~Samarth Sahakari Bank Ltd. (India)~Bank of Khartoum (Sudan)~Samata Sahakari' +
    ' Bank Limited (India)~Sudanese Islamic Bank (Sudan)~Sangli Urban Co-Op. Bank Ltd (India)~Dubai ' +
    'Islamic Bank (UAE)~Sanmitra Mahila Nagari Sahakari Bank Mydt. (India)~ADIB (UAE)~Saraspur ' +
    'Nagarik Co-Op. Bank Ltd. (India)~Bank of Africa (Kenya)~Saraswat Bank (India)~Guardian Bank ' +
    '(Kenya)~SARASWAT CO-OPERATIVE BANK LTD. (SCHEDULED BANK)~Barclays Bank (Kenya)~Sardar Bhiladwala' +
    ' Pardi Peoples Co-Op. Bank Ltd. (India)~Prime Bank (Kenya)~Sardar Vallabhbhai Sahakari Bank Ltd ' +
    '(India)~Imperial Bank Limited (Kenya)~Sardargunj Mercantile Co-Op. Bank Ltd. (India)~Fidelity ' +
    'Bank (Kenya)~SARVODAYA COMMERCIAL CO-OP. BANK LTD. MEHSANA.~UBA Kenya Bank Limited ' +
    '(Kenya)~Sarvodaya Commercial Co-Operative Bank~Bank of Sharjah (UAE)~SBM Bank Ltd. ' +
    '(India)~Bhutan National Bank Ltd. (Bhutan)~Sharad Sahakari Bank Ltd. (India)~Blom Bank France ' +
    '(UAE)~Shikshak Sahakari Bank Ltd. (India)~Druk Pnb Bank Ltd. (Bhutan)~Shiva Sahakari Bank ' +
    'Niyamita (India)~United Bank Ltd. (Qatar)~Shivajirao Bhosale Sahakari Bank Ltd. (India)~Doha ' +
    'Bank (Qatar)~Shivalik Mercantile Co-Operative Bank Ltd~Qatar National Bank (Qatar)~Shree Bharat ' +
    'Co-Op Bank Ltd. (India)~First Gulf Bank (UAE)~Shree Kadi Nagarik Sahakari Bank Ltd. ' +
    '(India)~Mashreq Bank (Qatar)~Shree Laxmi Co-Op. Bank Ltd., Pune(India)~Giro Commercial Bank Ltd.' +
    ' (Kenya)~Shree Mahesh Co-Op Bank Ltd (India)~Ahlibank (Qatar)~Shree Sharada Sahakari Bank Ltd., ' +
    'Pune (India)~MASRAF AL RAYAN (Qatar)~Shree Vardhaman Sahakari Bank Ltd. (India)~International ' +
    'Islamic Bank (Qatar)~SHREE WARANA SAHAKARI BANK LTD (India)~HSBC Bank Berhad (Malaysia)~Shri ' +
    'Adinath Co-Op Bank Ltd. (India)~Standard Chartered Bank Berhad (Malaysia)~SHRI ANAND CO-OP BANK ' +
    'LTD. CHINCHWAD (India)~PUBLIC BANK Berhad (Malaysia)~Shri Arihant Co-Op. Bank Limited ' +
    '(India)~RHD BANK BERHAD (Malaysia)~Shri Basaveshwar Sahakari Bank Nyt.(India)~Maybank - Berhad ' +
    '(Malaysia)~Shri Bilur Gurubasava Pattin Sahakari Bank (India)~UNITED OVERSEAS BANK ' +
    '(Malaysia)~Shri Chhatrapati Rajarshi Shahu Urban Co-Op.(India)~Ithmaar Bank (Bahrain)~Shri ' +
    'Kanyaka Nagari Sahakari Bank Ltd (India)~Shri Mahavir Urban Co-Op. Bank Ltd. (India)~Al Khaliji ' +
    '(Qatar)~Shri Rajkot District Co-Operative Bank Ltd. (India)~Commercial Bank (Qatar)~Shri ' +
    'Veershaiv Co-Op. Bank Ltd. (India)~QIB (Qatar)~Sir M. Visvesvaraya Co-Operative Bank Ltd. ' +
    '(India)~HSBC Bank (Qatar)~SJSB Bank (India)~National Bank of Oman (Oman)~SMALL INDUSTRIES ' +
    'DEVELOPMENT BANK OF INDIA (India)~Barclays Bank (Uganda)~Smriti Nagrik Sahakari Bank MYDT., ' +
    'Mandsaur (India)~Stanbic Bank (Kenya)~Solapur Janatha Sahakari Bank Ltd. (India)~Zenith Bank ' +
    '(Kenya)~Solapur Siddheshwar Sahakari Bank Ltd.(India)~NDEP Development Bank Ltd (Nepal)~South ' +
    'Indian Bank~OM Finance Limited (Nepal)~Sree Charan Souhardha Co-Operative Bank Ltd ' +
    '(India)~Diamond Trust Bank (Kenya)~State Bank of India~Bank Muscat (Oman)~Suco Souharda Sahakari' +
    ' Bank Ltd (India)~HSBC Bank (Oman)~Sundarlal Sawji Urban Co-Op. Bank Ltd. (India)~Bank of Baroda' +
    ' (Oman)~Surat National Co-Operative Bank Ltd. (India)~Standard Chartered Bank (Kenya)~Suryoday ' +
    'Small Finance Bank Limited (India)~Lloyds Bank (UK)~Suvarnayug Sahakari Bank Ltd.,Pune ' +
    '(India)~Habib African Bank Limited (Tanzania)~SVC Co-Operative Bank Ltd. (India)~Barclays Bank ' +
    '(Tanzania)~Tamilnad Mercantile Bank~Invest Bank (UAE)~Telangana Grameena Bank(India)~Habib Bank ' +
    'Limited (UAE)~Textile Traders Co-Op. Bank Ltd (India)~Bank of Kathmandu (Nepal)~Thane Bharat ' +
    'Sahakari Bank Ltd. (India)~Global IME Bank Ltd (Nepal)~The A.P. Mahesh Co-Operative Urban Bank ' +
    'Ltd. (India)~Gulf African Bank (Kenya)~The Abhinav Sahakari Bank Ltd. (India)~Standard Chartered' +
    ' Bank (Nepal)~The Adarsh Co-Operative Urban Bank Ltd (India)~Gulf Bank (Kuwait)~The Ahmedabad ' +
    'District Co-Op.BanK LTD. (India)~Oman Arab Bank (UAE)~The Ahmedabad Mercantile Co-Operative Bank' +
    ' Ltd. (India)~NBAD(UAE)~The Ahmednagar District Central Co-Op Bank (India)~National Bank of ' +
    'Kuwait (Kuwait)~The Ahmednagar Merchant\'s Co-Op. Bank Limited (India)~HSBC (Kuwait)~The Akola ' +
    'District Central Co-Op. Bank Ltd. (India)~OCBC(Singapore)~The Akola Janata Commercial Co-Op. ' +
    'Bank Ltd.(India)~NCB Bank(UAE)~The Akola Urban Co-Operative Bank Ltd (India)~NBQ Bank (UAE)~The ' +
    'Anand Mercantile Co-Operative Bank Ltd. (India)~HBL Bank (UAE)~The Balasore Bhadrak Central ' +
    'Co-Op Bank Ltd (India)~HBL Bank (Oman)~The Banaskantha Mercantile Co-Op. Bank ' +
    'Ltd.(India)~Rastriya Banijya Bank Ltd (Nepal)~The Baramati Sahakari Bank Ltd. (India)~Himalayan ' +
    'Bank Limited (Nepal)~The Bengaluru District Central Co-operative Bank Ltd (India)~Al Hilal ' +
    'Bank(UAE)~The Bhagyodaya Co-Op Bank Ltd. (India)~IBQ (International Bank of Qatar) (Qatar)~The ' +
    'Bhuj Commercial Co-Operative Bank Ltd. (India)~Bank Sohar (Oman)~The Business Co-Operative Bank ' +
    'Limited (India)~First City Monument Bank (Nigeria)~The C.K.P. Co-Op. Bank Ltd. (India)~Rand ' +
    'Merchant Bank (Nigeria)~The Catholic Syrian Bank Ltd (India)~The National Co-Op. Bank ' +
    'Ltd.(Maharashtra)~The Chikhli Urban Co-Op Bank Ltd (India)~Bank of Beirut(Oman)~The Chittoor ' +
    'District Co-Op Central Bank Ltd(India)~Prime Bank (Nepal)~The Co-Operative Bank of Rajkot Ltd. ' +
    '(India)~FGB (UAE)~The Commercial Co-Operative Bank Ltd (India)~Bank Dhofar (Oman)~The Cosmos ' +
    'Co-Operative Bank Ltd (India)~Boubyan Bank(Kuwait)~The Dahod Mercantile Co-Op. Bank Ltd. ' +
    '(India)~The Saudi Investment Bank (Saudi Arabia)~The Dahod Urban Co-Op. Bank Ltd (India)~Sharjah' +
    ' Islamic Bank(UAE)~The Deccan Merchants Co-Op.Bank Ltd. (India)~Noor Bank(UAE)~The Delhi State ' +
    'Co-Operative Bank Ltd. (India)~Diamond Trust Bank (Uganda)~The Gadhinglaj Urban Co-Op. Bank Ltd ' +
    '(India)~Standard Chartered Bank (Uganda)~The Gandevi People\'s Co-Operative Bank Limited ' +
    '(India)~KCB (Kenya)~The Gandhidham Mercantile Co-Operative Bank Ltd. (India)~Habib Metropolitan ' +
    'Bank Ltd. (Pakistan)~The Gandhinagar Urban Co-Op. Bank Ltd. (India)~MCB Bank ' +
    'Limited.(Pakistan)~The Gauhati Co-Op Urban Bank Ltd. (India)~Bank AL Habib Limited(Pakistan)~The' +
    ' Goa State Co-Operative Bank Ltd. (India)~Standard Chartered Bank(Pakistan)~The Goa Urban ' +
    'Co-Operative Bank Ltd (India)~Dubai Islamic Bank(Pakistan)~The Godhra Urban Co-Op. Bank Ltd. ' +
    '(India)~Faysal Bank Limited(Pakistan)~The Grain Merchants Co-Operative Bank Ltd (India)~Meezan ' +
    'Bank(Pakistan)~The Greater Bombay Co-Operative Bank Ltd. (India)~NIC Asia Bank(Nepal)~The ' +
    'Gujarat State Co-Op. Bank Ltd. (India)~Machhapuchchhre Bank Limited(Nepal)~The Hasti Co-Op. Bank' +
    ' Ltd.(India)~NMB Bank Limited (Nepal)~The Himachal Pradesh State Co-Operative Bank Ltd. ' +
    '(India)~Kuwait Finance House (Kuwait)~The Jain Sahakari Bank Ltd.(India)~Ahli United Bank ' +
    '(Kuwait)~The Jaipur Central Co-Operative Bank Ltd. (India)~Sunrise Bank Limited (Nepal)~THE ' +
    'JALGAON PEOPLES CO-OP. BANK LTD (India)~The National Commercial Bank (Saudi Arabia)~The Jamnagar' +
    ' Peoples Co-Op. Bank Ltd (India)~The Saudi British Bank (Saudi Arabia)~The Janata Co-Operative ' +
    'Bank Ltd. (India)~Alinma Bank (Saudi Arabia)~The Kalol Nagarik Sahakari Bank Ltd (India)~Al ' +
    'Rajhi Bank (Saudi Arabia)~The Kalupur Commercial Co-Op Bank Ltd. (India)~Bank Al Bilad (Saudi ' +
    'Arabia)~The Kalyan Janata Sahakari Bank Ltd. (India)~Bank Al Jazira (Saudi Arabia)~The Kangra ' +
    'Co-Operative Bank Ltd. (India)~Summit Bank (Pakistan)~The Kapol Co-Op Bank Ltd. (India)~Habib ' +
    'Bank Limited (Pakistan)~The Karad Urban Co-Op. Bank Ltd. (India)~Bank Alfalah (Pakistan)~The ' +
    'Karnavati Co-Op. Bank Ltd. (India)~Allied Bank (Pakistan)~The Khamgaon Urban Co-Op. Bank Ltd. ' +
    '(India)~United Bank Ltd. (Pakistan)~The Khattri Co-Operative Urban Bank Ltd. (India)~JS Bank ' +
    '(Pakistan)~The Kodoli Urban Co-Op. Bank Ltd (India)~National Bank of Pakistan (Pakistan)~The ' +
    'Kopargaon People\'s Co-Op. Bank Ltd. (India)~Askari Bank Limited (Pakistan)~The Kukarwada Nagarik' +
    ' Sahakari Bank Ltd. (India)~IFIC Bank Limited (Bangladesh)~The Kunbi Sahakari Bank Ltd.,Mumbai ' +
    '(India)~Al-Arafah Islami Bank Limited (Bangladesh)~The Kurmanchal Nagar Sahkari Bank Ltd ' +
    '(India)~FSIB - First Security Islami Bank Ltd. (Bangladesh)~The Laxmi Co-Operative Bank ' +
    'Ltd.,Solapur (India)~Shahjalal Islami Bank Limited (Bangladesh)~The Ludhiana Central ' +
    'Co-Operative Bank Ltd. (India)~Prime Bank Limited (Bangladesh)~The Mahanagar Co-Op Bank Ltd. ' +
    '(India)~Mercantile Bank Limited (Bangladesh)~The Maharashra State Co-Operative Bank Ltd. ' +
    '(India)~Standard Bank Limited (Bangladesh)~The Malad Sahakari Bank Ltd.(India)~NRBC Bank ' +
    '(Bangladesh)~The Malkapur Urban Co-Op.Bank Ltd.(India)~Southeast Bank Limited (Bangladesh)~The ' +
    'Mansa Nagarik Sahakari Bank Ltd.(India)~CBI - Commercial Bank International (UAE)~The Mehsana ' +
    'Urban Co-Op. Bank Ltd. (India)~Janata Bank Ltd (UAE)~The Mogaveera Co-Operative Bank Ltd. ' +
    '(India)~Ajman Bank (UAE)~The Municipal Co-Op Bank LTD (India)~Bank Melli Iran (UAE)~The Muslim ' +
    'Cooperative Bank Ltd, Pune (India)~City Bank (Bangladesh)~The Mysore Merchants Co-Operative Bank' +
    ' Limited (India)~FAB - First Abu Dhabi Bank (UAE)~The Nainital Bank Limited (India)~Citi Bank ' +
    '(UAE)~The Nanded Merchant\'s Co-Op Bank Ltd (India)~Mandiri Indonesia Bank (Indonesia)~The Nashik' +
    ' Road Deolali Vyapari Sahakari Bank Ltd.(India)~BNI - Bank Negara Indonesia (Indonesia)~The ' +
    'Nasik Merchants\' Co-Op. Bank Ltd. (India)~Permata Bank (Indonesia)~BDO Bank (Philippines)~The ' +
    'National Co-Operative Bank Ltd. (India)~Bank of The Philippine Islands (Philippines)~The Nav ' +
    'Jeevan Co-Op. Bank Ltd (India)~Indo Zambia Bank_(Zambia)~The Navnirman Co-Op. Bank Ltd. ' +
    '(India)~Janata Bank Nepal Ltd(Nepal)~The Nawanagar Co-Operative Bank Ltd (India)~NBB ' +
    '(Bahrain)~The Panchsheel Mercantile Co-Op. Bank Ltd. (India)~The Saudi British Bank (UAE)~The ' +
    'Pandharapur Urban Co-Op. Bank Ltd.,(India)~Century Bank (Nepal)~The Pandharpur Merchants Co-Op ' +
    'Bank Ltd (India)~Laxmi Bank (Nepal)~The Pratap Co-Operative Bank Ltd. (India)~Mega Bank Nepal ' +
    'Limited (Nepal)~The Raddi Sahakara Bank Niyamitha Dharwad (India)~Prabhu Bank (Nepal)~The Raigad' +
    ' District Central Co-Operative Bank Ltd (India)~Lumbini Bikas Bank Ltd (Nepal)~The Rajapur ' +
    'Sahakari Bank Ltd. (India)~Nepal SBI Bank Ltd (Nepal)~The Rajkot Commercial Co-Op Bank Ltd ' +
    '(India)~Woori Bank (Bangladesh)~The Sahebrao Deshmukh Co-Op Bank Ltd. (India)~Pubali Bank ' +
    'Limited (Bangladesh)~The Sarvodaya Sahakari Bank Ltd.(India)~CBA Bank (Kenya)~The Satara ' +
    'District Central Co-Op Bank Ltd (India)~BNP Paribas (UAE)~The Satara Sahakari Bank Ltd. ' +
    '(India)~Sterling Bank (Nigeria)~The Seva Vikas Co-Operative Bank Ltd (India)~C B Bank ' +
    '(Myanmar)~The Shamrao Vithal Co-Op. Bank Ltd. (India)~State Bank of Mauritius (Kenya)~The ' +
    'Shimoga Arecanut Mandy Merchants Co-Op Bank Ltd. (India)~Citi Bank (Malaysia)~The Shirpur ' +
    'People\'s Co-Op. Bank Ltd. (India)~Arab African International Bank (UAE)~The Sholapur District ' +
    'Central Co-Op Bank Ltd (India)~NCBA Bank Kenya (Kenya)~The Social Co-Operative Bank Ltd. ' +
    '(India)~Bank of America (USA)~The Sonepat Urban Co-Op. Bank LTD. (India)~Stanbic Bank ' +
    '(Zambia)~The Surat District Co-Op. Bank Ltd.(India)~First Citizens Bank (USA)~The Surat People\'s' +
    ' Co-Op. Bank Ltd. (India)~JP Morgan Chase Bank (Saudi Arabia)~The Sutex Co-Op. Bank Ltd. ' +
    '(India)~Meethaq Islamic Banking (Oman)~The Tamil Nadu State Apex Co-Operative Bank (India)~AL ' +
    'Masraf (UAE)~The Thane Dist. Central Co-Op. Bank Ltd. (India)~Truist Bank (USA)~The Thane Janata' +
    ' Sahakari Bank Ltd. (India)~Banque Misr (UAE)~The Tiruchirapalli Dt. Central Bank Ltd. ' +
    '(India)~Samba Financial Group (UAE)~The Udaipur Urban Co-Operative Bank LTD (India)~National ' +
    'Bank Ltd. (Bangladesh)~The Unava Nagarik Sahakari Bank Ltd. (India)~Exim Bank Ltd. ' +
    '(Bangladesh)~The Union Co-Operative Bank Ltd. (India)~Rupali Bank Ltd. (Bangladesh)~The United ' +
    'Co-Op Bank Ltd. (India)~Janata Bank Ltd. (Bangladesh)~The Vaidyanath Urban Co-Op. Bank Ltd ' +
    '(India)~Sonali Bank Ltd. (Bangladesh)~The Vaish Cooperative New Bank Ltd (India)~Bank Alfalah ' +
    '(Bangladesh)~The Varachha Co-Operative Bank Ltd. (India)~Agrani Bank Ltd. (Bangladesh)~The ' +
    'Veraval People\'s Co-Op. Bank Ltd. (India)~Eastern Bank Ltd. (Bangladesh)~The Vijay Co-Operative ' +
    'Bank Ltd. (India)~Wise Business (UK)~The Visakhapatnam Co-Operative Bank Ltd. (India)~AB Bank ' +
    'Ltd (Bangladesh)~The Vishweshwar Sahakari Bank Ltd., Pune (India)~HSBC Bank (USA)~The Washim ' +
    'Urban Co-Operative Bank Ltd. (India)~Maybank2E (Malaysia)~The West Bengal State Co-operative ' +
    'Bank Ltd (India)~Bahrain Development Bank (Bahrain)~The Yavatmal Urban Co-Op Bank Ltd ' +
    '(India)~The Zoroastrian Co-Operative Bank Ltd (India)~Chase Bank (USA)~TJSB Sahakari Bank Ltd ' +
    '(India)~M-Oriental Bank (Kenya)~Tripura Gramin Bank (India)~Mauritius Commercial Bank ' +
    '(Seychelles)~Tumkur Grain Merchant\'s Co-Op. Bank Ltd. (India)~WIO Bank PJSC (UAE)~UCO Bank~CAF ' +
    'Bank (UK)~Udyam Vikas Sahakari Bank Ltd. (India)~Saudi National Bank (Saudi Arabia)~Ujjivan ' +
    'Small Finance Bank (India)~Saudi Awwal Bank (Saudi Arabia)~Uma Co-Operative Bank ' +
    'Ltd.(India)~Saudi Investment Bank (Saudi Arabia)~Union Bank of India~Gulf International Bank ' +
    'Saudi Arabia (GIB-SA) (Saudi Arabia)~Unjha Nagarik Sahakari Bank Ltd.Unjha (India)~STC Bank ' +
    '(Saudi Arabia)~Urban Co-Operative Bank Ltd. Bareilly (India)~Vision Bank (Saudi Arabia)~Utkarsh ' +
    'Small Finance Bank (India).~Emirates NBD (Saudi Arabia)~Uttarakhand Gramin Bank (India)~National' +
    ' Bank of Bahrain (NBB) (Saudi Arabia)~Vaishya Sahakari Bank Ltd (India)~National Bank of Kuwait ' +
    '(NBK) (Saudi Arabia)~Vasai Janata Sahakari Bank Ltd. (India)~Muscat Bank (Saudi Arabia)~Vasai ' +
    'Vikas Sahakari Bank Ltd (India)~Deutsche Bank (Saudi Arabia)~Vidarbha Merchants Urban Co-Op Bank' +
    ' Ltd. (India)~BNP Paribas (Saudi Arabia)~Vidya Sahakari Bank Ltd (India)~J.P. Morgan Chase N.A ' +
    '(Saudi Arabia)~Vidyanand Co-Op. Bank Ltd. Solapur (India)~National Bank Of Pakistan (NBP) (Saudi' +
    ' Arabia)~Vikas Sahakari Bank Ltd. (India)~T.C.ZIRAAT BANKASI A.S. (Saudi Arabia)~Vikas Souharda ' +
    'Co Operative Bank Ltd. (India)~Industrial and Commercial Bank of China (ICBC) (Saudi ' +
    'Arabia)~Vishwas Co-Op Bank Ltd., Nashik (India)~Qatar National Bank (Saudi Arabia)~Vyapari ' +
    'Sahakari Bank Maryadit (India)~MUFG Bank, Ltd. (Saudi Arabia)~Vyavsayik Sahkari Bank Ltd. ' +
    '(India)~First Abu Dhabi Bank (Saudi Arabia)~Wana Nagrik Sahakari Bank Ltd. (India)~UBS AG Bank ' +
    '(Previously Credit Suisse) (Saudi Arabia)~Yes Bank~Standard Chartered Bank (Saudi ' +
    'Arabia)~National Bank of Iraq (Saudi Arabia)~Trade Bank of Iraq (Saudi Arabia)~Bank of China ' +
    'Limited (Saudi Arabia)~Banque Misr (Saudi Arabia)~National Bank of Egypt (Saudi Arabia)~Sohar ' +
    'International Bank (Saudi Arabia)~D360 Bank (Saudi Arabia)~Bank of Jordan (Saudi Arabia)~Abu ' +
    'Dhabi Commercial Bank (Saudi Arabia)~Dukhan Bank (Qatar)~CHOICE FINANCIAL GROUP (USA)~U.S. Bank ' +
    '(USA)~National Bank of Kenya (Kenya)~Absa Bank Kenya (Kenya)~DFCU (Uganda)~Stanbic (Uganda)~Bank' +
    ' of Baroda (Uganda)~Cenetenary Bank (Uganda)~OCBC (Indonesia)~BRI (Indonesia)~CIMB NIAGA ' +
    '(Indonesia)~Oman Arab Bank (Oman)~Bank Nizwa (Oman)~Siddartha Bank (Nepal)~Nepal Bank Limited ' +
    '(NBL) (Nepal)~Eco Bank Rwanda (Rwanda)~Bank of Kigali (Rwanda)~M-PESA (Kenya)~Family Bank ' +
    'Limited (Kenya)~MPESA (Tanzania)~Ahlibank (Oman)~Bank of China (Hong Kong)~Bank of ' +
    'Communications (Hong Kong)~Bank of East Asia (Hong Kong)~China CITIC Bank International (Hong ' +
    'Kong)~China Construction Bank (Hong Kong)~Chiyu Banking Corporation (Hong Kong)~Chong Hing Bank ' +
    '(Hong Kong)~Citibank (Hong Kong)~Dah Sing Bank (Hong Kong)~DBS Bank (Hong Kong)~Fubon Bank (Hong' +
    ' Kong)~Hang Seng Bank (Hong Kong)~Hongkong and Shanghai Banking Corporation (Hong ' +
    'Kong)~Industrial and Commercial Bank of China (Hong Kong)~Nanyang Commercial Bank (Hong ' +
    'Kong)~OCBC Bank (Hong Kong)~Public Bank (Hong Kong)~Shanghai Commercial Bank (Hong ' +
    'Kong)~Standard Chartered (Hong Kong)~Tai Sang Bank (Hong Kong)~Tai Yau Bank(Hong Kong)~CMB Wing ' +
    'Lung Bank (Hong Kong)~Al Maryah Community Bank (UAE)'
  ));

/* The full country list. Only India is selectable until Multi-Currency is on;
   the rest are here so turning the flag on is not also a data change. */
const COUNTRIES_FULL = unpack(
    'AD|Andorra~AE|United Arab Emirates~AF|Afghanistan~AG|Antigua and ' +
    'Barbuda~AI|Anguilla~AL|Albania~AM|Armenia~AO|Angola~AQ|Antarctica~AR|Argentina~AS|American ' +
    'Samoa~AT|Austria~AU|Australia~AW|Aruba~AX|Åland Islands~AZ|Azerbaijan~BA|Bosnia and ' +
    'Herzegovina~BB|Barbados~BD|Bangladesh~BE|Belgium~BF|Burkina ' +
    'Faso~BG|Bulgaria~BH|Bahrain~BI|Burundi~BJ|Benin~BL|Saint Barthélemy~BM|Bermuda~BN|Brunei ' +
    'Darussalam~BO|Bolivia (Plurinational State of)~BQ|Bonaire, Sint Eustatius and ' +
    'Saba~BR|Brazil~BS|Bahamas~BT|Bhutan~BV|Bouvet ' +
    'Island~BW|Botswana~BY|Belarus~BZ|Belize~CA|Canada~CC|Cocos (Keeling) Islands~CD|Congo, ' +
    'Democratic Republic of the~CF|Central African Republic~CG|Congo~CH|Switzerland~CI|Côte ' +
    'dIvoire~CK|Cook Islands~CL|Chile~CM|Cameroon~CN|China~CO|Colombia~CR|Costa Rica~CU|Cuba~CV|Cabo ' +
    'Verde~CW|Curaçao~CX|Christmas ' +
    'Island~CY|Cyprus~CZ|Czechia~DE|Germany~DJ|Djibouti~DK|Denmark~DM|Dominica~DO|Dominican ' +
    'Republic~DZ|Algeria~EC|Ecuador~EE|Estonia~EG|Egypt~EH|Western ' +
    'Sahara~ER|Eritrea~ES|Spain~ET|Ethiopia~FI|Finland~FJ|Fiji~FK|Falkland Islands ' +
    '(Malvinas)~FM|Micronesia (Federated States of)~FO|Faroe Islands~FR|France~GA|Gabon~GB|United ' +
    'Kingdom of Great Britain and Northern Ireland~GD|Grenada~GE|Georgia~GF|French Guiana~GG|Guernsey' +
    '~GH|Ghana~GI|Gibraltar~GL|Greenland~GM|Gambia~GN|Guinea~GP|Guadeloupe~GQ|Equatorial ' +
    'Guinea~GR|Greece~GS|South Georgia and the South Sandwich ' +
    'Islands~GT|Guatemala~GU|Guam~GW|Guinea-Bissau~GY|Guyana~HK|Hong Kong~HM|Heard Island and ' +
    'McDonald ' +
    'Islands~HN|Honduras~HR|Croatia~HT|Haiti~HU|Hungary~ID|Indonesia~IE|Ireland~IL|Israel~IM|Isle of ' +
    'Man~IN|India~IO|British Indian Ocean Territory~IQ|Iraq~IR|Iran (Islamic Republic of)~IS|Iceland~' +
    'IT|Italy~JE|Jersey~JM|Jamaica~JO|Jordan~JP|Japan~KE|Kenya~KG|Kyrgyzstan~KH|Cambodia~KI|Kiribati~' +
    'KM|Comoros~KN|Saint Kitts and Nevis~KP|Korea (Democratic Peoples Republic of)~KR|Korea, Republic' +
    ' of~KW|Kuwait~KY|Cayman Islands~KZ|Kazakhstan~LA|Lao Peoples Democratic ' +
    'Republic~LB|Lebanon~LC|Saint Lucia~LI|Liechtenstein~LK|Sri Lanka~LR|Liberia~LS|Lesotho~LT|Lithua' +
    'nia~LU|Luxembourg~LV|Latvia~LY|Libya~MA|Morocco~MC|Monaco~MD|Moldova, Republic ' +
    'of~ME|Montenegro~MF|Saint Martin (French part)~MG|Madagascar~MH|Marshall Islands~MK|North ' +
    'Macedonia~ML|Mali~MM|Myanmar~MN|Mongolia~MO|Macao~MP|Northern Mariana Islands~MQ|Martinique~MR|M' +
    'auritania~MS|Montserrat~MT|Malta~MU|Mauritius~MV|Maldives~MW|Malawi~MX|Mexico~MY|Malaysia~MZ|Moz' +
    'ambique~NA|Namibia~NC|New Caledonia~NE|Niger~NF|Norfolk ' +
    'Island~NG|Nigeria~NI|Nicaragua~NL|Netherlands~NO|Norway~NP|Nepal~NR|Nauru~NU|Niue~NZ|New ' +
    'Zealand~OM|Oman~PA|Panama~PE|Peru~PF|French Polynesia~PG|Papua New ' +
    'Guinea~PH|Philippines~PK|Pakistan~PL|Poland~PM|Saint Pierre and Miquelon~PN|Pitcairn~PR|Puerto ' +
    'Rico~PS|Palestine, State ' +
    'of~PT|Portugal~PW|Palau~PY|Paraguay~QA|Qatar~RE|Réunion~RO|Romania~RS|Serbia~RU|Russian ' +
    'Federation~RW|Rwanda~SA|Saudi Arabia~SB|Solomon ' +
    'Islands~SC|Seychelles~SD|Sudan~SE|Sweden~SG|Singapore~SH|Saint Helena, Ascension and Tristan da ' +
    'Cunha~SI|Slovenia~SJ|Svalbard and Jan Mayen~SK|Slovakia~SL|Sierra Leone~SM|San ' +
    'Marino~SN|Senegal~SO|Somalia~SR|Suriname~SS|South Sudan~ST|Sao Tome and Principe~SV|El ' +
    'Salvador~SX|Sint Maarten (Dutch part)~SY|Syrian Arab Republic~SZ|Eswatini~TC|Turks and Caicos ' +
    'Islands~TD|Chad~TF|French Southern Territories~TG|Togo~TH|Thailand~TJ|Tajikistan~TK|Tokelau~TL|T' +
    'imor-Leste~TM|Turkmenistan~TN|Tunisia~TO|Tonga~TR|Turkey~TT|Trinidad and ' +
    'Tobago~TV|Tuvalu~TW|Taiwan, Province of China~TZ|Tanzania, United Republic ' +
    'of~UA|Ukraine~UG|Uganda~UM|United States Minor Outlying Islands~US|United States of ' +
    'America~UY|Uruguay~UZ|Uzbekistan~VA|Holy See~VC|Saint Vincent and the Grenadines~VE|Venezuela ' +
    '(Bolivarian Republic of)~VG|Virgin Islands (British)~VI|Virgin Islands (U.S.)~VN|Viet ' +
    'Nam~VU|Vanuatu~WF|Wallis and Futuna~WS|Samoa~YE|Yemen~YT|Mayotte~ZA|South ' +
    'Africa~ZM|Zambia~ZW|Zimbabwe'
  , ['code','name']).map(c => ({id:c.name, name:c.name, code:c.code}));

/* Tally calls this Registration Type. The one thing the invoice reads off it is
   whether the party is registered at all. */
const GST_TREATMENTS_FULL = plainList(
    'Regular~Composition~Unregistered/Consumer~Government entity/TDS~Regular-SEZ~Regular-Deemed ' +
    'Exporter~Regular- Exports (EOU)~E-commerce Operator~Input Service Distributor~Embassy/UN ' +
    'body~Non-resident Taxpayer~OIDAR'
  );

/* Deductee / collectee type. Sets the rate on the sections that carry two of
   them, and residency is half of what it records. */
const DEDUCTEE_TYPES = plainList(
    'Unknown~AOP (Companies as Members) - Non Resident~AOP (Companies as Members) - Resident~AOP - ' +
    'Non Resident~AOP - Resident~Artificial Juridical Person~Artificial Juridical Person - Non ' +
    'Resident~Artificial Juridical Person - Resident~Association of Persons~Body of Individuals~BOI -' +
    ' Non Resident~BOI - Resident~Company - Non Resident~Company - Resident~Co-Operative Society - ' +
    'Non Resident~Co-Operative Society - Resident~Firm - Non Resident~Firm - Resident~Government~HUF ' +
    '- Non Resident~HUF - Resident~HUF~Individual/HUF - Non Resident~Individual/HUF - ' +
    'Resident~Individual - Non Resident~Individual - Resident~Local Authority~Others - Non ' +
    'Resident~Others - Resident~Partnership Firm'
  );

/* Nature of Payment (TDS) and Nature of Goods (TCS) off the Nature of Payments
   & Goods master. Labelled with the new Act's section and the one everybody
   still says it by, because a book keyed to 194C has to stay findable. */
const NATURE_PAYMENTS = unpack(
    '392|Payment to Government employees (Non-Union)|192~392|Payment to employees ' +
    '(Non-Government)|192~392|Payment to Indian Government employees|192~392(7)|RPF Accumulated ' +
    'Balance Payment|192A~393(1) Sl1(i)|Insurance Commission|194D~393(1) Sl1(ii)|Commission or ' +
    'Brokerage|194H~393(1) Sl2(i)|Any rent - Individual/HUF|194IB~393(1) Sl2(ii)D(a)|Rent on plant ' +
    'and machinery|194I(A)~393(1) Sl2(ii)D(b)|Rent on land or furniture etc|194I(B)~393(1) ' +
    'Sl3(ii)|Payments Under Specified Agreement|194IC~393(1) Sl3(iii)|Compensation on ' +
    'acquisition|194LA~393(1) Sl4(i)|Income From Mutual Fund Units|194K~393(1) ' +
    'Sl4(ii)-Interest|Interest from business trust units|194LBA(A)~393(1) Sl4(ii)-Dividend|Dividend ' +
    'from business trust units|194LBA(B)~393(1) Sl4(ii)-Rent|Rent from business trust ' +
    'units|194LBA~393(1) Sl4(iii)|Income from investment fund units|194LBB~393(1) Sl4(iv)|Income from' +
    ' securitization trust|194LBC~393(1) Sl5(i)|Interest on securities|193~393(1) ' +
    'Sl5(ii)D(a)|Interest (senior citizen)|194A~393(1) Sl5(ii)D(b)|Interest (non-senior ' +
    'citizen)|194A~393(1) Sl5(iii)|Interest (Specified person)|194A~393(1) Sl6(i)D(a)|Contract ' +
    'payments (Individual/HUF)|194C~393(1) Sl6(i)D(b)|Contract payments (Other)|194C~393(1) ' +
    'Sl6(ii)|Resident Contractors & Professionals|194M~393(1) Sl6(iii)D(a)|Technical ' +
    'services|194J(A)~393(1) Sl6(iii)D(b)-Fees|Professional fees|194J(B)~393(1) ' +
    'Sl6(iii)D(b)-Remuneration|Director remuneration|194J(B)~393(1) Sl7|Dividend|194~393(1) ' +
    'Sl8(i)|LIC maturity proceeds|194DA~393(1) Sl8(ii)|Payment of sale of goods|194Q~393(1) ' +
    'Sl8(iv)|Benefit or perquisite|194R~393(1) Sl8(iv) Note6|Benefit/perquisite (Not wholly ' +
    'cash)|194RP~393(1) Sl8(v)|e-commerce participant|194O~393(1) Sl8(vii)|Specified senior ' +
    'citizens|194P~393(1) Sl8(vi)-NonAudit|Virtual digital asset (Non-audit)|194S~393(1) ' +
    'Sl8(vi)-Audit|Virtual digital asset (Audit)|194S~393(1) Sl8(vi) Note 6|Virtual digital asset ' +
    '(Not wholly cash)|194SP~393(2) Sl1|Non-resident sportsmen/sports association|194E~393(2) ' +
    'Sl3|Interest on FCB from Indian company|194LC(ib)~393(2) Sl4E(a)|Interest LT bond/rupee bond ' +
    'IFSC (Apr 2020-Jul 2023)|194LC(ic)~393(2) Sl4E(b)|Interest LT bond/rupee bond IFSC (Jul ' +
    '2023+)|194LC(ic)~393(2) Sl5|Compensation on acquisition (immovable property)|194LB~393(2) ' +
    'Sl6E(a)|Distributed income - business trust|N/A~393(2) Sl6E(b)|Distributed income - business ' +
    'trust|N/A~393(2) Sl7|Distributed income - business trust|194LBA(C)~393(2) Sl8|Income from ' +
    'investment fund units|N/A~393(2) Sl9|Income from securitisation trust|N/A~393(2) Sl10|Income ' +
    'from Units/MF to Non-Residents|196A~393(2) Sl11|Income from units (Offshore fund)|196B~393(2) ' +
    'Sl12|LTCG on units (Offshore fund)|196B~393(2) Sl13|Interest/dividends on bonds or ' +
    'GDRs|196C~393(2) Sl14|LTCG on bonds/GDRs|196C~393(2) Sl15|Income of FII from ' +
    'securities|196D~393(2) Sl16|Income on securities (specified fund)|196D(1A)~393(2) Sl17|Other ' +
    'sums payable to non-resident|195~393(3) Sl1|Lotteries Winnings|194B~393(3) Sl1 Note2|Lotteries ' +
    'Winnings (Not wholly cash)|194BP~393(3) Sl2 Note2|Winnings from online games (Not wholly ' +
    'cash)|194BAP~393(3) Sl3|Horse Race|194BB~393(3) Sl4|Commission/prize on lottery|194G~393(3) ' +
    'Sl5D(a)|Cash to co-operative societies|194NC~393(3) Sl5D(b)|Cash payments (other ' +
    'cases)|194N~393(3) Sl6|Deposits in NSS|194EE~393(3) Sl7|Payment by Partnership to ' +
    'Partners|194T~192A|RPF Accumulated Balance Payment|N/A~193|Interest on ' +
    'securities|N/A~194|Dividend|N/A~194A|Other Interest than securities|N/A~194B|Lotteries ' +
    'Winnings|N/A~194B-P|Lotteries Winnings (Not wholly cash)|N/A~194BA|Winnings from online ' +
    'games|N/A~194BA-P|Winnings from online games (Not wholly cash)|N/A~194BB|Horse ' +
    'Race|N/A~194C|Payment of contractors (Individual/HUF & Other)|N/A~194D|Insurance ' +
    'Commission|N/A~194D(a)|LIC maturity proceeds|N/A~194EE|Deposits in NSS|N/A~194E|Payments to ' +
    'non-resident sportsmen/sports association|N/A~194F|Re-sales By Mutual ' +
    'Funds|N/A~194G|Commission - prize on lottery|N/A~194H|Commission or Brokerage|N/A~194IA|TDS on ' +
    'immovable property sale|N/A~194IB|Rent not covered under 194I|N/A~194IC|Payments Under Specified' +
    ' Agreement|N/A~194I|Rent on land/furniture & Rent on plant/machinery|N/A~194I(A)|Rent on land or' +
    ' furniture|N/A~194I(B)|Rent on plant and machinery|N/A~194J|Professional ' +
    'Fees|N/A~194J(A)|Technical services|N/A~194J(B)|Professional Fees or ' +
    'royalty|N/A~194LA|Compensation on acquisition|N/A~194LB|Payment compensation on acquisition ' +
    '(immovable property)|N/A~194LBA|Interest from units of business trust|N/A~194LBA(a)|Interest ' +
    'from units of business trust|N/A~194R|Benefit or perquisite|N/A~194R-P|Benefit or perquisite ' +
    '(Not wholly cash)|N/A~194S|Transfer of a virtual digital asset|N/A~194S-P|Transfer of a virtual ' +
    'digital asset (Not wholly cash)|N/A~194T|Payment by Partnership Firm to Partners|N/A~194K|Income' +
    ' From Mutual Fund Units|N/A~194M|Payment To Resident Contractors And ' +
    'Professionals|N/A~194N|Payment of certain amounts in cash|N/A~194NC|Payment to co-operative ' +
    'societies|N/A~194NF|Payment to non-filers (except co-operative societies)|N/A~194N-FT|Payment to' +
    ' non-filers being co-operative societies|N/A~194P|Deduction of tax in case of specified senior ' +
    'citizens|N/A~195|Other sums payable to a non-resident|N/A~192|Salaries|N/A~196A|Income from ' +
    'Units/MF to Non-Residents|N/A~196B|Income such as Capital Gains from Units/MF to ' +
    'Non-residents|N/A~196C|Non-resident Income From Foreign currency bonds|N/A~196D|Income of ' +
    'foreign institutional investors from securities|N/A~196D(1A)|Income of specified fund from ' +
    'securities|N/A~Others|Others|N/A'
  , ['section','desc','was']).map(n => ({id:`${n.section}|${n.desc}`,
    name:n.section ? `${n.section} — ${n.desc}${n.was?` (was ${n.was})`:''}` : n.desc,
    section:n.section, was:n.was}));

const NATURE_GOODS = unpack(
    '394(1) Sl1|Alcoholic liquor for human consumption|206C(6CA)~394(1) Sl2|Tendu ' +
    'leaves|206C(6CI)~394(1) Sl3 D(a)|Timber (forest lease)|206C(6CB)~394(1) Sl3 D(b)|Timber (other ' +
    'modes)|206C(6CC)~394(1) Sl3 D(c)|Forest produce (other)|206C(6CD)~394(1) ' +
    'Sl4|Scrap|206C(6CE)~394(1) Sl5|Sale of minerals (coal/lignite/iron ore)|206C(6CJ)~394(1) Sl6 ' +
    'D(a)|Sale of motor vehicle|206C(6CL)~394(1) Sl6 D(b)-Watch|Sale of wrist watch|206C(6CMA)~394(1)' +
    ' Sl6 D(b)-Collectibles|Sale of collectibles (coin/stamp)|206C(6CMC)~394(1) Sl6 D(b)-Yacht|Sale ' +
    'of yacht/rowing boat/canoe/helicopter|206C(6CMD)~394(1) Sl6 D(b)-Sunglasses|Sale of pair of ' +
    'sunglasses|206C(6CME)~394(1) Sl6 D(b)-Bag|Sale of bag (handbag/purse)|206C(6CMF)~394(1) Sl6 ' +
    'D(b)-Shoes|Sale of pair of shoes|206C(6CMG)~394(1) Sl6 D(b)-Sportswear|Sale of sportswear and ' +
    'equipment|206C(6CMH)~394(1) Sl6 D(b)-Home Theatre|Sale of home theatre system|206C(6CMI)~394(1) ' +
    'Sl6D(b)-Horse|Sale of horse (racing/polo)|206C(6CMJ)~394(1) Sl7 D(a)|Remittance under LRS for ' +
    'education or medical treatment|206C(6CP)~394(1) Sl7 D(b)|Remittance under LRS for other ' +
    'purposes|206C(6CQ)~394(1) Sl8 D(a)|Sale of overseas tour program (up to ' +
    'threshold)|206C(6CO)~394(1) Sl8 D(b)|Sale of overseas tour program (above ' +
    'threshold)|206C(6CO)~394(1) Sl9 D(a)|Parking lots|206C(6CF)~394(1) Sl9 D(b)|Toll ' +
    'plaza|206C(6CG)~394(1) Sl9 D(c)|Mine or quarry|206C(6CH)~206C(6CA)|Alcoholic liquor for human ' +
    'consumption|N/A~206C(6CB)|Timber obtained under forest lease|N/A~206C(6CC)|Timber obtained by ' +
    'any mode other than forest lease|N/A~206C(6CD)|Any other forest produce (not tendu ' +
    'leaves)|N/A~206C(6CE)|Scrap|N/A~206C(6CI)|Tendu leaves|N/A~206C(6CJ)|Sale of minerals ' +
    '(coal/lignite/iron ore)|N/A~206C(6CK)|Cash sale of bullion and jewellery|N/A~206C(6CF)|Parking ' +
    'lots|N/A~206C(6CG)|Toll plaza|N/A~206C(6CH)|Mine or quarry|N/A~206C(6CL)|Sale of motor ' +
    'vehicle|N/A~206C(6CMA)|Sale of wrist watch|N/A~206C(6CMB)|Sale of art piece ' +
    '(antiques/painting/sculpture)|N/A~206C(6CMC)|Sale of collectibles ' +
    '(coin/stamp)|N/A~206C(6CMD)|Sale of yacht/rowing boat/canoe/helicopter|N/A~206C(6CME)|Sale of ' +
    'pair of sunglasses|N/A~206C(6CMF)|Sale of bag (handbag/purse)|N/A~206C(6CMG)|Sale of pair of ' +
    'shoes|N/A~206C(6CMI)|Sale of home theatre system|N/A~206C(6CMJ)|Sale of horse ' +
    '(racing/polo)|N/A~206C(6CO)|Sales of overseas tour program package|N/A~206C(6CP)|Educational ' +
    'loan from financial institution (section 80E)|N/A~206C(6CQ)|Remittance under LRS for other ' +
    'purposes|N/A~206C(1H)|Sale of goods|N/A'
  , ['section','desc','was']).map(n => ({id:`${n.section}|${n.desc}`,
    name:n.section ? `${n.section} — ${n.desc}${n.was?` (was ${n.was})`:''}` : n.desc,
    section:n.section, was:n.was}));

/* HSN rate details and SAC rates in one list, because the field reading it is
   one field. `rate` is the current GST rate where the sheet states one — blank
   means the sheet is silent, not that the supply is nil rated. */
const HSN_SAC = unpack(
    '01012100|Live horses|5%~010129|Others|5%~0401|Ultra-High Temperature (UHT) ' +
    'milk|Nil~04029110|Condensed milk|5%~04029920|Condensed milk|5%~0405|Butter and other fats (i.e. ' +
    'ghee, butter oil, etc.) and oils|5%~0406|Cheese|5%~0801|Brazil nuts, dried, whether or not ' +
    'Shelled or Peeled|5%~0802|Other nuts, dried, whether or not shelled or peeled, such ' +
    'as|5%~0804|Dates (soft or hard), figs, pineapples, avocados, guavas, ma|5%~0805|Citrus fruit, ' +
    'such as Oranges, Mandarins (including tangerin|5%~0813|Fruit, dried, other than that of headings' +
    ' 0801 to 0806; mixt|5%~1107|Malt, whether or not roasted|5%~1108|Starches; ' +
    'inulin|5%~1302|Vegetable saps and extracts; pectic substances, pectinates a|5%~14049010|Bidi ' +
    'wrapper leaves (tendu)|5%~14049050|Indian katha|5%~1501|Pig fats (including lard) and poultry ' +
    'fat, other than that o|5%~1502|Fats of bovine animals, sheep or goats, other than those of ' +
    '|5%~1503|Lard stearin, lard oil, oleo stearin, oleo-oil and tallow oi|5%~1504|Fats and oils and ' +
    'their fractions, of fish or marine mammals|5%~1505|Wool grease and fatty substances derived ' +
    'therefrom (includin|5%~1506|Other animal fats and oils and their fractions, whether or ' +
    'n|5%~1516|Animal or microbial fats and animal or microbial oils and th|5%~1517|Edible mixtures ' +
    'or preparations of animal fats or microbial |5%~151710|All goods i.e. Margarine, ' +
    'Linoxyn|5%~1518|Animal or microbial fats and animal or microbial oils and ' +
    'th|5%~15200000|Glycerol, crude; glycerol waters and glycerol lyes|5%~1521|Vegetable waxes (other' +
    ' than triglycerides), Beeswax, other i|5%~1522|Degras, residues resulting from the treatment of ' +
    'fatty subst|5%~1601|Sausages and similar products, of meat, meat offal, blood or|5%~1602|Other ' +
    'prepared or preserved meat, meat offal, blood or insec|5%~1603|Extracts and juices of meat, fish' +
    ' or crustaceans, molluscs o|5%~1604|Prepared or preserved fish; caviar and caviar substitutes ' +
    'pr|5%~1605|Crustaceans, molluscs and other aquatic invertebrates prepar|5%~170191|All goods, ' +
    'including refined sugar containing added flavouri|5%~170199|All goods, including refined sugar ' +
    'containing added flavouri|5%~1702|Other sugars, including chemically pure lactose, maltose, ' +
    'gl|5%~1704|Sugar boiled confectionery|5%~1804|Cocoa butter, fat and oil|5%~1805|Cocoa powder, ' +
    'not containing added sugar or sweetening matte|5%~1806|Chocolates and other food preparations ' +
    'containing cocoa|5%~1901|Malt extract, food preparations of flour, groats, meal, ' +
    'star|5%~1902|Pasta, whether or not cooked or stuffed (with meat or other |5%~1904|[other than ' +
    '1904 10 20] All goods i.e. Corn flakes, bulgar w|5%~1905|Pastry, cakes, biscuits and other ' +
    'bakers’ wares, whether or |5%~19059030|Extruded or expanded products, savoury or ' +
    'salted|5%~2106|Khakhra, chapathi or roti|~2001|Vegetables, fruit, nuts and other edible parts of' +
    ' plants, pr|5%~2002|Tomatoes prepared or preserved otherwise than by vinegar or ' +
    '|5%~2003|Mushrooms and truffles, prepared or preserved otherwise than|5%~2004|Other vegetables ' +
    'prepared or preserved otherwise than by vin|5%~2005|Other vegetables prepared or preserved ' +
    'otherwise than by vin|5%~2006|Vegetables, fruit, nuts, fruit-peel and other parts of ' +
    'plant|5%~2007|Jams, fruit jellies, marmalades, fruit or nut puree and frui|5%~2008|Fruit, nuts ' +
    'and other edible parts of plants, otherwise prep|5%~2009|Fruit or nut juices (including grape ' +
    'must) and vegetable jui|5%~20098990|Tender coconut water, pre-packaged and ' +
    'labelled|5%~210111|Extracts, essences and concentrates of coffee, and ' +
    'preparati|5%~21011200|Extracts, essences and concentrates of coffee, and preparati|5%~210120|All' +
    ' goods i.e Extracts, essences and concentrates of tea or |5%~210130|Roasted chicory and other ' +
    'roasted coffee substitutes, and ex|5%~2102|Yeasts (active and inactive); other single cell ' +
    'micro-organi|5%~2103|All goods, including Sauces and preparations therefor, mixed|5%~2104|Soups ' +
    'and broths and preparations therefor; homogenised comp|5%~21050000|Ice cream and other edible ' +
    'ice, whether or not containing co|5%~210690|Namkeens, bhujia, mixture, chabena and similar ' +
    'edible prepar|5%~21069020|Pan masala*|40%~21069091|Diabetic foods|5%~2201|Drinking water packed ' +
    'in 20 litre bottles|5%~220210|All goods (including aerated waters), containing added ' +
    'sugar|40%~22029100|Other non-alcoholic beverages|40%~220299|Other non-alcoholic ' +
    'beverages|40%~22029910|Soya milk drinks|5%~22029920|Fruit pulp or fruit juice based drinks ' +
    '(other than Carbonate|5%~2202|Carbonated Beverages of Fruit Drink or Carbonated Beverages ' +
    '|40%~22029930|Beverages containing milk|5%~22029990|Caffeinated ' +
    'Beverages|40%~2401|Unmanufactured tobacco; tobacco refuse [other than tobacco l|40%~2402|Cigars,' +
    ' cheroots, cigarillos and cigarettes, of tobacco or o|40%~2403|Bidis|18%~24041100|Products ' +
    'containing tobacco or reconstituted tobacco and int|40%~24041900|Products containing tobacco or ' +
    'nicotine substitutes and inte|40%~25151210|Marble and travertine blocks|5%~2516|Granite ' +
    'blocks|5%~2523|Portland cement, aluminous cement, slag cement, super sulpha|18%~2701|Coal; ' +
    'briquettes, ovoids and similar solid fuels manufacture|18%~2702|Lignite, whether or not ' +
    'agglomerated, excluding jet|18%~2703|Peat (including peat litter), whether or not ' +
    'agglomerated|18%~28|Anaesthetics|5%~280120|Iodine|5%~28044010|Medical grade ' +
    'oxygen|5%~2807|Sulphuric acid|5%~2808|Nitric acid|5%~2814|Ammonia|5%~2847|Medicinal grade ' +
    'hydrogen peroxide|5%~38|Micronutrients, which are covered under serial number 1(g) ' +
    'o|~29380893|Gibberellic acid|5%~29061110|Natural menthol|5%~29061130|Following goods from ' +
    'natural menthol namely: a. Menthol and |5%~29063301|Following goods from natural menthol namely:' +
    ' a. Menthol and |5%~29061190|Other than natural menthol|18%~30|The following drugs and medicines' +
    ' 1 Agalsidase Beta 2 Imiglu|Nil~3001|Glands and other organs for organo-therapeutic uses, dried,' +
    ' |5%~3002|Animal blood prepared for therapeutic, prophylactic or diagn|5%~3003|Medicaments ' +
    '(excluding goods of heading 30.02, 30.05 or 30.0|5%~3004|Medicaments (excluding goods of heading' +
    ' 30.02, 30.05 or 30.0|5%~3005|Wadding, gauze, bandages and similar articles (for example, ' +
    '|5%~3006|Pharmaceutical goods specified in Note 4 to this Chapter [i.|5%~3304|Talcum powder, ' +
    'Face powder|5%~3305|Hair oil, shampoo|5%~3306|Dental floss, toothpaste|5%~33061010|Tooth ' +
    'powder|5%~3307|Shaving cream, shaving lotion, aftershave lotion|5%~33074100|Odoriferous ' +
    'preparations which operate by burning (other tha|18%~3401|Toilet Soap (other than industrial ' +
    'soap) in the form of bars|5%~3406|Candles, tapers and the like|5%~3503|Gelatin (including ' +
    'gelatin in rectangular (including square)|5%~3505|Dextrins and other modified starches (for ' +
    'example, pregelati|5%~36050010|All goods-safety matches|5%~3701|Photographic plates and film for' +
    ' x-ray for medical use|5%~3705|Photographic plates and films, exposed and developed, other ' +
    '|5%~3706|Photographic plates and films, exposed and developed, whethe|5%~3808|The following ' +
    'Bio-pesticides, namely - 1 Bacillus thuringien|5%~3818|Silicon wafers|5%~3822|All diagnostic ' +
    'kits and reagents|5%~3826|Biodiesel (other than biodiesel supplied to Oil Marketing ' +
    'Co|18%~3926|Feeding bottles; Plastic beads|5%~4007|Latex Rubber Thread|5%~4011|Rear tractor ' +
    'tyres and rear tractor tyre tubes|5%~40117000|Tyre for tractors|5%~40139049|Tube for tractor ' +
    'tyres|5%~4014|Nipples of feeding bottles|5%~4015|Surgical rubber gloves or medical examination ' +
    'rubber gloves|5%~4016|Erasers|Nil~4107|Leather further prepared after tanning or crusting, ' +
    'includin|5%~4112|Leather further prepared after tanning or crusting, includin|5%~4113|Leather ' +
    'further prepared after tanning or crusting, includin|5%~4114|Chamois (including combination ' +
    'chamois) leather; patent leat|5%~4115|Composition leather with a basis of leather or leather ' +
    'fibre|5%~420222|Handicraft- Handbags including pouches and purses; ' +
    'jewellery|5%~420229|Handicraft- Handbags including pouches and purses; ' +
    'jewellery|5%~42023110|Handicraft- Handbags including pouches and purses; ' +
    'jewellery|5%~42023190|Handicraft- Handbags including pouches and purses; ' +
    'jewellery|5%~420232|Handicraft- Handbags including pouches and purses; ' +
    'jewellery|5%~420239|Handicraft- Handbags including pouches and purses; ' +
    'jewellery|5%~42022220|Hand bags and shopping bags, of cotton|5%~42022230|Hand bags and shopping ' +
    'bags, of jute|5%~4203|Gloves specially designed for use in sports|5%~446883|Idols of wood, stone' +
    ' [including marble] and metals [other th|5%~44|The following goods, namely: - a. Cement Bonded ' +
    'Particle Boa|5%~4404|Hoopwood; split poles; piles, pickets and stakes of wood, po|5%~4405|Wood ' +
    'wool; wood flour|5%~4406|Railway or tramway sleepers (cross-ties) of wood|5%~4408|Sheets for ' +
    'veneering (including those obtained by slicing la|5%~4409|Bamboo flooring|5%~4414|Handicraft- ' +
    'Wooden frames for painting, photographs, mirrors|5%~4415|Packing cases, boxes, crates, drums and' +
    ' similar packings, of|5%~4416|Handicraft- Carved wood products, art ware/ decorative ' +
    'artic|5%~44219990|Handicraft- Carved wood products, art ware/ decorative artic|5%~4417|Tools, ' +
    'tool bodies, tool handles, broom or brush bodies and |5%~4418|Bamboo wood building ' +
    'joinery|5%~4419|Tableware and Kitchenware of wood|5%~4420|Wood marquetry and inlaid wood; ' +
    'caskets and cases for jewell|5%~4421|Other articles of wood; such as clothes hangers, Spools, ' +
    'cop|5%~45020000|Natural cork, debacked or roughly squared, or in rectangular|5%~4503|Articles of' +
    ' natural cork such as Corks and Stoppers, Shuttle|5%~45039090|Handicraft- Art ware of cork ' +
    '[including articles of sholapit|5%~450490|Handicraft- Art ware of cork [including articles of ' +
    'sholapit|5%~4504|Agglomerated cork (with or without a binding substance) and |5%~4701|Mechanical' +
    ' wood pulp|5%~4702|Chemical wood pulp, dissolving grades|18%~4703|Chemical wood pulp, soda or ' +
    'sulphate, other than dissolving |5%~4704|Chemical wood pulp, sulphite, other than dissolving ' +
    'grades|5%~4705|Wood pulp obtained by a combination of mechanical and chemic|5%~4706|Pulps of ' +
    'fibres derived from recovered (waste and scrap) pap|5%~4802|Uncoated paper and paperboard used ' +
    'for exercise book, graph |Nil~4804|Uncoated kraft paper and paperboard, in rolls or sheets, ' +
    'oth|18%~4805|Other uncoated paper and paperboard, in rolls or sheets, ' +
    'not|18%~48062000|Greaseproof papers|18%~48064010|Glassine papers|18%~4807|Composite paper and ' +
    'paperboard (made by sticking flat layers|18%~4808|Paper and paperboard, corrugated (with or ' +
    'without glued flat|18%~4810|Paper and paperboard, coated on one or both sides with ' +
    'kaoli|18%~481730|Boxes, pouches, wallets and writing compendiums, of paper or|5%~481910|Cartons,' +
    ' boxes and cases of,- a. Corrugated paper or paper b|5%~481920|Cartons, boxes and cases of,- a. ' +
    'Corrugated paper or paper b|5%~4820|Exercise book, graph book, & laboratory note book and ' +
    'notebo|Nil~4823|Paper pulp moulded trays|5%~48|Paper splints for matches, whether or not waxed, ' +
    'Asphaltic r|5%~4905|Maps and hydrographic or similar charts of all kinds, includ|Nil~5401|Sewing' +
    ' thread of manmade filaments, whether or not put up fo|5%~5402|Synthetic or artificial filament ' +
    'yarns|5%~5403|Synthetic or artificial filament yarns|5%~5404|Synthetic or artificial filament ' +
    'yarns|5%~5405|Synthetic or artificial filament yarns|5%~5406|Synthetic or artificial filament ' +
    'yarns|5%~5501|Synthetic or artificial filament tow|5%~5502|Synthetic or artificial filament ' +
    'tow|5%~5503|Synthetic or artificial staple fibres|5%~5504|Synthetic or artificial staple ' +
    'fibres|5%~5506|Synthetic or artificial staple fibres|5%~5507|Synthetic or artificial staple ' +
    'fibres|5%~5505|Waste of manmade fibres|5%~5508|Sewing thread of manmade staple ' +
    'fibres|5%~5509|Yarn of manmade staple fibres|5%~5510|Yarn of manmade staple fibres|5%~5511|Yarn ' +
    'of manmade staple fibres|5%~5601|Wadding of textile materials and articles thereof; such as ' +
    'a|5%~5602|Felt, whether or not impregnate, coated, covered or laminate|5%~5603|Nonwovens, ' +
    'whether or not impregnated, coated, covered or la|5%~5604|Rubber thread and cord, textile ' +
    'covered; textile yarn, and s|5%~5605|Metallised yarn, whether or not gimped, being textile yarn ' +
    'o|5%~5606|Gimped yarn, and strip and the like of heading 5404 or 5405,|5%~5607|Twine, cordage, ' +
    'ropes and cables, whether or not plaited or |5%~5609|Articles of yarn, strip or the like of ' +
    'heading 5404 or 5405,|5%~5701|Carpets and other textile floor coverings, knotted, whether ' +
    '|5%~5702|Carpets and other textile floor coverings, woven, not tufted|5%~5703|Carpets and other ' +
    'textile floor coverings (including Turf), |5%~5704|Carpets and other textile floor coverings, of' +
    ' felt, not tuft|5%~5705|Other carpets and other textile floor coverings, whether or ' +
    '|5%~5802|Terry towelling and similar woven terry fabrics, other than |5%~5803|Gauze, other than ' +
    'narrow fabrics of heading 5806|5%~5804|Tulles and other net fabrics, not including woven, ' +
    'knitted o|5%~5805|Hand-woven tapestries of the type Gobelins, Flanders, Aubuss|5%~5807|Labels, ' +
    'badges and similar articles of textile materials, in|5%~5808|Braids in the piece; ornamental ' +
    'trimmings in the piece, with|5%~5809|Woven fabrics of metal thread and woven fabrics of ' +
    'metallise|5%~5810|Embroidery in the piece, in strips or in motifs, Embroidered|5%~5811|Quilted ' +
    'textile products in the piece, composed of one or mo|5%~5901|Textile fabrics coated with gum or ' +
    'amylaceous substances, of|5%~5902|Tyre cord fabric of high tenacity yarn of nylon or other ' +
    'pol|5%~5903|Textile fabrics impregnated, coated, covered or laminated wi|5%~5904|Linoleum, ' +
    'whether or not cut to shape; floor coverings consi|5%~5905|Textile wall ' +
    'coverings|5%~5906|Rubberised textile fabrics, other than those of heading 5902|5%~5907|Textile ' +
    'fabrics otherwise impregnated, coated or covered; pa|5%~5908|Textile wicks, woven, plaited or ' +
    'knitted , for lamps, stoves|5%~5909|Textile hose piping and similar textile tubing, with or ' +
    'with|5%~5910|Transmission or conveyor belts or belting, of textile materi|5%~5911|Textile ' +
    'products and articles, for technical uses, specified|5%~6117|Handmade/hand embroidered ' +
    'shawls|5%~6214|Handmade/hand embroidered shawls|5%~61|Articles of apparel and clothing ' +
    'accessories, knitted or cro|18%~62|Articles of apparel and clothing accessories, not knitted ' +
    'or|18%~63|6309] Other made up textile articles, sets of sale value exc|18%~64|Footwear of sale ' +
    'value not exceeding Rs.2500 per pair|5%~6501|Textile caps|5%~6505|Hats (knitted/crocheted) or ' +
    'made up from lace or other texti|5%~6601|Umbrellas and sun umbrellas (including walking-stick ' +
    'umbrell|5%~6602|Whips, riding-crops and the like|5%~6603|Parts, trimmings and accessories of ' +
    'articles of heading 6601|5%~6701|Skins and other parts of birds with their feathers or down, ' +
    '|5%~68|Sand lime bricks or Stone inlay work|5%~6802|Handicraft Statues, statuettes, pedestals; ' +
    'high or low relie|5%~68159990|Handicraft -Stone art ware, stone inlay work|5%~6911|Tableware, ' +
    'kitchenware, other household articles and toilet |5%~6912|Tableware, kitchenware, other ' +
    'household articles and toilet |5%~69120010|Handicraft-Tableware and kitchenware of clay and ' +
    'terracotta,|5%~69120020|Handicraft-Tableware and kitchenware of clay and ' +
    'terracotta,|5%~6913|Handicraft-Statues and other ornamental ' +
    'articles|5%~69139000|Handicraft-Statuettes & other ornamental ceramic articles ' +
    '(i|5%~70099200|Handicraft-Ornamental framed mirrors|5%~701510|Glasses for corrective spectacles ' +
    'and flint buttons|5%~70189010|Handicraft-Glass statues [other than those of ' +
    'crystal]|5%~70200090|Handicraft-Glass art ware [ incl. pots, jars, votive, cask, |5%~7020|Globes' +
    ' for lamps and lanterns, Founts for kerosene wick lamp|5%~73107326|Mathematical boxes, geometry ' +
    'boxes and colour boxes|5%~7310|Milk cans made of Iron, Steel, or Aluminium|5%~7323|Milk cans ' +
    'made of Iron, Steel, or Aluminium|5%~7612|Milk cans made of Iron, Steel, or ' +
    'Aluminium|5%~7615|Milk cans made of Iron, Steel, or Aluminium|5%~7317|Animal shoe ' +
    'nails|5%~7319|Sewing needles|5%~73218516|Solar cookers|5%~7321|Kerosene burners, kerosene stoves' +
    ' and wood burning stoves of|5%~73269099|Handicraft -Art ware of iron|5%~7418|Table, kitchen or ' +
    'other household articles of copper; Utensi|5%~74198030|Brass Kerosene Pressure ' +
    'Stove|5%~741980|Handicraft -Art ware of brass, copper/ copper alloys, ' +
    'electr|5%~76169990|Handicraft -Aluminium art ware|5%~8214|Pencil ' +
    'sharpeners|Nil~8306|Handicraft-Bells, gongs and like, non-electric, of base ' +
    'meta|5%~848594|Following renewable energy devices and parts for their manuf|5%~8401|Fuel ' +
    'elements (cartridges), non-irradiated, for nuclear reac|5%~8407|Spark-ignition reciprocating or ' +
    'rotary internal combustion p|18%~8408|Compression-ignition internal combustion piston engines ' +
    '(die|18%~84082020|Agricultural Diesel Engine of cylinder capacity exceeding 25|5%~8409|Parts ' +
    'suitable for use solely or principally with the engine|18%~8413|Pumps for dispensing fuel or ' +
    'lubricants of the type used in |18%~84138190|Hydraulic Pumps for Tractors|5%~84142020|Other hand' +
    ' pumps|5%~8415|Air-conditioning machines, comprising a motor-driven fan and|18%~841912|Solar ' +
    'water heater and system|5%~8420|Hand operated rubber roller|5%~8422|Dish washing machines, ' +
    'household [8422 11 00] and other [842|18%~8424|Nozzles for drip irrigation equipment or nozzles ' +
    'for sprinkl|5%~8432|Agricultural, horticultural or forestry machinery for soil ' +
    'p|5%~8433|Harvesting or threshing machinery, including straw or fodder|5%~8436|Other ' +
    'agricultural, horticultural, forestry, poultry-keeping|5%~8452|Sewing machines, other than ' +
    'book-sewing machine of heading 8|5%~8479|Composting Machines|5%~8507|Electric accumulators, ' +
    'including separators therefor, whethe|18%~8511|Electrical ignition or starting equipment of a ' +
    'kind used for|18%~852560|Two-way radio (Walkie talkie) used by defence, police and ' +
    'pa|5%~8528|Television sets (including LCD and LED television); Monitors|18%~87|Fuel Cell Motor ' +
    'Vehicles including hydrogen vehicles based o|5%~8701|Tractors (except road tractors for ' +
    'semi-trailers of engine c|5%~8702|Motor vehicles for the transport of ten or more persons, ' +
    'inc|18%~8703|Motor cars and other motor vehicles principally designed for|40%~87028703|Motor ' +
    'vehicles cleared as ambulances duly fitted with all th|18%~870340|Motor vehicles with both ' +
    'spark-ignition internal combustion |18%~870360|Motor vehicles with both spark-ignition internal ' +
    'combustion |18%~870350|Motor vehicles with both compression-ignition internal ' +
    'combu|18%~870370|Motor vehicles with both compression-ignition internal combu|18%~8704|Motor ' +
    'vehicles for the transport of goods [other than Refrig|18%~8706|Chassis fitted with engines, for' +
    ' the motor vehicles of headi|18%~8707|Bodies (including cabs), for the motor vehicles of ' +
    'headings |18%~8708|Parts and accessories of the motor vehicles of headings ' +
    '8701|18%~87081010|Bumpers and parts thereof for tractors|5%~87083000|Brakes assembly and its ' +
    'parts thereof for tractors|5%~87084000|Gear boxes and parts thereof for ' +
    'tractors|5%~87085000|Transaxles and its parts thereof for tractors|5%~87087000|Road wheels and ' +
    'parts and accessories thereof for tractors|5%~87089100|i. Radiator assembly for tractors and ' +
    'parts thereof Cooling |5%~87089200|Silencer assembly for tractors and parts ' +
    'thereof|5%~87089300|Clutch assembly and its parts thereof for tractors|5%~87089400|Steering ' +
    'wheels and its parts thereof for tractor|5%~87089900|Hydraulic and its parts thereof for ' +
    'tractors|5%~8710|Tanks and other armoured fighting vehicles, motorised, ' +
    'wheth|5%~8711|Motorcycles of engine capacity (including mopeds) and cycles|18%~8712|Bicycles and' +
    ' other cycles (including delivery tricycles), no|5%~8714|Parts and accessories of bicycles and ' +
    'other cycles (includin|5%~87162000|Self-loading or self-unloading trailers for agricultural ' +
    'pur|5%~871680|Hand propelled vehicles (e.g. hand carts, rickshaws and the |5%~8802|Aircraft for ' +
    'personal use.|40%~8806|Unmanned aircrafts 28%/|5%~8903|Rowing boats and canoes|18%~90|Chapter ' +
    'Blood glucose monitoring system (Glucometer) and tes|5%~9001|Contact lenses; Spectacle ' +
    'lenses|5%~9003|Frames and mountings for spectacles, goggles or the like, an|5%~9004|Spectacles, ' +
    'corrective [including goggles for correcting vis|5%~9018|Instruments and appliances used in ' +
    'medical, surgical, dental|5%~9019|Mechano-therapy appliances; massage apparatus; ' +
    'psychological|5%~9020|Other breathing appliances and gas masks, excluding ' +
    'protecti|5%~9022|Apparatus based on the use of X-rays or of alpha, beta or ' +
    'ga|5%~9025|Thermometers for medical, surgical, dental or veterinary usa|5%~9027|Instruments and ' +
    'apparatus for medical, surgical, dental or v|5%~9302|Revolvers and pistols, other than those of ' +
    'heading 9303 or 9|40%~94012000|Seats of a kind used for motor vehicles|18%~940150|Handicraft- ' +
    'Furniture of bamboo, rattan and cane|5%~940380|Handicraft- Furniture of bamboo, rattan and ' +
    'cane|5%~9404|Coir products [except coir mattresses]|5%~9405|Hurricane lanterns, Kerosene lamp / ' +
    'pressure lantern, petrom|5%~940510|Handicraft-Handcrafted lamps (including panchloga ' +
    'lamp)|5%~9503|Toys like tricycles, scooters, pedal cars etc. (including ' +
    'pa|5%~9504|Handicraft-Ganjifa card|5%~9506|Sports goods other than articles and equipment for ' +
    'general p|5%~9507|Fishing rods, and other line fishing tackle; fish landing ' +
    'ne|5%~9601|Handicraft -Worked ivory, bone, tortoise shell, horn, antler|5%~9602|Handicraft ' +
    '-Worked vegetable or mineral carving, articles th|5%~96032100|Tooth brushes including ' +
    'dental-plate brushes|5%~9607|Slide fasteners and parts thereof|5%~9608|Pencils (including ' +
    'propelling or sliding pencils), crayons, |Nil~9609|Pencils (including propelling or sliding ' +
    'pencils), crayons, |Nil~9614|Smoking pipes (including pipe bowls) and cigar or cigarette ' +
    '|40%~9615|Combs, hair-slides and the like; hairpins, curling pins, cur|5%~96190030|All goods- ' +
    'napkins and napkin liners for babies, clinical di|5%~96190040|All goods- napkins and napkin ' +
    'liners for babies, clinical di|5%~96190090|All goods- napkins and napkin liners for babies, ' +
    'clinical di|5%~9701|Handicraft-Paintings, drawings and pastels, executed ' +
    'entirel|5%~9702|Original engravings, prints and lithographs|5%~9703|Handicraft -Original ' +
    'sculptures and statuary, in any materia|5%~9705|Collections and collectors\' pieces of ' +
    'zoological, botanical,|5%~9706|Antiques of an age exceeding one hundred years|5%~9804|All ' +
    'dutiable articles intended for personal use|18%~6363053200630533006309|Other made up textile ' +
    'articles, sets of sale value not excee|5%~49|Technical documentation in respect of goods ' +
    'exempted under n|Nil~71|Natural Cut and Polished Diamonds up to 25 cents (1/4 ' +
    'carats|Nil~888536|Flight Motion Simulator and its parts|Nil~8485|Low noise amplifier (Hermetic ' +
    'sealed), vent guide assembly-R|Nil~8485879093|Parts and sub-assemblies of IADWS|Nil~88|Military ' +
    'transport aircraft (C-130, C-295MW)|Nil~89|Deep Submergence Rescue Vessel|Nil~8807|Ejection ' +
    'Seats for fighter aircrafts|Nil~8506|High performance batteries for drones and specialised ' +
    'equipm|Nil~8525|Communication devices including software defined radios with|Nil~90199020|Air ' +
    'diving, rebreather sets, diving systems, components and |Nil~93|Ship launched ' +
    'missiles|Nil~9954|(i) Composite supply of works contract services involving ' +
    'pr|18%withITC~9963|Supply of "hotel accommodation" having value of supply of a ' +
    '|5%withoutITC~9964|(i) Supply of Air transport of passengers in other than ' +
    'econ|18%withITC~9965|(i) Supply of Transport of goods by GTA|5%withoutITC(RCM/FCM)~9966|(i) ' +
    'Supply of Renting of any motor vehicle (with operator) ' +
    'd|5%withITCofinputservices(inthesamelineofbusiness)~9968|(i) Local delivery services (This ' +
    'service is currently taxed|18%withITC(nochange)~9971|Supply of Service of third-party insurance ' +
    'of "goods carriag|5%withITC~9973|Leasing or rental services, without operator, of ' +
    'goods|40%withITC~9983|Other professional, technical and business services ' +
    'relating|18%withITC~9986|Support services to exploration, mining or drilling of ' +
    'petro|18%withITC~9988|(i) Supply of services by way of job work in relation to ' +
    'umb|5%withITC~9994|(i) Services by way of treatment of effluents by a Common ' +
    'Ef|5%withITC~9996|(i) Services by way of admission to exhibition of ' +
    'cinematogr|5%withITC~9997|Beauty and physical well-being services falling under group ' +
    '|5%withoutITC~99|All Services|~995411|Construction services of single dwelling or multi dwelling' +
    ' o|~995412|Construction services of other residential buildings such as|~995413|Construction ' +
    'services of industrial buildings such as buildi|~995414|Construction services of commercial ' +
    'buildings such as office|~995415|Construction services of other non-residential buildings ' +
    'suc|~995416|Construction services of other buildings nowhere else classi|~995417|(i) ' +
    'Construction services of commercial buildings such as of|~995418|Services by way of ' +
    'house-keeping, such as plumbing, carpente|~995419|Services involving repair, alterations, ' +
    'additions, replaceme|~995421|General construction services of highways, streets, roads, ' +
    'r|~995422|General construction services of harbours, waterways, dams, |~995423|General ' +
    'construction services of long-distance underground/ |~995424|General construction services of ' +
    'local water and sewage pipe|~995425|General construction services of mines and industrial ' +
    'plants|~995426|General Construction services of Power Plants and its relate|~995427|General ' +
    'construction services of outdoor sport and recreatio|~995428|General construction services of ' +
    'other civil engineering wor|~995429|Services involving repair, alterations, additions, ' +
    'replaceme|~995431|Demolition services|~995432|Site formation and clearance services including ' +
    'preparation |~995433|Excavating and earthmoving services|~995434|Water well drilling services ' +
    'and septic system installation |~995435|Other site preparation services nowhere else ' +
    'classified|~995439|Services involving repair, alterations, additions, ' +
    'replaceme|~995441|Installation, assembly and erection services of ' +
    'prefabricate|~995442|Installation, assembly and erection services of other ' +
    'prefab|~995443|Installation services of all types of street furniture (such|~995444|Other ' +
    'assembly and erection services nowhere else classified|~995449|Services involving repair, ' +
    'alterations, additions, replaceme|~995451|Pile driving and foundation services|~995452|Building ' +
    'framing and roof framing services|~995453|Roofing and waterproofing services|~995454|Concrete ' +
    'services|~995455|Structural steel erection services|~995456|Masonry services|~995457|Scaffolding' +
    ' services|~995458|Other special trade construction services nowhere else class|~995459|Services ' +
    'involving repair, alterations, additions, replaceme|~995461|Electrical installation services ' +
    'including Electrical wiring|~995462|Water plumbing and drain laying services|~995463|Heating, ' +
    'ventilation and air conditioning equipment installa|~995464|Gas fitting installation ' +
    'services|~995465|Insulation services|~995466|Lift and escalator installation ' +
    'services|~995468|Other installation services nowhere else classified|~995469|Services involving ' +
    'repair, alterations, additions, replaceme|~995471|Glazing services|~995472|Plastering ' +
    'services|~995473|Painting services|~995474|Floor and wall tiling services|~995475|Other floor ' +
    'laying, wall covering and wall papering services|~995476|Joinery and carpentry ' +
    'services|~995477|Fencing and railing services|~995478|Other building completion and finishing ' +
    'services nowhere els|~995479|Services involving repair, alterations, additions, ' +
    'replaceme|~9961|Services in wholesale trade|~996111|Services provided for a fee or commission or' +
    ' on contract bas|~9962|Services in retail trade|~996211|Services provided for a fee or ' +
    'commission or on contract bas|~996311|Room or unit accommodation services provided by Hotels, ' +
    'Inn,|~996312|Camp site services|~996313|Recreational and vacation camp services|~996321|Room or ' +
    'unit accommodation services for students in student |~996322|Room or unit accommodation services' +
    ' provided by Hostels, Cam|~996329|Other room or unit accommodation services nowhere else ' +
    'class|~996331|Services provided by restaurants, cafes and similar eating f|~996332|Services ' +
    'provided by Hotels, Inn, Guest House, Club and the |~996333|Services provided in canteen and ' +
    'other similar establishment|~996334|Catering Services in exhibition halls, events, marriage ' +
    'hall|~996335|Catering services in trains, flights and the like|~996336|Preparation or supply ' +
    'services of food, edible preparations,|~996337|Other contract food services|~996339|Other food, ' +
    'edible preparations, alcoholic and non-alcoholic|~996411|Local land transport services of ' +
    'passengers by railways, met|~996412|Taxi services including radio taxi and other similar ' +
    'service|~996413|Non-scheduled local bus and coach charter services|~996414|Other land ' +
    'transportation services of passengers|~996415|Local water transport services of passengers by ' +
    'ferries, cru|~996416|Sightseeing transportation services by rail, land, water ' +
    'and|~996417|Transport services of passengers by ropeways|~996418|Sightseeing transportation ' +
    'services by rail or road|~996419|Other local transportation services of passengers nowhere ' +
    'el|~996421|Long-distance transport services of passengers through rail |~996422|Long-distance ' +
    'transport services of passengers through road |~996423|Taxi services including radio taxi and ' +
    'other similar service|~996424|Coastal and transoceanic (overseas) water transport ' +
    'services|~996425|Domestic/ international scheduled air transport services of |~996426|Domestic/ ' +
    'international non-scheduled air transport services|~996427|Space transport services of ' +
    'passengers|~996429|Other long-distance transportation services of passengers ' +
    'no|~996431|Long-distance transport service of passengers through rail n|~996432|Scheduled ' +
    'long-distance transport services of passengers thr|~996433|Non-scheduled long-distance transport' +
    ' services of passengers|~996434|Long-distance transport service of passengers by any motor ' +
    'v|~996439|Other long distance transport service of passengers by land |~996441|Coastal water ' +
    'transport service of passengers by ferries and|~996442|Coastal water transport service of ' +
    'passengers by cruise ship|~996443|Inland water transport service of passengers by ferries and ' +
    '|~996444|Inland water transport service of passengers by cruise ships|~996445|International ' +
    'water transport services of passengers by ferr|~996449|Other long distance transport service of ' +
    'passengers by water|~996451|Domestic scheduled air transport service of passengers in ' +
    'ec|~996452|Domestic scheduled air transport service of passengers in ot|~996453|Domestic ' +
    'non-scheduled air transport service of passengers|~996454|International scheduled air transport ' +
    'service of passengers |~996455|International scheduled air transport service of passengers ' +
    '|~996456|International non-scheduled air transport service of passeng|~996459|Other ' +
    'long-distance transportation service of passengers by |~996511|Road transport services of Goods ' +
    'including letters, parcels,|~996512|Railway transport services of Goods including letters, ' +
    'parce|~996513|Transport services of petroleum and natural gas, water, sewe|~996514|Transport ' +
    'services via pipeline of other chemicals, coal slu|~996515|Moving services of household goods, ' +
    'office equipment and fur|~996516|Road transport services of goods including letters, ' +
    'parcels,|~996517|Railway transport services of goods including letters, parce|~996518|Transport ' +
    'of goods by ropeways|~996519|Other land transport services of goods nowhere else ' +
    'classifi|~996521|Coastal and transoceanic (overseas) water transport services|~996522|Inland ' +
    'water transport services of goods by refrigerator ves|~996523|International water transport ' +
    'services of goods by refrigera|~996531|Air transport services of letters and parcels and other ' +
    'good|~996532|Space transport services of freight|~996540|Multimodal Transport of goods from a ' +
    'place in India to anoth|~996601|Rental services of road vehicles including buses, coaches, ' +
    'c|~996602|Rental services of water vessels including passenger vessels|~996603|Rental services ' +
    'of aircraft including passenger aircrafts, f|~996604|Rental services of passenger vessels with ' +
    'operator|~996605|Rental services of goods vessels with operator|~996606|Rental service of ' +
    'passenger aircraft with operator|~996607|Rental service of goods aircraft with ' +
    'operator|~996609|Rental services of other transport vehicles nowhere else cla|~9967|Supporting ' +
    'services in transport|~996711|Container handling services|~996712|Customs House Agent ' +
    'services|~996713|Clearing and forwarding services|~996719|Other cargo and baggage handling ' +
    'services|~996721|Refrigerated storage services|~996722|Bulk liquid or gas storage ' +
    'services|~996729|Other storage and warehousing services|~996731|Railway pushing or towing ' +
    'services|~996739|Other supporting services for railway transport nowhere else|~996741|Bus ' +
    'station services|~996742|Operation services of national highways, state highways, ' +
    'exp|~996743|Parking lot services|~996744|Towing services for commercial and private ' +
    'vehicles|~996749|Other supporting services for road transport nowhere else cl|~996751|Port and ' +
    'waterway operation services (excluding cargo handli|~996752|Pilotage and berthing ' +
    'services|~996753|Vessel salvage and refloating services|~996754|Maintenance, repair or overhaul ' +
    'services in respect of ships|~996759|Other supporting services for water transport nowhere else ' +
    'c|~996761|Airport operation services (excluding cargo handling)|~996762|Air traffic control ' +
    'services|~996763|Other supporting services for air transport|~996764|Supporting services for ' +
    'space transport|~996768|Other supporting services for air transport|~996769|Supporting services ' +
    'for space transport|~996791|Goods transport agency services for road transport|~996792|Goods ' +
    'transport agency services for other modes of transport|~996793|Other goods transport ' +
    'services|~996799|Other supporting transport services nowhere else classified|~996811|Postal ' +
    'services including post office counter services, mail|~996812|Courier services|~996813|Local ' +
    'delivery services|~996819|Other Delivery Services nowhere else classified|~9969|Electricity, ' +
    'gas, water and other distribution services|~996911|Electricity transmission ' +
    'services|~996912|Electricity distribution services|~996913|Gas distribution ' +
    'services|~996921|Water distribution services|~996922|Services involving distribution of steam, ' +
    'hot water and air |~996929|Other similar services|~997111|Central banking ' +
    'services|~997112|Deposit services|~997113|Credit-granting services including stand-by ' +
    'commitment, guar|~997114|Financial leasing services|~997115|Transfer of the right to use any ' +
    'goods for any purpose (whet|~997116|Any transfer of right in goods or of undivided share in ' +
    'good|~997119|Other financial services (except investment banking, insuran|~997120|Investment ' +
    'banking services|~997131|pension services|~997132|Life insurance services (excluding reinsurance' +
    ' services)|~997133|Accident and health insurance services|~997134|Motor vehicle insurance ' +
    'services|~997135|Marine, aviation, and other transport insurance services|~997136|Freight ' +
    'insurance services and travel insurance services|~997137|Other property insurance ' +
    'services|~997138|Freight insurance services and travel insurance services|~997139|Other non-life' +
    ' insurance services (excluding reinsurance ser|~997141|Life reinsurance ' +
    'services|~997142|Accident and health reinsurance services|~997143|Motor vehicle reinsurance ' +
    'services|~997144|Marine, aviation and other transport reinsurance services|~997145|Freight ' +
    'reinsurance services|~997146|Other property reinsurance services|~997147|Other property ' +
    'reinsurance services|~997149|Other non-life reinsurance services|~997151|Services related to ' +
    'investment banking such as mergers and a|~997152|Brokerage and related securities and ' +
    'commodities services in|~997153|Portfolio management services except pension funds|~997154|Trust' +
    ' and custody services|~997155|Services related to the administration of financial ' +
    'markets|~997156|Financial consultancy services|~997157|Foreign exchange ' +
    'services|~997158|Financial transactions processing and clearing house service|~997159|Other ' +
    'services auxiliary to financial services|~997161|Services auxiliary to insurance and ' +
    'pensions|~997162|Insurance claims adjustment services|~997163|Actuarial services|~997164|Pension' +
    ' fund management services|~997169|Other services auxiliary to insurance and ' +
    'pensions|~997171|Services of holding equity of subsidiary companies|~997172|Services of holding ' +
    'securities and other assets of trusts an|~9972|Real estate services|~997211|Rental or leasing ' +
    'services involving own or leased residenti|~997212|Rental or leasing services involving own or ' +
    'leased non-resid|~997213|Trade services of buildings|~997214|Trade services of time-share ' +
    'properties|~997215|Trade services of vacant and subdivided land|~997219|Other real estate ' +
    'services involving owned or leased propert|~997221|Property management services on a fee or ' +
    'commission basis or|~997222|Building sales on a fee or commission basis or on contract ' +
    'b|~997223|Land sales on a fee or commission basis or on contract basis|~997224|Real estate ' +
    'appraisal services on a fee or commission basis |~997229|Other real estate services on a fee or ' +
    'commission basis or o|~997231|Services by way of grant of development rights, FSI or ' +
    'addit|~997311|Leasing or rental services concerning transport equipments i|~997312|Leasing or ' +
    'rental services concerning agricultural machinery|~997313|Leasing or rental services concerning ' +
    'construction machinery|~997314|Leasing or rental services concerning office machinery and ' +
    'e|~997315|Leasing or rental services concerning computers without oper|~997316|Leasing or rental' +
    ' services concerning telecommunications equ|~997317|Leasing or rental services concerning other ' +
    'machinery and eq|~997318|Transfer of the right to use any goods for any purpose ' +
    '(whet|~997319|Leasing or rental services concerning other machinery and eq|~997321|Leasing or ' +
    'rental services concerning televisions, radios, v|~997322|Leasing or rental services concerning ' +
    'video tapes and disks |~997323|Leasing or rental services concerning furniture and other ' +
    'ho|~997324|Leasing or rental services concerning pleasure and leisure e|~997325|Leasing or ' +
    'rental services concerning household linen|~997326|Leasing or rental services concerning ' +
    'textiles, clothing and|~997327|Leasing or rental services concerning do-it-yourself ' +
    'machine|~997328|Transfer of the right to use any goods for any purpose (whet|~997329|Leasing or ' +
    'rental services concerning other goods|~997331|Licensing services for the right to use computer ' +
    'software an|~997332|Licensing services for the right to broadcast and show ' +
    'origi|~997333|Licensing services for the right to reproduce original art w|~997334|Licensing ' +
    'services for the right to reprint and copy manuscr|~997335|Licensing services for the right to ' +
    'use research and develop|~997336|Licensing services for the right to use trademarks and ' +
    'franc|~997337|Licensing services for the right to use minerals including i|~997338|Licensing ' +
    'services for right to use other natural resources |~997339|Licensing services for the right to ' +
    'use other intellectual p|~9981|Research and development services|~998111|Research and ' +
    'experimental development services in natural sc|~998112|Research and experimental development ' +
    'services in engineerin|~998113|Research and experimental development services in medical ' +
    'sc|~998114|Research and experimental development services in agricultur|~998121|Research and ' +
    'experimental development services in social sci|~998122|Research and experimental development ' +
    'services in humanities|~998130|Interdisciplinary research and experimental development ' +
    'serv|~998141|Research and development originals in pharmaceuticals|~998142|Research and ' +
    'development originals in agriculture|~998143|Research and development originals in ' +
    'biotechnology|~998144|Research and development originals in computer related ' +
    'scien|~998145|Research and development originals in other fields nowhere e|~998149|Research and ' +
    'development originals in other fields nowhere e|~9982|Legal and accounting ' +
    'services|~998211|Legal advisory and representation services concerning crimin|~998212|Legal ' +
    'advisory and representation services concerning other |~998213|Legal documentation and ' +
    'certification services concerning pa|~998214|Legal documentation and certification services ' +
    'concerning ot|~998215|Arbitration and conciliation services|~998216|Other legal services nowhere' +
    ' else classified|~998219|Other legal services nowhere else classified|~998221|Financial auditing' +
    ' services|~998222|Accounting and bookkeeping services|~998223|Payroll services|~998224|Other ' +
    'similar services nowhere else classified|~998229|Other similar services nowhere else ' +
    'classified|~998231|Corporate tax consulting and preparation services|~998232|Individual tax ' +
    'preparation and planning services|~998239|Other tax consultancy and preparation ' +
    'services|~998240|Insolvency and receivership services|~998311|Management consulting and ' +
    'management services including fina|~998312|Business consulting services including public ' +
    'relations serv|~998313|Information technology consulting and support ' +
    'services|~998314|Information technology design and development services|~998315|Hosting and ' +
    'information technology infrastructure provisioni|~998316|Information technology infrastructure ' +
    'and network management|~998319|Other information technology services nowhere else ' +
    'classifie|~998321|Architectural advisory services|~998322|Architectural services for residential' +
    ' building projects|~998323|Architectural services for non-residential building ' +
    'projects|~998324|Historical restoration architectural services|~998325|Urban planning ' +
    'services|~998326|Rural land planning services|~998327|Project site master planning ' +
    'services|~998328|Landscape architectural services and advisory services|~998329|Other ' +
    'architectural services, urban and land planning and la|~998331|Engineering advisory ' +
    'services|~998332|Engineering services for building projects|~998333|Engineering services for ' +
    'industrial and manufacturing projec|~998334|Engineering services for transportation ' +
    'projects|~998335|Engineering services for power projects|~998336|Engineering services for ' +
    'telecommunications and broadcasting|~998337|Engineering services for waste management projects ' +
    '(hazardou|~998338|Engineering services for other projects nowhere else classif|~998339|Project ' +
    'management services for construction projects|~998341|Geological and geophysical consulting ' +
    'services|~998342|Subsurface surveying services|~998343|Mineral exploration and ' +
    'evaluation|~998344|Surface surveying and map-making services|~998345|Weather forecasting and ' +
    'meteorological services|~998346|Technical testing and analysis services|~998347|Certification of' +
    ' ships, aircraft, dams, and the like|~998348|Certification and authentication of works of ' +
    'art|~998349|Other technical and scientific services nowhere else classif|~998351|Veterinary ' +
    'services for pet animals|~998352|Veterinary services for livestock|~998359|Other veterinary ' +
    'services nowhere else classified|~998361|Advertising Services|~998362|Sales or sale of ' +
    'advertising space or time, on commission|~998363|Sale of advertising space in print media ' +
    '(except on commissi|~998364|Sale of television and radio advertising time|~998365|Sale of ' +
    'Internet advertising space|~998366|Sale of other advertising space or time (except on ' +
    'commissio|~998371|Market research services|~998372|Public opinion polling ' +
    'services|~998381|Portrait photography services|~998382|Advertising and related photography ' +
    'services|~998383|Event photography and event videography services|~998384|Specialty photography ' +
    'services|~998385|Restoration and retouching services of photography|~998386|Photographic and ' +
    'videographic processing services|~998387|Other photography and videography and their processing ' +
    'servi|~998389|Other photography and videography and their processing servi|~998391|Specialty ' +
    'design services including interior design, fashion|~998392|Design originals|~998393|Scientific ' +
    'and technical consulting services|~998394|Original compilations of facts or ' +
    'information|~998395|Translation and interpretation services|~998396|Trademarks and ' +
    'franchises|~998397|Sponsorship services and brand promotion services|~998398|Sponsorship ' +
    'services and brand promotion services|~998399|Other professional, technical and business ' +
    'services nowhere |~9984|Telecommunications, broadcasting and information supply ' +
    'serv|~998411|Carrier services|~998412|Fixed telephony services|~998413|Mobile telecommunications' +
    ' services|~998414|Private network services|~998415|Data transmission services|~998419|Other ' +
    'telecommunications services including fax services, te|~998421|Internet backbone ' +
    'services|~998422|Internet access services in wired and wireless mode|~998423|Fax, telephony over' +
    ' the Internet|~998424|Audio conferencing and video conferencing over the Internet|~998429|Other ' +
    'internet telecommunications services nowhere else clas|~998431|On-line text based information ' +
    'such as online books, newspap|~998432|On-line audio content|~998433|On-line video ' +
    'content|~998434|Software downloads|~998435|Supply consisting only of e-book.|~998439|Other ' +
    'on-line contents nowhere else classified|~998441|News agency services to newspapers and ' +
    'periodicals|~998442|Services of independent journalists and press photographers|~998443|News ' +
    'agency services to audiovisual media|~998451|Library services|~998452|Operation services of ' +
    'public archives including digital arch|~998453|Operation services of historical archives ' +
    'including digital |~998461|Radio broadcast originals|~998462|Television broadcast ' +
    'originals|~998463|Radio channel programmes|~998464|Television channel ' +
    'programmes|~998465|Broadcasting services|~998466|Home programme distribution ' +
    'services|~998469|Other broadcasting, programming and programme distribution s|~9985|Support ' +
    'services|~998511|Executive or retained personnel search services|~998512|Permanent placement ' +
    'services, other than executive search se|~998513|Contract staffing services|~998514|Temporary ' +
    'staffing services|~998515|Long-term staffing (pay rolling) services|~998516|Temporary ' +
    'staffing-to-permanent placement services|~998517|Co-employment staffing services|~998519|Other ' +
    'employment and labour supply services nowhere else cla|~998521|Investigation ' +
    'services|~998522|Security consulting services|~998523|Security systems services|~998524|Armoured' +
    ' car services|~998525|Guard services|~998526|Training of guard dogs|~998527|Polygraph ' +
    'services|~998528|Fingerprinting services|~998529|Other security services nowhere else ' +
    'classified|~998531|Disinfecting and exterminating services|~998532|Window cleaning ' +
    'services|~998533|General cleaning services|~998534|Specialised cleaning services for reservoirs ' +
    'and tanks|~998535|Sterilisation of objects or premises (operating rooms)|~998536|Furnace and ' +
    'chimney cleaning services|~998537|Exterior cleaning of buildings of all types|~998538|Cleaning ' +
    'of transportation equipment|~998539|Other cleaning services nowhere else ' +
    'classified|~998540|Packaging services of goods for others|~998541|Parcel packing and gift ' +
    'wrapping|~998542|Coin and currency packing services|~998543|Coin and currency packing ' +
    'services|~998549|Other packaging services nowhere else classified|~998551|Reservation services ' +
    'for transportation|~998552|Reservation services for accommodation, cruises and package ' +
    '|~998553|Reservation services for convention centres, congress centre|~998554|Reservation ' +
    'services for event tickets, cinema halls, entert|~998555|Tour operator services|~998556|Tourist ' +
    'guide services|~998557|Tourism promotion and visitor information services|~998559|Other travel ' +
    'arrangement and related services nowhere else c|~998591|Credit reporting and rating ' +
    'services|~998592|Collection agency services|~998593|Telephone-based support ' +
    'services|~998594|Combined office administrative services|~998595|Specialised office support ' +
    'services such as duplicating serv|~998596|Events, Exhibitions, Conventions and trade shows ' +
    'organisatio|~998597|Landscape care and maintenance services|~998598|Other information services ' +
    'nowhere else classified|~998599|Other support services nowhere else classified|~998611|Support ' +
    'services to crop production|~998612|Animal husbandry services|~998613|Support services to ' +
    'hunting|~998614|Support services to forestry and logging|~998615|Support services to ' +
    'fishing|~998619|Other support services to agriculture, hunting, forestry and|~998621|Support ' +
    'services to oil and gas extraction|~998622|Support services to other mining nowhere else ' +
    'classified|~998631|Support services to electricity transmission and distributio|~998632|Support ' +
    'services to gas distribution|~998633|Support services to water distribution|~998634|Support ' +
    'services to Distribution services of steam, hot wate|~998635|Other support services to ' +
    'electricity , gas and water distri|~9987|Maintenance, repair and installation (except ' +
    'construction) s|~998711|Maintenance and repair services of fabricated metal ' +
    'products|~998712|Maintenance and repair services of office and accounting ' +
    'mac|~998713|Maintenance and repair services of computers and peripheral |~998714|Maintenance and' +
    ' repair services of transport machinery and e|~998715|Maintenance and repair services of ' +
    'electrical household appl|~998716|Maintenance and repair services of telecommunication ' +
    'equipme|~998717|Maintenance and repair services of commercial and industrial|~998718|Maintenance' +
    ' and repair services of elevators and escalators|~998719|Maintenance and repair services of ' +
    'other machinery and equip|~998721|Repair services of footwear and leather goods|~998722|Repair ' +
    'services of watches, clocks and jewellery|~998723|Repair services of garments and household ' +
    'textiles|~998724|Repair services of furniture|~998725|Repair services of ' +
    'bicycles|~998726|Maintenance and repair services of musical instruments|~998727|Repair services ' +
    'for photographic equipment and cameras|~998729|Maintenance and repair services of other goods ' +
    'nowhere else |~998731|Installation services of fabricated metal products, except ' +
    'm|~998732|Installation services of industrial, manufacturing and servi|~998733|Installation ' +
    'services of office and accounting machinery and|~998734|Installation services of radio, ' +
    'television and communication|~998735|Installation services of professional medical machinery and' +
    ' |~998736|Installation services of electrical machinery and apparatus |~998739|Installation ' +
    'services of other goods nowhere else classified|~998811|Meat processing services|~998812|Fish ' +
    'processing services|~998813|Fruit and vegetables processing services|~998814|Vegetable and ' +
    'animal oil and fat manufacturing services|~998815|Dairy product manufacturing ' +
    'services|~998816|Other food product manufacturing services|~998817|Prepared animal feeds ' +
    'manufacturing services|~998818|Beverage manufacturing services|~998819|Tobacco manufacturing ' +
    'services nowhere else classified|~998821|Textile manufacturing services|~998822|Wearing apparel ' +
    'manufacturing services|~998823|Leather and leather product manufacturing ' +
    'services|~998829|Textile, wearing apparel and leather manufacturing services |~998831|Wood and ' +
    'wood product manufacturing services|~998832|Paper and paper product manufacturing ' +
    'services|~998839|Wood and paper manufacturing services other than services by|~998841|Coke and ' +
    'refined petroleum product manufacturing services|~998842|Chemical product manufacturing ' +
    'services|~998843|Pharmaceutical product manufacturing services|~998849|Petroleum, chemical and ' +
    'pharmaceutical products manufacturin|~998851|Rubber and plastic product manufacturing ' +
    'services|~998852|Plastic product manufacturing services|~998853|Other non-metallic mineral ' +
    'product manufacturing services|~998859|Rubber, plastic and other non-metallic mineral product ' +
    'manuf|~998860|Basic metal manufacturing services|~998861|Services by way of job work in relation' +
    ' to basic metals|~998869|Basic metal manufacturing services, other than services by ' +
    'w|~998871|Structural metal product, tank, reservoir and steam generato|~998872|Weapon and ' +
    'ammunition manufacturing services|~998873|Other fabricated metal product manufacturing and metal' +
    ' treat|~998874|Computer, electronic and optical product manufacturing servi|~998875|Electrical ' +
    'equipment manufacturing services|~998876|General-purpose machinery manufacturing services ' +
    'nowhere els|~998877|Special-purpose machinery manufacturing services|~998879|Fabricated metal ' +
    'product, machinery and equipment manufactur|~998881|Motor vehicle and trailer manufacturing ' +
    'services|~998882|Other transport equipment manufacturing services|~998883|Services by way of job' +
    ' work in relation to bus body building|~998889|Transport equipment manufacturing services, other' +
    ' than job w|~998891|Furniture manufacturing services|~998892|Jewellery manufacturing ' +
    'services|~998893|Imitation jewellery manufacturing services|~998894|Musical instrument ' +
    'manufacturing services|~998895|Sports goods manufacturing services|~998896|Game and toy ' +
    'manufacturing services|~998897|Medical and dental instrument and supply manufacturing ' +
    'servi|~998898|Other manufacturing services nowhere else classified|~998899|Other manufacturing ' +
    'services nowhere else classified|~9989|Other manufacturing services; publishing, printing and ' +
    'repro|~998911|Publishing, on a fee or contract basis|~998912|Printing and reproduction services ' +
    'of recorded media, on a f|~998920|Moulding, pressing, stamping, extruding and similar plastic ' +
    '|~998931|Iron and steel casting services|~998932|Non-ferrous metal casting ' +
    'services|~998933|Metal forging, pressing, stamping, roll forming and powder m|~998941|Metal ' +
    'waste and scrap recovery (recycling) services, on a fe|~998942|Non-metal waste and scrap ' +
    'recovery (recycling) services, on |~998950|Other manufacturing services, publishing, printing ' +
    'and repro|~9991|Public administration and other services provided to the com|~999111|Overall ' +
    'Government public services|~999112|Public administrative services related to the provision of ' +
    'e|~999113|Public administrative services related to the more efficient|~999119|Other ' +
    'administrative services of the government nowhere else|~999121|Public administrative services ' +
    'related to External Affairs, |~999122|Services related to foreign economic aid|~999123|Services ' +
    'related to foreign military aid|~999124|Military defence services|~999125|Civil defence ' +
    'services|~999126|Police and fire protection services|~999127|Public administrative services ' +
    'related to law courts|~999128|Administrative services related to the detention or ' +
    'rehabili|~999129|Public administrative services related to other public ' +
    'order|~999131|Administrative services related to sickness, maternity or ' +
    'te|~999132|Administrative services related to government employee pensi|~999133|Administrative ' +
    'services related to unemployment compensation|~999134|Administrative services related to family ' +
    'and child allowanc|~999139|Other administrative services related to compulsory social ' +
    's|~9992|Education services|~999210|Pre-primary education services|~999220|Primary education ' +
    'services|~999231|Secondary education services, general|~999232|Secondary education services, ' +
    'technical and vocational|~999241|Higher education services, general|~999242|Higher education ' +
    'services, technical|~999243|Higher education services, vocational|~999249|Other higher education' +
    ' services|~999250|Specialised education services|~999259|Specialised education ' +
    'services|~999291|Cultural education services|~999292|Sports and recreation education ' +
    'services|~999293|Commercial training and coaching services|~999294|Other education and training ' +
    'services nowhere else classifie|~999295|services involving conduct of examination for admission ' +
    'to e|~999299|Other Educational support services|~9993|Human health and social care ' +
    'services|~999311|Inpatient services|~999312|Medical and dental services|~999313|Childbirth and ' +
    'related services|~999314|Nursing and physiotherapeutic services|~999315|Ambulance ' +
    'services|~999316|Medical laboratory and diagnostic-imaging services|~999317|Blood, sperm and ' +
    'organ bank services|~999318|Blood, sperm and organ bank services|~999319|Other human health ' +
    'services including homeopathy, unani, ayu|~999321|Residential health-care services other than by' +
    ' hospitals|~999322|Residential care services for the elderly and persons with ' +
    'd|~999331|Residential care services for children suffering from mental|~999332|Other social ' +
    'services with accommodation for children|~999333|Residential care services for adults suffering ' +
    'from mental r|~999334|Other social services with accommodation for adults|~999341|Vocational ' +
    'rehabilitation services|~999349|Other social services without accommodation for the elderly ' +
    '|~999351|Child day-care services|~999352|Guidance and counseling services nowhere else ' +
    'classified rel|~999353|Welfare services without accommodation|~999359|Other social services ' +
    'without accommodation nowhere else cla|~999411|Sewerage and sewage treatment ' +
    'services|~999412|Septic tank emptying and cleaning services|~999413|Septic tank emptying and ' +
    'cleaning services|~999419|Other sewerage, sewage treatment and septic tank cleaning ' +
    'se|~999421|Collection services of hazardous waste|~999422|Collection services of non-hazardous ' +
    'recyclable materials|~999423|General waste collection services, residential|~999424|General ' +
    'waste collection services, other nowhere else classi|~999429|Other sewage and waste collection ' +
    'services|~999431|Waste preparation, consolidation and storage services|~999432|Hazardous waste ' +
    'treatment and disposal services|~999433|Non-hazardous waste treatment and disposal ' +
    'services|~999439|Other waste treatment and disposal services|~999441|Site remediation and ' +
    'clean-up services|~999442|Containment, control and monitoring services and other site ' +
    '|~999443|Building remediation services|~999449|Other remediation services nowhere else ' +
    'classified|~999451|Sweeping and snow removal services|~999459|Other sanitation services nowhere ' +
    'else classified|~999490|Other environmental protection services nowhere else ' +
    'classif|~999491|Services by way of treatment or disposal of biomedical waste|~999499|Other ' +
    'environmental protection services nowhere else classif|~9995|Services of membership ' +
    'organisations|~999511|Services furnished by business and employers ' +
    'organisations|~999512|Services furnished by professional organisations|~999520|Services ' +
    'furnished by trade unions|~999591|Religious services|~999592|Services furnished by political ' +
    'organisations|~999593|Services furnished by human rights organisations|~999594|Cultural and ' +
    'recreational associations|~999595|Services furnished by environmental advocacy ' +
    'groups|~999596|Services provided by youth associations|~999597|Other civic and social ' +
    'organisations|~999598|Home owners associations|~999599|Services provided by other membership ' +
    'organisations nowhere |~999611|Sound recording services|~999612|Motion picture, videotape, ' +
    'television and radio programme pr|~999613|Audiovisual post-production services|~999614|Motion ' +
    'picture, videotape and television programme distribut|~999615|Motion picture projection ' +
    'services|~999616|Services by way of admission to exhibition of cinematograph |~999617|Services ' +
    'by way of admission to exhibition of cinematograph |~999621|Performing arts event promotion and ' +
    'organisation services|~999622|Performing arts event production and presentation ' +
    'services|~999623|Performing arts facility operation services|~999624|Services by way of ' +
    'admission or access to circus, Indian cla|~999629|Other performing arts and live entertainment ' +
    'services nowher|~999631|Services of performing artists including actors, readers, ' +
    'mu|~999632|Services of authors, composers, sculptors and other artists,|~999633|Original works ' +
    'of authors, composers and other artists excep|~999641|Museum and preservation services of ' +
    'historical sites and bui|~999642|Botanical, zoological and nature reserve ' +
    'services|~999651|Sports and recreational sports event promotion and organisat|~999652|Sports and' +
    ' recreational sports facility operation services|~999653|Services by way of admission to ' +
    'sporting events like Indian |~999659|Other sports and recreational sports services nowhere else ' +
    'c|~999661|Services of athletes|~999662|Support services related to sports and ' +
    'recreation|~999691|Amusement park and similar attraction services|~999692|Coin-operated ' +
    'amusement machine services|~999693|Coin-operated amusement machine services|~999694|Services by ' +
    'way of admission to casinos or race clubs or any|~999699|Other recreation and amusement services' +
    ' nowhere else classif|~999711|Coin-operated laundry services|~999712|Dry-cleaning services ' +
    '(including fur product cleaning servic|~999713|Other textile cleaning services|~999714|Pressing ' +
    'services|~999715|Dyeing and colouring services|~999719|Other washing, cleaning and dyeing ' +
    'services nowhere else cla|~999721|Hairdressing and barbers services|~999722|Cosmetic treatment ' +
    '(including cosmetic or plastic surgery), |~999723|Physical well-being services including health ' +
    'club and fitne|~999729|Other beauty treatment services nowhere else ' +
    'classified|~999731|Cemeteries and cremation services|~999732|Undertaking ' +
    'services|~999791|Services involving commercial use or exploitation of any eve|~999792|Agreeing ' +
    'to do an act|~999793|Agreeing to refrain from doing an act|~999794|Agreeing to tolerate an ' +
    'act|~999795|Conduct of religious ceremonies or rituals by persons|~999799|Other services nowhere' +
    ' else classified|~9998|Domestic services|~999800|Domestic services both part time and full ' +
    'time|~9999|Services provided by extraterritorial organisations and bodi|~999900|Services ' +
    'provided by extraterritorial organisations and bodi|~996541|Multimodal Transport of goods from a' +
    ' place in India to anoth|'
  , ['id','desc','rate']).map(h => ({...h, name:h.desc ? `${h.id} — ${h.desc}` : h.id,
    kind:h.id.length === 6 && h.id.startsWith('99') ? 'sac' : 'hsn'}));

/* --- the company's own two switches ----------------------------------------
   These are company-level settings in the product, not ledger fields, but they
   decide which fields a ledger has at all — so a ledger form that cannot see
   them is a form that asks the wrong questions. Both are off, which is the
   state the sheet describes as the starting one. ⌃⇧D turns them on without a
   rebuild, because "what does this look like with multi-currency" is a
   question that gets asked of a prototype and should not need a code change. */
const COMPANY = {
  /* The onboarded company. A bank ledger's account holder is this by default,
     because the account being described is ours. */
  name:'Karbon Business',
  multiCurrency:false,   /* off: currency is stored as INR and never asked */
  costCentre:false,      /* off: "Cost centres are applicable" is not asked  */
  baseCurrency:'INR',
  /* Opening balances are stated as at the company's creation date, so the form
     says which date it means rather than leaving the number undated. */
  booksFrom:'1 Apr 2025',
  /* Ours, and they matter on a sales invoice in a way they never did on a
     sales invoice: raising an invoice makes this book the deductee, so the
     rate the customer will withhold at is decided by our own status. A company
     takes the plain 194C rate; an individual or HUF would take the lower one. */
  pan:'AAFCK1234M',
  deductee:'company'
};

/* --- what this user is allowed to do ----------------------------------------
   One permission, because there is one act on this sheet that writes something
   outliving the invoice: creating a master in the chart of accounts. Everything
   else here edits a voucher, and a voucher is what this screen is for.

   The line the permission draws is between *seeing* and *doing*, and it is
   drawn that way deliberately. A reviewer without create rights still gets
   every prediction, every reason and every `New` tag, because the sheet's
   reading of the invoice is not a privilege — it is the information they need in
   order to ask somebody else for the master. What they lose is the tick that
   would write it, the `+` that opens the form, and the way out of a picker.
   Hiding the suggestion instead would leave them looking at an unmapped line
   with nothing to say about it, which helps nobody and hides the backlog.

   Set to false and reload to see that sheet. It is the same invoice, the same
   seven proposals and the same seven reasons — with no way to act on them and
   the confirmation saying so. */
const PERMS = { chartOfAccountsCreate:true };
const canCreate = ()=>PERMS.chartOfAccountsCreate===true;
/* What to say when the answer is no. One sentence, carried by whatever was
   barred, so the control explains itself rather than failing silently. */
const NO_CREATE = 'You do not have Create permission on the chart of accounts.';

/* What a create control wears when the right is missing — in one place, so the
   five of them cannot drift apart.

   `disabled` is not among these attributes, and that is deliberate. A disabled
   button fires no mouse events, so the sentence above never reached the
   pointer: the title was in the markup and unreachable, which is indis-
   tinguishable from no explanation at all. It is also skipped by the tab key,
   so the keyboard lost the sentence too. `aria-disabled` states the same fact
   to assistive tech, keeps the control hoverable and focusable, and the press
   is refused in script — see the guard below.

   `title` stays as the floor. If the tip's script never runs, the native
   tooltip is still there, late and ugly but present. */
const barredAttrs = ()=> canCreate() ? ''
  : ` aria-disabled="true" data-barred title="${esc(NO_CREATE)}"`;

/* --- the chart of accounts, as groups --------------------------------------
   Tally's twenty-eight, with the four Primary pseudo-groups the sheet asks
   for. `profile` is which set of questions a ledger under this group gets —
   the whole point of the form. Sub-groups are indented in the picker rather
   than filed in a second dropdown, because "Under" is one question. */
const GROUP_TREE = [
  ['Capital Account',           '',                    'balance' ],
  ['Reserves & Surplus',        'Capital Account',     'balance' ],
  ['Loans (Liability)',         '',                    'assetliab'],
  ['Bank OD A/c',               'Loans (Liability)',   'bank'    ],
  ['Secured Loans',             'Loans (Liability)',   'assetliab'],
  ['Unsecured Loans',           'Loans (Liability)',   'assetliab'],
  ['Current Liabilities',       '',                    'assetliab'],
  ['Duties & Taxes',            'Current Liabilities', 'duties'  ],
  ['Provisions',                'Current Liabilities', 'assetliab'],
  ['Sundry Creditors',        'Current Liabilities', 'party'   ],
  ['Fixed Assets',              '',                    'assetliab'],
  ['Investments',               '',                    'assetliab'],
  ['Current Assets',            '',                    'assetliab'],
  ['Bank Accounts',             'Current Assets',      'bank'    ],
  ['Cash-in-Hand',              'Current Assets',      'cash'    ],
  ['Deposits (Asset)',          'Current Assets',      'balance' ],
  ['Loans & Advances (Asset)',  'Current Assets',      'assetliab'],
  ['Stock-in-Hand',             'Current Assets',      'stock'   ],
  ['Sundry Debtors',            'Current Assets',      'party'   ],
  ['Suspense A/c',              '',                    'balance' ],
  ['Branch / Divisions',        '',                    'balance' ],
  ['Misc. Expenses (ASSET)',    '',                    'assetliab'],
  ['Sales Accounts',            '',                    'pl'      ],
  ['Purchase Accounts',         '',                    'pl'      ],
  ['Direct Income',             '',                    'pl'      ],
  ['Indirect Income',           '',                    'pl'      ],
  ['Direct Expenses',           '',                    'pl'      ],
  ['Indirect Expenses',         '',                    'pl'      ],
  /* The four the sheet's own group column asks for. Tally's chart has
     twenty-eight; these are the primaries a ledger can be filed directly
     against, and they are marked so nothing tries to predict one — "Primary
     (Expense)" is where a ledger goes when no real group fits, which is never
     a guess worth making on an invoice's behalf. */
  ['Primary (Asset)',           '',                    'assetliab', true],
  ['Primary (Liability)',       '',                    'assetliab', true],
  ['Primary (Expense)',         '',                    'pl',        true],
  ['Primary (Income)',          '',                    'pl',        true]
].map(([name,parent,profile,primary])=>({id:name, name, parent, profile, primary:!!primary}));

/* The groups this book has made for itself, each under one of the twenty-eight.
   Tally allows sub-groups and this book uses them: its income ledgers are
   filed by nature of payment, which is a real filing and not a substitute for
   the chart. Naming the parent here is what lets a sub-group inherit a profile,
   sit under its parent in the picker, and be reached by a prediction that
   reasons in the chart's own terms. */
const BOOK_SUBGROUPS = {
  'Contracted work':'Sales Accounts', 'Professional':'Sales Accounts',
  'Rent & finance':'Indirect Income',  'No TDS':'Sales Accounts',
  'Blocked credit — s.17(5)':'Indirect Expenses', 'Other reasons':'Indirect Expenses',
  'Notified supplies — s.9(3)':'Duties & Taxes',
  'Unregistered supplier — s.9(4)':'Duties & Taxes',
  'Import — IGST s.5(3)':'Duties & Taxes'
};

const GROUP_BY_NAME = Object.fromEntries(GROUP_TREE.map(g=>[g.name,g]));
/* Tally's twenty-eight, which is the whole set a prediction may choose from.
   The primaries are excluded on purpose and the book's own sub-groups are not
   in here — a sub-group is reached by refining one of these, never instead. */
const TALLY_GROUPS = GROUP_TREE.filter(g=>!g.primary);
/* Whichever of the twenty-eight a group ultimately sits under. A sub-group
   answers with its parent; one of the twenty-eight answers with itself. */
const tallyParentOf = g => BOOK_SUBGROUPS[g] || (GROUP_BY_NAME[g] ? g : '');

/* Two exceptions the sheet states as prose rather than as a profile, and they
   are narrower than a profile: a group, not a shape.

   Reserves & Surplus and Suspense A/c sit in the same profile as Capital
   Account but hold no registration — and Investments, Misc. Expenses and
   Provisions sit in the same profile as Current Assets but hold none either.
   Neither is a different kind of ledger; each is a ledger that is nobody. */
const NO_GST_REG = ['Reserves & Surplus','Suspense A/c',
                    'Investments','Misc. Expenses (ASSET)','Provisions'];
/* "Behave as Duties & Taxes" is only offered where the sheet offers it. Any
   group can hold a ledger; only these can hold one that withholds. */
const DUTIES_FLAG_GROUPS = ['Current Assets','Current Liabilities',
                            'Primary (Asset)','Primary (Liability)',
                            'Direct Expenses','Indirect Expenses',
                            'Sales Accounts','Primary (Expense)'];

const MASTERS = {
  states:STATES,
  currencies:CURRENCIES,
  bankNames:BANK_NAMES,
  countriesFull:COUNTRIES_FULL,
  gstTreatmentsFull:GST_TREATMENTS_FULL,
  deducteeTypes:DEDUCTEE_TYPES,
  naturePayments:NATURE_PAYMENTS,
  natureGoods:NATURE_GOODS,
  hsnSac:HSN_SAC,
  groups:GROUP_TREE,

  /* the two lookups the optional groups need and nothing else does — a
     consignee can sit outside India, and an import states the port it
     cleared through */
  countries:[
    {id:'IN',name:'India'},{id:'AE',name:'United Arab Emirates'},{id:'AU',name:'Australia'},
    {id:'CN',name:'China'},{id:'DE',name:'Germany'},{id:'HK',name:'Hong Kong'},
    {id:'JP',name:'Japan'},{id:'KR',name:'South Korea'},{id:'MY',name:'Malaysia'},
    {id:'NL',name:'Netherlands'},{id:'SG',name:'Singapore'},{id:'GB',name:'United Kingdom'},
    {id:'US',name:'United States'},{id:'VN',name:'Vietnam'}
  ],

  ports:[
    {id:'INNSA1',name:'INNSA1 — Nhava Sheva (Sea)'},{id:'INMUN1',name:'INMUN1 — Mundra (Sea)'},
    {id:'INMAA1',name:'INMAA1 — Chennai (Sea)'},    {id:'INCOK1',name:'INCOK1 — Cochin (Sea)'},
    {id:'INBOM4',name:'INBOM4 — Mumbai (Air)'},     {id:'INDEL4',name:'INDEL4 — Delhi (Air)'},
    {id:'INMAA4',name:'INMAA4 — Chennai (Air)'},    {id:'INBLR4',name:'INBLR4 — Bengaluru (Air)'},
    {id:'INHYD4',name:'INHYD4 — Hyderabad (Air)'}
  ],

  /* address and pincode are here for the consignee picker: a ship-to on a
     sales is one of our own locations, so choosing it fills the rest */
  branches:[
    {id:'br-ka',name:'Karbon Business — Karnataka (29)',   gstin:'29AAFCK1234M1Z5',state:'KA',
     address:'Ground Floor, 27th Main, HSR Layout Sector 2, Bengaluru',pin:'560102'},
    {id:'br-mh',name:'Karbon Business — Maharashtra (27)', gstin:'27AAFCK1234M1Z1',state:'MH',
     address:'Unit 402, Trade Centre, Bandra Kurla Complex, Mumbai',pin:'400051'},
    {id:'br-tn',name:'Karbon Business — Tamil Nadu (33)',  gstin:'33AAFCK1234M1ZB',state:'TN',
     address:'2nd Floor, Rajiv Gandhi Salai, Perungudi, Chennai',pin:'600096'},
    {id:'br-dl',name:'Karbon Business — Delhi (07)',       gstin:'07AAFCK1234M1ZH',state:'DL',
     address:'A-14, Okhla Industrial Area Phase II, New Delhi',pin:'110020'},
    {id:'br-gj',name:'Karbon Business — Gujarat (24)',     gstin:'24AAFCK1234M1ZO',state:'GJ',
     address:'Block C, Sarkhej-Gandhinagar Highway, Ahmedabad',pin:'380054'},
    {id:'br-tg',name:'Karbon Business — Telangana (36)',   gstin:'36AAFCK1234M1Z4',state:'TG',
     address:'Level 5, Raheja Mindspace, HITEC City, Hyderabad',pin:'500081'}
  ],

  voucherTypes:[
    {id:'sales',    name:'Sales',                   prefix:'SAL'},
    {id:'sales-imp',name:'Sales — Export',          prefix:'SEXP'},
    {id:'sales-sez',name:'Sales — SEZ',             prefix:'SSEZ'},
    {id:'sales-ret',name:'Sales Return',            prefix:'SRET'},
    /* A credit note, not a debit note: on this side of the transaction it is
       us issuing the adjustment, not receiving one. */
    {id:'credit-note', name:'Credit Note',             prefix:'CN'}
  ],

  gstTreatments:[
    {id:'registered',  name:'Registered Business'},
    {id:'unregistered',name:'Unregistered Business'},
    {id:'composition', name:'Composition Dealer'},
    {id:'sez',         name:'SEZ Unit'},
    {id:'overseas',    name:'Overseas / Export'}
  ],

  /* deductee type is kept for the ledger shape; a missing PAN on the buyer
     forces 1% TCS u/s 206CC.
     fyGoods / fyServices are what is already booked against the customer this
     financial year — they drive the TDS threshold tests. */
  /* The book's customers. `deductee` is kept on the record because the master
     is still a party ledger and the field is part of that shape — but nothing
     on a sales invoice reads it any more: the entity type that decides a TDS
     rate is ours now, not theirs, and it lives on COMPANY. What their PAN
     still decides is TCS, where s.206CC collects at 1% from a buyer who has
     not furnished one.

     fyGoods / fyServices are what this customer has already been invoiced this
     financial year. They drive both thresholds — the 206C(1H) test we compute
     ourselves, and the aggregate the customer measures their own deduction
     against. */
  customers:[
    {id:'v-technova',name:'Technova Systems LLP',        group:'Karnataka',  gstin:'29AAGFT1122R1Z8',pan:'AAGFT1122R',state:'KA',credit:15,ledger:'led-sales-local',treatment:'registered',deductee:'company',   address:'#7, 4th Cross, Koramangala Industrial Layout, Bengaluru — 560034',fyGoods:4920000,fyServices:0},
    {id:'v-sunrise', name:'Sunrise Retail Ventures Pvt Ltd',group:'Karnataka',gstin:'29AACCS8899P1ZQ',pan:'AACCS8899P',state:'KA',credit:30,ledger:'led-sales-local',treatment:'registered',deductee:'company',   address:'14, Nandidurga Road, Benson Town, Bengaluru — 560046',fyGoods:860000,fyServices:0},
    {id:'v-globe',   name:'Globe Logistics & Freight',   group:'Karnataka',  gstin:'29AABCG3344H1ZP',pan:'AABCG3344H',state:'KA',credit:7, ledger:'led-sales-local',treatment:'registered',deductee:'company',   address:'Gate 3, Air Cargo Complex, Devanahalli, Bengaluru — 562110',fyGoods:0,fyServices:640000},
    {id:'v-meridian',name:'Meridian Hospitals Pvt Ltd',  group:'Karnataka',  gstin:'29AAECM7712J1ZD',pan:'AAECM7712J',state:'KA',credit:30,ledger:'led-sales-local',treatment:'registered',deductee:'company',   address:'Unit 4, Jakkasandra Extension, Bengaluru — 560034',fyGoods:0,fyServices:1450000},
    {id:'v-infinite',name:'Infinite Cloud Services',     group:'Karnataka',  gstin:'29AAFCI5590K1ZM',pan:'AAFCI5590K',state:'KA',credit:30,ledger:'led-sales-local',treatment:'registered',deductee:'company',   address:'Level 9, Prestige Tech Park, Marathahalli, Bengaluru — 560103',fyGoods:0,fyServices:2400000},
    {id:'v-samhita', name:'Samhita Realty Holdings',     group:'Karnataka',  gstin:'29AAJCS2201F1ZT',pan:'AAJCS2201F',state:'KA',credit:5, ledger:'led-sales-local',treatment:'registered',deductee:'company',   address:'Samhita House, Residency Road, Bengaluru — 560025',fyGoods:0,fyServices:1800000},
    {id:'v-lakshmi', name:'Lakshmi Educational Trust',   group:'Karnataka',  gstin:'29AAFFL9087C1ZB',pan:'AAFFL9087C',state:'KA',credit:7, ledger:'led-sales-local',treatment:'registered',deductee:'firm',      address:'22, 8th Main, Jayanagar 3rd Block, Bengaluru — 560011',fyGoods:0,fyServices:340000},
    {id:'v-nirmala', name:'Nirmala Enterprises',         group:'Karnataka',  gstin:'29AKPPN4471L1ZS',pan:'AKPPN4471L',state:'KA',credit:15,ledger:'led-sales-local',treatment:'registered',deductee:'individual',address:'56/2, Magadi Main Road, Bengaluru — 560079',fyGoods:180000,fyServices:120000},
    {id:'v-ecoclean',name:'EcoClean Industries',         group:'Karnataka',  gstin:'29AAGFE1180N1ZX',pan:'AAGFE1180N',state:'KA',credit:15,ledger:'led-sales-local',treatment:'registered',deductee:'firm',      address:'9, Sarjapur Road, Bengaluru — 560035',fyGoods:0,fyServices:62000},
    /* No PAN on file — s.206CC collects TCS at 1% instead of 0.1%, which is
       the mirror of the 206AA case this record used to demonstrate. */
    {id:'v-prakash', name:'Prakash Transport Co',        group:'Karnataka',  gstin:'29AAHFP6620E1ZG',pan:'',          state:'KA',credit:10,ledger:'led-sales-local',treatment:'registered',deductee:'firm',      address:'Yard 2, Peenya Industrial Area, Bengaluru — 560058',fyGoods:0,fyServices:95000},
    {id:'v-bluepeak',name:'BluePeak Interiors',          group:'Karnataka',  gstin:'29AAOFB3345M1ZK',pan:'AAOFB3345M',state:'KA',credit:20,ledger:'led-sales-exempt',treatment:'composition',deductee:'firm',     address:'44, Infantry Road, Bengaluru — 560001',fyGoods:210000,fyServices:0},
    {id:'v-kiran',   name:'Kiran Associates (Consultants)',group:'Karnataka',gstin:'',               pan:'AFZPK7190K',state:'KA',credit:15,ledger:'led-sales-local',  treatment:'unregistered',deductee:'individual',address:'202, Shanti Nilaya, Jayanagar 4th Block, Bengaluru — 560011',fyGoods:0,fyServices:210000},
    {id:'v-anand',   name:'Anand Paper Mills Ltd',       group:'Maharashtra',gstin:'27AAECA5566L1ZK',pan:'AAECA5566L',state:'MH',credit:45,ledger:'led-sales-inter',treatment:'registered',deductee:'company',   address:'Plot 18, MIDC Taloja, Navi Mumbai — 410208',fyGoods:4870000,fyServices:0},
    {id:'v-cygnus',  name:'Cygnus Media Networks',       group:'Maharashtra',gstin:'27AADCC9931B1ZL',pan:'AADCC9931B',state:'MH',credit:30,ledger:'led-sales-inter',treatment:'registered',deductee:'company',   address:'Unit 6, Andheri East, Mumbai — 400093',fyGoods:1240000,fyServices:0},
    {id:'v-orient',  name:'Orient Hardware Traders',     group:'Tamil Nadu', gstin:'33AAFFO7788K1ZR',pan:'AAFFO7788K',state:'TN',credit:21,ledger:'led-sales-inter',treatment:'registered',deductee:'firm',      address:'62, NSC Bose Road, Parrys, Chennai — 600001',fyGoods:980000,fyServices:0},
    {id:'v-arka',    name:'Arka Renewables Pvt Ltd',     group:'Tamil Nadu', gstin:'33AAGCA4412P1ZC',pan:'AAGCA4412P',state:'TN',credit:60,ledger:'led-sales-inter',treatment:'registered',deductee:'company',   address:'SIPCOT Phase II, Hosur — 635109',fyGoods:0,fyServices:1120000},
    {id:'v-falcon',  name:'Falcon Components (SEZ Unit)',group:'Tamil Nadu', gstin:'33AAECF2098D1ZW',pan:'AAECF2098D',state:'TN',credit:30,ledger:'led-sales-sez',  treatment:'sez',        deductee:'company',   address:'MEPZ SEZ, Tambaram, Chennai — 600045',fyGoods:640000,fyServices:0},
    {id:'v-vertex',  name:'Vertex Legal LLP',            group:'Delhi',      gstin:'07AAJFV8802Q1ZY',pan:'AAJFV8802Q',state:'DL',credit:30,ledger:'led-sales-inter',treatment:'registered',deductee:'firm',      address:'Suite 400, Barakhamba Road, New Delhi — 110001',fyGoods:0,fyServices:860000},
    {id:'v-shakti',  name:'Shakti Power Systems',        group:'Gujarat',    gstin:'24AACCS1123R1ZE',pan:'AACCS1123R',state:'GJ',credit:45,ledger:'led-sales-inter',treatment:'registered',deductee:'company',   address:'Block C, GIDC Vatva, Ahmedabad — 382445',fyGoods:2260000,fyServices:0},
    {id:'v-dhanraj', name:'Dhanraj Metals & Alloys',     group:'Gujarat',    gstin:'24AABCD6654F1ZN',pan:'AABCD6654F',state:'GJ',credit:30,ledger:'led-sales-inter',treatment:'registered',deductee:'company',   address:'Survey 210, Kutch Industrial Estate, Bhuj — 370001',fyGoods:5140000,fyServices:0},
    {id:'v-quantum', name:'Quantum Analytics Pvt Ltd',   group:'Telangana',  gstin:'36AAECQ7745H1ZV',pan:'AAECQ7745H',state:'TG',credit:30,ledger:'led-sales-inter',treatment:'registered',deductee:'company',   address:'Cyber Gateway, HITEC City, Hyderabad — 500081',fyGoods:0,fyServices:1960000},
    /* An export customer. No GSTIN and no PAN, so nothing is withheld either
       way — an export is zero-rated and 206C(1H) does not reach a buyer
       outside India. */
    {id:'v-globaltech',name:'Global Tech Distribution Pte Ltd',group:'Overseas',gstin:'',           pan:'',          state:'OT',credit:60,ledger:'led-sales-import',treatment:'overseas',   deductee:'company',   address:'138 Cecil Street, #12-01, Singapore 069538',fyGoods:3200000,fyServices:0}
  ],

  /* --- what each party still owes or is owed, reference by reference --------
     A ledger that maintains balances bill by bill does not carry a balance —
     it carries a list, and every voucher that touches the party has to say
     which entries on that list it moves and by how much. This is the list as
     the book holds it on the morning the sheet opens.

     `pending` is what is left on the reference, which is not always what it
     was raised for. `side` is which way it leans, and it is the only field
     that decides what a new voucher may do with it: Cr is money already held
     for the customer — an advance they paid, a credit note we raised — and so
     is what a new invoice can knock off; Dr is an invoice still waiting to be
     paid, and a second invoice cannot settle it.

     Most parties carry nothing, which is the ordinary case and the one the
     sample invoice lands on: an invoice from a party with no history is one new
     reference for the whole amount, and the dialog opens with it written. */
  billRefs:{
    'v-technova':[
      {id:'br-tech-adv', name:'ADV/TECH/2026/07', date:'2026-06-12', dueDate:'',           amount:120000, pending:120000, kind:'advance', side:'Cr'},
      {id:'br-tech-b88', name:'SAL/26-27/0188',   date:'2026-06-30', dueDate:'2026-07-15', amount:246800, pending:246800, kind:'invoice',    side:'Dr'}
    ],
    'v-sunrise':[
      {id:'br-sun-dn',   name:'CN/SAL/2026/014',  date:'2026-07-05', dueDate:'',           amount:4720,   pending:4720,   kind:'note',    side:'Cr'}
    ],
    'v-globe':[
      {id:'br-glb-b87',  name:'SAL/26-27/1187',   date:'2026-08-01', dueDate:'2026-08-08', amount:18900,  pending:18900,  kind:'invoice',    side:'Dr'}
    ],
    'v-meridian':[
      {id:'br-mfs-adv',  name:'ADV/MER/AUG',      date:'2026-08-01', dueDate:'',           amount:45000,  pending:45000,  kind:'advance', side:'Cr'}
    ],
    'v-infinite':[
      {id:'br-ics-adv',  name:'ADV/ICS/Q2',       date:'2026-07-01', dueDate:'',           amount:60000,  pending:60000,  kind:'advance', side:'Cr'}
    ],
    'v-anand':[
      {id:'br-apm-421',  name:'SAL/26-27/0421',   date:'2026-06-18', dueDate:'2026-08-02', amount:512000, pending:512000, kind:'invoice',    side:'Dr'},
      {id:'br-apm-455',  name:'SAL/26-27/0455',   date:'2026-07-09', dueDate:'2026-08-23', amount:318400, pending:190000, kind:'invoice',    side:'Dr'}
    ],
    'v-dhanraj':[
      {id:'br-dma-adv',  name:'ADV/DMA/2026',     date:'2026-07-20', dueDate:'',           amount:250000, pending:250000, kind:'advance', side:'Cr'},
      {id:'br-dma-dn',   name:'CN/SAL/2026/003',  date:'2026-08-11', dueDate:'',           amount:31200,  pending:31200,  kind:'note',    side:'Cr'}
    ]
  },

  items:[
    {id:'it-i3',   name:'i3/8GB/256GB SSD/Win 11 Pro Desktop', group:'Goods — IT hardware',kind:'goods',  hsn:'8471',  unit:'Nos',  rate:34500, tax:'tax-18',godown:'gd-main'},
    {id:'it-i5',   name:'i5/16GB/512GB SSD/Win 11 Pro Desktop',group:'Goods — IT hardware',kind:'goods',  hsn:'8471',  unit:'Nos',  rate:52800, tax:'tax-18',godown:'gd-main'},
    {id:'it-lap',  name:'ThinkBook 14 — i5 Laptop',            group:'Goods — IT hardware',kind:'goods',  hsn:'8471',  unit:'Nos',  rate:61500, tax:'tax-18',godown:'gd-main'},
    {id:'it-mon',  name:'24" LED Monitor — IPS',               group:'Goods — IT hardware',kind:'goods',  hsn:'8528',  unit:'Nos',  rate:8200,  tax:'tax-18',godown:'gd-main'},
    {id:'it-mon27',name:'27" 4K Monitor',                      group:'Goods — IT hardware',kind:'goods',  hsn:'8528',  unit:'Nos',  rate:24900, tax:'tax-18',godown:'gd-main'},
    {id:'it-kbm',  name:'Wireless Keyboard & Mouse Combo',     group:'Goods — IT hardware',kind:'goods',  hsn:'8471',  unit:'Set',  rate:1150,  tax:'tax-18',godown:'gd-hsr'},
    {id:'it-dock', name:'USB-C Docking Station',               group:'Goods — IT hardware',kind:'goods',  hsn:'8471',  unit:'Nos',  rate:7400,  tax:'tax-18',godown:'gd-main'},
    {id:'it-print',name:'Laser Printer — Mono Duplex',         group:'Goods — IT hardware',kind:'goods',  hsn:'8443',  unit:'Nos',  rate:18600, tax:'tax-18',godown:'gd-main'},
    {id:'it-toner',name:'Laser Toner Cartridge 88A',           group:'Goods — IT hardware',kind:'goods',  hsn:'8443',  unit:'Nos',  rate:4850,  tax:'tax-18',godown:'gd-main'},
    {id:'it-switch',name:'24-Port Gigabit Switch',             group:'Goods — Networking', kind:'goods',  hsn:'8517',  unit:'Nos',  rate:12400, tax:'tax-18',godown:'gd-wh2'},
    {id:'it-ap',   name:'Wi-Fi 6 Access Point',                group:'Goods — Networking', kind:'goods',  hsn:'8517',  unit:'Nos',  rate:8900,  tax:'tax-18',godown:'gd-wh2'},
    {id:'it-hdmi', name:'HDMI 2.0 Cable — 3 m',                group:'Goods — Networking', kind:'goods',  hsn:'8544',  unit:'Nos',  rate:520,   tax:'tax-18',godown:'gd-wh2'},
    {id:'it-cat6', name:'CAT-6 Patch Cable — 5 m',             group:'Goods — Networking', kind:'goods',  hsn:'8544',  unit:'Nos',  rate:180,   tax:'tax-18',godown:'gd-wh2'},
    {id:'it-cctv', name:'IP CCTV Camera — 4 MP',               group:'Goods — Networking', kind:'goods',  hsn:'8525',  unit:'Nos',  rate:5600,  tax:'tax-18',godown:'gd-wh2'},
    {id:'it-ups',  name:'UPS 600 VA Line-Interactive',         group:'Goods — Power',      kind:'goods',  hsn:'8504',  unit:'Nos',  rate:3150,  tax:'tax-18',godown:'gd-main'},
    {id:'it-ups1k',name:'UPS 1 kVA with Isolation',            group:'Goods — Power',      kind:'goods',  hsn:'8504',  unit:'Nos',  rate:9800,  tax:'tax-18',godown:'gd-main'},
    {id:'it-solar',name:'Solar Panel 540 Wp',                  group:'Goods — Power',      kind:'goods',  hsn:'8541',  unit:'Nos',  rate:14200, tax:'tax-12',godown:'gd-wh2'},
    {id:'it-chair',name:'Ergonomic Task Chair',                group:'Goods — Furniture',  kind:'goods',  hsn:'9401',  unit:'Nos',  rate:8900,  tax:'tax-18',godown:'gd-wh2'},
    {id:'it-desk', name:'Height-Adjustable Desk — 1200 mm',    group:'Goods — Furniture',  kind:'goods',  hsn:'9403',  unit:'Nos',  rate:21500, tax:'tax-18',godown:'gd-wh2'},
    {id:'it-cab',  name:'Storage Cabinet — 4 Drawer',          group:'Goods — Furniture',  kind:'goods',  hsn:'9403',  unit:'Nos',  rate:12800, tax:'tax-18',godown:'gd-wh2'},
    {id:'it-ac',   name:'Split AC 1.5 Ton — 5 Star',           group:'Goods — Facilities', kind:'goods',  hsn:'8415',  unit:'Nos',  rate:42500, tax:'tax-28',godown:'gd-main'},
    {id:'it-water',name:'Water Dispenser — Hot & Cold',        group:'Goods — Facilities', kind:'goods',  hsn:'8418',  unit:'Nos',  rate:11200, tax:'tax-18',godown:'gd-main'},
    {id:'it-a4',   name:'A4 Copier Paper 75 GSM',              group:'Goods — Stationery', kind:'goods',  hsn:'4802',  unit:'Ream', rate:245,   tax:'tax-12',godown:'gd-main'},
    {id:'it-file', name:'Box File — Foolscap',                 group:'Goods — Stationery', kind:'goods',  hsn:'4820',  unit:'Nos',  rate:96,    tax:'tax-18',godown:'gd-hsr'},
    {id:'it-note', name:'Spiral Notebook A5 (Pack of 6)',      group:'Goods — Stationery', kind:'goods',  hsn:'4820',  unit:'Pack', rate:320,   tax:'tax-12',godown:'gd-hsr'},
    {id:'it-pen',  name:'Gel Pen 0.7 mm (Pack of 10)',         group:'Goods — Stationery', kind:'goods',  hsn:'9608',  unit:'Pack', rate:180,   tax:'tax-12',godown:'gd-hsr'},
    {id:'it-tea',  name:'Tea & Coffee Premix',                 group:'Goods — Pantry',     kind:'goods',  hsn:'2101',  unit:'Kg',   rate:480,   tax:'tax-18',godown:'gd-main'},
    {id:'it-sanit',name:'Hand Sanitiser 500 ml',               group:'Goods — Pantry',     kind:'goods',  hsn:'3808',  unit:'Nos',  rate:145,   tax:'tax-18',godown:'gd-main'},
    {id:'it-mask', name:'N95 Mask (Box of 20)',                group:'Goods — Pantry',     kind:'goods',  hsn:'6307',  unit:'Box',  rate:640,   tax:'tax-5', godown:'gd-main'},
    {id:'it-amc',  name:'Onsite AMC — Desktop (per unit/yr)',  group:'Services',           kind:'service',hsn:'998713',unit:'Nos',  rate:8000,  tax:'tax-18',godown:''},
    {id:'it-instl',name:'Installation & Commissioning',        group:'Services',           kind:'service',hsn:'998739',unit:'Job',  rate:45000, tax:'tax-18',godown:''},
    {id:'it-audit',name:'Network Security Audit',              group:'Services',           kind:'service',hsn:'998316',unit:'Job',  rate:125000,tax:'tax-18',godown:''},
    {id:'it-train',name:'Corporate Training — per day',        group:'Services',           kind:'service',hsn:'999293',unit:'Day',  rate:18000, tax:'tax-18',godown:''},
    {id:'it-clean',name:'Housekeeping — per month',            group:'Services',           kind:'service',hsn:'998533',unit:'Month',rate:42000, tax:'tax-18',godown:''},
    {id:'it-rkc',  name:'RKC White Cement',                    group:'Goods — Facilities', kind:'goods',  hsn:'25232910',unit:'Bag',rate:670, tax:'tax-18',godown:'gd-main'},
    {id:'it-opc',  name:'RKC White Cement - OPC',              group:'Goods — Facilities', kind:'goods',  hsn:'25232910',unit:'Bag',rate:690, tax:'tax-18',godown:'gd-main'},
    {id:'it-pack', name:'Packaging Material',                  group:'Goods — Facilities', kind:'goods',  hsn:'25232100',unit:'Nos',rate:120, tax:'tax-18',godown:'gd-main'}
  ],

  godowns:[
    {id:'gd-main',name:'Main Store — Bengaluru',    group:'Karnataka'},
    {id:'gd-hsr', name:'HSR Branch Store',          group:'Karnataka'},
    {id:'gd-wh2', name:'Warehouse 2 — Peenya',      group:'Karnataka'},
    {id:'gd-mh',  name:'Warehouse — Bhiwandi',      group:'Maharashtra'},
    {id:'gd-chn', name:'Chennai Depot',             group:'Tamil Nadu'},
    {id:'gd-del', name:'Delhi Transit Store',       group:'Delhi'},
    {id:'gd-tra', name:'Goods in Transit',          group:'Control'},
    {id:'gd-rej', name:'Rejection Store',           group:'Control'}
  ],

  costCentres:[
    {id:'cc-admin', name:'Administration',      group:'Departments'},
    {id:'cc-fin',   name:'Finance & Accounts',  group:'Departments'},
    {id:'cc-hr',    name:'Human Resources',     group:'Departments'},
    {id:'cc-eng',   name:'Engineering',         group:'Departments'},
    {id:'cc-design',name:'Product & Design',    group:'Departments'},
    {id:'cc-sales', name:'Sales & Marketing',   group:'Departments'},
    {id:'cc-cs',    name:'Customer Success',    group:'Departments'},
    {id:'cc-ops',   name:'Operations',          group:'Departments'},
    {id:'cc-it',    name:'IT & Infrastructure', group:'Departments'},
    {id:'cc-legal', name:'Legal & Compliance',  group:'Departments'},
    {id:'cc-atlas', name:'Project Atlas',       group:'Projects'},
    {id:'cc-north', name:'Project Northstar',   group:'Projects'}
  ],

  costCentreClasses:[
    {id:'ccc-dept', name:'Departmental Split (Admin 40 / Eng 35 / Sales 25)'},
    {id:'ccc-eng',  name:'Engineering — 100%'},
    {id:'ccc-ops',  name:'Operations — 100%'},
    {id:'ccc-rev',  name:'Revenue Share (Sales 60 / Customer Success 40)'},
    {id:'ccc-atlas',name:'Project Atlas — 100%'}
  ],

  /* `nature` is the supply the ledger is for, and it is what the sheet works
     on rather than the id: when the source and destination states change the
     invoice from intra to inter, it is the local ledger and the interstate one
     that swap, and naming that in the data is what lets a sales ledger the
     user creates take part in the swap like the seven below. */
  salesLedgers:[
    {id:'led-sales-local',  name:'Sales — Local (GST)',       nature:'local'},
    {id:'led-sales-inter',  name:'Sales — Interstate (GST)',  nature:'inter'},
    {id:'led-sales-exempt', name:'Sales — Exempt',            nature:'exempt'},
    {id:'led-sales-import', name:'Sales — Export',            nature:'export'},
    {id:'led-sales-sez',    name:'Sales — SEZ',               nature:'sez'},
    {id:'led-sales-capital',name:'Sales — Capital Goods',     nature:'capital'}
  ],

  /* Where GST goes when it cannot be claimed. Credit blocked by s.17(5) is a
     cost of the thing that blocked it, so those ledgers name the expense;
     credit lost for any other reason is written off on its own. */

  /* --- where the tax lines themselves post ---------------------------------
     Every figure in the totals panel lands in a ledger, and until now the panel
     named those ledgers without the book holding any: the GST heads were
     generated strings and a withholding line carried a section rather than a
     ledger. They are real masters now, filed under Duties & Taxes like any
     other, so a tax line can be resolved against the book the same way a charge
     line is.

     Deliberately incomplete, because a complete list would make the prediction
     invisible. This book transacts in 12% and 18% locally and has had TDS
     withheld under 194C, 194J (professional), 194H and 194I — so it holds
     those. Nothing has ever been withheld from it under 194J (technical),
     which is exactly the case a first-time head puts a book in: the receivable
     is real and the ledger to hold it does not exist. */
  taxLedgers:[
    /* No 6% pair. A book holds the GST ledgers it has had reason to post to,
       and this one has never sold anything at 12% — so the sample invoice's
       12%-rated line has no CGST 6% or SGST 6% ledger to land in, and the two
       are proposed on the sheet exactly as a missing income ledger is. It is
       the fixture that makes the GST half of §1 L2 visible; the prediction
       itself is `predictTaxLine`, which has always covered both heads.
       Restoring these two rows turns the demonstration off, nothing else. */
    {id:'led-cgst-9',  name:'Output CGST 9%',  group:'Duties & Taxes', dutyType:'GST', head:'CGST', rate:9},
    {id:'led-sgst-9',  name:'Output SGST 9%',  group:'Duties & Taxes', dutyType:'GST', head:'SGST', rate:9},
    {id:'led-igst-12', name:'Output IGST 12%', group:'Duties & Taxes', dutyType:'GST', head:'IGST', rate:12},
    {id:'led-igst-18', name:'Output IGST 18%', group:'Duties & Taxes', dutyType:'GST', head:'IGST', rate:18},
    /* Receivable, not payable. TDS the customer withholds is tax paid in our
       name and set against our own liability — an asset under Current Assets,
       which is why these sit apart from the collected heads below. */
    {id:'led-tds-194c',    name:'TDS Receivable — 194C',              group:'Duties & Taxes', dutyType:'TDS', section:'194C'},
    {id:'led-tds-194j-prof',name:'TDS Receivable — 194J (Professional)',group:'Duties & Taxes', dutyType:'TDS', section:'194J-prof'},
    {id:'led-tds-194h',    name:'TDS Receivable — 194H',              group:'Duties & Taxes', dutyType:'TDS', section:'194H'},
    {id:'led-tds-194i-bld',name:'TDS Receivable — 194I (Premises)',   group:'Duties & Taxes', dutyType:'TDS', section:'194I-bld'},
    /* Collected from the customer and owed on — a liability from the moment
       the invoice is raised. */
    {id:'led-tcs-206c1h',  name:'TCS Payable — 206C(1H)',             group:'Duties & Taxes', dutyType:'TCS', section:'206C1H'}
  ],

  /* Income ledgers, and they carry the nature of the service for the same
     reason the expense ledgers did — except the section now says what the
     customer will withhold when they pay us, not what we withhold from them.
     `tds` is read the same way by the engine either side of the transaction. */
  incomeLedgers:[
    {id:'led-install',  name:'Installation & Commissioning', group:'Contracted work',tax:'tax-18',tds:'194C',     sac:'998739'},
    {id:'led-freight',  name:'Freight & Delivery Charges',   group:'Contracted work',tax:'tax-18',tds:'194C',     sac:'996511'},
    {id:'led-onsite',   name:'On-site Support Visits',       group:'Contracted work',tax:'tax-18',tds:'194C',     sac:'998717'},
    /* deliberately uncoded: a book that has invoiced cabling for years without
       ever putting a SAC on the ledger, which is the ordinary case the consent
       prompt is for — the master has no answer and the invoice does */
    {id:'led-housekeep',name:'Structured Cabling Work',      group:'Contracted work',tax:'tax-18',tds:'194C',     sac:''},
    {id:'led-security', name:'Managed Security Services',    group:'Contracted work',tax:'tax-18',tds:'194C',     sac:'998525'},
    {id:'led-advert',   name:'Co-marketing & Promotion',     group:'Contracted work',tax:'tax-18',tds:'194C',     sac:'998361'},
    {id:'led-amc',      name:'Annual Maintenance Contract',  group:'Professional',   tax:'tax-18',tds:'194J-tech',sac:'998713'},
    {id:'led-software', name:'Software Licence & Subscription',group:'Professional', tax:'tax-18',tds:'194J-tech',sac:'998434'},
    {id:'led-prof',     name:'Professional / Consultancy Fees',group:'Professional', tax:'tax-18',tds:'194J-prof',sac:'998311'},
    {id:'led-impl',     name:'Implementation & Migration',   group:'Professional',   tax:'tax-18',tds:'194J-prof',sac:'998314'},
    {id:'led-audit',    name:'IT Audit & Assessment',        group:'Professional',   tax:'tax-18',tds:'194J-prof',sac:'998221'},
    {id:'led-training', name:'Training & Enablement',        group:'Professional',   tax:'tax-18',tds:'194J-prof',sac:'999293'},
    {id:'led-rent',     name:'Equipment Rental — Plant & Machinery',group:'Rent & finance',tax:'tax-18',tds:'194I-pm', sac:'997314'},
    {id:'led-rentbld',  name:'Rack & Colocation Space',      group:'Rent & finance', tax:'tax-18',tds:'194I-bld', sac:'997212'},
    {id:'led-commission',name:'Commission / Brokerage Earned',group:'Rent & finance',tax:'tax-18',tds:'194H',     sac:'998599'},
    {id:'led-interest', name:'Interest on Overdue Invoices', group:'Rent & finance', tax:'tax-0', tds:'194A',     sac:'997119'},
    {id:'led-packing',  name:'Packing & Forwarding',         group:'No TDS',         tax:'tax-18',tds:'',         sac:'998540'},
    {id:'led-travel',   name:'Travel Recovered',             group:'No TDS',         tax:'tax-5', tds:'',         sac:'996411'},
    {id:'led-insurance',name:'Transit Insurance Recovered',  group:'No TDS',         tax:'tax-18',tds:'',         sac:'997134'},
    {id:'led-discount', name:'Trade Discount Allowed',       group:'No TDS',         tax:'tax-0', tds:'',         sac:''},
    {id:'led-printing', name:'Media & Consumables',          group:'No TDS',         tax:'tax-18',tds:'',         sac:'998912'},
    {id:'led-logistics',name:'Logistics Recovery',           group:'Contracted work',tax:'tax-18',tds:'194C',     sac:'996511'}
  ],

  taxes:[
    {id:'tax-0',   name:'Nil Rated (0%)', rate:0},
    {id:'tax-025', name:'GST 0.25%',      rate:0.25},
    {id:'tax-3',   name:'GST 3%',         rate:3},
    {id:'tax-5',   name:'GST 5%',         rate:5},
    {id:'tax-12',  name:'GST 12%',        rate:12},
    {id:'tax-18',  name:'GST 18%',        rate:18},
    {id:'tax-28',  name:'GST 28%',        rate:28}
  ],

  /* --- TDS sections ------------------------------------------------------
     single  : per-invoice threshold, annual : aggregate threshold for the FY */
  tdsSections:[
    {id:'194C',     name:'194C — Contractor / Sub-contractor', rate:2,  rateIndividual:1, single:30000, annual:100000, base:'services'},
    {id:'194J-tech',name:'194J — Technical services',          rate:2,  single:0, annual:30000,  base:'services'},
    {id:'194J-prof',name:'194J — Professional fees',           rate:10, single:0, annual:30000,  base:'services'},
    {id:'194H',     name:'194H — Commission / brokerage',      rate:2,  single:0, annual:20000,  base:'services'},
    {id:'194I-pm',  name:'194I — Rent (plant & machinery)',    rate:2,  single:0, annual:240000, base:'services'},
    {id:'194I-bld', name:'194I — Rent (land & building)',      rate:10, single:0, annual:240000, base:'services'},
    {id:'194A',     name:'194A — Interest other than securities',rate:10,single:0,annual:40000,  base:'services'}
  ],

  /* --- TCS sections ------------------------------------------------------
     Collected by us now, not stated to us — which is why 206C(1H) carries a
     threshold and the rest do not. The engine can compute (1H) because the
     test is against our own book: what this customer has been invoiced for
     goods this financial year, a figure we hold. The others are situational —
     scrap, timber, motor vehicles, overseas remittance — and are added by hand
     when the supply is one of them. */
  tcsSections:[
    {id:'206C1H', name:'206C(1H) — Sale of goods',              rate:0.1, annual:5000000, onExcess:true},
    {id:'206C1',  name:'206C(1) — Scrap',                       rate:1},
    {id:'206C1T', name:'206C(1) — Timber / forest produce',     rate:2.5},
    {id:'206C1F', name:'206C(1F) — Motor vehicle above ₹10 lakh',rate:1},
    {id:'206C1G', name:'206C(1G) — Overseas remittance / tour', rate:5}
  ],

  /* --- other statutory heads ---------------------------------------------
     Everything withheld on an invoice that is neither income-tax TDS nor TCS.
     They share the shape — a named head at a stated rate — so they share the
     section, and they are hand-added because none of them can be read off
     the customer master the way a TDS section can. */
  otherHeads:[
    {id:'eq-levy',   name:'Equalisation Levy — e-commerce supply', rate:2},
    {id:'gst-tds-51',name:'GST TDS u/s 51',                        rate:2},
    {id:'gst-tcs-52',name:'GST TCS u/s 52',                        rate:1},
    {id:'labour-cess',name:'Labour Welfare Cess (BOCW)',           rate:1},
    {id:'wct',       name:'Works Contract Tax',                    rate:2}
  ],

  /* Already raised — used for the duplicate-invoice check. Our own numbering
     now rather than each party's, because these are invoices this book issued
     and a seller controls the series. */
  existingInvoices:[
    {customer:'v-technova',invoiceNo:'SAL/26-27/0912',date:'2026-06-18',amount:412000},
    {customer:'v-technova',invoiceNo:'SAL/26-27/0977',date:'2026-07-02',amount:238500},
    {customer:'v-sunrise', invoiceNo:'SAL/26-27/2312',date:'2026-06-30',amount:22450},
    {customer:'v-anand',   invoiceNo:'SAL/26-27/4471',date:'2026-07-09',amount:1180000},
    {customer:'v-globe',   invoiceNo:'SAL/26-27/8213',date:'2026-07-15',amount:64800},
    {customer:'v-meridian',invoiceNo:'SAL/26-27/1102',date:'2026-07-01',amount:145000},
    {customer:'v-vertex',  invoiceNo:'SAL/26-27/0118',date:'2026-06-24',amount:275000},
    {customer:'v-dhanraj', invoiceNo:'SAL/26-27/0330',date:'2026-07-20',amount:2140000}
  ],

  /* --- what we did last time ----------------------------------------------
     The workspace's own past coding. This is the only evidence on the sheet
     that needs no trust in a model: it is the accountant's own decision, and
     it is counted rather than scored. "11 of 12 past invoices" is checkable;
     "87% confident" is not, which is why there is no percentage anywhere in
     this feature and no Confidence column in either table.

     `customer` empty means the whole book rather than one customer — a habit
     the customer themselves has established outranks one the book has. */
  coding:[
    // Technova's own history. Kept in full, and no longer the sample invoice's
    // customer: that invoice goes to a party with no master and no history, so
    // these are what the `existing` and `feedback-*` scenarios rest on and what
    // the default invoice deliberately cannot reach.
    {customer:'v-technova',kw:'e-waste|e waste|disposal|buyback',     route:'ledger',target:'led-housekeep',n:4, of:5},
    {customer:'v-technova',kw:'installation|commissioning',           route:'ledger',target:'led-install',  n:14,of:14},
    {customer:'v-technova',kw:'amc|annual maintenance|onsite maint',  route:'ledger',target:'led-amc',      n:9, of:9},
    {customer:'v-technova',kw:'i3 desktop|i3/',                       route:'item',  target:'it-i3',        n:11,of:11},
    {customer:'v-technova',kw:'led monitor|ips monitor',              route:'item',  target:'it-mon',       n:8, of:8},
    {customer:'v-technova',kw:'keyboard|mouse|desktop combo',         route:'item',  target:'it-kbm',       n:6, of:6},
    {customer:'v-technova',kw:'professional fee',                    route:'ledger',target:'led-retired-professional',n:4,of:5},
    // the book's history, across every customer
    {customer:'',          kw:'e-waste|e waste|disposal|buyback',     route:'ledger',target:'led-housekeep',n:11,of:14},
    {customer:'',          kw:'freight|delivery|transport|logistics', route:'ledger',target:'led-freight',  n:22,of:24},
    {customer:'',          kw:'onsite|site visit|engineer visit',     route:'ledger',target:'led-onsite',   n:17,of:17},
    {customer:'',          kw:'packing|forwarding',                   route:'ledger',target:'led-packing',  n:8, of:8},
    {customer:'',          kw:'cabling|structured cabling|patching',  route:'ledger',target:'led-housekeep',n:13,of:14},
    {customer:'',          kw:'security|soc|monitoring|managed secur',route:'ledger',target:'led-security', n:11,of:11},
    {customer:'',          kw:'migration|implementation|rollout',     route:'ledger',target:'led-impl',     n:12,of:13},
    {customer:'',          kw:'assessment|it audit|posture review',   route:'ledger',target:'led-audit',    n:6, of:6},
    {customer:'',          kw:'training|workshop|enablement',         route:'ledger',target:'led-training', n:5, of:5},
    {customer:'',          kw:'rack|colocation|colo|space',           route:'ledger',target:'led-rentbld',  n:19,of:21},
    {customer:'',          kw:'software|subscription|licence|license',route:'ledger',target:'led-software', n:15,of:16},
    {customer:'',          kw:'insurance|transit cover',              route:'ledger',target:'led-insurance',n:7, of:7},
    {customer:'',          kw:'travel|conveyance|site travel',        route:'ledger',target:'led-travel',   n:9, of:10},
    {customer:'',          kw:'co-marketing|promotion|campaign',      route:'ledger',target:'led-advert',   n:8, of:9},
    {customer:'',          kw:'commission|brokerage',                 route:'ledger',target:'led-commission',n:6,of:6},
    {customer:'',          kw:'consultanc|professional fee|advisory', route:'ledger',target:'led-prof',     n:20,of:22}
  ],

  /* --- HSN / SAC, to the precision the description supports -----------------
     HSN is hierarchical, so a prediction can be right about the heading and
     silent about the rest. `digits` is how far the description actually gets
     you: four digits of 7326 is a true statement about a powder-coated steel
     tray, and the eight-digit code underneath it is not. Filling the tail with
     zeroes to look complete would be the one dishonest thing this table could
     do, so it stops where the evidence stops.

     Longest keyword wins, so 'cable tray' beats 'cable'. */
  hsnGuide:[
    {kw:'cable management|cable tray|powder coated|steel tray|steel rack',code:'7326',name:'Articles of iron or steel',                 digits:4},
    {kw:'patch cable|patch cord|hdmi|lan cable|cable',                    code:'8544',name:'Insulated wire and cable',                  digits:4},
    {kw:'desktop|workstation|laptop|notebook pc|keyboard|mouse|dock',     code:'8471',name:'Automatic data processing machines',        digits:4},
    {kw:'monitor|display panel',                                          code:'8528',name:'Monitors and projectors',                   digits:4},
    {kw:'printer|toner|cartridge',                                        code:'8443',name:'Printing machinery and parts',              digits:4},
    {kw:'switch|router|access point|wi-fi|wifi',                          code:'8517',name:'Telephony and network apparatus',           digits:4},
    {kw:'cctv|camera',                                                    code:'8525',name:'Cameras and transmission apparatus',        digits:4},
    {kw:'ups|inverter|power supply',                                      code:'8504',name:'Transformers and static converters',        digits:4},
    {kw:'solar panel|photovoltaic',                                       code:'8541',name:'Semiconductor and photovoltaic devices',    digits:4},
    {kw:'chair|seating',                                                  code:'9401',name:'Seats and parts thereof',                   digits:4},
    {kw:'desk|table|cabinet|drawer|furniture',                            code:'9403',name:'Other furniture and parts',                 digits:4},
    {kw:'air conditioner|split ac|hvac',                                  code:'8415',name:'Air conditioning machines',                 digits:4},
    {kw:'paper|ream|copier paper',                                        code:'4802',name:'Uncoated paper and paperboard',             digits:4},
    {kw:'file|notebook|register',                                         code:'4820',name:'Registers, notebooks and stationery',       digits:4},
    {kw:'pen|pencil|marker',                                              code:'9608',name:'Pens and similar articles',                 digits:4},
    {kw:'installation|commissioning|erection',                            code:'998739',name:'Installation services, other',           digits:6},
    {kw:'maintenance|amc|repair',                                         code:'998713',name:'Maintenance and repair of computers',     digits:6},
    {kw:'housekeep|cleaning|e-waste|disposal|recycl',                     code:'998533',name:'General cleaning services',               digits:6},
    {kw:'freight|cartage|transport',                                      code:'996511',name:'Road transport of goods',                 digits:6},
    {kw:'courier|postage',                                                code:'996812',name:'Courier services',                        digits:6}
  ],

  lastVoucherSeq:{sales:184,'sales-imp':12,'sales-sez':4,'sales-ret':6,'credit-note':31}
};

/* The figures the sheet opens on. The service lines attract 194C and 194J, so
   the TDS the customer will withhold is exercised end to end; switch the
   statutory mode to TCS on a customer already near the 50 lakh mark and
   206C(1H) is exercised the same way.

   Each line carries what the customer printed — a description in the customer's
   words, sometimes an HSN, the quantities and the rate charged — and where the
   line belongs in our books: `route` says which table it lands in, `item` or
   `ledger` names the master it posts to. Two lines name no master at all: the
   field arrives empty and the user picks one. Nothing here is inferred. */
/* let, not const: the inbox seeds the invoice it extracted over this sample by
   replacing the whole object, so every prediction downstream reads it. */
let SAMPLE = {
  branch:'br-ka', voucherType:'sales',

  /* The customer this invoice goes to. An id, not a printed header: nothing
     is being read, so the party is one the book holds and everything the sheet
     shows about them — address, GSTIN, treatment, their state, their credit
     period — is read straight off that master when it is picked.

     Technova, because it is the record with the fullest history: a Karnataka
     party, so the supply stays local and the CGST/SGST split is the one on
     screen, and already near enough to the 50 lakh mark that switching the
     statutory mode to TCS shows 206C(1H) actually biting. */
  customer:'v-technova',

  customerPoNo:'PO/ANV/2026/0442',
  invoiceDate:'2026-07-28',
  salesLedger:'led-sales-local',
  narration:'Desktop refresh supplied to Anvaya Technologies — their PO/2026/0442. Covers installation, a 1-year onsite AMC, the rack build and power for their staging area, structured cabling, and an advance invoiced against next year’s support renewal. Deposit on the loaner bench is refundable to them on return.',
  costCentreClass:'ccc-dept',
  /* What the invoice carries past the voucher header. The customer's order
     reference is on it — it is in the narration above — and their PO carries
     no order date, which is exactly the case the conditional rules exist for.
     Order and Despatch Details are switched off by default, so these two
     arrive held rather than filled, and the sheet has to say so. */
  extra:{
    consigneeName:    'br-ka',
    consigneeAddress: 'No. 42, 1st Floor, HSR Layout Sector 2, Bengaluru',
    consigneeState:   'KA',
    consigneePincode: '560102',
    placeOfSupply:    'KA',
    orderNo:          'PO/2026/0442',
    receiptNoteNo:    'DC/2026/1187'
  },
  lines:[
    {text:'Supply of i3 Desktop, 8GB/256GB SSD',             hsn:'8471',  unit:'Nos',qty:12,rate:34500,disc:2,discType:'pct',gst:18,cc:'cc-eng',route:'item',item:'it-i3'},
    /* the customer's PO files monitors under 8529 — parts — where this book
       files the whole unit under 8528. A real disagreement, and the one the
       consent prompt exists for: neither side is obviously wrong. */
    {text:'24" LED Monitor - IPS',                          hsn:'8529',  unit:'Nos',qty:12,rate:8200, gst:18,cc:'cc-eng',route:'item',item:'it-mon'},
    {text:'Cordless desktop combo - keyboard and mouse',    hsn:'',      unit:'Set',qty:12,rate:1150, gst:18,cc:'cc-eng',route:'item',item:'it-kbm'},
    /* §1 L1. Listed with a quantity of twelve and a rate, in the item block,
       and it is not stock — it is a maintenance contract we are selling.
       Technova has been coded to Onsite AMC nine times out of nine and never
       to an item, so the habit reads the line as a ledger and the row offers
       to move it. The quantity is what makes it the case worth carrying: it is
       exactly the shape the old rule took as proof that a line was an item. */
    {text:'Annual maintenance — 12 desktops, 1 year',       hsn:'998713',unit:'Nos',qty:12,rate:8000, gst:18,cc:'cc-eng',route:'item',item:''},
    /* No item master named — the row arrives with the Item cell empty. It is
       also the one line whose unit this book has no master for: the tray is
       sold by the metre and nothing in this book is measured that way. That is
       the UOM rule's whole case — the draft's Unit is left blank rather than
       defaulted, and the item is the one master the confirmation refuses to
       write until somebody answers it. Change 'Mtr' to 'Nos' to see the
       invoice go through with nothing blocked. */
    {text:'Cable management tray, powder coated 1200mm',    hsn:'',      unit:'Mtr',qty:24,rate:1850, gst:18,cc:'cc-it', route:'item',item:''},
    {text:'Installation & commissioning — 12 seats',        hsn:'998739',amount:45000,gst:18,cc:'cc-ops',route:'ledger',ledger:'led-install'},
    /* the code agrees and the rate does not — the case a code-only comparison
       would wave through, and the one that actually moves the tax */
    {text:'Onsite AMC — 12 desktops, 1 year',               hsn:'998713',amount:96000,gst:12,cc:'cc-eng',route:'ledger',ledger:'led-amc'},
    /* likewise: a service with no ledger named, so the Ledger cell arrives
       empty — and the ledger the habit tier proposes for it is one this book
       has never coded, so the line's own SAC is the only one in the room */
    {text:'E-waste buyback & disposal of replaced units',   hsn:'998533',amount:18500,gst:18,cc:'cc-ops',route:'ledger',ledger:''},

    /* --- the six that arrive with no ledger and no obvious home -------------
       Every one of these lands in the create-ledger dialog, and between them
       they walk the whole of the Under prediction: the four words that decide
       what kind of thing a line is, one that only decides which shelf, and one
       the engine genuinely cannot place. They are on the invoice because they
       are things this book would really invoice for — a rack build, a deposit on
       loaned kit, an advance, a transit cover recharge — and a line invented
       purely to exercise a code path would be worth less than one that also
       has to survive being read as a document.

       Ordered as they would print: the goods-shaped charges first, then the
       ones that are not charges at all. */

    /* A goods code and a capital sale at once, which is the case the ladder
       has to get right in the correct order: "plant & machinery" is a
       statement about what happens to the thing, and it outranks the fact that
       8504 is a goods heading. */
    {text:'Plant & machinery — 15 kVA UPS with isolation transformer',
                                                            hsn:'8504',  amount:145000,gst:18,cc:'cc-it', route:'ledger',ledger:''},
    /* No code, no ledger, and nothing in the book that reads like it. The
       honest fallback — said as a fallback rather than dressed up as a
       finding. */
    {text:'Structured cabling and rack dressing — 2 racks',  hsn:'',      amount:38000,gst:18,cc:'cc-it', route:'ledger',ledger:''},
    /* Worded with the aside after a dash, like the rest of the invoice,
       because that is what the ledger name is cut back to: everything tying
       the line to this one despatch comes off and "Transit Insurance
       Recovered" is left, which is still true on the next invoice. */
    {text:'Transit insurance recovered — this despatch',     hsn:'',      amount:22000,gst:18,cc:'cc-ops',route:'ledger',ledger:''},
    /* An advance is money not yet earned — a liability until the supply
       lands, not income. It is on a tax invoice because advance invoicing is
       ordinary, and it is here because booking it as revenue is the mistake
       that matters. The year is after the dash so the master is not named for
       one of them. */
    {text:'Support renewal advance — FY 2027-28',             hsn:'',      amount:60000,gst:18,cc:'cc-eng',route:'ledger',ledger:''},
    /* Refundable to the customer, so it is a liability and carries no GST —
       which also exercises a nil-rated line through the totals. Called a
       caution deposit rather than a security one on purpose: this book has
       coded eleven of eleven past lines saying "security" to Managed Security
       Services, and that habit is strong enough to answer the row before the
       group prediction is ever reached. A real deposit would hit the same
       wall, which is worth knowing, but it is not what this line is here to
       show. */
    {text:'Refundable caution deposit — loaner test bench',   hsn:'',      amount:50000,gst:0, cc:'cc-ops',route:'ledger',ledger:''},
    /* A recharge, not a supply of our own — it is here because the engine has
       to place a line whose words point at a cost while the amount is income. */
    {text:'Site readiness survey — recharged at cost',        hsn:'',      amount:12000,gst:0, cc:'cc-fin',route:'ledger',ledger:''},

    /* --- the three §5 charge lines -----------------------------------------
       The last thing an invoice prints, and the part of the block that is not
       a supply. Delivery is a real recovery and stays in Ledgers — it is here
       to show the bucket that does *not* move, and because this book has coded
       twenty-two of twenty-four freight lines already, it arrives coded rather
       than asking. The other two are not charges at all: they settle the
       invoice, so the sheet takes them out of the line tables entirely and
       puts them in Adjustments with the ledger type Tally needs to recognise
       them by.

       Both are printed the way an invoice prints them — the discount negative,
       the round off a few paise — so the totals have to survive them rather
       than being arranged around them. */
    {text:'Freight & delivery — outward consignment',         hsn:'996511',amount:14500,gst:18,cc:'cc-ops',route:'ledger',ledger:''},
    {text:'Early settlement discount — 2% on hardware',       hsn:'',      amount:-9500,gst:0, cc:'',       route:'ledger',ledger:''},
    {text:'Round off',                                        hsn:'',      amount:-0.40,gst:0, cc:'',       route:'ledger',ledger:''}
  ]
};

/* ============================================================================
   2. HELPERS
   ==========================================================================*/
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const byId = (list,id)=>list.find(x=>x.id===id);
const num = v=>{const n=parseFloat(String(v??'').replace(/[^0-9.\-]/g,''));return isFinite(n)?n:0};
const r2  = n=>Math.round((n+Number.EPSILON)*100)/100;
const inr = new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const money = n=>'₹ '+inr.format(r2(n||0));
const esc = s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let uidSeq = 0;
const uid = ()=>'r'+(++uidSeq);

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const ordinal = d=>d>3&&d<21 ? d+'th' : d+({1:'st',2:'nd',3:'rd'}[d%10]||'th');
function fmtDate(iso){
  if(!iso) return '';
  const [y,m,d] = iso.split('-').map(Number);
  return `${ordinal(d)} ${MONTHS[m-1]}, ${y}`;
}
/* Local-date arithmetic. toISOString() converts to UTC and rolls the date back
   a day for anyone east of Greenwich, so build the string from local parts. */
const isoOf = dt=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
const today = ()=>isoOf(new Date());
function addDays(iso,days){
  const [y,m,d] = iso.split('-').map(Number);
  return isoOf(new Date(y,m-1,d+days));
}
function fyLabel(iso){                                   // Indian FY runs Apr–Mar
  const [y,m] = iso.split('-').map(Number);
  const start = m>=4 ? y : y-1;
  return `${String(start).slice(2)}-${String(start+1).slice(2)}`;
}
const optionTag = (o,selected)=>`<option value="${o.id}"${o.id===selected?' selected':''}>${esc(o.name)}</option>`;
function options(list,placeholder,selected){
  return (placeholder?`<option value=""${selected?'':' selected'} disabled>${esc(placeholder)}</option>`:'') +
    list.map(o=>optionTag(o,selected)).join('');
}
/* same, but honouring a `group` field so long lists stay scannable */
function options2(list,placeholder,selected){
  const groups = new Map();
  list.forEach(o=>{
    const g = o.group||'';
    if(!groups.has(g)) groups.set(g,[]);
    groups.get(g).push(o);
  });
  let html = placeholder?`<option value=""${selected?'':' selected'} disabled>${esc(placeholder)}</option>`:'';
  groups.forEach((items,g)=>{
    const inner = items.map(o=>optionTag(o,selected)).join('');
    html += g ? `<optgroup label="${esc(g)}">${inner}</optgroup>` : inner;
  });
  return html;
}
/* Builds the Tost component's shape: a status circle, then the title with an
   optional subtitle under it. `msg` may carry the subtitle after a newline,
   which is how the existing callers can gain one without being rewritten. */
const TOAST_GLYPH = {ok:'i-tick', err:'i-info', warn:'i-info'};
function toastEl(msg,kind=''){
  const el = document.createElement('div');
  el.className = 'toast'+(kind?' toast--'+kind:'');

  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  icon.innerHTML =
    `<svg aria-hidden="true"><use href="#${TOAST_GLYPH[kind]||'i-info'}"/></svg>`;
  el.append(icon);

  const [title,...rest] = String(msg).split('\n');
  const body = document.createElement('div');
  body.className = 'toast__body';
  const t = document.createElement('p');
  t.className = 'toast__ttl'; t.textContent = title;
  body.append(t);
  if(rest.length){
    const s = document.createElement('p');
    s.className = 'toast__sub'; s.textContent = rest.join(' ');
    body.append(s);
  }
  el.append(body);
  return el;
}
function toast(msg,kind=''){
  const el = toastEl(msg,kind);
  $('#toasts').append(el);
  setTimeout(()=>el.remove(),3600);
  return el;
}

/* A toast with a way back out of what it is reporting. It lives longer than a
   plain one, because a notice you are meant to act on and a notice you are
   meant to read cannot be given the same three seconds — and §8 leaves the
   window open, so it is one number, named, in one place.

   Pressing it removes the toast first and acts second: an undo that leaves its
   own offer on screen invites being pressed twice. */
const TOAST_UNDO_MS = 12000;
function toastAction(msg,label,fn,kind='ok'){
  const el = toastEl(msg,kind);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'toast__act';
  /* The component draws a glyph beside this word, but the glyph it draws is
     undo-2 and the word it draws is "Undo". The only caller here offers
     "Create all N", which no arrow describes, so the chip is the word alone.
     DEV: adding a genuine undo toast means adding an undo-2 symbol to the
     sprite and pairing it here — a chevron standing in for it would read as
     "next", which is the opposite of what the button does. */
  b.append(document.createTextNode(label));
  b.addEventListener('click',()=>{ el.remove(); fn(); });
  el.append(b);
  $('#toasts').append(el);
  setTimeout(()=>el.remove(),TOAST_UNDO_MS);
  return el;
}

/* ============================================================================
   2a. OPTIONAL FIELD GROUPS
   --------------------------------------------------------------------------
   Four groups of voucher fields that most invoices have no use for. A goods
   sales collected at the counter names no consignee, clears no port and
   quotes no order — printing those thirty fields on every invoice would bury
   the eight that decide the posting.

   So they are configuration rather than layout: Field Configuration says
   which groups this company enters, and the sheet is built from the answer.
   Only Consignee is on out of the box, because a ship-to that differs from
   the invoice-to is the one of the four that turns up on ordinary sales.

   The config is deliberately not part of `state` — it belongs to the company,
   not to the invoice, so discarding an invoice or starting the next one leaves it
   standing. What gets *typed* into the fields is invoice data and lives in
   `state.extra`, keyed by field id.
   ==========================================================================*/
/* `req` names the field that makes this one mandatory: a date that has to be
   stated once its document number is. Nothing here is required on its own —
   these are optional groups — so the requirement is always conditional, and
   it is enforced where the fields are entered rather than on the sheet. */
const FIELD_GROUPS = [
  {id:'consignee', name:'Consignee Details', on:true, fields:[
    {id:'consigneeName',    name:'Consignee (Ship To)',   type:'select', list:'branches', ph:'Select Consignee (Ship To)', wide:true},
    {id:'consigneeAddress', name:'Address',               type:'textarea', ph:'Enter Address', wide:true},
    {id:'consigneeState',   name:'Consignee State',       type:'select', list:'states',    ph:'Select State'},
    {id:'consigneeCountry', name:'Consignee Country',     type:'select', list:'countries', ph:'Select Country'},
    {id:'consigneePincode', name:'Pincode',               type:'text',   ph:'Enter Pincode', mode:'numeric'},
    {id:'consigneeGstin',   name:'Consignee (GSTIN/UIN)', type:'text',   ph:'Enter GSTIN/UIN'},
    {id:'placeOfSupply',    name:'Place of Supply',       type:'select', list:'states',    ph:'Select Place of Supply', wide:true}
  ]},
  {id:'import', name:'Import Details', on:false, fields:[
    {id:'placeOfReceipt',  name:'Place of Receipt by Shipper',      type:'text',   ph:'Enter place of receipt', wide:true},
    {id:'vesselFlightNo',  name:'Vessel / Flight / Vehicle No',     type:'text',   ph:'Enter vessel / flight / vehicle no', wide:true},
    {id:'portOfLoading',   name:'Port of Loading',                  type:'text',   ph:'Enter port of loading'},
    {id:'portOfDischarge', name:'Port of Discharge',                type:'text',   ph:'Enter port of discharge'},
    {id:'countryTo',       name:'Country To',                       type:'select', list:'countries', ph:'Select Country', wide:true},
    {id:'boeNo',           name:'Bill of Entry / Shipping Invoice No', type:'text',   ph:'Enter invoice of entry / shipping invoice no', wide:true},
    {id:'boeDate',         name:'Bill of Entry / Shipping Invoice Date',type:'date',  ph:'Select Date',
     note:'Mandatory when Invoice No. is filled.', req:'boeNo'},
    {id:'portCode',        name:'Port Code',                        type:'select', list:'ports', ph:'Select Port Code',
     note:'Mandatory when Invoice No. is filled. Uses ICEGATE 6-character port codes.', req:'boeNo'}
  ]},
  {id:'receipt', name:'Receipt Details', on:false, fields:[
    {id:'receiptNoteNo',   name:'Delivery Note No(s)',             type:'text', ph:'Enter delivery note no(s)'},
    {id:'receiptNoteDate', name:'Note Date',                       type:'date', ph:'Select Date',
     note:'Mandatory when Note No. is filled.', req:'receiptNoteNo'},
    {id:'grnNo',           name:'Despatch Doc No',                 type:'text', ph:'Enter despatch doc no', wide:true},
    {id:'dispatchedThrough',name:'Dispatched Through',             type:'text', ph:'Enter dispatch mode'},
    {id:'dispatchDest',    name:'Destination',                     type:'text', ph:'Enter destination'},
    {id:'carrier',         name:'Carrier Name / Agent',            type:'text', ph:'Enter carrier name / agent', wide:true},
    {id:'ladingNo',        name:'Invoice of Lading / LR-RR No',       type:'text', ph:'Enter invoice of lading / LR-RR no'},
    {id:'ladingDate',      name:'Invoice of Lading Date',             type:'date', ph:'Select Date',
     note:'Mandatory when Lading No. is filled.', req:'ladingNo'}
  ]},
  {id:'order', name:'Order Details', on:false, fields:[
    {id:'orderNo',      name:'Order No(s)',              type:'text', ph:'Enter order no(s)'},
    {id:'orderDate',    name:'Order Date',               type:'date', ph:'Select Date',
     note:'Mandatory when Order No. is filled.', req:'orderNo'},
    {id:'paymentTerms', name:'Mode / Terms of Payment',  type:'text', ph:'Enter mode / terms of payment', wide:true},
    {id:'otherRefs',    name:'Other References',         type:'text', ph:'Enter other references', wide:true},
    {id:'deliveryTerms',name:'Terms of Delivery',        type:'text', ph:'Enter terms of delivery', wide:true}
  ]}
];
const fieldById = id=>FIELD_GROUPS.flatMap(g=>g.fields).find(f=>f.id===id);

/* A group is off, or it is on with some subset of its fields. Both switches
   matter: turning the group off hides it whole without forgetting which
   fields were chosen inside it. */
const fcDefaults = ()=>Object.fromEntries(FIELD_GROUPS.map(g=>[g.id,
  {on:g.on, fields:Object.fromEntries(g.fields.map(f=>[f.id,true]))}]));
const fcClone = c=>JSON.parse(JSON.stringify(c));
const fcSame  = (a,b)=>JSON.stringify(a)===JSON.stringify(b);
let fieldConfig = fcDefaults();

/* what the sheet draws — a group with every field switched off is nothing to
   draw, so it does not get a heading of its own either */
const fcLive = (cfg=fieldConfig)=>FIELD_GROUPS
  .filter(g=>cfg[g.id].on && g.fields.some(f=>cfg[g.id].fields[f.id]))
  .map(g=>({id:g.id, name:g.name, fields:g.fields.filter(f=>cfg[g.id].fields[f.id])}));

/* ============================================================================
   3. STATE — every value here is user-editable; nothing is derived-only
   ==========================================================================*/
/* `hsn` is our code for the line; `invoiceHsn` is the code the customer printed.
   They are kept apart because they disagree often enough to be worth saying so
   — a customer's classification is their filing, not ours.
   `pred` / `predState` carry the master prediction for the row, `hsnPred` the
   code prediction. Both are row state, not derived, so a proposal survives a
   re-render and a dismissal stays dismissed. */
/* `hsnPredState` runs the code proposal the way `predState` runs the master
   one: a code inferred from the description is offered, never applied. Only a
   code with an authority behind it — a master, a classification, or a human —
   is allowed to sit in the field looking like a value.
   `hsnConsent` records what was asked of the master and answered: '' means
   nothing was asked, 'updated' means the book now carries the code, 'declined'
   means the user kept the master as it was and the invoice syncs specified. */
const blankItem = ()=>({id:uid(),sel:false,description:'',item:'',kind:'goods',hsn:'',invoiceHsn:'',invoiceRate:null,invoiceUnit:'',
                        hsnFrom:'',hsnDismissed:false,godown:'',
                        costCentre:'',ccSplit:null,qty:0,rate:0,discount:0,discountType:'pct',tax:'',
                        amountOverride:null,pred:null,predState:'',hsnPred:null,hsnPredState:'',hsnConsent:'',hsnRateMoved:false});
const blankLedger = ()=>({id:uid(),sel:false,description:'',ledger:'',hsn:'',invoiceHsn:'',invoiceRate:null,
                          hsnFrom:'',hsnDismissed:false,costCentre:'',ccSplit:null,
                          tax:'',amount:0,pred:null,predState:'',hsnPred:null,hsnPredState:'',hsnConsent:'',hsnRateMoved:false});

let state;

function freshState(){
  return {
    mode:'item', ccMode:'centre',
    branch:'', voucherType:'sales', voucherNo:'', voucherDate:today(), invoiceDate:'', dueDate:'',
    customerPoNo:'', costCentreClass:'', invoiceCostCentre:'',
    customer:'', customerCostCentre:'', customerCcSplit:null, billingAddress:'', gstTreatment:'', gstin:'',
    sourceState:'', destState:'',
    salesLedger:'',
    narration:'',
    extra:{},                        // whatever the optional groups are showing
    /* Where each extra value came from. A field the document supplied and a
       field the user typed are the same value with different standing: only
       the first can be withdrawn on the grounds that nobody asked for it. */
    extraFrom:{},
    items:[blankItem()], ledgers:[blankLedger()], stashedItems:null,
    taxLines:[], dismissedLines:[], adjustments:[],
    /* Masters this invoice will add to the book. They are live the moment they are
       created — every picker, the GST breakdown and the TDS engine see them at
       once, because a master you cannot post to is not one — but they belong to
       the draft until it is allocated, so discarding the invoice takes them with
       it. `newMasters` is what the posting summary names and what reset sweeps
       back out of MASTERS. */
    newMasters:[],
    /* A reviewed create form produces a pending record. It is deliberately not
       placed in MASTERS until approval: the field can name it, validation can
       inspect it, and the approval pass can create valid records independently
       without pretending the ERP-facing master already exists. */
    salesLedgerSuggestion:null,
    /* The party the invoice names, when the book holds no master for it. Held the
       same way the sales ledger's proposal is, and for the same reason: it
       is a record this invoice would add, not a value on the invoice, so it waits in
       state until somebody answers it rather than being written on arrival.

       It used to be a modal. The extraction opened the create-customer form over
       the sheet before the reader had seen the invoice — the one prediction on
       this screen that demanded an answer instead of offering one. Now it is
       an offer, like every other. */
    customerSuggestion:null,
    customerPredReason:'',
    /* what the document printed at the top of itself — the evidence the customer
       match rests on, and what a new customer master is built from */
    printedCustomer:null,
    /* Which of the three withholdings this invoice carries. They are exclusive:
       an invoice deducts TDS, or bears TCS, or carries some other statutory head
       — not two at once. The lines of the modes not chosen stay in taxLines
       and come back on switching, but only the chosen mode's lines post. */
    deductionMode:'tds',
    /* null means the section has not been touched, and decides for itself:
       open if it holds lines, shut if it does not. Once a caret is clicked
       the answer is a boolean and the section keeps it. */
    secOpen:{gst:null, ded:null, adj:null},
    /* How this invoice divides the party's credit across references. Empty until
       the allocation dialog is confirmed, and it is the voucher's own record
       of the split — what the journal prints under the party line. */
    billRefs:[],
    /* What the allocation did to the book, kept so it can be undone. References
       this invoice wrote, and the pending it took off references it settled: the
       same bargain the drafted masters are held under, for the same reason —
       an invoice that is discarded, or replaced by the next one, has to leave the
       party's outstandings as it found them. */
    newRefs:[], knockedRefs:[],
    validated:false, document:null, allocated:false
  };
}

/* ============================================================================
   4. CALCULATION ENGINE
   --------------------------------------------------------------------------
   Line   : gross = qty x rate; discount % or flat; taxable = gross - discount
            (a hand-typed Amount overrides the computed figure)
   GST    : source state == destination state -> CGST + SGST (half each)
            otherwise                         -> IGST (full rate)
            Composition / Export customers are not charged GST.
   TDS    : what the customer will withhold when they pay, on taxable value
            only (GST excluded, CBDT circ. 23/2017), subject to per-invoice and
            FY-aggregate thresholds. It comes off the receivable.
   TCS    : what we collect from them, u/s 206C(1H), on the value crossing the
            50 lakh FY threshold. It goes onto the receivable.
   Receivable: sub total + GST ± the statutory head + adjustments, rounded to
            the rupee. Which sign applies is the mode's, not a constant.
   ==========================================================================*/
function lineOf(row){
  const gross = num(row.qty)*num(row.rate);
  const disc  = row.discountType==='pct' ? gross*num(row.discount)/100 : num(row.discount);
  const computed = Math.max(0, gross-disc);
  const taxable = row.amountOverride===null||row.amountOverride===undefined ? computed : num(row.amountOverride);
  const rate = byId(MASTERS.taxes,row.tax)?.rate ?? 0;
  return {gross:r2(gross),disc:r2(disc),computed:r2(computed),taxable:r2(taxable),rate,tax:r2(taxable*rate/100)};
}
function ledgerLineOf(row){
  const taxable = num(row.amount);
  const rate = byId(MASTERS.taxes,row.tax)?.rate ?? 0;
  return {taxable:r2(taxable),rate,tax:r2(taxable*rate/100)};
}
function gstApplies(){
  return !['composition','overseas'].includes(state.gstTreatment);
}
function isIntraState(){
  if(!state.sourceState || !state.destState) return null;
  return state.sourceState===state.destState;
}

/* --- suggestions: what the engine thinks the tax / TDS lines should be ---- */
function suggestTaxLines(){
  const intra = isIntraState();
  if(intra===null || !gstApplies()) return [];
  const slabs = new Map();
  const add = (rate,base)=>{ if(rate) slabs.set(rate, r2((slabs.get(rate)||0)+base)); };
  if(state.mode==='item') state.items.forEach(r=>{const l=lineOf(r); add(l.rate,l.taxable)});
  state.ledgers.forEach(r=>{const l=ledgerLineOf(r); add(l.rate,l.taxable)});

  const out = [];
  [...slabs.entries()].sort((a,b)=>a[0]-b[0]).forEach(([rate,base])=>{
    if(intra){
      out.push({type:'gst',key:`CGST-${rate}`,name:`Output CGST ${rate/2}%`,rate:rate/2,base,amount:r2(base*rate/200)});
      out.push({type:'gst',key:`SGST-${rate}`,name:`Output SGST ${rate/2}%`,rate:rate/2,base,amount:r2(base*rate/200)});
    }else{
      out.push({type:'gst',key:`IGST-${rate}`,name:`Output IGST ${rate}%`,rate,base,amount:r2(base*rate/100)});
    }
  });
  return out;
}

/* The statutory heads this invoice carries, worked out from what is on it.

   Both directions are suggested on every invoice and the mode switch decides
   which one is live, because the two are different questions about the same
   sheet and the answer to neither depends on which is being looked at.

   Who holds the PAN changes sides here, and it is the easiest thing to get
   backwards. On a sales invoice we were the deductor and the customer was the
   deductee, so their PAN drove 206AA and their entity type drove the 194C
   rate. On a sales invoice the customer deducts and *we* are the deductee — so
   the TDS rate is a fact about this book, not about them, and 206AA cannot
   arise at all because a book always has its own PAN. What the customer's PAN
   still decides is TCS: s.206CC collects at 1% instead of 0.1% from a buyer
   who has not furnished one. */
function suggestTdsLines(){
  /* A proposed party prices the invoice exactly as a recorded one does: the
     year-to-date of a customer the book has never invoiced is zero, which is a
     number and not an absence, so thresholds are measured from this invoice —
     which is the truth about a first invoice. Returning [] here, which is what
     a missing master used to mean, put ₹0.00 against a head that was owed. */
  const v = byId(MASTERS.customers,state.customer) || state.customerSuggestion;
  if(!v) return [];
  const us  = COMPANY;
  const out = [];

  /* --- services: what the customer will withhold when they pay -------------
     Grouped by the section the income ledger falls under. The threshold is
     measured on what this customer has been invoiced for services this year,
     because that is the aggregate their own deduction is tested against. */
  const bySection = new Map();
  state.ledgers.forEach(r=>{
    const led = byId(MASTERS.incomeLedgers,r.ledger);
    if(!led?.tds) return;
    const e = bySection.get(led.tds) || {base:0,single:0};
    e.base = r2(e.base + num(r.amount));
    e.single = Math.max(e.single, num(r.amount));
    bySection.set(led.tds, e);
  });
  bySection.forEach((e,secId)=>{
    const sec = byId(MASTERS.tdsSections,secId);
    const priorFY = v.fyServices;
    const crossesSingle = sec.single ? e.single >= sec.single : true;
    const crossesAnnual = (priorFY + e.base) >= sec.annual;
    const applies = crossesSingle || crossesAnnual;
    /* our own status, not the customer's — we are the deductee here */
    const rate = (sec.rateIndividual && us.deductee==='individual') ? sec.rateIndividual : sec.rate;
    out.push({
      type:'tds', key:secId, section:secId, name:sec.name, rate:applies?rate:0, base:e.base,
      amount:applies?r2(e.base*rate/100):0,
      note: applies
        ? `${v.name} will deduct — `+(crossesSingle&&sec.single?`single payment ≥ ${money(sec.single)}`:`FY aggregate ≥ ${money(sec.annual)}`)
        : `below threshold — not deducted`,
      detail:`Single ${money(sec.single)} / annual ${money(sec.annual)} · invoiced to this customer this FY ${money(priorFY)} + ${money(e.base)}`
    });
  });

  /* --- goods: 206C(1H) on the value crossing the 50 lakh FY threshold ------
     The exact mirror of the 194Q test that used to live here: same threshold,
     same excess-only base, opposite side of the transaction. */
  {
    // in accounting mode the goods sit on sales-ledger lines instead of items
    const goodsValue = state.mode==='item'
      ? r2(state.items.reduce((s,r)=>s+lineOf(r).taxable,0))
      : r2(state.ledgers.filter(r=>byId(MASTERS.salesLedgers,r.ledger))
                        .reduce((s,r)=>s+num(r.amount),0));
    if(goodsValue>0){
      const sec = byId(MASTERS.tcsSections,'206C1H');
      const prior = v.fyGoods;
      const cumulative = r2(prior+goodsValue);
      const excess = r2(Math.max(0, cumulative - sec.annual));
      const chargeable = r2(Math.min(goodsValue, excess));
      const rate = v.pan ? sec.rate : 1;                   // s.206CC — buyer has no PAN
      out.push({
        type:'tcs', key:'206C1H', section:'206C1H', name:sec.name, rate:chargeable>0?rate:0,
        base:chargeable, amount:chargeable>0?r2(chargeable*rate/100):0,
        note: chargeable>0
          ? (v.pan?'':'No PAN — 1% u/s 206CC · ')+`only the value above the ${money(sec.annual)} FY threshold`
          : `below the ${money(sec.annual)} FY threshold — not collected`,
        detail:`FY sales to this customer ${money(prior)} + ${money(goodsValue)} = ${money(cumulative)}`
      });
    }
  }
  return out;
}

/* Merge engine suggestions into the editable lines: untouched rows follow the
   engine, hand-edited rows are left alone, user-added rows always survive. */
function syncLines(listName, suggestions){
  const list = state[listName];
  const seen = new Set();
  suggestions.forEach(s=>{
    if(state.dismissedLines.includes(s.key)) return;   // user removed this line
    seen.add(s.key);
    const found = list.find(l=>l.key===s.key);
    if(!found){ list.push({id:uid(),auto:true,touched:false,...s}); }
    else if(!found.touched){ Object.assign(found,s); }
  });
  for(let i=list.length-1;i>=0;i--){
    const l = list[i];
    if(l.auto && !l.touched && !seen.has(l.key)) list.splice(i,1);
  }
}

/* ============================================================================
   4b. PREDICTION
   --------------------------------------------------------------------------
   Where the sheet used to leave a line empty and wait, it now says what it
   thinks and why. Three things govern it:

   1. Evidence, not scores. A prediction carries the rule that produced it —
      a code on the invoice, a count of past invoices, or an admission that all it
      has is a word in common. There is no percentage and no Confidence
      column, because a count is checkable at the customer ledger and a
      percentage is only checkable against itself.

   2. The consequence decides the interaction, not the confidence. Naming an
      income ledger picks a nature of payment, and that moves the deduction.
      So a prediction that changes no money is applied and reported; one that
      moves a rupee is proposed and waits. That is why HSN fills itself in
      (rates are carried by the master, so a code costs nothing on this invoice)
      and a ledger that adds a TDS section does not.

   3. A resemblance is never posted on. If all the engine has is a word in
      common, the honest answer is not that master — it is that the master
      this line needs does not exist yet. The resemblance stays on the sheet
      as the thing considered and rejected, because naming what was ruled out
      is what stops the offer above it from reading as a shrug.

   Two questions, not one ladder
   ----------------------------
   Every prediction answers two independent questions, and collapsing them
   into a single ranking is what made the earlier version wrong:

     EVIDENCE   — how the engine got here. Read off the invoice, our own past
                  coding, or inferred from the words.
     RESOLUTION — whether the answer exists in the book. Point at a master we
                  hold, or author one we do not.

   They combine freely. A code the customer printed that no ledger in this
   book carries is the strongest evidence there is *and* a master that does
   not exist — and it is the single best reason to create one. Ranked on one
   ladder, that case fell to the bottom and reported itself as "nothing
   matches", throwing away the very code it then went on to use.

   One rule crosses the two: pointing at a master we hold beats authoring a
   new one, whatever the evidence, because creating a record is the more
   consequential act. Within "point at one we hold", the invoice still outranks
   our habits.
   ==========================================================================*/
/* the lead each evidence tier prints, which is a claim about where the answer
   came from and never about whether it exists */
const EVIDENCE = {
  invoice:    'Read off the invoice',
  habit:   'Your own past coding',
  inferred:'Read from the description'
};
const PRED_WORD = s=>String(s||'').toLowerCase().match(/[a-z0-9]+/g)||[];
const PRED_STOP = new Set(['of','and','the','for','with','per','nos','set','pack','box','each','our','from','job']);
const customerShort = ()=>(byId(MASTERS.customers,state.customer)?.name||'').split(/[\s,]+/)[0]||'this customer';

/* What the code the customer printed can tell us, which is three different
   things and not one. Exactly one master on the code is a match. Two or more
   is a shortlist, which is not an answer. And none at all is not silence — it
   is the invoice naming a classification this book has no ledger for, which is
   evidence of the strongest kind that a master is missing. The old version
   returned an id or null and threw the last case away. */
function sacHit(row,route){
  const code = String(row.invoiceHsn||'').trim();
  if(!code) return null;
  const pool = route==='ledger' ? MASTERS.incomeLedgers.filter(l=>l.sac===code)
                                : MASTERS.items.filter(i=>i.hsn===code);
  if(pool.length===1) return {code, target:pool[0].id};
  if(pool.length)     return {code, target:null, ambiguous:true, n:pool.length};
  return {code, target:null, unheld:true};
}
/* Does anything in the book carry this code? Asked of both pools, because an
   HSN on an item and a SAC on an income ledger are the same field wearing
   two names, and a code is new to the book only if neither holds it. */
const codeHeld = code => !!String(code||'').trim() &&
  (MASTERS.items.some(i=>i.hsn===code) || MASTERS.incomeLedgers.some(l=>l.sac===code));

/* ============================================================================
   §1 L2 — THE FEEDBACK LOOP
   ----------------------------------------------------------------------------
   `MASTERS.coding` is what this book did before this sheet existed: a fixed
   table, edited by hand, and the same on every invoice. This is the other half —
   what the person reading *this* invoice did about it, kept, and read back on the
   next one. It is the only part of the prediction that changes by being used.

   Four things are stored, and the keys are the requirement's own:

     line            customer + description  → the item or ledger they chose
     salesLedger  customer                → the sales ledger they posted to
     route           customer + description  → item or ledger, which table it is
     suppressed      customer                → stop reading descriptions for them

   **A correction overrides, it never blends.** There is no counter and no
   weighting between what the model thought and what it was told: the last
   answer a human gave for this customer and this wording is the answer. Blending
   would mean a user correcting the same line twice and watching it come back a
   third time, which teaches them the correction does not work.

   That is also why it sits *above* the printed code in the ladder. Everywhere
   else on this sheet the invoice outranks our habits, and that is right — but a
   correction is not a habit. It is somebody having already seen this exact
   argument, code and all, and having said no. Ranking it below the thing it
   overruled would be the sheet re-making a case it has already lost.

   Kept in localStorage so it survives a reload, which is the only way "the next
   invoice" means anything on a prototype with one invoice in it. Where storage is
   unavailable — some file:// contexts — it degrades to memory for the session
   and nothing else changes. `resetFeedback()` is the way back to a blank book.
   ------------------------------------------------------------------------- */
const FB_KEY = 'aia.ar.feedback.v1';
const FB_BLANK = ()=>({line:{}, salesLedger:{}, route:{}, suppressed:{}, misses:{}});
let FEEDBACK = FB_BLANK();
function fbLoad(){
  try{ const raw = localStorage.getItem(FB_KEY);
       if(raw) FEEDBACK = {...FB_BLANK(), ...JSON.parse(raw)}; }
  catch(e){ /* memory only, which is a working sheet with a shorter memory */ }
}
function fbSave(){
  try{ localStorage.setItem(FB_KEY, JSON.stringify(FEEDBACK)); }catch(e){}
}
function resetFeedback(){ FEEDBACK = FB_BLANK(); fbSave(); }

/* The description, reduced to what is the same about it from one invoice to the
   next. Quantities, dates, order numbers and the aside after the dash all
   change every month while naming the same thing, so they come off — the same
   cut `ledgerNameFrom` makes, for the same reason. What is left is the key. */
function fbDescKey(desc){
  return String(desc||'')
    .split(/\s+[—–-]\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
const fbKey = (customer,desc)=>`${customer||'-'} ${fbDescKey(desc)}`;

/* How many corrections against description-derived predictions it takes before
   this book stops offering them for a customer. §8 leaves the real thresholds to
   the model team; this is a placeholder that is honest about being one, and it
   is here so the *behaviour* either side of it can be seen and argued about. */
const FB_SUPPRESS_AFTER = 3;

/* What was chosen, for a line the sheet had an opinion about. `wasInferred` is
   whether the opinion it is overruling came from reading the description —
   that is the signal suppression counts, because a wrong code or a wrong habit
   is a wrong fact, and a wrong resemblance is a method that is not working for
   this customer. */
function fbRecordLine(row,route,targetId,{wasInferred=false}={}){
  const v = state.customer; if(!v || !targetId) return;
  const key = fbKey(v,row.description); if(!fbDescKey(row.description)) return;
  FEEDBACK.line[key] = {route, target:targetId};
  /* §1 L3, the second half: customer-level primary, company-level fallback. The
     same answer is filed a second time under no customer at all, so a wording
     this book has coded once is coded that way for a customer it has never
     seen. It is written unconditionally and read only when the customer's own
     shelf is empty — the fallback never overrules the customer, it only speaks
     where the customer is silent.

     Last answer wins at the company level, which is the honest reading of a
     store with one slot: this is what the book most recently decided a line
     like this is, not a vote across everyone who ever coded one. */
  FEEDBACK.line[fbKey('',row.description)] = {route, target:targetId};
  /* The routing signal, kept per customer rather than per line: which table this
     customer's lines actually end up in, counted. It is what tips the
     cross-route reading for wordings nobody has corrected yet — a customer who
     invoices services with quantities on them will teach this once and have it
     apply to the next twelve lines, which is the whole value of it. */
  const bias = FEEDBACK.route[v] ||= {item:0, ledger:0};
  bias[route] = (bias[route]||0) + 1;
  if(wasInferred){
    FEEDBACK.misses[v] = (FEEDBACK.misses[v]||0) + 1;
    if(FEEDBACK.misses[v] >= FB_SUPPRESS_AFTER) FEEDBACK.suppressed[v] = true;
  }else if(FEEDBACK.suppressed[v]){
    /* "Overriding a suppressed route re-enables description reading for that
       customer." Answering a line by hand while the route is off is the user
       telling the book to try again — so the count goes back to nothing rather
       than to one below the threshold, which would switch it off again on the
       very next correction. */
    delete FEEDBACK.suppressed[v];
    FEEDBACK.misses[v] = 0;
  }
  fbSave();
}
/* §1 L3's second key: `customer → sales ledger`, which the requirement says
   "learns across multiple sales accounts". One slot per customer could not do
   that — it only ever remembered the last invoice, so a customer billing local
   supply eleven times and interstate once would be offered the interstate
   account for having done it most recently. So the store is a tally: every
   choice is counted against the account it went to, and the reading is the
   account this customer's invoices have actually gone to most often.

   A string left by the previous shape is read as a single count of one, so a
   book that has been learning for a month does not forget what it learned. */
const fbLedgerCounts = tally => !tally ? {}
  : typeof tally==='string' ? {[tally]:1} : {...tally};

function fbRecordSalesLedger(customerId,ledgerId){
  if(!customerId || !ledgerId) return;
  const counts = fbLedgerCounts(FEEDBACK.salesLedger[customerId]);
  counts[ledgerId] = (counts[ledgerId]||0) + 1;
  FEEDBACK.salesLedger[customerId] = counts;
  fbSave();
}
/* The account, and what it is out of — the count is the evidence, and it is
   checkable against the customer ledger in a way a preference is not. An account
   the book has since lost is not an answer, so it is skipped while still
   counting towards the total: "3 of 5" stays true about what happened. */
function fbSalesLedgerHit(customerId){
  const counts = fbLedgerCounts(FEEDBACK.salesLedger[customerId]);
  let best = null, of = 0;
  for(const [id,n] of Object.entries(counts)){
    of += n;
    if(!byId(MASTERS.salesLedgers,id)) continue;
    if(!best || n>best.n) best = {id, n};
  }
  return best ? {...best, of} : null;
}
/* Read back. The target has to still exist — a ledger the book has since lost
   is not an answer, and offering it would be the loop outliving its own book. */
function fbLineHit(row){
  if(!fbDescKey(row.description)) return null;
  const look = key => {
    const rec = FEEDBACK.line[key]; if(!rec) return null;
    const held = rec.route==='item' ? byId(MASTERS.items,rec.target)
                                    : byId(MASTERS.incomeLedgers,rec.target);
    return held ? {...rec, name:held.name} : null;
  };
  /* Customer first, and only then the book. `own` is which of the two answered,
     and it is carried out of here rather than worked out again by the caller,
     because the row has to say which — "you coded this on a past Technovan invoice"
     and "on a past invoice in this book" are different claims and the weaker one
     may not borrow the stronger one's sentence. */
  const own = state.customer ? look(fbKey(state.customer,row.description)) : null;
  if(own) return {...own, own:true};
  const org = look(fbKey('',row.description));
  return org ? {...org, own:false} : null;
}
/* Where a feedback hit came from, in the words the row prints. */
const fbWhere = fb => fb.own ? `a past ${customerShort()} invoice` : 'a past invoice in this book';
const fbSuppressed = ()=>!!FEEDBACK.suppressed[state.customer];
/* Which way this customer's corrections have gone, as a single number: positive
   means their lines keep turning out to be ledgers, negative means items, zero
   means nobody has said. */
const fbRouteBias = ()=>{
  const b = FEEDBACK.route[state.customer]; if(!b) return 0;
  return (b.ledger||0) - (b.item||0);
};

/* Habit — what this book did the last time it saw a line like this. A pattern
   the customer themselves established outranks one the whole book did, and a
   longer keyword outranks a shorter one, so "cable tray" beats "cable". */
function codingHit(row,route){
  const text = String(row.description||'').toLowerCase();
  if(!text.trim()) return null;
  let best = null;
  MASTERS.coding.forEach(c=>{
    if(c.route!==route) return;
    if(c.customer && c.customer!==state.customer) return;
    const hit = c.kw.split('|').filter(k=>text.includes(k)).sort((a,b)=>b.length-a.length)[0];
    if(!hit) return;
    const rank = (c.customer?1000:0) + hit.length;
    if(!best || rank>best.rank) best = {rank,target:c.target,n:c.n,of:c.of,own:!!c.customer};
  });
  return best;
}

/* Resemblance — words in common with a master's name, and nothing more. It
   returns the words so the row can print them: naming the evidence is what
   stops this tier from being mistaken for the one above it. */
function guessHit(row,route){
  const want = PRED_WORD(row.description).filter(w=>w.length>3 && !PRED_STOP.has(w));
  if(!want.length) return null;
  const pool = route==='ledger' ? MASTERS.incomeLedgers : MASTERS.items;
  let best = null;
  pool.forEach(m=>{
    const have = new Set(PRED_WORD(m.name).filter(w=>w.length>3 && !PRED_STOP.has(w)));
    const words = [...new Set(want.filter(w=>have.has(w)))];
    if(!words.length) return;
    const score = words.length / Math.max(1,have.size);
    if(!best || words.length>best.words.length || (words.length===best.words.length && score>best.score))
      best = {target:m.id, words, score};
  });
  return best;
}

/* The book identifies a master by its name, so a draft whose name is already on
   the shelf is not a record to write — it is the record that is there. Checked
   against the whole list rather than only this invoice's additions, because a name
   collision with a master the book has always held is the same duplicate; the
   two are told apart afterwards so the row can say which happened.

   Exact, after trimming and case: a resemblance is not enough to merge on, for
   the same reason it is not enough to post on. Those are carried to the create
   form instead — see `nearMasterForDraft`, which is where §6 asks for them and
   where the person is actually looking at the record. */
function twinOf(draft,route){
  const name = String(draft.name||'').trim().toLowerCase();
  if(!name) return null;
  const pool = route==='item' ? MASTERS.items : MASTERS.incomeLedgers;
  const hit  = pool.find(m=>String(m.name||'').trim().toLowerCase()===name);
  if(!hit) return null;
  return {id:hit.id, name:hit.name, onThisInvoice:state.newMasters.some(m=>m.id===hit.id)};
}

/* The words a name is compared on, once the ones too short or too common to
   carry a resemblance have come off. */
const predWords = s => PRED_WORD(s||'').filter(w=>w.length>3 && !PRED_STOP.has(w));

/* A resemblance is advisory. Exact names are rejected by validation; a close
   name is shown in the create form with both valid exits. Singularising the
   last token is enough for the prototype's important case (Charge/Charges)
   without pretending to be a production deduplication policy. */
/* The resemblance keeps three-letter words; the prediction tiers do not.

   `predWords` drops anything that short because, when it is matching a
   description against master names, "set" and "box" and "job" are noise. Here
   they are the opposite. This book's shortest words are its most specific ones
   — TDS, TCS, GST, RCM, ITC — and dropping them reduced `TCS Payable` to
   `{payable}` and `TDS Payable — 194C` to `{payable, 194c}`, which is a half
   match on a generic noun after the two tokens carrying the entire difference
   had been thrown away. The stop list already holds every three-letter word
   that is genuinely filler. */
const nearWords = s => PRED_WORD(s)
  .filter(w=>w.length>2 && !PRED_STOP.has(w))
  .map(w=>w.length>4&&w.endsWith('s')?w.slice(0,-1):w);
/* How much of the longer name has to match before two records are worth
   confusing. At a half, a name wholly contained in a longer one cleared the
   bar on the strength of being contained: `Plant & Machinery` matched
   `Rent — Plant & Machinery` at two words out of three, and the form offered
   to post a capital sales to a rent ledger. But that extra word is the
   whole point of the existing master — `Rent — X`, `Input X`, `X — Interstate`
   are the shapes a book uses to say *deliberately not the other one*.

   Three quarters keeps what the requirement actually names — "Printing Charge"
   against "Printing Charges", which is the same word set after singularising
   and scores a full one — and drops the subset-plus-qualifier case, which is
   not a near-duplicate but a sibling. */
const NEAR_MIN = 0.75;

function nearMasterForDraft(d){
  /* Never for a tax ledger. A duties-and-taxes ledger is not identified by its
     name — it is identified by the head and the rate it carries, or by the
     section it is for, and `taxLedgerHit` is what decides whether the book
     already holds one. This draft exists precisely because that check came back
     empty, so there is no existing master to point at.

     What the resemblance found instead was the family: `Input CGST 6%` shares
     "input" and "cgst" with `Input CGST 9%` and scores well over the threshold.
     So the form offered to reuse a 9% ledger for a 6% line — the one substitution
     that silently changes what the invoice posts — and the panel behind it was
     saying the opposite at the same time. Two of the same head at different
     rates are not near-duplicates; they are the two ledgers a book that buys at
     two rates is supposed to have. */
  if(d.kind==='tax') return null;
  /* Compared against the list this record is actually being added to, not
     against every ledger in the book. You cannot duplicate a record in a list
     you are not writing to: an income ledger drafted from a line is filed with
     the income ledgers, and the reverse-charge, blocked-credit and
     duties-and-taxes lists are reached from their own places on the sheet and
     identified by what they are for rather than by what they are called.

     Comparing across them is what let a drafted `TCS Payable` be measured
     against `TDS Payable — 194C` — a duties ledger, on the strength of the one
     word they share.

     The exact-name check is deliberately not scoped this way: `nameTaken` still
     asks the whole book, because a ledger name has to be unique company-wide
     whatever list it sits in. Identity is company-wide; resemblance is only
     meaningful inside the family. */
  const pool = d.kind==='item' ? MASTERS.items
    : d.kind==='customer' ? MASTERS.customers
    : (NM_LIST[d.kind]?.() || MASTERS.incomeLedgers);
  const exact = String(d.name||'').trim().toLowerCase();
  const want = new Set(nearWords(d.name));
  if(!exact || !want.size) return null;
  let best = null;
  pool.forEach(m=>{
    if(String(m.name||'').trim().toLowerCase()===exact) return;
    const have = new Set(nearWords(m.name));
    const shared = [...want].filter(w=>have.has(w));
    const score = shared.length / Math.max(want.size,have.size,1);
    if(score>=NEAR_MIN && (!best || score>best.score)) best={...m,score};
  });
  return best;
}

/* --- the fourth tier: the master does not exist yet ------------------------
   Three tiers ask which master we hold this line belongs to. When none of them
   can answer, the line is not a mystery — it is a master the book is missing,
   and the engine knows enough about it to draft one. Everything below is read
   off the invoice or off the description; nothing is invented, and each field
   carries where it came from so the dialog can print it.
   ------------------------------------------------------------------------ */

/* Title case that leaves alone anything already carrying its own case — a
   part number, a size, an acronym. "powder coated 1200mm" becomes "Powder
   Coated 1200mm" and "Onsite AMC" stays "Onsite AMC". */
const titleCase = s=>String(s||'').trim().split(/\s+/).map(w=>
  /\d/.test(w) || (w.length>1 && w===w.toUpperCase()) ? w
  : w.split('-').map(p=>p ? p[0].toUpperCase()+p.slice(1).toLowerCase() : p).join('-')
).join(' ');

/* An item is named in the customer's words, because the wording is the product.
   Only the verb the invoice opens with comes off — "Sales of i3 Desktop" is
   the customer describing the transaction, not the thing. */
const itemNameFrom = d => titleCase(String(d||'').replace(/^(sales|supply|sale|sales)\s+(of\s+)?/i,''));

/* A ledger is named for the kind of income, not for the instance of it:
   "E-Waste Disposal & Recycling", not "…of the units replaced in July". The
   heading has to still be true on the next invoice, so everything that ties the
   sentence to this one comes off — the quantities, the dates, the aside after
   the dash, and the "of what" clause. */
function ledgerNameFrom(desc){
  let s = String(desc||'').split(/\s+[—–-]\s+/)[0];          // the aside after the dash
  s = s.split(/\s+(?:of|for|to)\s+/i)[0];                    // "…of the replaced units"
  s = s.replace(/[,(].*$/,'');                               // "…, 1 year"
  s = s.replace(/\s*\b\d[\w./]*\b\s*/g,' ');                 // stray quantities
  return titleCase(s) || titleCase(desc);
}

/* The group is not asked for when the book can answer it: items sharing the
   heading of this HSN are already filed somewhere, and that is where this one
   belongs. Four digits, because that is the level the heading is about. */
function groupForHsn(hsn){
  const head = String(hsn||'').slice(0,4);
  if(head.length<4) return '';
  const tally = new Map();
  MASTERS.items.filter(i=>String(i.hsn).slice(0,4)===head)
    .forEach(i=>tally.set(i.group,(tally.get(i.group)||0)+1));
  return [...tally.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
}

/* An item's group has to be predicted for the same reason a ledger's does —
   the master is now written without being asked, so a field left blank would
   file it under nothing. It cannot borrow `predictGroup`: that one answers in
   chart-of-accounts groups, and filing a cable tray under Indirect Incomes is
   not a shelf in the item book.

   Three tiers, strongest first, and each says which one answered — the HSN
   heading is the book's own filing of this classification, the nearest item is
   the same matcher the row uses to say "closest is …", and the goods/service
   call is the last thing left that is still a fact about the line rather than a
   guess about the shelf. Nothing after that: a fourth tier would be picking the
   book's commonest group, which is not a statement about this line at all, and
   the group is asked for once in the confirmation instead. */
function predictItemGroup(row,hsn){
  const head = String(hsn||'').slice(0,4);
  const byHsn = groupForHsn(hsn);
  if(byHsn) return {group:byHsn, why:`where this book files HSN ${head}`};

  const near = guessHit(row,'item');
  const nearItem = near && byId(MASTERS.items,near.target);
  if(nearItem) return {group:nearItem.group,
    why:`this book files ${nearItem.name} there, and the two lines share “${near.words.join('”, “')}”`};

  const t = String(row.description||'').toLowerCase();
  if(row.kind==='service' || SERVICE_WORDS.test(t)){
    const svc = groupsOf(MASTERS.items).find(g=>/^services\b/i.test(g));
    if(svc) return {group:svc, why:'this line describes work done, not a thing bought'};
  }
  return {group:'', why:''};
}

/* The nature of payment is what a new income ledger costs, so it is derived
   from the code rather than picked out of the air: ledgers we already hold on
   this SAC were given a section by someone, and the same code is the same kind
   of work. Failing an exact code, the SAC heading. Failing that it stays
   empty, which means no deduction — said out loud rather than assumed. */
function tdsForSac(sac){
  const code = String(sac||'').trim();
  if(!code) return '';
  const exact = MASTERS.incomeLedgers.filter(l=>l.sac===code);
  if(exact.length) return exact[0].tds;
  const head = code.slice(0,4);
  const near = MASTERS.incomeLedgers.filter(l=>String(l.sac).slice(0,4)===head && l.sac);
  if(!near.length) return '';
  const tally = new Map();
  near.forEach(l=>tally.set(l.tds,(tally.get(l.tds)||0)+1));
  return [...tally.entries()].sort((a,b)=>b[1]-a[1])[0][0];
}

/* Within Indirect Incomes, this book files by nature of payment — so once the
   chart has said Indirect Incomes, the section says which shelf of it. */
const GROUP_FOR_TDS = {'194C':'Contracted work','194J-tech':'Professional','194J-prof':'Professional',
  '194I-pm':'Rent & finance','194I-bld':'Rent & finance','194H':'Rent & finance','194A':'Rent & finance'};
const groupForTds = tds => GROUP_FOR_TDS[tds] || 'No TDS';

/* --- predicting Under ------------------------------------------------------
   Tally's chart is twenty-eight groups, and that is what makes this worth
   predicting at all: the answer is one of a closed set, so a wrong guess is
   correctable in one click rather than being a blank field on a form with a
   thousand-line dropdown behind it.

   The ladder runs strongest evidence first and stops at the first hit. Every
   rung returns the sentence it would print under the field, because a group
   this book cannot explain is one the user has no way to check.

   Note what is not in here: nothing guesses a Primary group, and nothing
   guesses Sundry Creditors. The customer is a customer master, not a charge line
   on their own invoice, and an invoice that made one would be filing the customer twice. */
const CAPITAL_CHAPTERS = ['8471','8528','8443','8517','8525','8504','8541','9401','9403','8415','8418'];

/* Words that change what kind of thing the line is, not merely which shelf it
   sits on — so they outrank even this book's own filing of the code. An advance
   against housekeeping is an advance, however the book files housekeeping; a
   deposit is refundable whatever it is a deposit for. Getting this wrong does
   not misfile a cost, it books an asset as an income. */
const GROUP_WORDS_STRONG = [
  {g:'Duties & Taxes', kw:'gst payable|tds receivable|tcs payable|output tax|cess payable',
   why:'the description names a tax rather than sales income'},
  {g:'Current Liabilities', kw:'advance received|customer advance|advance payment|advance|refundable deposit|security deposit|rental deposit|caution deposit|earnest money',
   why:'a customer advance or refundable deposit is owed to the customer until earned or returned'},
  {g:'Indirect Expenses', kw:'discount allowed|discount|rebate allowed',
   why:'a discount allowed reduces the amount receivable from the customer'},
  {g:'Indirect Income', kw:'interest received|interest income|scrap sale|gain on sale',
   why:'the description names income outside ordinary sales'}
];
const GROUP_WORDS_WEAK = [
  {g:'Sales Accounts', kw:'sale of goods|goods sold|trading goods|raw material|freight|delivery|packing|service|consulting|maintenance',
   why:'goods, services and delivery charges invoiced to a customer are sales income'}
];
/* A charge line whose description reads as work done is a service however the
   keyword guide coded it — "Onsite AMC — 12 desktops" codes to 8471 off the
   word "desktops" and is still a maintenance contract. This is what stops a
   goods code alone from sending a service to Sales Accounts. */
const SERVICE_WORDS = /\b(amc|maintenance|repair|service|services|fee|fees|charges|rent|rental|subscription|licence|license|installation|commission|consultancy|consulting|audit|training|courier|postage|freight|cartage|housekeep|cleaning|security|advertis|legal|professional|contract|labour|labor)\b/;

/* Same word-start rule the HSN guide uses, for the same reason. */
const firstWord = (list,t) => {
  for(const w of list){
    const hit = w.kw.split('|').filter(k=>kwHit(k,t)).sort((a,b)=>b.length-a.length)[0];
    if(hit) return {group:w.g, parent:w.g, confident:true, why:`${w.why} — “${hit}”`};
  }
  return null;
};

/* Where this book already files ledgers carrying this code. The strongest rung
   there is: not a rule about accounting, but a fact about this book. */
function groupForSac(sac){
  const code = String(sac||'').trim();
  if(!code) return null;
  const at = (list,label) => {
    if(!list.length) return null;
    const tally = new Map();
    list.forEach(l=>tally.set(l.group,(tally.get(l.group)||0)+1));
    const [g,n] = [...tally.entries()].sort((a,b)=>b[1]-a[1])[0];
    return {group:g, why:`${n===list.length&&n>1?'every':n===1?'the':`${n} of the`} ledger${
      list.length>1?'s':''} this book holds on ${label} ${n===1?'is':'are'} filed there`};
  };
  const held = MASTERS.incomeLedgers.filter(l=>l.sac);
  return at(held.filter(l=>l.sac===code), `SAC ${code}`)
      || at(held.filter(l=>l.sac.slice(0,4)===code.slice(0,4)), `SAC ${code.slice(0,4)}`);
}

/* The answer, and the sentence explaining it. `group` is always one of the
   twenty-eight or a sub-group of one; `parent` is which of the twenty-eight it
   ultimately sits under, which is what a Tally sync actually posts against. */
function predictGroup(desc,sac,tds){
  const t = String(desc||'').toLowerCase();

  /* 1. the words that say what kind of thing this is */
  const strong = firstWord(GROUP_WORDS_STRONG,t);
  if(strong) return strong;

  /* 2. what this book has already done with this code */
  const own = groupForSac(sac);
  if(own) return {...own, parent:tallyParentOf(own.group), confident:true};

  /* 3. the ledger this book holds that this line reads most like. The same
        matcher the row itself uses to say "closest is …", so the group and
        that sentence can never name two different ledgers. */
  const near = guessHit({description:desc},'ledger');
  const nearLed = near && byId(MASTERS.incomeLedgers,near.target);
  if(nearLed) return {group:nearLed.group, parent:tallyParentOf(nearLed.group), confident:true,
    why:`this book files ${nearLed.name} there, and the two lines share “${near.words.join('”, “')}”`};

  /* 4. the words that only say which shelf */
  const weak = firstWord(GROUP_WORDS_WEAK,t);
  if(weak) return weak;

  return {group:'Sales Accounts', parent:'Sales Accounts', confident:!!sac,
    why:sac ? 'the invoice classifies goods or services sold to the customer'
            : 'a sales invoice line earns income from the customer'};
}

/* Every ledger opens the same way, whichever of the four it is: in the book's
   own currency, at nothing on the credit side, not tracked bill by bill, and
   with the party block empty — an invoice names the customer, and the customer is a
   customer master, not this. Spread first in each draft so the fields a line can
   actually answer overwrite these rather than the other way round. */
/* What every ledger starts as, whatever group it ends up under. The fields a
   group's own profile decides — cost centres, bill-by-bill — are set by
   `groupDefaults` when Under is answered, so they are absent rather than
   guessed here. */
const ledgerDefaults = ()=>({
  currency:'INR', ledType:'Not Applicable',
  address:'', country:'India', state:'', pincode:'', mobile:'', email:'',
  gstApp:'Not Applicable', pan:'', sac:'', tax:'', tds:'',
  opening:'0', drcr:'Cr',
  /* Tally asks the two Set/Alter questions before it asks what the answers
     are, and the difference is load-bearing: a ledger can be GST-applicable
     and still decline to state a rate. Both start off, and only a line that
     actually carried something turns them on. */
  setAlterHsn:false, setAlterGst:false, gstDate:'',
  roundLimit:'', roundMethod:'',
  taxability:'Taxable', supply:'', treatment:'', gstin:'',
  acHolder:'', bankName:'na', acNo:'', ifsc:'', swift:'', branch:'', bsr:'',
  asDuties:false, dutyType:'', nop:'', nog:'',
  dutyPct:'', deductee:'', statutory:'', credit:''
});

/* `from` is the provenance the dialog prints under each field. A field with no
   entry is one the book cannot answer, and that is the field the user fills. */
/* --- §5, the printed lines that are not supplies ----------------------------
   A customer's line block holds three things that are not what they sold you.
   Freight, packing and insurance are costs of getting the goods here — real
   charges, really incurred, and they belong in Ledgers with everything else the
   invoice made you pay for.

   Discount and round off are different in kind: they do not name a cost, they
   settle the invoice. Nothing was bought and nothing was consumed; the total
   moved. This sheet already has the place for a figure that moves the payable
   without being a supply, and it is Adjustments — so that is where they are
   put, rather than being booked as expenses with a minus sign in front.

   Each carries what Tally needs to recognise it later. A discount ledger is a
   Discount ledger, and a round off is Invoice Rounding with the limit and the
   method stated — because a rounding ledger with no limit on it does not round
   anything, and the value that would be filled in later is knowable now. */
const ROUND_METHODS = ['Normal Rounding','Downward Rounding','Upward Rounding']
  .map(v=>({id:v,name:v}));
const CHARGE_ROUTE = [
  /* Round off is tested first: "rounding discount" is a phrase, and the more
     specific of two overlapping readings is the one that should win. */
  {re:/\bround(?:ing|ed)?[\s-]*off\b|\brounding\b/i, bucket:'adjustment', what:'round off',
   ledType:'Invoice Rounding', roundLimit:'1', roundMethod:'Normal Rounding'},
  {re:/\bdiscount\b|\brebate\b/i, bucket:'adjustment', what:'discount',
   ledType:'Discount', roundLimit:'', roundMethod:''},
  {re:/\bfreight\b|\bcartage\b|\bpacking\b|\bforwarding\b|\binsurance\b/i,
   bucket:'ledger', what:'charge', ledType:'', roundLimit:'', roundMethod:''}
];
const chargeRouteOf = text => CHARGE_ROUTE.find(r=>r.re.test(String(text||''))) || null;

/* New customers default to Sundry Debtors and invoice income to Sales
   Accounts. Evidence-based group suggestions remain reviewable in the picker. */
const BUCKET_GROUP = {
  customer:  'Sundry Debtors',
  sales:'Sales Accounts',
  ledger:  'Sales Accounts',
  tax:     'Duties & Taxes',
  /* This is the visible bucket default required by the invoice workflow. The
     picker remains overridable so an ERP adapter can later translate Stock
     Item to the company's actual stock-group hierarchy. */
  item:    'Stock Item'
};

/* --- the unit ---------------------------------------------------------------
   A unit of measure is not a thing this book may invent. Tally holds units as
   masters of their own and AIA does not create them, so there are exactly three
   answers here and the middle one is the only one that fills the field:

     the invoice states no unit          → Not Applicable, which is an answer
     it states one this book holds    → that one
     it states one this book does not → blank, and the item cannot be created

   The third is the case the whole rule exists for. Defaulting it to Nos — which
   is what this did — writes a master measured in something the customer never
   said, and does it silently, on the one field nothing downstream can correct.
   Blank is the honest answer, and `req` on the field is what turns it into a
   block rather than a shrug. */
/* The unit the user typed on the row, if the book holds it. Nothing is
   inferred — a unit this book has never used is left blank for them to pick,
   which is the one field a new item cannot be written without. */
function unitFromInvoice(row){
  const said = String(row.invoiceUnit||'').trim();
  if(!said) return {v:'Not Applicable', why:'the invoice states no unit'};
  const held = unitsInUse().find(u=>u.toLowerCase()===said.toLowerCase());
  if(held) return {v:held, why:`the invoice states ${said}`};
  return {v:'', why:`the invoice states “${said}”, which is not a unit this book holds`};
}

/* The draft a new item master opens with, built from what is on the row —
   nothing more. The group is the bucket a line-drafted item belongs in and the
   user changes it if it belongs elsewhere; there is no shelf to work out from
   a description nobody but them wrote. */
function draftItem(row){
  /* the code the customer printed outranks one worked out from the wording —
     it is their classification, stated, and ours is only inferred */
  const g   = hsnGuess(row.description);
  const hsn = String(row.invoiceHsn || g?.code || '').trim();
  const grp = predictItemGroup(row,hsn);
  const uom = unitFromInvoice(row);
  const gstRate = row.tax ? rateOfTax(row.tax) : null;
  return {
    kind:'item', id:'', name:itemNameFrom(row.description), group:BUCKET_GROUP.item,
    groupSuggest: grp.group && grp.group!==BUCKET_GROUP.item ? grp : null,
    itemKind:row.kind || 'goods', hsn, unit:uom.v, rate:num(row.rate)||0,
    tax:row.tax || '', godown:'', gstApp:'Applicable', setAlterHsn:!!hsn,
    setAlterGst:gstRate!=null, taxability:'Taxable', taxType:'IGST',
    igstRate:gstRate==null?'':String(gstRate), gstDate:gstRate==null?'':today(),
    from:{
      name:'the customer’s wording on this invoice',
      group:'the shelf an item created from an invoice opens on',
      itemKind:'the row’s goods / service call',
      hsn: row.invoiceHsn ? 'the code the customer printed'
         : (g ? `predicted from the description, to ${g.digits} digits` : ''),
      unit:uom.why,
      rate:num(row.rate) ? 'read off the invoice' : '',
      tax:row.tax ? 'the rate the invoice charged' : '',
      gstApp:'a stock item created from a taxable sales is GST-applicable',
      setAlterHsn:hsn ? 'the invoice carries a code for this line' : '',
      setAlterGst:gstRate!=null ? 'the invoice charged GST on this line'
                               : 'the invoice states no rate, so no rate is invented',
      taxability:'the extracted line is taxable', taxType:'the extracted rate is entered as IGST',
      igstRate:gstRate!=null ? 'the rate the invoice charged' : '',
      gstDate:gstRate!=null ? 'stated from today' : ''
    }
  };
}

/* A charge line is not enough to say a supply is exempt — an invoice can be silent
   about GST for a dozen reasons — so nil is only stated when the invoice states a
   nil rate, and everything else stays Taxable. */
function taxabilityFor(taxId){
  if(!taxId) return {v:'Taxable', why:''};
  const r = rateOfTax(taxId);
  return r===0 ? {v:'Nil Rated', why:'the invoice charged this line at nil'}
               : {v:'Taxable',   why:`the invoice charged ${r}% on this line`};
}

/* Goods or services, off the code's own shape: a six-digit code starting 99 is
   a SAC and everything else in the schedule is goods. Capital goods are a call
   about intent that the code alone cannot make, so it is only said when the
   group prediction has already said the line is being kept.

   The description gets the last word over the code, and it has to: the keyword
   guide reads "Onsite AMC — 12 desktops" as 8471 off the word desktops, and a
   maintenance contract is not goods however its code was arrived at. */
function supplyFor(sac,group,desc){
  if(group==='Fixed Assets')
    return {v:'Capital Goods', why:'this line is being capitalised'};
  const t = String(desc||'').toLowerCase();
  const code = String(sac||'');
  const isSac = code.length>5 && code.startsWith('99');
  if(isSac)  return {v:'Services', why:`SAC ${code} is a service code`};
  if(SERVICE_WORDS.test(t)){
    const hit = t.match(SERVICE_WORDS)[0];
    return {v:'Services', why:`this line describes work done — “${hit}”`};
  }
  /* Nothing said this is a service and no code says otherwise, so it takes the
     default the pre-fill rule states — Goods. Left blank, as it was, this became
     the one required field on the statutory block that a line could never
     answer, and the confirmation would refuse to write an otherwise complete
     ledger over a field the invoice was simply silent about. A default that says
     it is a default is the better failure. */
  if(!code) return {v:'Goods', why:'nothing on the line says otherwise'};
  return {v:'Goods', why:`HSN ${code} is a goods code`};
}

function draftLedger(row){
  const g   = hsnGuess(row.description);
  const sac = String(row.invoiceHsn || g?.code || '').trim();
  const tds = tdsForSac(sac);
  /* The ladder still runs, and still knows that a caution deposit is an asset.
     It is no longer what fills the field — the bucket is — so what it produces
     is carried alongside as the suggestion, offered first in the picker with
     this sentence on the row. */
  const grp = predictGroup(row.description, sac, tds);
  const txb = taxabilityFor(row.tax);
  const sup = supplyFor(sac, grp.parent, row.description);
  return {
    ...ledgerDefaults(),
    /* Drafted from a line's Ledger cell, so the bucket is Ledger and the record
       is an income ledger. Picking Sales Accounts in either the form or the
       confirmation turns it into a sales ledger, which is what
       `kindForGroup` is for — the group is the question, not which of two
       near-identical menu items was clicked. */
    kind:'ledger', id:'',
    name:ledgerNameFrom(row.description), group:BUCKET_GROUP.ledger,
    groupSuggest: grp.group && grp.group!==BUCKET_GROUP.ledger ? grp : null,
    /* An adjustment drafted from a printed discount or round off carries what
       kind of ledger it is — that is the whole of what §5 pre-fills, and it is
       read off the row rather than guessed here, because the row is where the
       classification was made. */
    ...(row.ledType ? {ledType:row.ledType,
                       roundLimit:row.roundLimit||'', roundMethod:row.roundMethod||''} : {}),
    sac, tax:row.tax || '',
    /* A nature of payment is not offered. AIA creates no nature of payment or
       nature of goods, so a suggestion here would be a field the user has to
       check against a list they are about to be shown anyway — and a wrong one
       moves the deduction. It is left blank and picked from what exists.
       `tdsForSac` still runs above, because which shelf of Indirect Incomes
       this book files a code on is a different question from what to withhold
       against it. */
    tds:'',
    /* GST applicability is a fact about the ledger, not about what this
       particular invoice happened to print — an income ledger is GST-applicable
       whether or not one invoice stated a rate. What the silent invoice decides is
       the Set/Alter toggle underneath: nothing was extracted, so nothing is
       stated, and the ledger goes out without a rate on it rather than with a
       guessed one. */
    gstApp:'Applicable',
    setAlterHsn: !!sac,
    setAlterGst: !!row.tax,
    gstDate: row.tax ? today() : '',
    taxability:txb.v, supply:sup.v,
    from:{
      name:'the kind of income this line describes',
      group:'where a ledger created from an invoice line opens',
      sac: row.invoiceHsn ? 'the code the customer printed'
         : (g ? `predicted from the description, to ${g.digits} digits` : ''),
      tax:row.tax ? 'the rate the invoice charged' : '',
      tds:'',
      ...(row.ledType?{ledType:`the invoice prints this as a ${row.chargeWhat||'charge'}`,
                       roundLimit:'the rounding an invoice settles to',
                       roundMethod:'the rounding an invoice settles to'}:{}),
      gstApp:'an income ledger is GST-applicable',
      setAlterHsn: sac ? 'the invoice carries a code for this line' : '',
      setAlterGst: row.tax ? 'the invoice charged GST on this line'
                           : 'the invoice states no rate, so this ledger states none',
      gstDate: row.tax ? 'stated from today' : '',
      taxability:txb.why, supply:sup.why,
      currency:'the book’s own currency',
      opening:'a ledger made from an invoice opens at nothing'
    }
  };
}

/* --- the ledgers that are not about a line ---------------------------------
   An income ledger is drafted from the line it posts. These three are not
   about a line at all: a sales ledger is about the supply, and the reverse
   charge and blocked-credit ledgers are about a call already made further down
   the sheet. So each of them is drafted from the answer that opened the
   question — which means none of them arrives blank either.
   ------------------------------------------------------------------------ */

/* The supply the invoice is actually carrying, in the words the sales ledger
   list is filed by. Reverse charge and the customer's treatment outrank the
   states: an import is an import whichever state it landed in. */
function supplyNature(){
  if(state.gstTreatment==='overseas')     return 'import';
  if(state.gstTreatment==='sez')          return 'sez';
  if(state.gstTreatment==='composition')  return 'exempt';
  const intra = isIntraState();
  return intra===false ? 'inter' : 'local';
}
/* `name` is how the picker reads, `short` is how the audit line reads — the
   two are different sentences and neither is a good substitute for the other:
   "Local — same state, CGST + SGST" tells you what to pick, "local supply"
   tells you what was made. */
const PURCHASE_NATURES = [
  {id:'local',  name:'Local — same state, CGST + SGST', short:'local supply'},
  {id:'inter',  name:'Interstate — IGST',               short:'interstate supply'},
  {id:'import', name:'Import',                          short:'imports'},
  {id:'sez',    name:'SEZ',                             short:'SEZ supply'},
  {id:'exempt', name:'Exempt / composition',            short:'exempt supply'},
  {id:'capital',name:'Capital goods',                   short:'capital goods'}
];
function draftSalesLedger(){
  const nature = supplyNature();
  const why = {
    import:'the customer’s GST treatment is overseas',
    sez:   'the customer is an SEZ unit',
    exempt:'the customer is a composition dealer',
    inter: 'the source and destination states differ',
    local: 'the source and destination states are the same'
  }[nature];
  return {
    ...ledgerDefaults(),
    kind:'sales', id:'',
    name:`Sales — ${byId(PURCHASE_NATURES,nature)?.name.split(' — ')[0] || ''}`.trim(),
    nature, group:'Sales Accounts', drcr:'Cr',
    from:{name:'named for the supply below', nature:why,
          group:'where the book files what it sells',
          currency:'the book’s own currency',
          opening:'a ledger made from an invoice opens at nothing'}
  };
}


/* --- the ledgers the tax lines themselves post to ---------------------------
   A GST head and a withholding section are not ledgers — they are what decides
   which ledger. This is the step between: given a line in the totals panel,
   which Duties & Taxes ledger does it land in, and does the book hold one?

   Same two questions as a charge line, and deliberately the same shape of
   answer, so the panel and the tables can never disagree about what "New"
   means.
   ------------------------------------------------------------------------ */

/* CGST / SGST / IGST / Cess, off the head's own name. */
const gstHeadOf = name => (String(name||'').match(/CGST|SGST|IGST|Cess/i)||[''])[0].toUpperCase();

/* Does the book hold the ledger this line posts to? A GST line is identified by
   its head and its rate together — Output CGST 9% and Output CGST 6% are two
   ledgers, not one with two rates. A withholding line is identified by its
   section, which is already unique. */
function taxLedgerHit(row){
  if(row.type==='gst'){
    const head = gstHeadOf(row.name);
    if(!head) return null;
    return MASTERS.taxLedgers.find(l=>l.dutyType==='GST' && l.head===head
                                      && num(l.rate)===num(row.rate)) || null;
  }
  if(!row.section) return null;
  return MASTERS.taxLedgers.find(l=>l.section===row.section) || null;
}

/* The section as everyone still says it — "194J" out of "194J — Technical
   services" — which is also the key the Nature of Payments master files its
   own entries under. */
const sectionShort = secId => {
  const sec = byId(MASTERS.tdsSections,secId) || byId(MASTERS.tcsSections,secId);
  return String(sec?.name||secId).split(/\s+—\s+/)[0].trim();
};

/* This book's section ids against the ones the Nature of Payments master files
   under. They are the same sections said two ways: the book splits 194J into
   technical and professional, and the master calls those 194J(A) and 194J(B).
   Stripping to "194J" and hoping would throw the distinction away, and the
   distinction is the rate. */
const SECTION_WAS = {
  '194C':'194C', '194A':'194A', '194H':'194H', '194Q':'194Q',
  '194J-tech':'194J(A)', '194J-prof':'194J(B)',
  '194I-pm':'194I(A)',   '194I-bld':'194I(B)'
};

/* The new Act's nature of payment for one of this book's sections. Where a
   section still offers a choice — 194C is written twice, once for individuals
   and HUFs and once for everyone else — the customer's own deductee type settles
   it, because that is the fact the split is about. Where nothing matches at
   all the field is left empty for the user rather than filled with the first
   row that happened to share a number. */
function natureForSection(secId){
  const code = SECTION_WAS[secId] || sectionShort(secId);
  const all  = [...MASTERS.naturePayments, ...MASTERS.natureGoods];
  let pool = all.filter(n=>n.was===code);
  if(!pool.length) pool = all.filter(n=>String(n.was||'').startsWith(sectionShort(secId)));
  if(!pool.length) return null;
  if(pool.length===1) return pool[0];

  const v = byId(MASTERS.customers,state.customer);
  const isInd = v?.deductee==='individual';
  const namesInd = n=>/individual|huf/i.test(n.name||'');
  const bySplit = pool.filter(n=>namesInd(n)===isInd);
  if(bySplit.length===1) return bySplit[0];

  /* still more than one, so fall back to which reads most like the section */
  const sec = byId(MASTERS.tdsSections,secId) || byId(MASTERS.tcsSections,secId);
  const words = PRED_WORD(sec?.name||'').filter(w=>w.length>3 && !PRED_STOP.has(w));
  const rank = (bySplit.length?bySplit:pool).map(n=>{
    const have = new Set(PRED_WORD(n.name||''));
    return {n, hits:words.filter(w=>have.has(w)).length};
  }).sort((a,b)=>b.hits-a.hits);
  /* A tie is not an answer. 194A is written three ways — senior citizen,
     specified person, and everyone else — and choosing between them needs
     facts about the payee this invoice does not carry. Filling the field with
     whichever sorted first would be a guess wearing the same clothes as a
     finding, so it is left empty and the form asks. */
  if(!rank[0].hits || (rank[1] && rank[1].hits===rank[0].hits)) return null;
  return rank[0].n;
}

/* What a tax line's ledger would be called. A GST head names itself; a
   statutory line is named for the section it holds, because that is what a
   book looking for it will search on — and for which side of the balance
   sheet it lands on, which is the half that changed when this became a sales
   invoice. Withheld heads are receivable, collected heads are payable, and
   `DEDUCTIONS` is where that is decided once. */
const taxLedgerName = row => row.type==='gst'
  ? row.name
  : `${DEDUCTIONS[row.type].account} — ${sectionShort(row.section)}`;

/* The draft the create dialog opens with. Everything a Duties & Taxes ledger
   needs is already known from the line: what kind of duty it is, and either the
   rate it carries or the section it holds. */
function draftTaxLedger(row){
  const gst  = row.type==='gst';
  const head = gstHeadOf(row.name);
  const nat  = gst ? null : natureForSection(row.section);
  const d = {
    ...ledgerDefaults(),
    kind:'tax', id:'', name:taxLedgerName(row),
    group:'Duties & Taxes', drcr: gst ? 'Dr' : 'Cr',
    asDuties:true, dutyType: gst ? 'GST' : DEDUCTIONS[row.type].label,
    /* Not fields on the form — they are how the book finds this ledger again
       once it exists, and they are facts about the line rather than answers
       anyone is being asked for. */
    head: gst ? head : '', taxRate: gst ? num(row.rate) : null,
    section: gst ? '' : row.section,
    from:{
      name: gst ? 'the head this line is charged under'
                : `the section this line is deducted under`,
      group:'a tax the invoice carries is filed under Duties & Taxes',
      dutyType: gst ? 'this is a GST line on the invoice'
                    : `this is a ${DEDUCTIONS[row.type].label} line on the invoice`,
      currency:'the book’s own currency',
      opening:'a ledger made from an invoice opens at nothing'
    }
  };
  if(gst){
    /* The rate details are the ledger's identity, not a question — an Output
       CGST 9% ledger that does not carry 9% is not that ledger. `singleHead`
       is what tells the rate dialog this is one head on purpose rather than
       half of a CGST + SGST pair someone forgot to finish. */
    d.statutory = {...statutoryBlank(), singleHead:true,
                   types:[head.toLowerCase()], [head.toLowerCase()]:String(row.rate)};
    d.from.statutory = `the invoice charges ${head} at ${row.rate}% on this line`;
  }else if(nat){
    d.nop = nat.id; d.nog = nat.id;
    d.from.nop = d.from.nog = `the ${sectionShort(row.section)} deduction this line is`;
  }
  return d;
}

/* Which ledger this line posts to, and whether that is an answer or an offer.
   A line whose ledger the book already holds says nothing — the same rule the
   charge rows follow, where an existing master that costs nothing applies
   itself. Only a ledger that does not exist yet is worth interrupting for. */
function predictTaxLine(row){
  /* A ledger this invoice wrote for this line, kept as the answer it is — with the
     proposal it came from still on it, because that is what Undo puts back.

     This function runs again on every recompute, and the branch below would
     find the new record perfectly well and report the line as simply matched.
     That is true, and it is also how the way back disappeared: matched lines
     carry no `pred`, so the record this invoice had just authored became
     indistinguishable from one the book had held for years, one render later. */
  if(row.pred?.made && byId(MASTERS.taxLedgers,row.pred.made)){
    row.taxLedger = row.pred.made;
    row.predState = 'applied';
    return;
  }
  const held = taxLedgerHit(row);
  if(held){
    row.taxLedger = held.id;
    row.pred = null; row.predState = 'applied';
    return;
  }
  /* not held: the book has no ledger for this head or this section */
  if(row.taxLedger && byId(MASTERS.taxLedgers,row.taxLedger)){ row.predState = 'applied'; row.pred = null; return; }
  const gst = row.type==='gst';
  row.taxLedger = '';
  row.pred = {
    resolution:'new', evidence:'invoice', route:'tax',
    reason: gst
      ? `this invoice charges ${gstHeadOf(row.name)} at ${row.rate}% and no ledger in this book carries it`
      : `${sectionShort(row.section)} is deducted on this invoice and this book holds no ${DEDUCTIONS[row.type].account.toLowerCase()} ledger for it`,
    /* No `makes`. It said "New duties and taxes ledger", which is the category
       and not the record — and it only ever earned a line because the field
       beside it was too narrow to show the name. The field shows
       "TDS Payable — 194J" now, which is both the category and the record, in
       the one place the answer belongs. */
    draft: draftTaxLedger(row)
  };
  row.predState = 'open';
}

/* A GSTIN is not an opaque string — it is three facts concatenated, and two of
   them are exactly what a customer master needs. Digits 1–2 are the state code
   the registration was issued under; characters 3–12 are the PAN; and the
   PAN's own fourth character is the status of the holder, which is what sets
   the 194C rate. So a customer we have never seen still arrives mostly filled,
   and every field can name the part of the number it came from. */
const PAN_STATUS = {C:'company', F:'firm', P:'individual', H:'individual',
                    A:'company', B:'company', T:'company', J:'company',
                    L:'company', G:'company'};
const PAN_STATUS_NAME = {C:'a company', F:'a firm or LLP', P:'an individual', H:'a HUF',
                         A:'an association of persons', B:'a body of individuals',
                         T:'a trust', J:'an artificial juridical person',
                         L:'a local authority', G:'a government body'};

/* Which customer the invoice is from. The GSTIN is the only identifier on a customer
   invoice that is unique by construction, so it is the one that decides — a
   name can be spelt three ways across three invoices and still be the same party,
   and two parties can share a name. Falling back to the name is a proposal
   rather than a match for exactly that reason. */
function matchCustomer(printed){
  const gstin = String(printed?.gstin||'').trim().toUpperCase();
  if(gstin){
    const hit = MASTERS.customers.find(v=>String(v.gstin).toUpperCase()===gstin);
    if(hit) return {id:hit.id, evidence:'invoice', reason:`GSTIN ${gstin} names this customer`};
  }
  const name = String(printed?.name||'').trim().toLowerCase();
  if(name){
    const hit = MASTERS.customers.find(v=>v.name.toLowerCase()===name);
    if(hit) return {id:hit.id, evidence:'habit', reason:`the name on the invoice matches this customer`};
  }
  return null;
}

function draftCustomer(printed){
  const gstin = String(printed?.gstin||'').trim().toUpperCase();
  const valid = gstin.length===15;
  const pan   = (valid ? gstin.slice(2,12) : String(printed?.pan||'').trim().toUpperCase());
  const st    = valid ? (MASTERS.states.find(s=>s.gst===gstin.slice(0,2))?.id || '') : '';
  const status= pan.length===10 ? pan[3] : '';
  const branchState = byId(MASTERS.branches,state.branch)?.state || '';
  return {
    kind:'customer', id:'', name:String(printed?.name||'').trim(),
    /* The Party Name bucket, which is Sundry Debtors — where Tally files a
       customer and where this one goes. The state-named groups the other
       customers sit under are this sheet's own filing for the picker, not chart
       groups, so a new customer lands in the chart group and is offered the
       state as the shelf if that is how this book keeps them. */
    group:BUCKET_GROUP.customer,
    groupSuggest: st ? {group:byId(MASTERS.states,st)?.plain || '',
                        why:'this book files its customers by state'} : null,
    gstin, pan, state:st,
    treatment: valid ? 'registered' : 'unregistered',
    deductee: PAN_STATUS[status] || 'company',
    credit: 30,
    ledger: st && branchState && st===branchState ? 'led-sales-local' : 'led-sales-inter',
    address: String(printed?.address||'').trim(),
    fyGoods:0, fyServices:0,
    from:{
      name:'the customer name printed on the invoice',
      gstin:gstin ? 'the GSTIN printed on the invoice' : '',
      pan: valid ? 'characters 3–12 of the GSTIN' : (pan?'the PAN printed on the invoice':''),
      state: st ? `state code ${gstin.slice(0,2)} of the GSTIN` : '',
      treatment: valid ? 'a 15-character GSTIN is a registered customer'
                       : 'no GSTIN on the invoice — an unregistered customer',
      deductee: status && PAN_STATUS_NAME[status]
        ? `the PAN’s 4th character, ${status}, makes this ${PAN_STATUS_NAME[status]}` : '',
      address:printed?.address ? 'the address printed on the invoice' : '',
      credit:'', ledger: st ? (st===branchState?'same state as the billed branch':'a different state from the billed branch') : ''
    }
  };
}

/* The consequence chip is gone, and with it `tdsDeltaFor`, `consequenceOf`,
   `withDraftLedger` and `draftConsequence` — the four functions that existed
   only to price a prediction on the row.

   Two things were said there and neither belongs on a ledger line. The
   withholding a line would add is already stated where it is decided: the TDS
   panel names the section, the rate and the amount, so the chip was the same
   figure a second time. And the ledger-versus-invoice GST rate comparison is a
   concept the sheet does not show at all now, by request.

   The TDS panel is the one account of what this invoice withholds. */

/* Applying records what it touched, so Undo can put back exactly that and
   nothing else. A value the invoice supplied is never overwritten — the guard is
   the falsy test on each field, which is also why accepting an item master
   cannot move the amount. */
function applyPred(row,pred,route){
  const set  = (k,v)=>{ row[k]=v; };
  const fill = (k,v)=>{ if(v!==undefined && v!=='' && !row[k]) set(k,v); };
  if(route==='item'){
    const m = byId(MASTERS.items,pred.target); if(!m) return;
    set('item',m.id);
    if(row.kind!==m.kind) set('kind',m.kind);
    if(!row.hsn && m.hsn){ set('hsn',m.hsn); set('hsnFrom','master'); }
    if(m.kind!=='service') fill('godown',m.godown);
    fill('rate',m.rate);
    fill('tax',m.tax);
  }else{
    /* both pools, because a ledger line can sit against either and a sales
       ledger created from this picker is as valid a target as an income one.
       A sales ledger carries no rate, so `fill` simply finds nothing. */
    const m = byId(MASTERS.incomeLedgers,pred.target) || byId(MASTERS.salesLedgers,pred.target);
    if(!m) return;
    set('ledger',m.id);
    fill('tax',m.tax);
  }
}
/* Undo puts back exactly the values that were there, in reverse — not blanks.
   A field the invoice had filled and the prediction left alone is never touched
   by either direction. */

/* --- §1 L1, the other representation ----------------------------------------
   Whether this book's habits read an item-table line as a ledger. It answers
   only on history, and only when the ledger reading is the stronger of the two
   — `rank` already carries the ticket's priority order, a customer's own coding
   above the book's and a longer keyword above a shorter one, so the comparison
   is the one comparison rather than a second set of rules.

   A tie goes to the item, because the extraction put the line there and a habit
   that is merely equal is not a reason to overrule what the document's own
   layout said. */
function crossRouteHit(row){
  const asLedger = codingHit(row,'ledger');
  if(!asLedger) return null;
  const held = byId(MASTERS.incomeLedgers, asLedger.target);
  if(!held) return null;
  const asItem = codingHit(row,'item');
  /* The customer's own corrections break the tie the fixed table cannot. Where
     they have been telling this book their lines are ledgers, an equal reading
     goes to the ledger; where they have been telling it the opposite, the
     ledger reading has to be strictly better than it would otherwise need to
     be. Nothing here invents a hit — it only decides which of two real ones
     wins. */
  const bias = fbRouteBias();
  if(asItem && asItem.rank >= asLedger.rank + (bias>0 ? 1 : 0)) return null;
  if(bias<0 && !asItem) return null;
  return {hit:asLedger, ledger:held};
}

/* Taking it is a move, not a fill: the line stops being an item line and
   becomes a ledger line, carrying everything that was true of it — the words,
   the cost centre, the code and whatever was already asked about the code, and
   the figure it had reached. The amount is stated rather than recomputed
   because a ledger line has no quantity to recompute it from; that is what the
   two tables differ by, and it is the whole of what the move costs. */
function moveItemToLedger(row,ledgerId){
  const led = {...blankLedger(),
    description:row.description, ledger:ledgerId,
    hsn:row.hsn, hsnFrom:row.hsnFrom, hsnDismissed:row.hsnDismissed,
    hsnPred:row.hsnPred, hsnPredState:row.hsnPredState,
    hsnConsent:row.hsnConsent, hsnRateMoved:row.hsnRateMoved,
    invoiceHsn:row.invoiceHsn, invoiceRate:row.invoiceRate,
    costCentre:row.costCentre, ccSplit:row.ccSplit,
    tax:row.tax, amount:r2(lineOf(row).taxable),
    pred:{...row.pred}, predState:'applied'};
  const at = state.items.indexOf(row);
  if(at>=0) state.items.splice(at,1);
  state.ledgers.push(led);
  if(!state.items.length) state.items = [blankItem()];
  /* Taking a cross-route offer is answering the routing question, so it is
     recorded like any other answer — this is what makes the move stick on the
     next invoice instead of being offered again. */
  fbRecordLine(led,'ledger',ledgerId);
  return led;
}

/* A prediction names either a master we hold or one it would create, and the
   field shows the same thing either way — which of the two it is, is what the
   tag says. */
const predName = pred => pred.draft ? pred.draft.name
  : pred.route==='item' ? (byId(MASTERS.items,pred.target)?.name || '')
  : (byId(MASTERS.incomeLedgers,pred.target)?.name || '');

/* One line per row, answering the two questions in order. Dismissed and applied
   rows are left alone — a question that has been answered is not asked again on
   the next render.

   RESOLUTION first, because it decides what kind of act this is: steps 1 and 2
   look for a master we hold, and only when neither finds one does step 3 author
   a new one. Within the search, EVIDENCE decides the order — the invoice outranks
   our habits — and whichever step answers, its evidence is carried through and
   printed. That is the part the single ladder used to lose. */
function predictRow(row,route){
  const filled = route==='item' ? row.item : row.ledger;
  if(filled || row.predState==='dismissed' || row.predState==='applied') return;
  if(!String(row.description||'').trim()){ row.pred=null; row.predState=''; return; }

  /* 0. What somebody already told this book about this customer and this wording.
        Above everything, including the printed code, because it is the answer
        to the argument the rest of the ladder is about to have again. */
  const fb = fbLineHit(row);
  if(fb && fb.route===route){
    const target = fb.target;
    row.pred = {resolution:'existing', evidence:'habit', route, target,
      reason:`you coded this to ${fb.name} on ${fbWhere(fb)}`};
    applyPred(row,row.pred,route);
    row.predState = 'applied';
    return;
  }
  /* A correction that moved the line to the other table is read the same way,
     and it is what makes a corrected route stick rather than being re-argued
     by the habit tier on every invoice. */
  if(route==='item' && fb && fb.route==='ledger'){
    row.pred = {resolution:'existing', evidence:'habit', route:'ledger', crossRoute:true,
      target:fb.target,
      reason:`you moved this to ${fb.name} on ${fbWhere(fb)}, so it is a ledger`};
    /* Taken rather than offered. The move is the answer this book already has
       for this wording; the reason in the popover is what accounts for it now
       that the chip that used to announce it is gone. */
    row.predState = 'applied';
    row.crossMove = fb.target;
    return;
  }

  /* §1 L1. Before asking which item this line is, ask whether it is an item at
     all. A quantity and a rate are how a customer prints a line; they are not a
     statement that the thing on it is stock. "Annual maintenance — 12 desktops"
     has a quantity of twelve and is a service contract, and the only reason
     this sheet used to call it an item is that the extraction put it in the
     item table and nothing downstream was allowed to disagree.

     History is what is allowed to disagree, because history is the one kind of
     evidence that is about this line rather than about its layout: if this book
     has coded lines like this to a ledger more strongly than to an item, the
     ledger is the reading. Everything else — the printed code, resemblance,
     authoring a new master — stays inside whichever table the row is in. Only
     a habit is trusted to move a line between them. */
  if(route==='item'){
    const cross = crossRouteHit(row);
    if(cross){
      row.pred = {resolution:'existing', evidence:'habit', route:'ledger',
        crossRoute:true, target:cross.ledger.id,
        reason:`${cross.hit.n} of ${cross.hit.of} past ${
          cross.hit.own?customerShort()+' invoices':'invoices in this book'} — coded to a ledger, `
          + `not an item`,
};
      row.predState = 'applied';
      row.crossMove = cross.ledger.id;
      return;
    }
  }

  const noun = route==='ledger' ? 'ledger' : 'item';
  const sac  = sacHit(row,route);
  const kind = c => String(c).length>5 ? 'SAC' : 'HSN';
  let pred = null;

  /* 1. a master we hold, named by the code the customer printed */
  if(sac?.target){
    pred = {resolution:'existing', evidence:'invoice', target:sac.target,
            reason:`${kind(sac.code)} ${sac.code} names this ${noun}`};
  }
  /* 2. a master we hold, named by what this book did last time */
  if(!pred){
    const h = codingHit(row,route);
    const held = h && (byId(MASTERS.incomeLedgers,h.target) || byId(MASTERS.items,h.target));
    /* the lead already says this is past coding, so the reason is only the
       count — which is the part that is checkable at the customer ledger */
    const count = h ? `${h.n} of ${h.of} past ${h.own?customerShort()+' invoices':'invoices in this book'}` : '';
    if(held) pred = {resolution:'existing', evidence:'habit', target:h.target, reason:count};
    /* the book has coded lines like this before, to something it no longer
       holds — the habit is still the evidence, the master is just missing */
    else if(h) pred = {resolution:'new', evidence:'habit',
                       reason:`${count}, to a ${noun} this book no longer holds`};
  }
  /* 3. no master we hold answers it, so author one. The evidence for that is
        whatever got us here, and the printed code is the strongest of the
        three: a classification the customer stated and this book has no
        ledger for is the clearest possible case for a missing master. */
  if(!pred || pred.resolution==='new'){
    const draft = route==='item' ? draftItem(row) : draftLedger(row);
    if(!draft.name){ row.pred=null; row.predState=''; return; }
    if(!pred){
      if(sac?.unheld){
        pred = {resolution:'new', evidence:'invoice',
                reason:`${kind(sac.code)} ${sac.code} is on the invoice and no ${noun} in this book carries it`};
      }else if(sac?.ambiguous){
        pred = {resolution:'new', evidence:'invoice',
                reason:`${kind(sac.code)} ${sac.code} is on the invoice and ${sac.n} ${noun}s carry it, which names none of them`};
      }else{
        /* §1 L2, suppression. Where this customer's description readings have
           been corrected often enough, the sheet stops offering them and says
           so — an offer that keeps being wrong for one customer is worse than
           no offer, because it still has to be read and dismissed. The draft is
           still made and the line can still author a master; what is withheld
           is the resemblance that was doing the arguing. Answering any line for
           this customer by hand turns it back on. */
        const g = fbSuppressed() ? null : guessHit(row,route);
        /* no em dash in here: the line already opens on one, and two in a
           sentence this short reads as a break rather than an aside */
        pred = {resolution:'new', evidence:'inferred', inferred:true,
          reason: g ? `closest is ${predName({route,target:g.target})} on “${
                        g.words.join('”, “')}” alone, which is not enough to post on`
                    : (fbSuppressed()
                        ? `reading descriptions is switched off for ${customerShort()} after ${
                            FB_SUPPRESS_AFTER} corrections — answer one by hand to turn it back on`
                        : 'nothing in this book matches the description')};
      }
    }
    pred.target = '';
    pred.draft  = draft;
    /* Before authoring anything, check the shelf the draft is headed for. Now
       that a row writes its own master, two lines describing the same thing
       would mint the same record twice — and a book with two cable trays in it
       is a worse outcome than the dialogs this replaced. A name already on the
       shelf is not a new master, it is this one. */
    const twin = twinOf(draft,route);
    if(twin){
      pred.resolution = 'existing';
      pred.target     = twin.id;
      pred.draft      = null;
      pred.reason     = twin.onThisInvoice
        ? `an earlier line on this invoice created ${twin.name}`
        : `${twin.name} is already in this book under that name`;
    }
  }
  if(!pred){ row.pred=null; row.predState=''; return; }

  pred.route = route;
  /* What the row says it will make, so the offer is legible without opening the
     dialog that makes it — and only the part of it that is not already on the
     row. An item row prints its own goods/service call and its HSN on the meta
     line directly underneath, so repeating them here would be the same sentence
     twice in eighteen pixels; a ledger row has no meta line, so its code is
     worth naming. */
  /* No `makes` chip on a plain new-master proposal.
     It used to read "New item master" or "New income ledger" on a line
     underneath the field — the category of the thing, restated below the field
     that holds the thing. Two lines, and the second one carried strictly less
     than the first: the tag in the field already says `New`, and the field's
     own value already says which record it is.

     It looked like it was carrying its weight only because the field was too
     narrow to show the name, so on an adjustment or a tax line you saw `New`
     with an empty box beside it and a category underneath — which reads as two
     unrelated rows rather than one answer. The field is wide enough now, so
     the line has nothing left to add and goes.

     `makes` survives where it says something the field cannot: the cross-route
     proposals set it to "Moves this line to Ledgers" and return before they
     ever reach here, because moving a line between tables is a consequence, not
     a restatement. */

  /* A master that does not exist yet is still an offer and not a posting — the
     tick is still in the field, and pressing it still opens the form that
     writes the record, because creating a master by hand has to stay a thing
     you can do.

     What changed is that nobody has to press it. A proposal left alone is not
     refused, it is *unanswered* — and an unanswered proposal to author a master
     is written by the confirmation the invoice is allocated through, which names
     every one of them in one place. So the row keeps the question and loses the
     obligation: press the tick to fill the record in yourself, press the cross
     to say no, or leave it and be asked once at the end.

     A prediction that points at a master the book already holds no longer waits
     for anything, including money. There is one question on this sheet now and
     it is "shall I create this record"; pointing a line at a ledger that exists
     is coding a voucher, which is the screen's ordinary work and not a thing to
     be asked about. What a deduction it moves still gets said — the chip under
     the row states it — but it is reported, not negotiated. */
  if(pred.resolution!=='new'){
    applyPred(row,pred,route);
    row.predState = 'applied';
  }else{
    row.predState = 'open';
  }
  row.pred = pred;
}

/* HSN is hierarchical, so the prediction stops at the digit the description
   stops supporting. Four digits of 7326 is a true statement about a powder-
   coated steel tray; padding it to eight to look finished would be the one
   dishonest thing this cell could do. Codes cost nothing on this invoice — the
   rate is carried by the master, never by the code — so this one applies
   itself rather than asking.

   HSN takes the evidence axis and not the resolution one, and the reason is
   worth stating: an HSN code is published by CBIC, not authored by a business.
   There is no master to create, because 7326 already exists in the world
   whether this book has heard of it or not — "create HSN 7326" is not an act
   anyone can perform. The code is a *field* on the item or ledger master, and
   it is carried onto the master being created rather than created beside it.

   What the second axis does mean here is worth saying anyway: has this book
   ever used this code? A classification new to the book is not wrong, but it
   is the moment a human should look, so the row says so. */
/* The lookup on its own, so a draft master can ask the same question without
   the row having been through predictHsn first. It has to be separable: the
   item pass runs the master prediction before the HSN one, and ledger rows
   never run the HSN one at all — but a ledger being drafted still needs the
   SAC the description supports. Longest keyword wins. */
/* Keywords match at the start of a word, not anywhere inside one. Plain
   substring matching found "pen" inside "income" and coded a preliminary
   income to stationery — a wrong code, stated with the same confidence as a
   right one. The start is bounded and the end is not, because several of these
   are deliberately stems: "housekeep" has to reach "housekeeping" and "recycl"
   has to reach "recycling". */
const kwHit = (kw,t) => {
  const at = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  return at.test(t) ? kw : null;
};
function hsnGuess(text){
  const t = String(text||'').toLowerCase();
  if(!t.trim()) return null;
  let best = null;
  MASTERS.hsnGuide.forEach(g=>{
    const hit = g.kw.split('|').filter(k=>kwHit(k,t)).sort((a,b)=>b.length-a.length)[0];
    if(!hit) return;
    if(!best || hit.length>best.hit.length) best = {hit,g};
  });
  return best ? {code:best.g.code, name:best.g.name, digits:best.g.digits} : null;
}

/* --- the code the master carries -------------------------------------------
   One field wearing two names: `hsn` on an item master, `sac` on an income
   ledger. A sales ledger carries neither — under the rule this build
   follows, an item line's classification is the item's own, so the sales
   ledger stays code-free and a folded line keeps the code it came in with. */
const rateOfTax = id => { const t = byId(MASTERS.taxes,id); return t ? num(t.rate) : null; };
function masterCodeOf(row,route){
  const item = id=>{ const m = byId(MASTERS.items,id);
    return m ? {code:String(m.hsn||''), rate:rateOfTax(m.tax), master:m, field:'hsn'} : null; };
  if(route==='item') return item(row.item);
  /* A folded sales line is an item line wearing a ledger row. Its code is
     the item master's — the sales ledger carries none — so the lookup
     follows the line home rather than stopping at the row it is drawn as. */
  if(row.carriedItem) return item(row.carriedItem);
  const m = byId(MASTERS.incomeLedgers,row.ledger);
  return m ? {code:String(m.sac||''), rate:rateOfTax(m.tax), master:m, field:'sac'} : null;
}
/* The whole HSN question for a row, answered in one place so the field, the
   explanation under it, the consent prompt and the sync tag can never disagree
   with each other — they are four readings of this one object.

   `from` is whose claim the value is, and it is the only thing that decides
   the tag. `clash` is what the customer printed against what we hold, and it
   is asked even when we are certain, because the rate is the part that moves
   the tax and a matching code does not vouch for it. */
function hsnState(row,route){
  const master = masterCodeOf(row,route);
  const invoiceCode = String(row.invoiceHsn||'').trim();
  const invoiceRate = row.invoiceRate==null ? null : num(row.invoiceRate);

  /* Tier 1 — the company's own stated position: the code on the master. */
  let value = '', from = '', ourRate = null;
  if(master?.code){ value = master.code; from = 'master'; ourRate = master.rate; }

  /* Tier 2 and below only ever fill an empty value, and a hand-typed code
     outranks both — once a human has touched the field nothing may move it. */
  if(row.hsnFrom==='user' && row.hsn){ value = String(row.hsn); from = 'user'; }
  else if(!value && invoiceCode){         value = invoiceCode;       from = 'invoice';  ourRate = invoiceRate; }
  else if(!value && row.hsn && row.hsnFrom==='pred'){ value = String(row.hsn); from = 'pred'; }

  /* There is one question about the master's own code, and it is whether it has
     one: `missing` — the master carries none and the customer printed one.

     There used to be three more. The sheet compared the master's code against
     the invoice's and offered to reconcile them, on a differing code, a differing
     rate, or both. That comparison cannot happen: when a master is set to *as
     per company/masters*, extraction does not return an HSN for the line at
     all, so there is never a second code to hold the first one against. The
     sheet was drawing a decision out of two values it could not both have.

     What is left is the case that is real, and it is the one §2 asks for: a
     ledger the book has posted to for years without ever coding it, and an invoice
     that prints the code. Take the code from the invoice, or leave the master
     alone — no arrow, because nothing is being weighed against anything. */
  const ours = master?.code || '';
  const clash = (master && !ours && invoiceCode) ? 'missing' : 'none';
  /* A master that carries no code at all, with nothing on the invoice either, is
     not a clash — it is simply unanswered, and inference may offer something. */
  const unanswered = !value;

  /* Only the company's own answer syncs as the company's own answer. Consent
     is what converts an invoice's code into one: updating the master makes the
     book carry it, so from that moment it is ours. Declining is a real answer
     and the invoice goes out specified. */
  const settled = row.hsnConsent==='updated';
  const tag = (settled || ((from==='master'||from==='user') && clash==='none'))
    ? 'masters' : 'specify';

  return {value, from, ourRate, invoiceCode, invoiceRate, masterCode:ours, clash, unanswered, tag,
          consent:row.hsnConsent||'',
          master:master?.master||null, field:master?.field||'hsn'};
}
/* Still the two things the voucher can say about a code, and still what the
   consent bar states before the choice is made. What is gone is the pill that
   repeated it on every row. */
const SYNC_TAG = {masters:'As per company/masters', specify:'Specify Details Here'};

/* Inference is an offer, not an answer. It writes `hsnPred` and opens the
   proposal; the code itself stays out of the field until a human takes it,
   because a four-digit heading read off a description has no authority to look
   like a value. Nothing is offered where an answer already exists. */
function predictHsn(row,route){
  if(row.hsnDismissed || row.hsnPredState==='applied') return;
  if(!hsnState(row,route).unanswered) return;
  const g = hsnGuess(row.description);
  if(!g){ row.hsnPred = null; row.hsnPredState = ''; return; }
  /* Taken, not offered. A code is not a record — it is a field on one, it costs
     nothing on this invoice, and the only question this sheet asks is whether to
     add a master to the book. So the digits go in, marked by the dashed rule
     that has always meant "not the book's own answer", and the pencil holds the
     reason and the way to change it. */
  row.hsnPred = g;
  acceptHsnPred(row);
}
/* Taking the offer is what makes it ours to the extent a description can make
   anything ours: the code lands in the field marked as inferred, which is a
   tier that never earns the master tag. */
function acceptHsnPred(row){
  if(!row.hsnPred) return;
  row.hsn = row.hsnPred.code;
  row.hsnFrom = 'pred';
  row.hsnPredState = 'applied';
}
function dismissHsnPred(row){
  row.hsnPredState = 'dismissed';
  row.hsnDismissed = true;
}
/* Putting the code back to nothing. It was the row's own Undo link and is now
   the popover's, which is the whole of the change — the four assignments are
   the same four, kept in one place so the two never drift. `hsnDismissed` is
   what stops the offer being made again the moment the row re-renders: taking
   a code back off is an answer, not an oversight. */
function clearHsn(row){
  row.hsn = ''; row.hsnFrom = ''; row.hsnPred = null;
  row.hsnPredState = ''; row.hsnDismissed = true;
}

/* Consent — the only path by which an invoice's code becomes the book's. It writes
   the code the customer printed onto a master that had none, and records it so
   the row stops asking. Only the code: the rate is not in question here, and
   was only ever moved by the comparison that no longer exists. */
function consentUpdateMaster(row,route){
  const st = hsnState(row,route);
  const m  = st.master;
  if(!m || !st.invoiceCode) return false;
  /* which field the code lives in is the master's business, not the row's — a
     folded sales line updates the item master it came from, on `hsn` */
  m[st.field] = st.invoiceCode;
  row.hsnConsent = 'updated';
  row.hsnFrom = 'master';
  row.hsn = st.invoiceCode;
  return true;
}
function consentDecline(row,route){
  const st = hsnState(row,route);
  row.hsnConsent = 'declined';
  /* Declining keeps the master untouched but the invoice still has to carry a
     code, so the line holds whatever it already resolved to — and where that
     was nothing, the customer's, which is the only code in the room. */
  if(!row.hsn){ row.hsn = st.value || st.invoiceCode; if(row.hsn) row.hsnFrom = 'invoice'; }
}

/* Master prediction first, over both routes, then the code pass over both —
   a resolved master is the best source there is for the code, so asking the
   description before asking the master would answer a question already
   settled. Ledger rows run the code pass too: a SAC on an income ledger and
   an HSN on an item are the same field, and Accounting Mode has to show it. */
function runPredictions(){
  state.items.forEach(r=>   predictRow(r,'item'));
  /* A line this book codes to a ledger is moved to the ledger table, not asked
     about. `predictRow` cannot do the move itself — it is iterating the very
     array the move splices — so it flags the row and the move happens here,
     after the pass is over. */
  state.items.filter(r=>r.crossMove).slice().forEach(r=>{
    const to = r.crossMove; delete r.crossMove;
    moveItemToLedger(r,to);
  });
  state.ledgers.forEach(r=> predictRow(r,'ledger'));
  state.adjustments.forEach(r=>predictRow(r,'ledger'));
  state.items.forEach(r=>   predictHsn(r,'item'));
  state.ledgers.forEach(r=> predictHsn(r,'ledger'));
}

/* Coded by prediction means pointed at a master the book already held. A line
   that got its master by making one is a different outcome and is named as one
   — counting it here too would report the same line twice under two headings
   that contradict each other. */
const predictedLines = ()=>[...state.items,...state.ledgers].filter(r=>
  r.predState==='applied' && r.pred?.resolution!=='new');
/* GST and the withholdings are all tax lines — they live in one list, split
   only by type. `dedLines` is the withholding the invoice is actually carrying:
   the other two modes keep their lines in the list but are not on this invoice,
   so they are neither drawn nor added up. */
const gstLines = ()=>state.taxLines.filter(t=>t.type==='gst');
const dedLines = (mode=state.deductionMode)=>state.taxLines.filter(t=>t.type===mode);

/* The master a statutory line picks its head from, what that mode is called
   where the mode itself has to be named — and, on a sales invoice, which way
   the money moves.

   On a sales invoice every head pointed the same way: whatever was withheld
   came off what we owed the customer, and every one of them credited a payable.
   Raising an invoice splits them, because the two heads are not the same kind
   of thing at all.

   TDS is deducted by the customer when they pay us. It is not ours to collect,
   so it comes *off* the receivable, and what it leaves behind is an asset —
   tax already paid to the department in our name, set against our own
   liability at the year end. Dr TDS Receivable.

   TCS we collect *from* the customer and hand on. It goes *onto* the invoice
   and what it leaves behind is a liability — money held for the department and
   not ours at any point. Cr TCS Payable.

   `sign` is which way the head moves the receivable; `posts` is which side of
   the entry it lands on. Nothing else in the sheet needs to know the
   difference. */
const DEDUCTIONS = {
  tds:   {label:'TDS',    master:'tdsSections', group:'TDS deducted by customer',
          sign:-1, posts:'dr', account:'TDS Receivable'},
  tcs:   {label:'TCS',    master:'tcsSections', group:'TCS collected',
          sign:+1, posts:'cr', account:'TCS Payable'},
  /* Equalisation levy, GST TDS u/s 51, works contract tax: all withheld by the
     customer out of what they pay us, so they follow TDS in both respects. */
  others:{label:'Others', master:'otherHeads',  group:'Other statutory heads',
          sign:-1, posts:'dr', account:'Statutory Receivable'}
};
const dedSign = (mode=state.deductionMode)=>DEDUCTIONS[mode].sign;
const dedMaster = (mode=state.deductionMode)=>MASTERS[DEDUCTIONS[mode].master];

function compute(){
  syncLines('taxLines', [...suggestTaxLines(), ...suggestTdsLines()]);
  /* Run after the sync, over the lines that actually survived it: a line the
     invoice no longer produces has no ledger to predict, and one it has just
     started producing needs asking about the moment it appears. */
  state.taxLines.forEach(predictTaxLine);

  const rows = state.mode==='item' ? state.items.map(lineOf) : [];
  const ledgerRows = state.ledgers.map(ledgerLineOf);
  const itemsTaxable  = r2(rows.reduce((s,l)=>s+l.taxable,0));
  const ledgerTaxable = r2(ledgerRows.reduce((s,l)=>s+l.taxable,0));
  const subTotal = r2(itemsTaxable+ledgerTaxable);

  const gstTotal = r2(gstLines().reduce((s,t)=>s+num(t.amount),0));
  /* The figure itself, always positive — the sheet states what the head is
     worth and the sign says where it goes, so a TDS line does not print as a
     negative number just because it reduces the receivable. */
  const dedTotal = r2(dedLines().reduce((s,t)=>s+num(t.amount),0));
  const adjTotal = r2(state.adjustments.reduce((s,a)=>s+num(a.amount),0));

  const heads = {};
  gstLines().forEach(t=>{
    const head = (t.name.match(/CGST|SGST|IGST|Cess/i)||['Tax'])[0].toUpperCase();
    heads[head] = r2((heads[head]||0)+num(t.amount));
  });

  // no automatic rounding — a round off is just an adjustment, so it is entered
  // as one rather than being derived behind the user's back
  /* TCS adds to the receivable; TDS and other withheld heads reduce it.
     Output GST is always included in this AR workflow. */
  const grand = r2(subTotal + gstTotal + dedSign()*dedTotal + adjTotal);

  return {intra:isIntraState(),rows,ledgerRows,itemsTaxable,ledgerTaxable,subTotal,
          gstTotal,dedTotal,dedSign:dedSign(),adjTotal,heads,grand};
}

/* The tax master for a rate the document printed. */
const taxIdForRate = rate => byId(MASTERS.taxes, 'tax-'+String(rate).replace('.',''))
  ? 'tax-'+String(rate).replace('.','')
  : (MASTERS.taxes.find(t=>t.rate===num(rate))?.id || '');

/* A master this invoice created is filed where it belongs — under the group it
   was given, not in a holding pen — but it is still marked, because a name you
   have never seen in this list before should say why. The mark goes in the
   option's text and never in its value: the item picker matches on the value,
   so decorating that would stop the master being findable by its own name. */
/* Nothing. It used to append " · new on this invoice" to a master this invoice wrote,
   wherever that master appeared in a picker — which put the mark straight into
   the field's own value, so a created ledger read `Round Off · new on this
   invoice` where every ledger beside it read its name. That is the last place a
   record's age was still showing on the sheet, and age is not what a field is
   for. The invoice's additions are listed, in one place, in the approval
   confirmation. */
const newMark = () => '';

/* The last option in these two pickers is not a master, the way the last
   option in a cost centre picker is not a cost centre. Same sentinel trick,
   because "it isn't in this list" is a real answer and the list is where
   someone goes looking for it. */
const NM_NEW_CUSTOMER   = '__nm-customer';
const NM_NEW_LEDGER   = '__nm-ledger';
const NM_NEW_PURCHASE = '__nm-sales';
/* Every picker that offers masters ends the same way, so the way out is in the
   same place in all of them — and where the user may not author a master, the
   group stays and the option is disabled rather than removed. Removing it would
   say the book has no way out; disabling it says there is one and this person
   is not it, which is the true statement and the one they can act on. */
const nmOut = (value,label)=>
  `<optgroup label="Not in the book"><option value="${value}"${
    canCreate()?'':` disabled title="${esc(NO_CREATE)}"`}>+ Create new ${label}…</option></optgroup>`;

/* the item picker's suggestion list */
function refreshItemsList(){
  let dl = $('#items-list');
  if(!dl){
    dl = document.createElement('datalist');
    dl.id = 'items-list';
    document.body.append(dl);
  }
  dl.innerHTML = MASTERS.items.map(i=>
    `<option value="${esc(i.name)}">${esc(i.group)} · HSN/SAC ${esc(i.hsn)} · ${esc(i.unit)} · ₹${inr.format(i.rate)}${esc(newMark(i))}</option>`).join('');
}

/* The customer picker is filled once at start-up and again whenever this invoice
   adds a customer, and it carries the way out of its own list: an invoice from
   someone the book has never seen is not a picking problem. */
function refreshCustomerList(){
  const sel = $('[data-bind="customer"]'); if(!sel) return;
  /* The proposal sits at the head of the list and selected, the same as the
     sales ledger's — the field shows what the invoice says it is, and the list
     underneath is what the book already holds. Barred readers get it disabled
     rather than removed: that the invoice names a party this book has no master
     for is not a privilege, and hiding it would leave them looking at an empty
     required field with nothing to say about it. */
  const suggested = !state.customer && state.customerSuggestion;
  const list = MASTERS.customers.map(v=>({...v, name:v.name+newMark(v)}));
  /* The name alone. It carried a `+` prefix, which was a third thing saying
     "new" beside the pill that says it in a word and the `+` button that acts
     on it — and the one of the three that looked like a control while being
     part of a label. */
  sel.innerHTML = (suggested
      ? `<option value="__customer-suggestion" selected${
          canCreate()?'':` disabled title="${esc(NO_CREATE)}"`}>${esc(suggested.name)}</option>`
        + options2(list,'',state.customer)
      : options2(list,'Select Customer',state.customer))
    + nmOut(NM_NEW_CUSTOMER,'customer');
  sel.value = suggested ? '__customer-suggestion' : (state.customer || '');
}

/* The sales ledger picker in Invoice Details, rebuilt for the same reason: the
   invoice can add to this list too. */
function refreshSalesLedgerList(){
  const sel = $('[data-bind="salesLedger"]'); if(!sel) return;
  /* No offer branch. A sales ledger is picked from the list, or created from
     the list's own last option — there is nothing proposing one. */
  const list = MASTERS.salesLedgers.map(l=>({...l, name:l.name+newMark(l)}));
  sel.innerHTML = options(list,'Select Ledger',state.salesLedger)+nmOut(NM_NEW_PURCHASE,'sales ledger');
  sel.value = state.salesLedger || '';
  $('#sales-picker-state')?.classList.remove('is-suggested');
  const tag = $('#sales-suggest-tag');
  if(tag) tag.hidden = true;
}

/* ============================================================================
   5. RENDER
   ==========================================================================*/
const caret  = `<span class="ico ico-13 ico--muted"><svg width="13" height="13"><use href="#i-caret"/></svg></span>`;
const dots   = `<span class="ico ico--brand"><svg width="4" height="16"><use href="#i-dots"/></svg></span>`;
/* the bulk bar's furniture — one chevron symbol turned twice, so the two
   arrows cannot end up different weights */
const chevLeft  = `<span class="ico" style="transform:rotate(90deg)"><svg width="12" height="12"><use href="#i-caret"/></svg></span>`;
const chevRight = `<span class="ico" style="transform:rotate(-90deg)"><svg width="12" height="12"><use href="#i-caret"/></svg></span>`;
const trashIco  = `<span class="ico"><svg width="16" height="16"><use href="#i-trash"/></svg></span>`;
const closeIco  = `<span class="ico"><svg width="18" height="18"><use href="#i-close"/></svg></span>`;
const pencil = `<span class="ico ico-11 ico--brand"><svg width="12" height="12"><use href="#i-pencil"/></svg></span>`;
const plusIco  = `<span class="ico ico-12"><svg width="12" height="12"><use href="#i-plus"/></svg></span>`;
const infoIco  = `<span class="ico ico-13"><svg width="13" height="13"><use href="#i-info"/></svg></span>`;

/* Lines the extraction could not name a master for — they post on the
   description alone until someone picks one. */
const masterlessLines = ()=>[...state.items.filter(r=>!r.item && r.description.trim()),
                             ...state.ledgers.filter(r=>!r.ledger && r.description.trim())];

/* ---------------------------------------------------------------------------
   The prediction goes in the field. `openPred` is the proposal a field should
   be showing instead of its own empty state; `predActions` are the two ways
   out, which sit inside the field with the value; `predWhy` is the single line
   underneath that says where it came from and what it costs.

   The item's prediction and the HSN's are two different claims about the line,
   so they are never drawn as one stack: the item's reason sits under the item
   field, and the HSN's sits under the HSN it is about, naming it.
   ------------------------------------------------------------------------ */
const openPred = (row,route)=>{
  const filled = route==='item' ? row.item : row.ledger;
  return (row.predState==='open' && row.pred && !filled) ? row.pred : null;
};
/* Exactly when the row has prediction content to show — which is also exactly
   when it earns the stripe and the top-packed cells. A dismissed row has
   neither: it holds a `pred` object, but it is no longer making a claim. */
function rowHasPred(row,route){
  const filled = route==='item' ? row.item : row.ledger;
  if(row.pred && row.predState==='open'    && !filled) return true;
  if(row.pred && row.predState==='applied' &&  filled) return true;
  /* the HSN line earns the row its stripe too — including the one that only
     says the printed code is unheld, which is a reason to look at the row. An
     open comparison earns it outright: a master about to be changed is the
     single most consequential thing a row can be carrying, and it now happens
     on both routes. */
  return !!hsnWhy(row,route) || !!hsnConsentBar(row,route);
}
/* One tag, and it says `New`.

   There used to be two. `Predicted` marked a line pointed at a master the book
   already holds, and `New` one it does not — two resolutions of the same
   question, drawn as two states of the same pill. But only one of them is a
   question. Pointing a line at a ledger that exists is coding a voucher, which
   is what this screen is for; the value belongs in the field the way an
   extracted value does, and where it came from is the row's `why` to answer,
   not a badge's.

   What is left asks the only thing the sheet actually asks: shall I add this
   record to the book. So the tag appears on exactly the fields where a master
   would be created, and nowhere else.

   The tag carries the reason too. It was a line of prose under the field, on
   every predicted row, at rest — which on a forty-line invoice is forty
   paragraphs nobody reads. Here it costs nothing until it is asked for, and it
   is asked for on the thing being decided. */
const predTag = (p,why) => why
  ? `<button type="button" class="predtag predtag--why predtag--new"
       data-act="why" aria-expanded="false">New<span class="predtag__why">${why}</span></button>`
  : `<span class="predtag predtag--new">New</span>`;

/* The tick means one of two things and says which: use a master, or create
   one. A record that outlives this invoice should not be made by a button
   labelled "use". */
/* One button, and it is a plus.

   It was a tick and a cross. A tick is an agreement — it says *yes, that one* —
   and the thing on offer here is not a reading to agree with but a record to
   add, which is what a plus says and a tick never did. The cross went with it:
   refusing a suggestion is choosing something else, and the field beside the
   button is a picker, so the way to say no is to say what instead.

   Nothing is created by leaving it alone either — the summary behind Approve
   all is where an unanswered suggestion is finally decided, and it lists every
   one of them before it writes anything. */
const predActions = p=>{
  const barred = !canCreate();
  return `<button type="button" class="predbtn" data-act="pred-accept"${barredAttrs()}${
          barred?'':` title="${esc(EVIDENCE[p.evidence]||'')}. Create ${esc(predName(p))}"`}
          aria-label="Create ${esc(predName(p))}"><svg width="12" height="12"><use href="#i-plus"/></svg></button>`;
};
/* the class the field itself wears — dashed for a master on offer, dotted for
   one that does not exist yet */
const predCellCls = p => p ? (p.resolution==='new' ? ' cell--pred cell--new' : ' cell--pred') : '';

/* A master this invoice wrote, sitting in the field it was written for. The row is
   not asking anything here — the record exists and the field holds it — so what
   is left is a mark, not a control. It keeps the dotted rule the offer used to
   wear, because dotted has always meant "a master that was not in this book",
   and that is still true of it.

   Both cells draw the word, so the mark does not depend on which table the line
   landed in. The ledger cell's own option drops its "· new on this invoice" while
   the pill is showing — see `ledgerOptions` — because the field should say it
   once. */
/* A master this invoice wrote, still sitting in the field it was written for. It
   is what Undo reads, and nothing else: the field draws it exactly as it draws
   a master the book already held.

   It used to wear `New`, and then `Created` once the invoice was allocated. That
   was a mark about the record's provenance rather than about the line's answer
   — and a field the user had reviewed and confirmed does not need to keep
   announcing that it is young. What is left is the Undo underneath, which is
   the only part of that state anybody can act on. */
const madePred = (row,route)=>{
  const filled = route==='item' ? row.item : row.ledger;
  return (row.predState==='applied' && filled && row.pred?.made) ? row.pred : null;
};

/* The line leads with the claim rather than the evidence. Opening on "4 of 5
   past Technovan invoices" describes where a figure came from without ever saying
   that the value above it is a guess.

   While the proposal is open the field already carries the word, so the lead
   names the *kind* of evidence instead of repeating it — the tag says what it
   is, the lead says what it rests on. Once accepted there is no tag, because
   the field now holds a real value, so the line takes the word back. */
/* The reason, for the tag's popover. Unchanged words: the lead still names the
   evidence and the sentence still says what the guess rests on. It has only
   stopped being printed on the sheet at rest. */
function predReason(row,route){
  const p = row.pred; if(!p) return '';
  const filled = route==='item' ? row.item : row.ledger;
  const lead = row.predState==='applied' && filled && p.resolution==='new'
    ? 'Created'
    : (EVIDENCE[p.evidence] || '');
  const body = row.predState==='applied' && filled && p.resolution==='new'
    ? (p.createdReason || p.reason) : p.reason;
  if(!body) return '';
  return `<b>${esc(lead)}:</b> ${esc(body)}.`;
}
/* What the row will do, and nothing else. The two marks above it have already
   said what it is and what it rests on, so repeating either here is the same
   statement twice in eighteen pixels — which is what the old sentence did, and
   what made a predicted row four lines tall. */
function predWhy(row,route){
  const p = row.pred; if(!p) return '';
  const filled  = route==='item' ? row.item : row.ledger;
  const open    = row.predState==='open'    && !filled;
  const applied = row.predState==='applied' &&  filled;
  if(!open && !applied) return '';

  /* One chip, and only a record — never a figure. `makes` used to sit beside a
     priced consequence ("194C +₹290.00"); that is the TDS panel's to state and
     is no longer said here. `makes` itself carried "Moved to Ledgers" until
     that was removed too, so in the shipped sheet this renders nothing and the
     mechanism stays only because the acceptance fixtures set it. */
  const chips = [p.makes].filter(Boolean)
    .map(t=>`<span class="predcost">${esc(t)}</span>`).join('');
  /* No control at all on an answered row.

     There was an Edit, which opened the record this row wrote. But the field it
     sat under is the record's own field: typing in it, or picking from it,
     changes what the line posts to, which is what somebody wanting to change
     the entry actually wants. Edit offered a second, heavier route to the same
     end — a modal about the master rather than the line — and put a control on
     every created row to advertise it.

     So what is left under an answered row is what it says, not what you can do
     to it: the money it moves, the table it moved to, and the reason behind the
     dot. The field above is the control. */
  const edit = '';
  const undo = '';
  const reason = predReason(row,route);
  const dot = applied && reason
    ? `<button type="button" class="preddot predtag--why" data-act="why" aria-expanded="false"
         aria-label="Why this line was predicted"><span class="predtag__why">${reason}</span></button>`
    : '';
  if(!chips && !undo && !edit) return '';
  return `<div class="predwhy${applied?' predwhy--applied':''}">${dot}${chips}${edit}${undo}</div>`;
}

/* Whose claim the value is, in words a human can check. `codeHeld` is asked
   live rather than stored, so creating a master that carries the code stops
   the row calling it new the moment it exists. */
const HSN_SRC = {
  class:  'the GST classification this line carries',
  master: route=>route==='item' ? 'its item master' : 'its ledger master',
  invoice:   'the code the customer printed',
  pred:   'a prediction from the description',
  user:   'your edit'
};
const hsnSrcWord = (from,route)=>{
  const v = HSN_SRC[from];
  return typeof v==='function' ? v(route) : (v||'this line');
};
const pct = n => `${Number(n)}%`;

/* What a proposed code means, for the tag that proposes it. It names its own
   depth, because four digits of 7326 is a true statement and the eight
   underneath it are not. */
function hsnReason(row){
  const p = row.hsnPred; if(!p) return '';
  const fresh = p.code && !codeHeld(p.code) ? ' A code new to this book.' : '';
  return `<b>${esc(EVIDENCE.inferred)}:</b> HSN ${esc(p.code)}, ${
    esc(p.name.toLowerCase())}, to ${p.digits} digits.${fresh}`;
}

/* The two lines that used to stand here said, in twenty words, what three
   marks on their own row already said: the tag beside the field prints the
   code, and the sync tag beside that prints where it will file. The only fact
   they added was what the code means, which is now on the tag that offers it.
   A line whose every clause is a restatement of a mark six pixels away is not
   an explanation, it is an echo, and it was costing this row two of its four
   lines.

   What survives is the one thing no mark on the row carries: a code the
   customer printed that nothing in the book holds. That is not a complaint
   about the code — it is the clearest signal there is that the master for this
   line is missing — so it is still said, as the finding it is. */
function hsnWhy(row,route){
  const st = hsnState(row,route);
  const code = st.value;
  if(row.hsnPredState==='open' || (row.hsnPredState==='applied' && st.from==='pred')) return '';
  if(st.from==='invoice' && code && !codeHeld(code))
    return `<div class="predwhy"><span class="predcost" title="${
      esc(EVIDENCE.invoice)}">No master carries ${esc(code)}</span></div>`;
  return '';
}

/* The one place an invoice is allowed to change the book. It appears where the
   master behind this line carries no code and the customer printed one — the
   ordinary case of a ledger the book has posted to for years without ever
   coding it.

   It is an offer, not a comparison. There is one code in the room and the only
   question is whether the book takes it, so there is no arrow and no second
   column: naming the master and the code is the whole of what is being asked.

   Both answers are real. Taking it writes the code onto the master and the line
   syncs as the company's own. Leaving it keeps the book exactly as it was and
   the line syncs specified, which is a correct outcome and not a deferral. */
function hsnConsentBar(row,route){
  const st = hsnState(row,route);
  if(row.hsnConsent) {
    if(row.hsnConsent==='updated')
      return `<div class="hsncon hsncon--done"><b>Master updated</b> — ${
        esc(st.value)}, syncs as ${esc(SYNC_TAG.masters)}.</div>`;
    return `<div class="hsncon hsncon--done"><b>Master kept</b> — syncs as ${
      esc(SYNC_TAG.specify)}.<button type="button" class="link" data-act="hsn-reopen">Change</button></div>`;
  }
  if(!st.master || st.clash!=='missing') return '';

  return `<div class="hsncon">
    <p class="hsncon__ask">${esc(st.master.name)} carries no HSN/SAC. The invoice prints
      <b>${esc(st.invoiceCode)}</b>.</p>
    <div class="hsncon__acts">
      <button type="button" class="hsnbtn hsnbtn--yes" data-act="hsn-consent-update"
        title="Write ${esc(st.invoiceCode)} onto ${esc(st.master.name)}">Add to master</button>
      <button type="button" class="hsnbtn" data-act="hsn-consent-decline"
        title="Leave ${esc(st.master.name)} as it is and sync this line as ${esc(SYNC_TAG.specify)}">Leave it</button>
    </div>
  </div>`;
}

/* The short flag beside the field, for the question the bar below is already
   asking — it marks the row at a glance in a table that may be long. */
function hsnClash(row,route){
  const st = hsnState(row,route);
  if(st.clash!=='missing' || row.hsnConsent) return '';
  return `<span class="hsn__flag" title="${esc(st.master.name)} carries no HSN/SAC; the invoice prints ${esc(st.invoiceCode)}.">
    <svg width="13" height="13"><use href="#i-info"/></svg></span>`;
}

/* One HSN block, drawn identically on an item row and a ledger row, because a
   SAC on a ledger and an HSN on an item are the same field and reading them
   differently in the two modes is exactly what the invoice's reviewer cannot
   afford. The field is read-only until the pencil is pressed: a code is the
   book's answer, not a free-text note. */
function hsnMeta(row,route){
  const st = hsnState(row,route);
  /* An accepted code is a settled value, and it is drawn as one. It used to
     keep the tag that offered it *and* a separate Undo, which made it the only
     row in the column that carried four marks and the only one that wrapped —
     everything around it reads `HSN/SAC 8471 ✏️` and its sync tag, and a row
     that has been answered should not be busier than a row that never asked.

     Nothing is lost. The dashed rule under the digits still says the value is
     not the book's own, and the word for it, the reason behind it and the way
     back out are all in the pencil, which is the one control that was already
     there. */
  return `<span class="hsn">HSN/SAC
    <input class="hsn__input${st.from==='pred'?' is-pred':''}" data-f="hsn" value="${esc(st.value)}"
           placeholder="—" aria-label="HSN or SAC code"${
             st.from==='pred'?' title="Read from the description — open the pencil for the reason"':''} readonly>
    ${hsnClash(row,route)}
    <button type="button" class="pencil" data-act="hsn-edit" aria-label="Edit HSN or SAC code"
            aria-haspopup="dialog">${pencil}</button>
  </span>`;
}

/* The sync tag used to sit here, on every line that carried a code, saying
   which of the two authorities the voucher would cite for it. It is gone from
   the row, and from the voucher preview and the two summaries that repeated
   it, by request.

   What still says it: the consent bar, which is where the choice is actually
   made and which states both outcomes in full before either is taken, and the
   pencil, which holds the code's provenance. Neither is a pill. */
function checkbox(checked,mixed){
  const st = mixed?'mixed':(checked?'true':'false');
  return `<button type="button" class="checkbox" role="checkbox" aria-checked="${st}">
    <span class="checkbox__box"><svg width="10" height="10"><use href="#i-${mixed?'dash':'tick'}"/></svg></span></button>`;
}
/* A ledger line can sit against a sales ledger (accounting mode) or an
   income ledger (charges on top of an item invoice). */
const ledgerNameOf = id =>
  byId(MASTERS.salesLedgers,id)?.name || byId(MASTERS.incomeLedgers,id)?.name || '';
/* Sales + income ledgers, grouped — the one pool every ledger picker in
   the sheet (item rows, adjustments) chooses from. */
/* `proposed` is a name the field should be showing in place of its own empty
   state. It is an option with an empty value, so it displays without being a
   choice — the row's ledger stays unset until the tick is pressed, which is
   the whole point of a proposal. */
/* `bare` is the one ledger whose option leaves its "· new on this invoice" off:
   the cell showing it is already carrying the `New` pill, and the mark twice in
   one field is the same sentence twice in eighteen pixels. It stays on every
   other option, which is where somebody browsing the list needs it. */
function ledgerOptions(selected,proposed,bare){
  const opt = (o)=>`<option value="${o.id}"${o.id===selected?' selected':''}>${
    esc(o.name + (o.id===bare ? '' : newMark(o)))}</option>`;
  const head = proposed
    ? `<option value="" selected>${esc(proposed)}</option>`
    : `<option value=""${selected?'':' selected'} disabled>Select Ledger</option>`;
  /* One way out. This picker draws from two pools, but a sales ledger and an
     income ledger are both ledgers — which one is being made is answered by
     the group on the form, not by which of two near-identical menu items was
     clicked before the form was ever seen. */
  return `${head}
    <optgroup label="Sales">${MASTERS.salesLedgers.map(opt).join('')}</optgroup>
    ${[...new Set(MASTERS.incomeLedgers.map(l=>l.group))].map(g=>
      `<optgroup label="${esc(g)}">${MASTERS.incomeLedgers.filter(l=>l.group===g).map(opt).join('')}</optgroup>`).join('')}
    ${nmOut(NM_NEW_LEDGER,'ledger')}`;
}
/* An income ledger, because that is what a charge line on an invoice is. The
   sales route stays in the list, where its own picker in Invoice Details is
   short enough to show it. */
/* Built per render rather than once, because whether it is pressable is a fact
   about the reader and not about the markup. */
const newLedgerBtn = ()=>`<button type="button" class="fieldplus" data-act="new-ledger"${
  barredAttrs()}${canCreate()?' title="Create a new income ledger"':''}
  aria-label="Create a new income ledger"
  ><svg width="12" height="12"><use href="#i-plus"/></svg></button>`;

/* The plus is the way out of a list that does not hold the answer, so it is
   drawn on a field that has no answer — a line already pointed at a ledger has
   nothing left to create, and the button sat there on every coded row
   soliciting a master nobody needed. It goes once the field is filled, and
   nothing goes with it: the same form is still the picker's own last option,
   which is where a line that needs re-pointing to a ledger the book lacks
   would go anyway. */
const wantsNewBtn = (filled,pred)=>!filled && !pred;

function ledgerSelect(row,p){
  const made = madePred(row,'ledger');
  return `<select class="cell__select t-cell" data-f="ledger">${
    ledgerOptions(row.ledger, p?predName(p):'', made?row.ledger:'')}</select>${
    wantsNewBtn(row.ledger,p)?newLedgerBtn():''}`;
}

/* ---------------------------------------------------------------------------
   Item Mode <-> Accounting Mode.
   The two modes are two presentations of one voucher, so switching converts
   rather than discards: every item line becomes a sales-ledger line of its
   own and unfolds back again.

   One line per item, not one per GST slab. A line the user typed has to still
   be there after the switch — the description they wrote, the cost centre they
   picked, the price they have not filled in yet. Rolling them up by slab threw
   all of that away and, for an invoice nobody had priced yet, left the ledgers
   table empty; the tax working is identical either way, because GST is summed
   by rate across whatever lines exist.
   ------------------------------------------------------------------------ */
function itemLabel(r){
  return r.description || byId(MASTERS.items,r.item)?.name || (typeof r.item==='string'?r.item:'') || '';
}
/* The fold carries the whole line, not a summary of it. Everything the code
   question depends on travels with the row — the customer's code and rate, the
   classification, the proposal and whatever consent was already given — and
   `carriedItem` keeps the row pointed at the item master it came from, so
   Accounting Mode shows the same code, the same tag and the same prompt that
   Item Mode showed, and answering it in either place answers it in both. */
function foldItemsIntoLedgers(){
  state.stashedItems = state.items;
  const led = byId(MASTERS.salesLedgers,state.salesLedger);
  const folded = state.items
    .filter(r=>itemLabel(r) || lineOf(r).taxable>0)     // anything the user has started
    .map(r=>{
      const label = itemLabel(r) || (led?led.name:'Sales');
      const foldedRow = {
        ...blankLedger(), fromItems:true, srcItem:r.id, srcLabel:label,
        ledger: state.salesLedger,
        carriedItem: r.item || '', kind: r.kind,
        description: label,
        costCentre: r.costCentre, ccSplit: r.ccSplit,
        tax: r.tax,
        pred:r.pred, predState:r.predState,
        hsn: r.hsn, hsnFrom: r.hsnFrom, hsnDismissed: r.hsnDismissed,
        hsnPred: r.hsnPred, hsnPredState: r.hsnPredState, hsnConsent: r.hsnConsent, hsnRateMoved: r.hsnRateMoved,
        invoiceHsn: r.invoiceHsn, invoiceRate: r.invoiceRate,
        amount: lineOf(r).taxable
      };
      return foldedRow;
    });
  const kept = state.ledgers.filter(r=>r.ledger||r.description||num(r.amount));
  state.items = [];
  state.ledgers = [...folded, ...kept];
  if(!state.ledgers.length) state.ledgers = [blankLedger()];
}

/* Unfolding used to restore the stash and warn that Accounting-mode edits were
   about to be thrown away. It no longer throws anything away: each folded row
   writes what was done to it back onto the item it came from, and an amount
   that was edited comes back as an override, which is the item line's own way
   of saying "this figure is stated, not computed". A folded row deleted in
   Accounting Mode is a line deleted, and does not come back either. */
function unfoldItemsFromLedgers(){
  const folded = state.ledgers.filter(r=>r.fromItems);
  const stash  = state.stashedItems || [];
  const src    = new Map(stash.map(r=>[r.id,r]));
  const alive  = new Set();

  folded.forEach(f=>{
    const it = src.get(f.srcItem);
    if(!it) return;                       // a row added in Accounting Mode; stays a ledger line
    alive.add(f.srcItem);
    /* only a description the user actually changed comes back — the fold
       supplies one for a line that had none, and that is our text, not theirs */
    if(f.description !== f.srcLabel) it.description = f.description;
    it.costCentre = f.costCentre; it.ccSplit = f.ccSplit;
    it.tax = f.tax;
    it.pred = f.pred; it.predState = f.predState;
    it.hsn = f.hsn; it.hsnFrom = f.hsnFrom; it.hsnDismissed = f.hsnDismissed;
    it.hsnPred = f.hsnPred; it.hsnPredState = f.hsnPredState; it.hsnConsent = f.hsnConsent; it.hsnRateMoved = f.hsnRateMoved;
    const was = r2(lineOf(it).taxable), now = r2(num(f.amount));
    if(Math.abs(now-was)>0.005) it.amountOverride = now;
  });

  const survived = stash.filter(r=>
    alive.has(r.id) || !(itemLabel(r) || lineOf(r).taxable>0));   // untouched blanks stay
  state.ledgers = state.ledgers.filter(r=>!r.fromItems);
  state.items = survived.length ? survived : [blankItem()];
  state.stashedItems = null;
  if(!state.ledgers.length) state.ledgers = [blankLedger()];
  return true;
}

/* Switching is a change of view, never a re-read of the document. Nothing here
   calls extraction, and both directions convert rather than discard. */
function setMode(next){
  if(next===state.mode) return;
  if(next==='accounting') foldItemsIntoLedgers();
  else unfoldItemsFromLedgers();
  state.mode = next;
  render();
}

/* ---------------------------------------------------------------------------
   COST CENTRES

   Two ways to say where the money lands, and the toggle picks which:

   · a cost centre *class* — a saved template that allocates every line the
     same way, so the lines themselves stop asking; or
   · cost centres chosen per line, with an invoice-level default behind them.

   A line does not have to land in one place. Cost centres are grouped into
   categories (Departments, Projects), and — as in Tally — each category
   allocates the *whole* line independently: ₹6,666 can be Engineering 50 /
   Sales 50 by department and Project Atlas 100 by project at the same time.
   That is why the split is validated per category and each has to reach
   100%, rather than everything summing to 100% between them.
   ------------------------------------------------------------------------ */
/* A cost centre set at header level applies to the whole invoice: every other
   cost centre field shows it and goes read-only behind it. The per-line values
   are masked rather than overwritten — row.costCentre and any split stay in
   state, so clearing the header brings each line's own answer back. */
/* Only a centre that resolves against the masters counts. The inbox seeds this
   field from the record, and those carry cost centre NAMES ('Engineering')
   rather than master ids ('cc-eng'), so an unresolvable value has always been
   possible here. It used to be harmless — it fed a placeholder and nothing
   else. Now that it drives a lock it has to be checked, or an embedded bill
   locks every cost centre field to a value it cannot show and cannot set. */
const ccHeader = ()=> state.ccMode==='centre' && byId(MASTERS.costCentres,state.invoiceCostCentre)
  ? state.invoiceCostCentre : '';
const ccLocked = ()=> state.ccMode==='class' || !!ccHeader();
function ccPlaceholder(){
  if(state.ccMode!=='class'){
    const invoice = byId(MASTERS.costCentres,state.invoiceCostCentre);
    return invoice ? invoice.name+' (invoice cost centre)' : 'Select Cost Centre';
  }
  const cls = byId(MASTERS.costCentreClasses,state.costCentreClass);
  return cls ? cls.name : 'Set by class';
}

const CC_SPLIT = '__cc-split';                    // the sentinel option value
const ccCategories = ()=>[...new Set(MASTERS.costCentres.map(c=>c.group))];
const ccInCategory = cat=>MASTERS.costCentres.filter(c=>c.group===cat);
const blankCcRow = ()=>({id:uid(),centre:'',pct:0});
const blankCcCat = cat=>({id:uid(),category:cat,rows:[blankCcRow()]});

const ccCatTotal = c=>r2(c.rows.reduce((s,r)=>s+num(r.pct),0));
const ccCatDone  = c=>Math.abs(ccCatTotal(c)-100)<0.005 && c.rows.every(r=>r.centre);
const ccSplitDone = s=>!!s && s.categories.length>0 && s.categories.every(ccCatDone);
const ccSplitCentres = s=>new Set(s.categories.flatMap(c=>c.rows.map(r=>r.centre).filter(Boolean)));

function ccSplitLabel(s){
  const n = ccSplitCentres(s).size;
  return `Split — ${n} cost centre${n===1?'':'s'}`;
}
function ccSplitDetail(s){
  return s.categories.map(c=>
    `${c.category}: ${c.rows.filter(r=>r.centre).map(r=>
      `${byId(MASTERS.costCentres,r.centre)?.name} ${num(r.pct)}%`).join(', ')||'—'}`).join(' · ');
}

/* One cost-centre picker, wherever it appears: the centres, then the way to
   split across them. The same markup serves the table rows and the customer
   card — only the binding attribute differs. */
function ccSelect({cls, attrs, disabled, placeholder, value, split}){
  return `<select class="${cls}" ${attrs}${disabled?' disabled':''}${
      split?` title="${esc(ccSplitDetail(split))}"`:''}>
    ${split?`<option value="${CC_SPLIT}" selected>${esc(ccSplitLabel(split))}</option>`:''}
    ${options2(MASTERS.costCentres, placeholder, split?CC_SPLIT:value)}
    <option value="${CC_SPLIT}-open">${split?'Edit split…':'Split cost centres…'}</option>
  </select>`;
}

function renderItems(){
  const head = `<div class="trow trow--head">
    <div class="tcell col-check tcell--check">${checkbox(state.items.length>0&&state.items.every(r=>r.sel),state.items.some(r=>r.sel)&&!state.items.every(r=>r.sel))}</div>
    <div class="tcell col-desc tcell--grow">Item Description</div>
    <div class="tcell col-item">Item</div>
    <div class="tcell col-med">Cost Centre</div>
    <div class="tcell col-godown">Godown/Location</div>
    <div class="tcell col-qty">Quantity</div>
    <div class="tcell col-num tcell--end">Unit Rate</div>
    <div class="tcell col-num tcell--end">Discount</div>
    <div class="tcell col-num tcell--end"><span class="req">*</span>&nbsp;Amount</div>
    <div class="tcell col-menu tcell--last"></div>
  </div>`;

  const rows = state.items.map(row=>{
    const l = lineOf(row);
    const master = byId(MASTERS.items,row.item);
    const invalid = state.validated && l.taxable<=0;
    const overridden = row.amountOverride!==null && row.amountOverride!==undefined;
    /* the proposal is shown in the field, so the field's value is the proposed
       name and the row is marked as carrying one — which is what pulls every
       cell in it to the top so the fields still line up */
    const p = openPred(row,'item');
    const shown = p;
    return `<div class="trow${row.sel?' is-selected':''}${rowHasPred(row,'item')?' has-pred':''}" data-kind="items" data-id="${row.id}">
      <div class="tcell col-check tcell--check">${checkbox(row.sel)}</div>
      <div class="tcell col-desc tcell--grow">
        <label class="cell"><input class="cell__input t-cell" data-f="description" value="${esc(row.description)}" placeholder="Enter Description"></label>
      </div>
      <div class="tcell col-item">
        <label class="cell${predCellCls(p)}">${p?predTag(p,predReason(row,'item')):''}<input class="cell__input t-cell" data-f="item" data-list="items-list" value="${
            esc(shown ? predName(shown) : (master?master.name:row.item))}"${shown?` title="${esc(predName(shown))}"`:''} placeholder="Type or Select Item">
          <button type="button" class="cellcaret" data-act="pickitem" aria-label="Show item suggestions">${caret}</button>
          ${p?predActions(p):''}</label>
        ${predWhy(row,'item')}
        <div class="itemmeta">
          <button type="button" class="kindtoggle" data-f="kind" data-kind="${row.kind}"
                  title="Switch between goods and service">${row.kind==='service'?'Service':'Goods'}</button>
          ${hsnMeta(row,'item')}
        </div>
        ${hsnWhy(row,'item')}
        ${hsnConsentBar(row,'item')}
      </div>
      <div class="tcell col-med">
        <label class="cell${ccLocked()?' is-disabled':''}">${ccSelect({
          cls:'cell__select t-cell', attrs:'data-f="costCentre"', disabled:ccLocked(),
          placeholder:ccPlaceholder(), value:ccLocked()?(ccHeader()||''):row.costCentre,
          split:ccLocked()?null:row.ccSplit})}</label>
      </div>
      <div class="tcell col-godown">
        <label class="cell${row.kind==='service'?' is-disabled':''}">
          <select class="cell__select t-cell" data-f="godown">${options2(MASTERS.godowns,row.kind==='service'?'Not applicable':'Select Godown/Location',row.godown)}</select></label>
      </div>
      <div class="tcell col-qty">
        <div class="split"><input class="split__value t-cell" data-f="qty" inputmode="decimal" value="${row.qty||0}">
        <span class="split__addon">${esc(master?master.unit:'—')}</span></div>
      </div>
      <div class="tcell col-num">
        <label class="cell cell-num"><input class="cell__input t-cell" data-f="rate" inputmode="decimal" value="${row.rate||0}"></label>
      </div>
      <div class="tcell col-num">
        <div class="split"><input class="split__value t-cell" data-f="discount" inputmode="decimal" value="${row.discount||0}">
        <button type="button" class="split__addon split__addon--btn" data-f="discountType" title="Switch between % and flat amount">
          ${row.discountType==='pct'?`<span class="ico ico-14 ico--muted"><svg width="14" height="14"><use href="#i-percent"/></svg></span>`:'₹'}${caret}</button></div>
      </div>
      <div class="tcell col-num${invalid?' is-invalid':''}">
        <label class="cell cell-num"><input class="cell__input t-cell" data-f="amountOverride" inputmode="decimal" value="${inr.format(l.taxable)}"></label>
        ${overridden?`<button type="button" class="link" data-f="clearOverride">Reset to ${inr.format(l.computed)}</button>`:''}
      </div>
      <div class="tcell col-menu tcell--last">
        <button type="button" class="row-menu" data-act="menu" aria-label="Row options">${dots}</button>
      </div>
    </div>`;
  }).join('');

  $('#items-table').innerHTML = head + (rows || `<div class="trow trow--empty">No line items yet — use “Add Line Item”.</div>`);
}

function renderLedgers(){
  const head = `<div class="trow trow--head">
    <div class="tcell col-check tcell--check">${checkbox(state.ledgers.length>0&&state.ledgers.every(r=>r.sel),state.ledgers.some(r=>r.sel)&&!state.ledgers.every(r=>r.sel))}</div>
    <div class="tcell col-med tcell--grow">Description</div>
    <div class="tcell col-ledger">Ledger Name</div>
    <div class="tcell col-med">Cost Centre</div>
    <div class="tcell col-num tcell--end">Amount</div>
    <div class="tcell col-menu tcell--last"></div>
  </div>`;

  const rows = state.ledgers.map(row=>{
    const p = openPred(row,'ledger');
    const shown = p;
    return `<div class="trow${row.sel?' is-selected':''}${rowHasPred(row,'ledger')?' has-pred':''}" data-kind="ledgers" data-id="${row.id}">
      <div class="tcell col-check tcell--check">${checkbox(row.sel)}</div>
      <div class="tcell col-med tcell--grow">
        <label class="cell"><input class="cell__input t-cell" data-f="description" value="${esc(row.description)}" placeholder="Enter Description"></label>
      </div>
      <div class="tcell col-ledger">
        <label class="cell${predCellCls(p)}">${
          p?predTag(p,predReason(row,'ledger')):''
          }${ledgerSelect(row,shown)}${p?predActions(p):''}</label>
        ${predWhy(row,'ledger')}
        <div class="itemmeta">${hsnMeta(row,'ledger')}</div>
        ${hsnWhy(row,'ledger')}
        ${hsnConsentBar(row,'ledger')}
      </div>
      <div class="tcell col-med">
        <label class="cell${ccLocked()?' is-disabled':''}">${ccSelect({
          cls:'cell__select t-cell', attrs:'data-f="costCentre"', disabled:ccLocked(),
          placeholder:ccPlaceholder(), value:ccLocked()?(ccHeader()||''):row.costCentre,
          split:ccLocked()?null:row.ccSplit})}</label>
      </div>
      <div class="tcell col-num">
        <label class="cell cell-num"><input class="cell__input t-cell" data-f="amount" inputmode="decimal" value="${row.amount||0}"></label>
      </div>
      <div class="tcell col-menu tcell--last">
        <button type="button" class="row-menu" data-act="menu" aria-label="Row options">${dots}</button>
      </div>
    </div>`;
  }).join('');

  $('#ledgers-table').innerHTML = head + (rows || `<div class="trow trow--empty">No ledger lines — use “Add Ledger”.</div>`);
}

/* ---------------------------------------------------------------------------
   THE BULK BAR

   Everything the bar can set is a field the row already has, and it sets it
   the same way the cell does — the Item picker runs the master cascade, the
   Godown picker skips service lines that have no godown to set, the Cost
   Centre picker goes dark when a class is driving cost centres. A bulk edit
   that could write a value the cell itself refuses would be a second, looser
   way into the same rows.

   Fields left blank are not part of the edit. That is what makes the bar
   usable twice in a row without re-ticking anything: set Cost Centre, Apply,
   then set Godown, Apply. The selection survives both.
   ------------------------------------------------------------------------ */

/* Which table the bar is pointed at. Set by the last tick, not by a count, so
   that a selection left behind in the other table doesn't silently steal it. */
let bulkKind = null;
/* Held outside the DOM: the bar is re-rendered on every render(), and a value
   typed into it has to survive the re-render that ticking another row causes. */
let bulkDraft = {items:{}, ledgers:{}};

/* The widths are the mock's, and they are set rather than left to the content
   because a select sizes itself to its longest option: left alone, the Ledger
   picker alone made the bar half as wide again as the sheet it floats over.
   A truncated option in a 109px field is the same thing the row cells do. */
const BULK_FIELDS = {
  items: [
    {f:'description', kind:'text',   w:159, placeholder:'Enter Description', label:'Description for selected line items'},
    {f:'item',        kind:'select', w:109, placeholder:'Select an Item',    label:'Item for selected line items',
     options:()=>options2(MASTERS.items,'Select an Item','')},
    {f:'godown',      kind:'select', w:134, placeholder:'Godown/Location',   label:'Godown or location for selected line items',
     options:()=>options2(MASTERS.godowns,'Godown/Location','')},
    {f:'costCentre',  kind:'select', w:101, placeholder:'Cost Centre',       label:'Cost centre for selected line items',
     off:()=>ccLocked(), offTitle:()=>`Cost centres are set by ${ccPlaceholder()}`,
     options:()=>options2(MASTERS.costCentres,'Cost Centre','')},
  ],
  ledgers: [
    {f:'description', kind:'text',   w:159, placeholder:'Enter Description', label:'Description for selected ledger lines'},
    {f:'ledger',      kind:'select', w:109, placeholder:'Select Ledger',     label:'Ledger for selected ledger lines',
     options:()=>bulkLedgerOptions()},
    {f:'costCentre',  kind:'select', w:101, placeholder:'Cost Centre',       label:'Cost centre for selected ledger lines',
     off:()=>ccLocked(), offTitle:()=>`Cost centres are set by ${ccPlaceholder()}`,
     options:()=>options2(MASTERS.costCentres,'Cost Centre','')},
  ],
};

/* The row picker's pool without its tail. "Create one" belongs to a single
   line being answered, not to a menu that is about to write the same id into
   every ticked row. */
function bulkLedgerOptions(){
  const opt = o=>`<option value="${o.id}">${esc(o.name)}</option>`;
  return `<option value="" selected disabled>Select Ledger</option>
    <optgroup label="Sales">${MASTERS.salesLedgers.map(opt).join('')}</optgroup>
    ${[...new Set(MASTERS.incomeLedgers.map(l=>l.group))].map(g=>
      `<optgroup label="${esc(g)}">${
        MASTERS.incomeLedgers.filter(l=>l.group===g).map(opt).join('')}</optgroup>`).join('')}`;
}

const bulkCount = kind => kind ? state[kind].filter(r=>r.sel).length : 0;

function renderBulkBar(){
  const bar = $('#bulkbar'); if(!bar) return;

  /* The bar follows the selection rather than the other way round: a table
     whose last tick was unticked hands the bar to whichever one still has
     rows, and only an empty page puts it away. */
  if(!bulkCount(bulkKind)) bulkKind = ['items','ledgers'].find(k=>bulkCount(k)) || null;
  document.body.classList.toggle('has-bulkbar', !!bulkKind);
  if(!bulkKind){ bar.hidden = true; return; }

  const kind = bulkKind, n = bulkCount(kind), draft = bulkDraft[kind];
  const noun = kind==='items' ? `line item${n===1?'':'s'}` : `Ledger${n===1?'':'s'}`;

  bar.hidden = false;
  bar.innerHTML =
    `<span class="bulkbar__n">${n} ${noun} selected</span>
     <span class="bulkbar__rule" aria-hidden="true"></span>
     <button type="button" class="bulkbar__arrow" data-bulk="page" data-dir="-1"
             aria-label="Show earlier fields">${chevLeft}</button>
     <div class="bulkbar__fields" id="bulkbar-fields">${
       BULK_FIELDS[kind].map(spec=>{
         const off = spec.off?.();
         const v   = off ? '' : (draft[spec.f] ?? '');
         const cls = `bulkbar__fld${v?' is-set':''}${off?' is-off':''}`;
         const t   = off && spec.offTitle ? ` title="${esc(spec.offTitle())}"` : '';
         return `<div class="${cls}" style="width:${spec.w}px"${t}>${
           spec.kind==='text'
             ? `<input type="text" data-bf="${spec.f}" value="${esc(v)}"
                       placeholder="${esc(spec.placeholder)}" aria-label="${esc(spec.label)}"${
                       off?' disabled':''}>`
             : `<select data-bf="${spec.f}" aria-label="${esc(spec.label)}"${off?' disabled':''}>${
                  spec.options()}</select>`
         }</div>`;
       }).join('')
     }</div>
     <button type="button" class="bulkbar__arrow" data-bulk="page" data-dir="1"
             aria-label="Show later fields">${chevRight}</button>
     <span class="bulkbar__rule" aria-hidden="true"></span>
     <button type="button" class="btn btn--solid btn--sm" data-bulk="apply">Apply</button>
     <button type="button" class="bulkbar__icon bulkbar__icon--danger" data-bulk="delete"
             aria-label="Delete selected rows">${trashIco}</button>
     <button type="button" class="bulkbar__icon" data-bulk="clear"
             aria-label="Clear selection">${closeIco}</button>`;

  /* A select cannot be given its value in markup here — the draft holds an id
     and the options are rebuilt each pass, so it is set after they exist. */
  BULK_FIELDS[kind].forEach(spec=>{
    if(spec.kind!=='select') return;
    const el = bar.querySelector(`[data-bf="${spec.f}"]`);
    if(el && draft[spec.f]) el.value = draft[spec.f];
  });

  /* a trackpad can move the strip without the arrows being touched, so they
     take their state from the strip rather than from having been pressed */
  $('#bulkbar-fields').addEventListener('scroll', syncBulkArrows, {passive:true});

  placeBulkBar();
  syncBulkArrows();
}

/* Centred on the form pane and held inside it. Both the centre and the width
   ceiling are read from its rect rather than written as constants, so the bar
   still follows the column as the window resizes. --bulk-w is what stops the
   bar growing past the pane; the inset keeps it off the pane's own edges. */
const BULK_INSET = 8;
function placeBulkBar(){
  const bar = $('#bulkbar'); if(!bar || bar.hidden) return;
  const pane = $('.form'); if(!pane) return;
  const r = pane.getBoundingClientRect();
  bar.style.setProperty('--bulk-w', `${Math.round(r.width - BULK_INSET*2)}px`);
  bar.style.setProperty('--bulk-x', `${Math.round(r.left + r.width/2)}px`);
}

/* The arrows page the strip. They are drawn whether or not there is anything
   to page — the bar's width would jump as the pane is dragged if they came and
   went — but they go dim at the ends so they never look live when they aren't. */
function syncBulkArrows(){
  const strip = $('#bulkbar-fields'); if(!strip) return;
  const max = strip.scrollWidth - strip.clientWidth;
  const x = strip.scrollLeft;
  const atStart = x <= 1, atEnd = x >= max - 1;
  $('#bulkbar [data-dir="-1"]').disabled = atStart;
  $('#bulkbar [data-dir="1"]').disabled  = atEnd;
  strip.classList.toggle('is-scrollable', max > 1);
  strip.classList.toggle('at-start', atStart);
  strip.classList.toggle('at-end', atEnd);
}

function bulkApply(){
  const kind = bulkKind; if(!kind) return;
  const rows = state[kind].filter(r=>r.sel);
  const draft = bulkDraft[kind];
  const set = BULK_FIELDS[kind].filter(s=>!s.off?.() && draft[s.f]);
  if(!rows.length) return;
  if(!set.length){ toast('Nothing to apply — fill a field in the bar first'); return; }

  /* Counted per field, because a field can decline a row: a service line has
     no godown, and reporting four when three were written would be a lie the
     next Apply inherits. */
  let touched = 0;
  rows.forEach(row=>{
    let hit = false;
    set.forEach(spec=>{
      const v = draft[spec.f];
      if(spec.f==='item'){
        const master = byId(MASTERS.items, v); if(!master) return;
        applyItemMaster(row, master); hit = true; return;
      }
      if(spec.f==='godown' && row.kind==='service') return;   // not a field this row has
      if(spec.f==='ledger'){
        row.ledger = v; row.pred = null; row.predState = '';
        if(row.hsnFrom!=='user'){ row.hsn=''; row.hsnFrom=''; row.hsnPred=null; row.hsnPredState=''; }
        row.hsnConsent = '';
        predictHsn(row,'ledger');
        hit = true; return;
      }
      if(spec.f==='costCentre'){ row.costCentre = v; row.ccSplit = null; hit = true; return; }
      row[spec.f] = v;
      hit = true;
    });
    if(hit) touched++;
  });

  const skipped = rows.length - touched;
  bulkDraft[kind] = {};                   // the edit has landed; the bar is empty again
  render();
  const noun = kind==='items' ? `line item${touched===1?'':'s'}` : `ledger line${touched===1?'':'s'}`;
  toast(`Applied to ${touched} ${noun}${skipped?` · ${skipped} skipped`:''}`, 'ok');
}

/* --- the missing ledger, on a tax line -------------------------------------
   The same two marks the tables use — the tag that says what this is, the tick
   and cross that answer it — drawn on a second row, because the first row of a
   399px panel has no space left in it.

   It draws only when there is something to decide. A tax line whose ledger the
   book holds points at it and says nothing, which is the whole reason this can
   sit inside a totals panel without turning it into a worklist. */
/* An open proposal on a tax line is drawn in the line's own field, not on a
   row beneath it.

   This one is not quite the shape the other tables are. A ledger row's field
   holds the very master being proposed, so the offer goes straight into it. A
   withholding line's field holds the *section* — 194J — and the record being
   proposed is the payable ledger that section posts to, which is a second
   value with nowhere of its own to live in a 433px panel. Drawn as its own
   row, the two read as two separate lines rather than one answer, which is
   what they are.

   So the tag and the two buttons join the section's field, and the name of the
   ledger they would create rides on the field's own tooltip and in the
   confirmation, which lists it in full. The row states that it needs a record
   and lets you take or refuse it; the name of that record is one hover away
   rather than one line down. */
const taxPredTag = row => {
  const p = row.pred;
  if(!p || row.predState!=='open') return '';
  return `<button type="button" class="predtag predtag--sm predtag--why predtag--new" data-act="why"
          aria-expanded="false">New<span class="predtag__why"><b>Read off the invoice:</b> ${
            esc(p.reason)}. Creates ${esc(taxLedgerName(row))}.</span></button>`;
}; const taxPredActs = row => {
  const p = row.pred;
  if(!p || row.predState!=='open') return '';
  const name = taxLedgerName(row);
  const barred = !canCreate();
  return `<button type="button" class="predbtn" data-act="tax-pred-accept"${barredAttrs()}${
          barred?'':` title="${esc('Create '+name)}"`} aria-label="${esc('Create '+name)
          }"><svg width="12" height="12" aria-hidden="true"><use href="#i-plus"/></svg></button>`;
}; /* Ledger picker for a tax line: GST output ledgers and the statutory sections
   in one list, because a withheld or collected head is just another tax line
   on the invoice. Output, not input — the GST on an invoice we raise is tax we
   have charged and owe on, never credit to claim. */
function gstLedgerChoices(){
  const out = [];
  [0,2.5,6,9,14].forEach(r=>['CGST','SGST'].forEach(h=>out.push(`Output ${h} ${r}%`)));
  [0,5,12,18,28].forEach(r=>out.push(`Output IGST ${r}%`));
  out.push('Output Cess');
  return out;
}
/* A line can be re-pointed within its own family but not out of it: a GST
   ledger offers GST ledgers, and a withholding line offers the heads of the
   mode the section is in. Letting a TDS row become a GST row from this
   dropdown would move it into a section that is not the one it is drawn in,
   which reads as the line vanishing. */
/* The full value is revealed by the sheet's own tooltip (see bdTip), not by a
   title attribute — a title on a select becomes that select's accessible name,
   so carrying the value there had screen readers announcing the chosen ledger
   as the field's label and then announcing it again as its value. The name of
   this field is what it is for; the value is the select's own business. */
function taxLedgerSelect(row){
  const tip = ` aria-label="${row.type==='gst'?'GST ledger':'Withholding head'}"`;
  if(row.type!=='gst'){
    const mode = row.type, d = DEDUCTIONS[mode];
    return `<select class="bd-fld__select" data-f="ledger"${tip}>
      <optgroup label="${esc(d.group)}">${dedMaster(mode).map(s=>
        `<option value="${mode}:${esc(s.id)}"${s.id===row.section?' selected':''}>${esc(s.name)}</option>`
      ).join('')}</optgroup>
    </select>`;
  }
  const gst = gstLedgerChoices();
  if(row.name && !gst.includes(row.name)) gst.unshift(row.name);
  return `<select class="bd-fld__select" data-f="ledger"${tip}>
    <optgroup label="GST">${gst.map(n=>
      `<option value="${esc(n)}"${n===row.name?' selected':''}>${esc(n)}</option>`).join('')}</optgroup>
  </select>`;
}


/* --- creating the master the book is missing -------------------------------
   Like the allocation dialog, it edits a copy, so Cancel really cancels — and
   unlike it, what is being edited was written by the engine rather than by the
   user, so every field states which part of the invoice it came from. The fields
   the invoice cannot answer arrive empty and are the only required ones: asking
   for a name that is already on the sheet would be the dialog pretending it
   knows less than it does.
   ------------------------------------------------------------------------ */
let nmDraft = null;                 // {draft, target:{kind,id}|null}

/* One title for all four, because they make one kind of record. Which ledger it
   is, is what the note underneath says and what the group answers — it is not a
   different dialog. */
const NM_TITLE = {item:'Create Item Master', ledger:'New Ledger',
                  sales:'New Ledger',
                  tax:'New Ledger', customer:'Create Customer'};
/* NM_NOTE and PROFILE_NOTE lived here — a headline and a paragraph per kind
   of master, written for the banner above each modal's fields. The banner is
   gone from every modal, so they are too. */
const PROFILE_HINT = {
  bank:'E.g., HDFC Current A/c 4471', balance:'E.g., Share Capital',
  cash:'E.g., Petty Cash — Bengaluru',  assetliab:'E.g., Security Deposit — Office',
  duties:'E.g., CGST Payable',          stock:'E.g., Closing Stock',
  party:'E.g., Technova Systems LLP'
};

/* One spec per master, read top to bottom into a two-column grid. `req` is a
   field the invoice could not answer; `wide` spans both columns. */
const unitsInUse = ()=>[...new Set(MASTERS.items.map(i=>i.unit).filter(Boolean))].sort();
const groupsOf   = list=>[...new Set(list.map(x=>x.group).filter(Boolean))];
/* Both lists lead on "Not Applicable" because that is the honest answer for an
   expense head read off an invoice, and a default that has to be corrected on every
   ledger is worse than no default at all. */
const LEDGER_TYPES = [{id:'Not Applicable',name:'Not Applicable'},
                      {id:'Discount',name:'Discount'},
                      {id:'Invoice Rounding',name:'Invoice Rounding'}];
/* The sheet allows two. Tally's third, "Undefined", is what a migration leaves
   behind and not something anything here creates. */
const GST_APPLICABILITY = [{id:'Not Applicable',name:'Not Applicable'},
                           {id:'Applicable',name:'Applicable'}];
const TAXABILITY_TYPES = ['Taxable','Exempt','Nil Rated','Non-GST'].map(v=>({id:v,name:v}));
const SUPPLY_TYPES     = ['Goods','Services','Capital Goods'].map(v=>({id:v,name:v}));
const DUTY_TYPES       = ['GST','TDS','TCS','Others'].map(v=>({id:v,name:v}));
const DRCR             = [{id:'Dr',name:'Dr'},{id:'Cr',name:'Cr'}];
/* There is no "the value I need is not in here" row on the statutory lists any
   more. Nature of payment, nature of goods and unit of measure are classifications
   the ERP holds and AIA does not author, so the way out of those lists is that
   there isn't one — the answer is picked from what exists or the field stays
   empty and says so. The ledger and item pickers keep their own create routes;
   those are records an invoice may legitimately author. */

/* "Must be unique within the company" is a statement about the book, not about
   whichever of the four lists this ledger happens to land in. */
const allLedgers = () => [...MASTERS.incomeLedgers, ...MASTERS.salesLedgers,
                          ...MASTERS.taxLedgers];
const nameTaken = (n,kind) => {
  const t = String(n||'').trim().toLowerCase();
  const pool = kind==='item' ? MASTERS.items : kind==='customer' ? MASTERS.customers : allLedgers();
  return !!t && pool.some(l=>String(l.name).trim().toLowerCase()===t);
};

/* The Under picker: the chart of accounts in its own order with sub-groups
   indented under their parent, then any group this book has already filed a
   ledger under that the chart does not name. Those last ones are real — a
   picker that hides them cannot re-file a ledger that already exists. */
function groupOptions(kind){
  const known = new Set(GROUP_TREE.map(g=>g.name));
  const cfg   = LEDGER_KIND[kind] || {};
  /* Groups this book has filed a ledger under that neither the chart nor the
     sub-group table names. They are real — a picker that hides them cannot
     re-file a ledger that already exists — so they are listed last rather than
     being passed off as part of the chart. */
  const loose = [...new Set([...groupsOf(cfg.pool?cfg.pool():[]), ...(cfg.fallback||[])])]
                  .filter(g=>g && !known.has(g) && !BOOK_SUBGROUPS[g]).sort();
  const out = [];
  const pad = n => '   '.repeat(n);
  GROUP_TREE.forEach(g=>{
    out.push({id:g.name, name:pad(g.parent?1:0)+g.name});
    /* A book sub-group sits one level in from the group it was made under, so
       the picker reads as one tree rather than as a chart plus a list of the
       things that did not fit into it. */
    Object.keys(BOOK_SUBGROUPS).filter(s=>BOOK_SUBGROUPS[s]===g.name).sort()
      .forEach(s=>out.push({id:s, name:pad(g.parent?2:1)+s}));
  });
  return [...out, ...loose.map(g=>({id:g, name:g}))];
}

/* Which questions a ledger under this group answers — the whole point of the
   form. A group the chart does not name is one this book invented, and it gets
   the shape of the kind of ledger being made rather than a guess from its name. */
const KIND_FALLBACK_PROFILE = {ledger:'pl', sales:'pl'};
const profileFor = (group,kind) =>
  GROUP_BY_NAME[group]?.profile
  || GROUP_BY_NAME[BOOK_SUBGROUPS[group]]?.profile   /* a sub-group is its parent */
  || KIND_FALLBACK_PROFILE[kind] || 'pl';

/* --- the blocks the profiles are built from --------------------------------
   The sheet repeats four or five blocks in different combinations, so they are
   written once and composed. What separates two profiles is which blocks they
   carry and, in a couple of places, what a block leaves out. */
/* Which profiles put the statutory block on the form. Two fields lock against
   GST Applicability, and a value that is not being asked for may not lock
   anything. */
const STATUTORY_PROFILES = ['assetliab','pl'];
const gstAsked = d => STATUTORY_PROFILES.includes(profileFor(d.group,d.kind));

const blk = {
  head: (kind,group) => [
    {section:'Basic Details'},
    {k:'name',  label:'Name', type:'text', req:true, unique:true,
     placeholder:(kind==='ledger' && PROFILE_HINT[profileFor(group,kind)])
                 || LEDGER_KIND[kind]?.hint},
    {k:'group', label:'Under', type:'select', req:true, free:true, drives:true,
     opts:()=>groupOptions(kind), placeholder:'Select Under',
     note:groupSuggestNote},
    /* Stored either way. Asked only when the company keeps more than one
       currency — a field whose only possible answer is INR is not a question. */
    {k:'currency', label:'Currency of Ledger', type:'select', req:true,
     flag:'multiCurrency', opts:()=>MASTERS.currencies}
  ],

  /* Visible only when the company keeps cost centres at all. Yes puts a cost
     centre column against this ledger on every voucher; No leaves it off. */
  costCentre: () => [
    {k:'costCentre', label:'Cost centres are applicable', type:'switch', flag:'costCentre'}
  ],

  /* Bill-by-bill and inventory values are the same claim about a ledger made
     two ways, so the sheet forbids both — and forbidding is done by locking the
     other one to No rather than by letting both be set and rejecting the save. */
  balances: ({inventory=false, creditPeriod=false}={}) => [
    {k:'billByBill', label:'Maintain balances bill by bill', type:'switch', drives:true,
     lock:d=>d.invValues===true ? false : null,
     note:d=>d.invValues===true ? 'Not while this ledger affects inventory values.' : ''},
    ...(creditPeriod?[
      {k:'credit', label:'Default Credit Period (days)', type:'text', sub:true,
       when:d=>d.billByBill===true, placeholder:'e.g. 30',
       valid:{re:/^\d{1,4}$/, msg:'Credit period is a number of days.'},
       note:'An invoice’s due date becomes its voucher date plus these days.'}
    ]:[]),
    ...(inventory?[
      {k:'invValues', label:'Inventory values are affected', type:'switch', drives:true,
       lock:d=>d.billByBill===true ? false : null,
       note:d=>d.billByBill===true ? 'Not while this ledger maintains balances bill by bill.' : ''}
    ]:[])
  ],

  /* State before country, which is the order the sheet asks them in. Country is
     shown rather than asked until multi-currency is on, because until then there
     is one answer. */
  address: ({contact=true}={}) => [
    {section:'Address'},
    {k:'address', label:'Address', type:'textarea', wide:true, placeholder:'Enter Address'},
    {k:'state',   label:'State', type:'select', opts:()=>MASTERS.states, placeholder:'Select State'},
    {k:'country', label:'Country', type:'select',
     opts:()=>COMPANY.multiCurrency ? MASTERS.countriesFull : [{id:'India',name:'India'}],
     lock:()=>COMPANY.multiCurrency ? null : 'India'},
    {k:'pincode', label:'Pincode', type:'text', placeholder:'6 digits',
     valid:{re:/^\d{6}$/, msg:'Pincode is six digits.'}},
    ...(contact?[
      {k:'mobile', label:'Mobile No', type:'text', placeholder:'10 digits',
       valid:{re:/^\d{10}$/, msg:'Mobile number is ten digits.'}},
      {k:'email',  label:'Email ID', type:'text', placeholder:'Enter Email',
       valid:{re:/^[^@\s]+@[^@\s]+\.[^@\s]+$/, msg:'Email needs an @ and a domain.'}}
    ]:[])
  ],

  /* Only the bank profile holds one of these, and it is the only profile with
     no PAN on it — the registration on a bank ledger is the bank's, not ours. */
  bank: () => [
    {section:'Bank Account Details'},
    {k:'acHolder', label:'A/c Holder Name', type:'text'},
    {k:'bankName', label:'Bank Name', type:'combo', opts:()=>MASTERS.bankNames,
     placeholder:'Not Applicable'},
    /* Text, not a number: an account number with a leading zero is a different
       account, and a number would drop it. */
    {k:'acNo',   label:'A/c No.', type:'text', placeholder:'Enter A/c No.'},
    {k:'ifsc',   label:'IFSC Code', type:'text', placeholder:'e.g. HDFC0001234',
     valid:{re:/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/,
            msg:'IFSC is eleven characters — four letters, a zero, then six.'}},
    {k:'swift',  label:'SWIFT Code', type:'text', placeholder:'8 or 11 characters',
     valid:{re:/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/, msg:'SWIFT is 8 or 11 characters.'}},
    {k:'branch', label:'Branch', type:'text'},
    {k:'bsr',    label:'BSR Code', type:'text', placeholder:'up to 7 digits',
     valid:{re:/^\d{1,7}$/, msg:'BSR code is up to seven digits.'}}
  ],

  /* Tally will not take a GSTIN on a ledger that is itself GST-applicable, so
     saying Applicable in the statutory block is also saying this block does not
     apply. It is locked rather than left fillable-and-dropped-on-sync.

     Only where the statutory block is actually asked, though. A ledger drafted
     off a line the invoice charged GST on arrives carrying gstApp: Applicable, and
     on a profile with no statutory block that value is not on the form — so
     honouring it there would be an invisible field locking two visible ones. */
  taxReg: ({treatment=true, gstin=true, pan=true}={}) => [
    {section:'Tax Registration Details'},
    ...(treatment?[
      {k:'treatment', label:'GST Treatment', type:'select', drives:true,
       opts:()=>MASTERS.gstTreatmentsFull, placeholder:'Select a treatment',
       lock:d=>gstAsked(d) && d.gstApp==='Applicable' ? '' : null,
       note:d=>gstAsked(d) && d.gstApp==='Applicable'
         ? 'A GST-applicable ledger does not also carry a registration.' : ''}
    ]:[]),
    ...(gstin?[
      {k:'gstin', label:'GSTIN/UIN', type:'text', drives:true, placeholder:'15 characters',
       valid:{re:/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]{3}$/,
              msg:'GSTIN is fifteen characters.'},
       lock:d=>gstAsked(d) && d.gstApp==='Applicable' ? '' : null}
    ]:[]),
    /* Characters 3–12 of a GSTIN are the PAN inside it, so a stated GSTIN
       answers this field. It stays editable: the autofill is a reading of the
       GSTIN, not a claim that the reading is right. */
    ...(pan?[
      {k:'pan', label:'PAN/IT No.', type:'text', placeholder:'10 characters',
       valid:{re:/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/,
              msg:'PAN is ten characters — five letters, four digits, a letter.'}}
    ]:[])
  ],

  /* GST Applicability opens the block rather than sitting inside it, because
     Not Applicable is the answer that makes the rest of it meaningless. */
  statutory: () => [
    {section:'Statutory Details'},
    {k:'gstApp', label:'GST Applicability', type:'select', req:true, drives:true,
     opts:GST_APPLICABILITY,
     lock:d=>d.ledType && d.ledType!=='Not Applicable' ? 'Not Applicable' : null,
     note:d=>d.ledType && d.ledType!=='Not Applicable'
       ? `A ${d.ledType} ledger is never GST-applicable.` : ''},
    /* Applicability says the ledger is in the GST regime; the two Set/Alter
       questions say whether this ledger states its own answers or leaves them
       to whatever posts against it. They are separate because the invoice can
       answer one and not the other — a line can carry a code and no rate — and
       collapsing them into applicability is what made a rate-less invoice look
       like a ledger outside GST altogether. */
    {k:'setAlterHsn', label:'Set/Alter HSN Code', type:'switch', sub:true, drives:true,
     when:d=>d.gstApp==='Applicable'},
    /* Two, four, six or eight digits — the sheet's own range. Typing a code the
       list does not hold is how a new one gets made, so this is a combo rather
       than a closed dropdown. */
    {k:'sac', label:'HSN/SAC', type:'combo', sub:true, drives:true,
     opts:()=>MASTERS.hsnSac, placeholder:'Type or pick a code',
     when:d=>d.gstApp==='Applicable' && d.setAlterHsn===true,
     valid:{re:/^(\d{2}|\d{4}|\d{6}|\d{8})$/, msg:'HSN/SAC is 2, 4, 6 or 8 digits.'}},
    {k:'setAlterGst', label:'Set/Alter Taxability & GST Rate', type:'switch', sub:true, drives:true,
     when:d=>d.gstApp==='Applicable',
     note:d=>d.setAlterGst===true ? ''
       : 'Off, so this ledger states no rate of its own and takes whatever the voucher carries.'},
    {k:'taxability', label:'Taxability Type', type:'select', sub:true, req:true, drives:true,
     opts:TAXABILITY_TYPES, when:d=>d.gstApp==='Applicable' && d.setAlterGst===true},
    /* The sheet marks the rate mandatory alongside a taxability that can say
       there is no rate. Both are kept: the field stays, and a supply that is
       not taxable pins it at nil instead of asking for a number that cannot
       exist. */
    {k:'tax', label:'GST Rate', type:'select', sub:true, req:true,
     opts:()=>MASTERS.taxes, placeholder:'Select a rate',
     when:d=>d.gstApp==='Applicable' && d.setAlterGst===true,
     lock:d=>d.taxability && d.taxability!=='Taxable' ? 'tax-0' : null,
     note:d=>d.taxability && d.taxability!=='Taxable'
       ? `A ${d.taxability} supply carries no rate.` : ''},
    {k:'supply', label:'Type of Supply', type:'select', sub:true, req:true,
     opts:SUPPLY_TYPES, placeholder:'Select type of supply',
     when:d=>d.gstApp==='Applicable' && d.setAlterGst===true},
    /* A rate is a statement about a period, not about a ledger for all time —
       so the date it starts from is asked wherever the rate is. */
    {k:'gstDate', label:'Applicable Date', type:'date', sub:true, req:true,
     when:d=>d.gstApp==='Applicable' && d.setAlterGst===true}
  ],

  /* The nature of payment this book already prices against. It is not on the
     sheet — the sheet's Nature of Payment belongs to a ledger that behaves as a
     duties ledger, which is a different question — and it stays because it is
     what the TDS panel reads to decide the section a line falls under. */
  deduction: () => [
    {k:'tds', label:'Nature of Payment (TDS)', type:'select', drives:true,
     opts:()=>MASTERS.tdsSections, placeholder:'None — nothing withheld'}
  ],

  /* The opening balance is stated as at one date for the whole book, so the
     field names that date rather than leaving the number undated. */
  opening: () => [
    {section:'Opening Balance'},
    {k:'opening', label:`Opening Balance as at ${COMPANY.booksFrom}`, type:'money', prefix:'₹'},
    {k:'drcr',    label:'Dr/Cr', type:'segment', opts:DRCR}
  ]
};

/* --- behaving as a duties ledger -------------------------------------------
   One branch, asked in three profiles. `on` is what opens it: an always-true
   for Duties & Taxes, where the question is not optional, and the switch
   everywhere else. */
function dutyBranch(on){
  const tds = d=>on(d) && d.dutyType==='TDS';
  const tcs = d=>on(d) && d.dutyType==='TCS';
  return [
    {k:'dutyType', label:'Type of Duty/Tax', type:'select', req:true, sub:true, drives:true,
     opts:DUTY_TYPES, placeholder:'Select type of duty/tax', when:on},
    {k:'statutory', label:'Statutory Details (GST Rate and Related Details)',
     type:'statutory', sub:true, wide:true, req:true,
     when:d=>on(d) && d.dutyType==='GST'},
    /* Closed lists, both of them. AIA creates no nature of payment and no
       nature of goods — those are statutory classifications the ERP holds, not
       records an invoice may author — so the way out of the list is not offered
       and the answer is picked from what exists. */
    {k:'nop', label:'Nature of Payment', type:'select', sub:true, req:true, drives:true,
     opts:()=>MASTERS.naturePayments, placeholder:'Select nature of payment',
     when:tds},
    {k:'nog', label:'Nature of Goods', type:'select', sub:true, req:true, drives:true,
     opts:()=>MASTERS.natureGoods, placeholder:'Select nature of goods',
     when:tcs},
    {k:'dutyPct', label:'Percentage of Calculation', type:'text', sub:true, req:true,
     prefix:'%', placeholder:'e.g. 2',
     valid:{re:/^\d{1,3}(\.\d{1,3})?$/, msg:'Enter a percentage.'},
     when:d=>on(d) && d.dutyType==='Others'}
  ];
}

/* --- the eight shapes a ledger comes in ------------------------------------
   One per block of the sheet, in the sheet's own order. `g` is the group the
   ledger is being filed under, which two of them read for the exceptions the
   sheet states as prose. */
const LEDGER_PROFILES = {
  /* Bank Accounts, Bank OD A/c */
  bank: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.costCentre(),
    ...blk.address(),
    {section:'Tax Registration Details'},
    {k:'gstin', label:'GSTIN/UIN', type:'text', placeholder:'15 characters',
     valid:{re:/^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]{3}$/,
            msg:'GSTIN is fifteen characters.'}},
    ...blk.bank(),
    ...blk.opening()
  ],

  /* Branch/Divisions, Capital Account, Deposits (Asset), Suspense A/c,
     Reserves & Surplus — the two that hold no registration say so by group. */
  balance: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.balances(),
    ...blk.costCentre(),
    ...blk.address(),
    ...blk.taxReg({treatment:!NO_GST_REG.includes(g), gstin:!NO_GST_REG.includes(g)}),
    ...blk.opening()
  ],

  /* Cash-in-Hand. The shortest ledger in the book: cash has no email address
     and nothing to register. */
  cash: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.costCentre(),
    ...blk.address({contact:false}),
    ...blk.opening()
  ],

  /* Current Assets/Liabilities, Fixed Assets, Loans, Investments, Provisions,
     Misc. Expenses, Primary (Asset)/(Liability) */
  assetliab: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.balances(),
    ...blk.costCentre(),
    ...(DUTIES_FLAG_GROUPS.includes(g)?[
      {k:'asDuties', label:'Behave as Duties & Taxes Ledger', type:'switch', drives:true},
      ...dutyBranch(d=>d.asDuties===true)
    ]:[]),
    ...blk.address(),
    ...blk.statutory(),
    ...blk.taxReg({treatment:!NO_GST_REG.includes(g), gstin:!NO_GST_REG.includes(g)}),
    ...blk.opening()
  ],

  /* Direct/Indirect Expenses and Incomes, Sales, Sales Accounts,
     Primary (Expense)/(Income) — the only profile that affects inventory, and
     the only one whose cost centres default to Yes. */
  pl: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.balances({inventory:true}),
    ...blk.costCentre(),
    /* Anything other than Not Applicable takes this ledger out of GST
       altogether, which is what the lock on GST Applicability says. */
    {k:'ledType', label:'Type of Ledger', type:'select', opts:LEDGER_TYPES, drives:true},
    /* An Invoice Rounding ledger that states no limit and no method rounds
       nothing, so the two are asked together with the type that needs them and
       nowhere else. */
    {k:'roundMethod', label:'Rounding Method', type:'select', sub:true, req:true,
     opts:ROUND_METHODS, placeholder:'Select a method',
     when:d=>d.ledType==='Invoice Rounding'},
    {k:'roundLimit', label:'Rounding Limit', type:'text', sub:true, req:true,
     placeholder:'e.g. 1', when:d=>d.ledType==='Invoice Rounding',
     valid:{re:/^\d{1,4}(\.\d{1,2})?$/, msg:'Rounding limit is a number.'}},
    ...(DUTIES_FLAG_GROUPS.includes(g)?[
      {k:'asDuties', label:'Behave as Duties & Taxes Ledger', type:'switch', drives:true},
      ...dutyBranch(d=>d.asDuties===true)
    ]:[]),
    ...blk.address(),
    ...blk.statutory(),
    ...blk.deduction(),
    ...blk.taxReg({treatment:false, gstin:false}),
    ...blk.opening()
  ],

  /* Duties and Taxes. The one profile where what kind of duty this is is not
     an optional extra but the first thing about the ledger. */
  duties: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.costCentre(),
    ...blk.balances(),
    ...dutyBranch(()=>true),
    /* Rows 137–138 point the TDS/TCS dropdown at the deductee worksheet while
       rows 71 and 107 point it at the nature master. They are two fields, not
       one reading of the same field, so both are asked. */
    {k:'deductee', label:'Deductee / Collectee Type', type:'select', sub:true,
     opts:()=>MASTERS.deducteeTypes, placeholder:'Select type',
     when:d=>d.dutyType==='TDS' || d.dutyType==='TCS'},
    ...blk.address({contact:false}),
    ...blk.taxReg({treatment:false, gstin:false}),
    ...blk.opening()
  ],

  /* Stock-in-Hand. Stock is valued, not transacted with, so it holds no cost
     centre and no balances. */
  stock: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.address({contact:false}),
    ...blk.taxReg({treatment:false, gstin:false}),
    ...blk.opening()
  ],

  /* Sundry Debtors / Debtors. The sheet says "same as current" and adds four
     fields to it. A party's full master is its own form — this is the ledger
     side of one, which is what the Under picker can actually reach. */
  party: (g,kind)=>[
    ...blk.head(kind,g),
    ...blk.balances({creditPeriod:true}),
    ...blk.costCentre(),
    ...blk.address(),
    ...blk.taxReg(),
    ...blk.opening()
  ]
};

/* What a ledger under this group starts as — the handful of fields whose
   opening value is the group's to decide rather than the record's. */
function groupDefaults(group,kind){
  const p = profileFor(group,kind);
  return {
    currency:COMPANY.baseCurrency, country:'India', drcr:'Cr',
    ledType:'Not Applicable', gstApp:'Not Applicable', taxability:'Taxable',
    /* Yes on the income and expense side, No everywhere else — the sheet's own
       split, and the one place a default differs by profile. */
    costCentre:p==='pl',
    /* A party ledger is the one kind that is bill-by-bill by default, because
       that is what a party balance is for. */
    billByBill:p==='party',
    invValues:false, asDuties:false,
    bankName:'na', acHolder:p==='bank' ? COMPANY.name : ''
  };
}

/* On open, fill only what nothing has answered. On a change of Under, refill
   everything the person using the form has not answered themselves — moving a
   ledger from Indirect Expenses to Capital Account should move its defaults
   with it, and should not move a cost centre they deliberately switched on. */
function applyGroupDefaults(d,{refill=false}={}){
  for(const [k,v] of Object.entries(groupDefaults(d.group,d.kind)))
    if(d[k]===undefined || (refill && !d.touched?.[k])) d[k] = v;
  /* §3's last two rows. Moving a ledger into Duties & Taxes is choosing the
     TDS/TCS/Others bucket, and that bucket states its own Type of Duty/Tax —
     so the field arrives answered rather than as the one thing standing
     between the record and the book. The GST bucket is reached from the Taxes
     table instead, and `draftTaxLedger` answers it there. Blank counts as
     unanswered here: `ledgerDefaults` seeds it as '' rather than leaving it
     undefined, so the loop above will never see it. */
  if(profileFor(d.group,d.kind)==='duties' && !d.dutyType && !d.touched?.dutyType){
    d.dutyType = 'TDS';
    if(d.from) d.from.dutyType = 'the bucket a duty drafted from a line falls in';
  }
}

const SALES_GROUP = 'Sales Accounts';
const LEDGER_KIND = {
  /* The expense form offers the sales group too, because the line's picker
     now has one create option rather than two and the group is what decides
     which of the two is being made. */
  ledger:  {pool:()=>MASTERS.incomeLedgers, hint:'E.g., Reliance Industries Ltd',
            fallback:[SALES_GROUP]},
  sales:{pool:()=>MASTERS.salesLedgers, hint:'Sales — …',
            fallback:[SALES_GROUP, ...groupsOf(MASTERS.incomeLedgers)]},
  /* The ledgers the totals panel posts to. Filed under Duties & Taxes, which
     is also the profile that asks what kind of duty they are. */
  tax:     {pool:()=>MASTERS.taxLedgers, hint:'E.g., Output CGST 9%',
            fallback:['Duties & Taxes']},
  /* A customer belongs here because a customer *is* a ledger under Sundry
     Creditors — that is where Tally files a customer and where §3's Party Name
     bucket sends one. It used to have a form of its own, nine fields long,
     which asked a subset of what this form asks and drifted from it. Under
     this key it gets the `party` profile instead: name and Under, bill-by-bill
     with a credit period, cost centre, address, GSTIN/PAN/treatment, opening
     balance. The same form, reached from the customer field.

     The record written is still a customer master — see nmWrite, which keeps its
     own branch for that. The form is shared; the shape of what it writes is
     not, because the sheet reads a party's credit period and deductee type off
     the master and neither is a thing an income ledger has. */
  customer:  {pool:()=>MASTERS.customers, hint:'E.g., Technova Systems LLP',
            fallback:[BUCKET_GROUP.customer]}
};
/* Which list a group belongs to. Only the sales group crosses over — the
   reverse charge and blocked credit ledgers are reached from their own places
   on the sheet and never from a line. */
const kindForGroup = (group,current) =>
  group===SALES_GROUP ? 'sales'
: (current==='sales' ? 'ledger' : current);

/* The form for one ledger: the profile its group puts it in, plus the one
   question a sales ledger carries that no other ledger does. */
function ledgerFields(kind,draft){
  const group = draft?.group || '';
  const fields = (LEDGER_PROFILES[profileFor(group,kind)] || LEDGER_PROFILES.pl)(group,kind);
  if(kind!=='sales') return fields;
  /* A sales ledger states the supply it is for, which the sheet reads back
     when the invoice moves between local and interstate. It is a fact the book
     stores about that ledger, so it is asked on the same form. */
  return fields.flatMap(f=>f.k==='group'
    ? [f, {k:'nature', label:'Used for', type:'select', opts:PURCHASE_NATURES, req:true,
           placeholder:'Select the supply this ledger is for'}]
    : [f]);
}

/* Every field a profile could show, flat — what the commit walks to decide
   which keys are this ledger's and which belong to a shape it is not. */
const visibleFields = (kind,draft) =>
  ledgerFields(kind,draft).filter(f=>!f.section && fieldShown(f,draft));

/* A field is on the form when the company keeps the thing it is about and the
   answers it depends on have been given. */
const fieldShown = (f,d) =>
  (!f.flag || COMPANY[f.flag]) && (!f.when || f.when(d));

/* A locked field has its value decided by another field. `lock` returns that
   value, or null when nothing is deciding it. */
const fieldLock = (f,d) => f.lock ? f.lock(d) : null;
const optsOf    = f => typeof f.opts==='function' ? f.opts() : (f.opts||[]);
const noteOf    = (f,d) => typeof f.note==='function' ? f.note(d) : (f.note||'');

/* What the ladder would have filed this under, said once, wherever the group is
   asked. It stops being said the moment the answer is that — a note repeating
   the value above it is noise, and on a draft nobody moved it would be on every
   row. */
const groupSuggestNote = d => {
  const s = d.groupSuggest;
  return (s && s.group && s.group!==d.group)
    ? `This book would file it under ${s.group} — ${s.why}.` : '';
};
/* The suggested group first in the picker, under its own heading, so taking it
   is picking it. No second control: the field that asks the question is the
   field that answers it. */
const groupOptsWithSuggestion = (d,base)=>{
  const s = d.groupSuggest;
  const rest = base.filter(o=>o.id!==s?.group);
  return (s && s.group && s.group!==d.group)
    ? [{id:s.group, name:s.group, head:'This book’s own filing'}, ...rest]
    : base;
};

const NM_FIELDS = {
  item:()=>[
    {k:'name',    label:'Item Name', type:'text', wide:true, req:true, unique:true},
    /* Stock Item is the invoice-workflow bucket default. Existing company stock
       groups remain available so the user can override it. */
    {k:'group',   label:'Group', type:'select', req:true, free:true,
     opts:()=>[{id:BUCKET_GROUP.item,name:BUCKET_GROUP.item}]
             .concat(groupsOf(MASTERS.items).map(g=>({id:g,name:g}))),
     placeholder:'Select a group', note:groupSuggestNote},
    {k:'itemKind',label:'Type', type:'select',
     opts:[{id:'goods',name:'Goods'},{id:'service',name:'Service'}]},
    {section:'GST Details'},
    {k:'gstApp', label:'GST Applicability', type:'select', req:true, drives:true,
     opts:GST_APPLICABILITY},
    {k:'setAlterHsn', label:'Set/Alter HSN Code', type:'switch', sub:true, drives:true,
     when:d=>d.gstApp==='Applicable'},
    {k:'hsn', label:'HSN / SAC', type:'text', sub:true,
     when:d=>d.gstApp==='Applicable' && d.setAlterHsn===true,
     valid:{re:/^(\d{2}|\d{4}|\d{6}|\d{8})$/, msg:'HSN/SAC is 2, 4, 6 or 8 digits.'}},
    {k:'setAlterGst', label:'Set/Alter Taxability & GST Rate', type:'switch', sub:true, drives:true,
     when:d=>d.gstApp==='Applicable',
     note:d=>d.setAlterGst ? '' : 'Off because the invoice did not state a GST rate.'},
    {k:'taxability', label:'Taxability Type', type:'select', sub:true, req:true,
     opts:TAXABILITY_TYPES, when:d=>d.gstApp==='Applicable' && d.setAlterGst===true},
    {k:'tax', label:'GST Rate', type:'select', sub:true, req:true,
     opts:()=>MASTERS.taxes, placeholder:'Select a rate',
     when:d=>d.gstApp==='Applicable' && d.setAlterGst===true},
    {k:'taxType', label:'Tax Type', type:'select', sub:true, req:true,
     opts:[{id:'IGST',name:'IGST'}],
     when:d=>d.gstApp==='Applicable' && d.setAlterGst===true},
    {k:'igstRate', label:'IGST Rate', type:'text', sub:true, req:true,
     when:d=>d.gstApp==='Applicable' && d.setAlterGst===true,
     valid:{re:/^\d{1,2}(\.\d{1,2})?$/, msg:'IGST rate is a percentage.'}},
    {k:'gstDate', label:'Applicable From', type:'date', sub:true, req:true,
     when:d=>d.gstApp==='Applicable' && d.setAlterGst===true},
    {section:'Inventory Details'},
    /* Closed, and required. AIA creates no unit master, so the list is what the
       book already measures in plus the answer that says it measures in
       nothing. Required is what makes an unmatched unit a block rather than a
       blank: a unit the customer stated and this book has no master for leaves
       the field empty, and an empty field stops this one item being written
       without touching the rest of the invoice. */
    {k:'unit',    label:'Unit', type:'select', req:true,
     opts:()=>[{id:'Not Applicable',name:'Not Applicable'}]
            .concat(unitsInUse().map(u=>({id:u,name:u}))),
     placeholder:'Select a unit'},
    {k:'rate',    label:'Rate', type:'money'},
    {k:'godown',  label:'Godown / Location', type:'select', opts:MASTERS.godowns,
     placeholder:'Select Godown/Location'}
  ],
  /* Four kinds of ledger, one form. A sales ledger, an income ledger, a
     reverse charge ledger and a blocked credit ledger are all ledgers — they
     differ in which group they are filed under, not in what a ledger is — so
     asking for them in four differently-shaped dialogs made the book look like
     it held four kinds of record. It holds one — in eight shapes, decided by
     the group it is filed under, which is why the draft comes in here. */
  ledger:d=>ledgerFields('ledger',d),
  sales:d=>ledgerFields('sales',d),
  tax:d=>ledgerFields('tax',d),
  /* A customer is a ledger under Sundry Debtors, so it is asked the questions
     that group asks — the `party` profile — and not a form of its own. What
     used to be here was a nine-field party form that asked less than the
     profile does and could drift from it; the two are now one form. */
  customer:  d=>ledgerFields('customer',d)
};

/* `lock` is a value another field has already decided. It is drawn as the
   answer and closed, not hidden — a field that vanishes when something else is
   set looks like a bug, and the point is that the form knows the answer. */
function nmControl(f,v,locked){
  const dis = locked!==null && locked!==undefined ? ' disabled' : '';
  if(f.type==='select'){
    /* `free` groups let a master be filed somewhere the book has not filed one
       before — the list is what exists, not what is allowed */
    const opts = optsOf(f).map(o=>
      `<option value="${esc(o.id)}"${o.id===v?' selected':''}>${esc(o.name)}</option>`).join('');
    const head = `<option value=""${v?'':' selected'}${f.req?' disabled':''}>${esc(f.placeholder||'—')}</option>`;
    return `<select data-nm="${f.k}"${f.req?' required':''}${dis}>${head}${opts}</select>
      <span class="ico ico-13 ico--muted"><svg width="13" height="13"><use href="#i-caret"/></svg></span>`;
  }
  /* A list of seven hundred banks or eleven hundred HSN codes is not a dropdown
     anybody can find anything in, so it is a field you type into with the list
     behind it. Typing a code the list does not hold is also how a new one gets
     made, which is what the sheet means by "dropdown + create new". */
  if(f.type==='combo'){
    const id = `dl-${f.k}`;
    const list = optsOf(f).map(o=>
      `<option value="${esc(o.id)}"${o.name!==o.id?` label="${esc(o.name)}"`:''}></option>`).join('');
    /* `data-list` and not `list`: the datalist stays as the data, but the
       browser is never told to render its own popup from it. The panel reads
       it instead. */
    return `<input data-nm="${f.k}" type="text" data-list="${id}" autocomplete="off"${dis}${
      f.placeholder?` placeholder="${esc(f.placeholder)}"`:''} value="${esc(v)}">
      <datalist id="${id}">${list}</datalist>
      <span class="ico ico-13 ico--muted"><svg width="13" height="13"><use href="#i-caret"/></svg></span>`;
  }
  /* The GST rate details are a record of their own, so they are opened rather
     than inlined — five more fields in this grid would bury the ledger. */
  if(f.type==='statutory'){
    const set = statutorySet(v);
    return `<button type="button" class="nmd__sub" data-nmstat="${f.k}"
      aria-haspopup="dialog">${esc(set || 'Set GST rate and related details…')}
      <span class="ico ico-13 ico--muted"><svg width="13" height="13"><use href="#i-caret"/></svg></span>
    </button>`;
  }
  if(f.type==='textarea')
    return `<textarea data-nm="${f.k}"${dis}${f.placeholder?` placeholder="${esc(f.placeholder)}"`:''
      }>${esc(v)}</textarea>`;
  /* Both halves are drawn, so neither is a value you have to open something to
     see. `aria-pressed` carries the answer, which is also what the click
     handler reads back. */
  if(f.type==='segment')
    return optsOf(f).map(o=>`<button type="button" data-nmseg="${f.k}" data-v="${esc(o.id)}"${dis}
      aria-pressed="${o.id===v}">${esc(o.name)}</button>`).join('');
  if(f.type==='switch')
    return `<button type="button" class="switch" role="switch" data-nmsw="${f.k}"${dis}
      aria-checked="${v==='true'||v===true}"></button>`;
  /* A convention the name has to follow is shown as a placeholder and never as
     a value: seeded as a value, "RCM Payable — " passes a required check and
     posts a ledger with half a name on it. */
  return `${f.prefix?`<span class="nmd__pre">${esc(f.prefix)}</span>`:''
    }<input data-nm="${f.k}" type="${f.type==='date'?'date':'text'}"${f.type==='money'?' inputmode="decimal"':''}${
    f.readonly?' readonly tabindex="-1"':''}${dis}${
    f.placeholder?` placeholder="${esc(f.placeholder)}"`:''} value="${esc(v)}">`;
}

function renderNmDialog(){
  if(!nmDraft) return;
  const d = nmDraft.draft;
  $('#nm-title').textContent = NM_TITLE[d.kind];
  /* The explanatory banner that stood above this form is gone, on every modal
     in the sheet. The title says what is being made and the fields say what it
     will hold; a paragraph restating both was the same information a third
     time, above the thing it was describing. */
  $('#nm-save').textContent = nmDraft.target ? 'Confirm creation' : 'Confirm creation';
  const near = null;
  nmDraft.near = near;
  $('#nm-near').hidden = !near;
  if(near) $('#nm-near-name').textContent = `${near.name} is already in this book.`;

  /* A section whose every field is off this profile — or waiting on an answer
     that has not been given — is a heading with nothing under it, so it is
     dropped rather than drawn empty. */
  const spec = NM_FIELDS[d.kind](d);
  const live = spec.filter((f,i)=>{
    if(!f.section) return fieldShown(f,d);
    return spec.slice(i+1).some(n=>n.section ? false : fieldShown(n,d));
  });

  $('#nm-body').innerHTML = live.map(f=>{
    if(f.section) return `<p class="nmd__sec">${esc(f.section)}</p>`;
    const locked = fieldLock(f,d);
    const raw    = locked!==null && locked!==undefined ? locked : d[f.k];
    /* Every field on this form holds a string except the statutory block, which
       holds the record the sub-dialog wrote — so it is passed through whole. */
    const v      = f.type==='statutory' ? raw
                 : raw===undefined||raw===null ? '' : String(raw);
    const from   = d.from?.[f.k];
    const note   = noteOf(f,d);
    const tail   = `${from?`<span class="nmd__from">${esc(from)}</span>`:''}${
                     note?`<span class="nmd__note">${esc(note)}</span>`:''}`;
    const cls    = `${f.wide?' nmd__f--wide':''}${f.sub?' nmd__f--sub':''}${
                     locked!==null&&locked!==undefined?' is-locked':''}`;
    /* A switch and a segmented pair are their own control — wrapping them in
       the 40px box built to hold a line of text would box a button. */
    if(f.type==='switch')
      return `<div class="nmd__f nmd__f--switch${cls}" data-nmf="${f.k}">
        <span class="nmd__swlbl"><label class="nmd__lbl">${esc(f.label)}</label>${
          note?`<span class="nmd__note">${esc(note)}</span>`:''}</span>${
        nmControl(f,v,locked)}</div>`;
    const ctl = f.type==='segment' ? `<span class="nmd__seg">${nmControl(f,v,locked)}</span>`
      : f.type==='statutory' ? nmControl(f,v,locked)
      : `<span class="nmd__ctl${f.type==='textarea'?' nmd__ctl--area':''}${
          f.readonly?' nmd__ctl--ro':''}">${nmControl(f,v,locked)}</span>`;
    return `<div class="nmd__f${cls}" data-nmf="${f.k}">
      <label class="nmd__lbl">${f.req?'<span class="req">*</span> ':''}${esc(f.label)}</label>
      ${ctl}
      ${tail}
    </div>`;
  }).join('');

}

/* Redraw after an answer that changes which questions there are, and put the
   cursor back where it was — a select that re-renders itself out from under
   the person using it is a select that loses their place. */
function rerenderNm(focusKey){
  renderNmDialog();
  if(!focusKey) return;
  const el = $(`#nm-body [data-nm="${focusKey}"], #nm-body [data-nmsw="${focusKey}"]`);
  if(el && !el.disabled) el.focus();
}

/* The line this master is being created for, or null when it is being created
   for the invoice rather than for a line. `kind` names a list on state for the two
   table targets and a plain field for the customer, so it is checked rather than
   indexed blind. */
/* Which row asked for this master. Split from `nmRow` because the dialog is no
   longer the only thing that writes one — a row that creates its own master
   never opens the form, so the target has to be passable rather than read off
   the open dialog. */
function rowOfTarget(t){
  if(!t || (t.kind!=='items' && t.kind!=='ledgers' && t.kind!=='adjustments')) return null;
  return state[t.kind]?.find(r=>r.id===t.id)
    || (t.kind==='items' ? state.stashedItems?.find(r=>r.id===t.id) : null)
    || null;
}
function nmRow(){ return rowOfTarget(nmDraft?.target); }

/* renderNmCost stood here, restating the row's chip inside the dialog so the
   two could not disagree. Both are gone: the withholding is the TDS panel's to
   state, and the rate comparison is not a thing the sheet shows. */

/* --- GST rate and related details ------------------------------------------
   The sheet's own statutory block, which three profiles reach and none of them
   inline. Tax Type is four independent answers rather than one dropdown: a
   ledger carries IGST, or it carries CGST and SGST together, and possibly cess
   on top of either — which is a set, not a choice of one. */
const CESS_VALUATION = ['Not Applicable','Based on Value','Based on Quantity',
                        'Based on Value and Quantity'].map(v=>({id:v,name:v}));
const TAX_TYPES = [['igst','IGST'],['cgst','CGST'],['sgst','SGST/UTGST'],['cess','Cess']];

const statutoryBlank = () => ({types:[], igst:'', cgst:'', sgst:'',
                               cessVal:'Not Applicable', cessRate:'', from:today(),
                               /* set when the ledger is one head by definition —
                                  an input ledger rather than a supply's rates */
                               singleHead:false});

/* What the button on the ledger form says once details are set. Nothing here is
   abbreviated — the point of the summary is that the dialog does not have to be
   reopened to see what is in it. */
function statutorySet(s){
  if(!s || !s.types?.length) return '';
  const parts = [];
  if(s.types.includes('igst')) parts.push(`IGST ${s.igst||0}%`);
  if(s.types.includes('cgst')) parts.push(`CGST ${s.cgst||0}%`);
  if(s.types.includes('sgst')) parts.push(`SGST/UTGST ${s.sgst||0}%`);
  if(s.types.includes('cess') && s.cessVal!=='Not Applicable')
    parts.push(`Cess ${s.cessRate||0}${s.cessVal==='Based on Quantity'?'/unit':'%'}`);
  return `${parts.join(' + ')}${s.from?` — from ${fmtDate?fmtDate(s.from):s.from}`:''}`;
}

let stDraft = null;   /* {k, data} — which field on the ledger form asked, and the answer so far */

function renderStDialog(){
  if(!stDraft) return;
  const s   = stDraft.data;
  const has = t => s.types.includes(t);
  const rate = (t,label) => !has(t) ? '' : `
    <div class="nmd__f" data-stf="${t}">
      <label class="nmd__lbl"><span class="req">*</span> ${label}</label>
      <span class="nmd__ctl"><input data-st="${t}" type="text" inputmode="decimal"
        placeholder="0" value="${esc(s[t])}"><span class="nmd__pre">%</span></span>
    </div>`;
  $('#st-body').innerHTML = `
    <div class="nmd__f nmd__f--wide" data-stf="types">
      <label class="nmd__lbl"><span class="req">*</span> Tax Type</label>
      <span class="nmd__chips">${TAX_TYPES.map(([id,label])=>
        `<button type="button" data-sttype="${id}" aria-pressed="${has(id)}">${label}</button>`).join('')}</span>
    </div>
    ${rate('igst','IGST Rate')}${rate('cgst','CGST Rate')}${rate('sgst','SGST/UTGST Rate')}
    ${!has('cess') ? '' : `
    <div class="nmd__f" data-stf="cessVal">
      <label class="nmd__lbl"><span class="req">*</span> Cess Valuation Type</label>
      <span class="nmd__ctl"><select data-st="cessVal">${CESS_VALUATION.map(o=>
        `<option value="${esc(o.id)}"${o.id===s.cessVal?' selected':''}>${esc(o.name)}</option>`).join('')}</select>
        <span class="ico ico-13 ico--muted"><svg width="13" height="13"><use href="#i-caret"/></svg></span></span>
    </div>
    ${s.cessVal==='Not Applicable' ? '' : `
    <div class="nmd__f" data-stf="cessRate">
      <label class="nmd__lbl"><span class="req">*</span> Cess Rate</label>
      <span class="nmd__ctl"><input data-st="cessRate" type="text" inputmode="decimal"
        placeholder="0" value="${esc(s.cessRate)}"><span class="nmd__pre">${
        s.cessVal==='Based on Quantity' ? 'per unit' : s.cessVal==='Based on Value' ? '%' : '% + per unit'
      }</span></span>
    </div>`}`}
    <div class="nmd__f" data-stf="from">
      <label class="nmd__lbl"><span class="req">*</span> Applicable From</label>
      <span class="nmd__ctl"><input data-st="from" type="date" value="${esc(s.from)}"></span>
    </div>`;
}

function openStDialog(k){
  const dlg = $('#st-dialog'); if(!dlg || dlg.open) return;
  const cur = nmDraft?.draft?.[k];
  stDraft = {k, data:{...statutoryBlank(), ...(cur && typeof cur==='object' ? cur : {})}};
  $('#st-warn').hidden = true;
  renderStDialog();
  dlg.showModal();
}

/* Either IGST on its own, or CGST and SGST together. One of a pair is a rate
   that cannot be charged, so it is refused here rather than written and found
   later by whatever tries to post with it. */
function stCommit(){
  const s = stDraft?.data; if(!s) return false;
  const w = $('#st-warn');
  const fail = msg => { w.textContent = msg; w.hidden = false; return false; };
  const has = t => s.types.includes(t);
  const num_ = t => String(s[t]??'').trim();

  if(!has('igst') && !has('cgst') && !has('sgst'))
    return fail('A ledger carries IGST, or CGST and SGST/UTGST together. Choose at least one.');
  if(has('igst') && (has('cgst') || has('sgst')))
    return fail('IGST and CGST/SGST are alternatives — a supply is one or the other, never both.');
  /* The pair rule is about a supply's rate details, where charging CGST without
     SGST is half a rate. It is not about an output ledger, which is one head by
     definition — "Output CGST 9%" holds CGST and nothing else, and its opposite
     number is a second ledger rather than a second row in this dialog. */
  if(!s.singleHead && has('cgst') !== has('sgst'))
    return fail('CGST and SGST/UTGST are charged as a pair. Set both, or neither.');
  for(const t of ['igst','cgst','sgst'])
    if(has(t) && !/^\d{1,2}(\.\d{1,2})?$/.test(num_(t)))
      return fail(`${t.toUpperCase()} rate is a percentage.`);
  if(has('cess') && s.cessVal!=='Not Applicable' && !/^\d{1,4}(\.\d{1,2})?$/.test(num_('cessRate')))
    return fail('Cess rate is a number.');
  if(!s.from) return fail('A rate applies from a date. Give the date it starts.');

  nmDraft.draft[stDraft.k] = {...s};
  (nmDraft.draft.touched ||= {})[stDraft.k] = true;
  stDraft = null;
  renderNmDialog();
  return true;
}

function openNmDialog(draft,target,opt={}){
  const dlg = $('#nm-dialog'); if(!dlg || dlg.open) return;
  /* The controls that reach this are already disabled, so arriving here without
     the right is a keyboard route or a stale render rather than a click. It is
     still refused, and said out loud: a form that opens and then will not save
     is worse than one that does not open. */
  if(!canCreate()){ toast(NO_CREATE,'err'); return; }
  /* A value the invoice supplied counts as answered: it has provenance, and a
     later change of group must not quietly overwrite it with a default. */
  const d = {...draft, from:{...(draft.from||{})}};
  d.touched = Object.fromEntries(Object.keys(d.from).map(k=>[k,true]));
  if(LEDGER_KIND[d.kind]) applyGroupDefaults(d);
  nmDraft = {draft:d, target:target||null, ignoreNear:false, near:null};
  $('#nm-warn').hidden = true;
  renderNmDialog();
  dlg.showModal();
  $('#nm-body input,#nm-body select')?.focus?.();
}

/* Editing a field is a statement that the value is now yours, so the line
   underneath saying where it came from goes — it would be describing a value
   that is no longer there. */
/* Which fields, when answered, change what else is on the form. Anything with
   `drives` redraws; everything else just writes its value, so typing an
   address does not rebuild the dialog on every keystroke. */
const nmSpec = k => {
  const d = nmDraft?.draft; if(!d) return null;
  return NM_FIELDS[d.kind](d).find(f=>f.k===k) || null;
};

document.addEventListener('input', e=>{
  const k = e.target.dataset?.nm; if(!k || !nmDraft) return;
  const d = nmDraft.draft;
  d[k] = e.target.value;
  (d.touched ||= {})[k] = true;
  if(d.from) delete d.from[k];
  e.target.closest('.nmd__f')?.querySelector('.nmd__from')?.remove();
  e.target.closest('.nmd__f')?.classList.remove('is-invalid');
  /* Characters 3–12 of a GSTIN are the PAN inside it. Filling PAN from a GSTIN
     that is still being typed would fill it with a fragment, so it waits for
     all fifteen — and never overwrites a PAN the user has typed themselves. */
  if(k==='gstin' && !d.panEdited){
    const g = String(d.gstin||'').trim().toUpperCase();
    if(g.length===15){
      d.pan = g.slice(2,12);
      const el = $('#nm-body [data-nm="pan"]');
      if(el){ el.value = d.pan; el.closest('.nmd__f')?.classList.remove('is-invalid'); }
    }
  }
  if(k==='pan') d.panEdited = true;
});
document.addEventListener('change', e=>{
  const k = e.target.dataset?.nm; if(!k || !nmDraft) return;
  const d = nmDraft.draft;
  d[k] = e.target.value;
  (d.touched ||= {})[k] = true;
  if(d.from) delete d.from[k];
  e.target.closest('.nmd__f')?.querySelector('.nmd__from')?.remove();
  e.target.closest('.nmd__f')?.classList.remove('is-invalid');
  /* Under is re-read when the nature of payment moves, because the section is
     one of the things that decided it — but only while the group is still the
     engine's guess. Once the user has said where this ledger goes, nothing
     else gets to move it. */

  if(k==='tax' && d.kind==='item' && d.setAlterGst===true){
    const rate = rateOfTax(e.target.value);
    if(rate!=null){ d.igstRate=String(rate); d.taxType='IGST'; d.gstDate ||= today(); }
  }
  /* Choosing the group is choosing which questions this ledger answers, and —
     when the group is Sales Accounts — which kind of ledger it is. Both
     redraw, and the new profile's defaults fill only what it has no answer
     for, so nothing the user has already said is overwritten. */
  if(k==='group'){
    if(d.kind==='ledger' || d.kind==='sales'){
      const next = kindForGroup(e.target.value, d.kind);
      if(next!==d.kind){
        d.kind = next;
        if(next==='sales' && !d.nature) d.nature = supplyNature();
      }
    }
    applyGroupDefaults(d,{refill:true});
  }
  /* Bill-by-bill and inventory values are the same claim made two ways. Setting
     one clears the other rather than letting both stand and refusing the save. */
  if(k==='billByBill' && d.billByBill===true) d.invValues = false;
  if(k==='invValues'  && d.invValues===true)  d.billByBill = false;

  if(k==='name') return renderNmDialog();
  if(nmSpec(k)?.drives) return rerenderNm(k);
});

/* The two controls that are buttons rather than fields. They answer the same
   way everything else on this form does — write the value, drop the provenance
   line, because a value you set is no longer a value the invoice supplied. */
document.addEventListener('click', e=>{
  if(!nmDraft) return;
  const seg = e.target.closest?.('[data-nmseg]');
  const sw  = e.target.closest?.('[data-nmsw]');
  const el  = seg || sw; if(!el) return;
  if(el.disabled) return;
  const d = nmDraft.draft;
  const k = seg ? seg.dataset.nmseg : sw.dataset.nmsw;
  if(seg){
    d[k] = seg.dataset.v;
    seg.parentElement.querySelectorAll('[data-nmseg]').forEach(b=>
      b.setAttribute('aria-pressed', String(b===seg)));
  }else{
    const on = sw.getAttribute('aria-checked')!=='true';
    d[k] = on;
    sw.setAttribute('aria-checked', String(on));
  }
  (d.touched ||= {})[k] = true;
  if(d.from) delete d.from[k];
  el.closest('.nmd__f')?.querySelector('.nmd__from')?.remove();
  /* Bill-by-bill and inventory values are the same claim about a ledger made
     two ways, so saying one is saying the other is No. The sheet blocks both
     being Yes; blocking it here means the pair can never reach a state the
     save has to refuse. */
  if(k==='billByBill' && d.billByBill===true) d.invValues  = false;
  if(k==='invValues'  && d.invValues===true)  d.billByBill = false;
  if(nmSpec(k)?.drives) rerenderNm(k);
});

/* Created masters are marked, not hidden — filed under the group they were
   given rather than in a holding pen, with `isNew` carrying the fact and
   letting Undo tell a master this invoice made from one it merely used. */
let nmSeq = 0;
const newMasterId = kind =>
  ({item:'it',ledger:'led',sales:'led',tax:'led',customer:'v'}[kind]) + '-new' + (++nmSeq);

/* Which list in MASTERS each kind is written to. One table, so the commit, the
   sweep and the reset all agree about where a created master lives. */
const NM_LIST = {
  item:    ()=>MASTERS.items,
  ledger:  ()=>MASTERS.incomeLedgers,
  sales:()=>MASTERS.salesLedgers,
  tax:     ()=>MASTERS.taxLedgers,
  customer:  ()=>MASTERS.customers
};
const NM_LABEL = {item:'item', ledger:'income ledger', sales:'sales ledger',
                  tax:'duties and taxes ledger', customer:'customer'};

/* What Undo calls the thing this invoice made. A ledger filed under Bank Accounts
   is not an income ledger, so the noun follows the group the same way the
   dialog's own heading does. */
const LEDGER_NOUN = {bank:'bank ledger', cash:'cash ledger', duties:'duties and taxes ledger',
                     stock:'stock ledger', party:'party ledger', pl:'income ledger'};
const createdReason = m =>
  m.kind==='item'     ? `a new item master in ${m.group}${m.hsn?`, HSN ${m.hsn}`:''}`
: m.kind==='ledger'   ? `a new ${LEDGER_NOUN[profileFor(m.group,'ledger')]||'ledger'} in ${
                          m.group}${m.sac?`, SAC ${m.sac}`:''}`
: m.kind==='sales' ? `a new sales ledger for ${byId(PURCHASE_NATURES,m.nature)?.short||'this supply'}`
: m.kind==='customer'   ? `a new customer${m.gstin?`, GSTIN ${m.gstin}`:''}`
                      : `a new ledger in ${m.group}`;

/* Writes the master into the book and points whatever asked for it at the
   result. Everything up to the push is reversible and nothing after it is
   guessed. */
/* What is wrong with a draft — asked of the draft alone, so both routes can ask
   the same question of the same record. The form asks before it closes; the
   confirmation asks before it writes. It returns the offending fields rather
   than a verdict, because the two report it differently: the form marks them
   and puts the cursor in the first, the confirmation names them on the row.

   Nothing here is new. It is `nmCommit`'s own three checks lifted out, so the
   master a human filled in and the master nobody looked at are held to one
   standard — the bulk route used to be held to none, which is how a draft with
   no unit on it reached the book. */
function nmFaults(d){
  /* Only what is on the form. A required field belonging to a profile this
     ledger is not in has nothing to say about whether this ledger is complete,
     and a locked field is answered by whatever locked it. */
  const onForm = NM_FIELDS[d.kind](d).filter(f=>!f.section && fieldShown(f,d));
  const answer = f => {
    const l   = fieldLock(f,d);
    const raw = l!==null&&l!==undefined ? l : d[f.k];
    /* The statutory block answers itself or it does not — there is no partly
       set version of it, because its own dialog refuses to write one. */
    if(f.type==='statutory') return raw?.types?.length ? statutorySet(raw) : '';
    return String(raw ?? '').trim();
  };

  const missing = onForm.filter(f=>f.req && !answer(f));
  if(missing.length) return {fields:missing, labels:missing.map(f=>f.label),
    msg:`${missing.map(f=>f.label).join(' and ')} ${missing.length>1?'are':'is'
      } needed before this master can be created.`};

  /* A format the field states and the value does not meet. Blank is not a
     failure here — that is what `req` is for — so an optional field left empty
     passes and an optional field filled wrongly does not. */
  const bad = onForm.filter(f=>f.valid && answer(f) && !f.valid.re.test(answer(f)));
  if(bad.length) return {fields:bad, labels:bad.map(f=>f.label), msg:bad[0].valid.msg};

  /* "Must be unique within the company", checked against every list a ledger
     can be filed in rather than against the one this one is headed for. */
  const dupe = onForm.filter(f=>f.unique && nameTaken(answer(f),d.kind));
  if(dupe.length) return {fields:dupe, labels:dupe.map(f=>f.label),
    msg:`A ${d.kind==='item'?'item':'ledger'} called “${answer(dupe[0])}” already exists in this company.`};

  return null;
}

const cloneDraft = d => JSON.parse(JSON.stringify(d));

/* Confirming the form writes the master. There is no queue in front of it any
   more.

   There used to be: a confirmed draft sat as `Pending` until the invoice was
   approved, and approval was what actually wrote it. The idea was that nothing
   should enter the book until the voucher did. What it cost was a third state
   on every field that could carry a master — a value that was neither a
   suggestion nor a record — and the sheet had to explain it everywhere: a
   badge on the field, a line under it, a count in the confirmation, a branch in
   every renderer. For a record the user had already reviewed field by field and
   pressed Confirm on.

   So creation is immediate, and the way back is Undo. A field holding a master
   this invoice made looks exactly like a field holding one the book already had,
   because that is what it is; and Undo takes the record back out and puts the
   suggestion back, which is the state it came from. One state fewer, and the
   one that remains is reversible. */
function nmCommit(){
  const d = nmDraft?.draft; if(!d) return false;
  const fault = nmFaults(d);
  if(fault) return nmReject(fault.fields, fault.msg);
  return nmWrite(d);
}

/* One way to refuse: mark the fields, say why once, and put the cursor in the
   first thing that needs fixing. */
function nmReject(fields,msg){
  $$('#nm-body .nmd__f').forEach(el=>
    el.classList.toggle('is-invalid', fields.some(f=>f.k===el.dataset.nmf)));
  const w = $('#nm-warn');
  w.textContent = msg;
  w.hidden = false;
  $(`#nm-body [data-nmf="${fields[0].k}"] input, #nm-body [data-nmf="${fields[0].k}"] select`)?.focus();
  return false;
}

/* `opt.silent` is the row writing its own master: no dialog to close, no toast,
   and no render — the caller is mid-prediction and will render once at the end.
   Everything between here and the push is identical either way, which is the
   point of the split: the form and the row cannot write two different records. */
function nmWrite(d,opt){
  /* The last gate, and the only one that matters — every other check on this
     permission is a control drawn differently. This is the function that
     touches the book, so this is where the right is actually required. */
  if(!canCreate()) return false;

  const t   = opt && 'target' in opt ? opt.target : nmDraft.target;
  const row = rowOfTarget(t);

  const id = newMasterId(d.kind);
  let master;
  if(d.kind==='item'){
    master = {id, name:String(d.name).trim(), group:d.group, kind:d.itemKind,
              hsn:String(d.hsn||'').trim(), unit:d.unit||'', rate:num(d.rate),
              tax:d.tax, godown:d.itemKind==='service'?'':d.godown,
              gstApp:d.gstApp||'Applicable', setAlterHsn:d.setAlterHsn===true,
              setAlterGst:d.setAlterGst===true, taxability:d.taxability||'Taxable',
              taxType:d.taxType||'IGST', igstRate:d.igstRate===''?null:num(d.igstRate),
              gstDate:d.gstDate||'', isNew:true};
    MASTERS.items.push(master);
    refreshItemsList();
  }else if(d.kind==='customer'){
    /* Named before the ledger branch below, and this is the reason the two are
       not one: a customer now shares the ledger *form*, so it answers to
       LEDGER_KIND and would otherwise be written by that branch as an expense
       ledger and pushed into whichever list NM_LIST names.

       What it has to be is a party master. The sheet reads a credit period off
       it to date the invoice, a deductee type and a year's turnover off it to
       price the withholding, and a state and treatment off it to decide the
       supply — none of which an income ledger carries. So the form is shared
       and the record is not. */
    master = {id, name:String(d.name).trim(), group:d.group||BUCKET_GROUP.customer,
              gstin:String(d.gstin||'').trim().toUpperCase(), pan:String(d.pan||'').trim().toUpperCase(),
              state:d.state, credit:num(d.credit)||30, ledger:d.ledger||'led-sales-local',
              treatment:d.treatment||'registered', deductee:d.deductee||'company',
              address:String(d.address||'').trim(), fyGoods:0, fyServices:0, isNew:true};
    MASTERS.customers.push(master);
    refreshCustomerList();
  }else if(LEDGER_KIND[d.kind]){
    /* One record for all four. They are filed in different lists because the
       sheet asks for them in different places, but what gets written is the
       same ledger either way — and the sales kind carries the supply it is
       for, which the local/interstate swap reads back off it. */
    const on = v => v===true || v==='true';
    master = {id, name:String(d.name).trim(), group:d.group, tax:d.tax,
              tds:d.tds||'', sac:String(d.sac||'').trim(),
              currency:d.currency||COMPANY.baseCurrency, ledType:d.ledType||'Not Applicable',
              address:String(d.address||'').trim(), country:d.country||'India',
              state:d.state||'', pincode:String(d.pincode||'').trim(),
              mobile:String(d.mobile||'').trim(), email:String(d.email||'').trim(),
              roundLimit:d.roundLimit||'', roundMethod:d.roundMethod||'',
              gstApp:d.gstApp||'Not Applicable', pan:String(d.pan||'').trim().toUpperCase(),
              opening:num(d.opening)||0, drcr:d.drcr||'Cr',
              billByBill:on(d.billByBill), isNew:true,
              /* the rest of the record — the fields whichever profile this
                 ledger's group put it in asked for. A key its profile never
                 showed is written as empty rather than left off, so two ledgers
                 in different groups are still the same shape of record. */
              costCentre:on(d.costCentre), invValues:on(d.invValues),
              credit:d.credit?num(d.credit):null,
              setAlterHsn:on(d.setAlterHsn), setAlterGst:on(d.setAlterGst),
              gstDate:d.gstDate||'',
              taxability:d.taxability||'', supply:d.supply||'',
              treatment:d.treatment||'', gstin:String(d.gstin||'').trim().toUpperCase(),
              acHolder:String(d.acHolder||'').trim(), bankName:d.bankName==='na'?'':d.bankName||'',
              acNo:String(d.acNo||'').trim(), ifsc:String(d.ifsc||'').trim().toUpperCase(),
              swift:String(d.swift||'').trim().toUpperCase(),
              branch:String(d.branch||'').trim(), bsr:String(d.bsr||'').trim(),
              asDuties:on(d.asDuties), dutyType:d.dutyType||'',
              nop:d.nop||'', nog:d.nog||'',
              dutyPct:d.dutyPct?num(d.dutyPct):null, deductee:d.deductee||'',
              statutory:d.statutory||''};
    if(d.kind==='sales') master.nature = d.nature;
    /* A tax ledger is found again by what it is for, not by its name — the head
       and rate for a GST ledger, the section for a withholding one. Without
       these the ledger would exist and the very next recompute would still call
       the line unheld. */
    if(d.kind==='tax'){
      master.head    = d.head || '';
      master.rate    = d.taxRate==null ? null : num(d.taxRate);
      master.section = d.section || '';
    }
    NM_LIST[d.kind]().push(master);
    if(d.kind==='sales') refreshSalesLedgerList();
  }
  state.newMasters.push({id, kind:d.kind, name:master.name});

  if(d.kind==='customer'){
    state.customer = id;
    /* answered — the record exists, so there is nothing left to propose */
    state.customerSuggestion = null; state.customerPredReason = '';
    applyCustomer();
    runPredictions();
  }else if(d.kind==='sales' && (!t || t.kind==='salesLedger')){
    state.salesLedger = id;
    state.salesLedgerSuggestion = null;
    fbRecordSalesLedger(state.customer,id);
    refreshSalesLedgerList();
  }else if(t && t.kind==='taxLines'){
    /* The totals panel's own rows. A tax line has one thing the creation
       changes, which is where it posts. */
    const line = state.taxLines.find(l=>l.id===t.id);
    if(line){
      line.taxLedger = id;
      line.pred = {...line.pred, resolution:'new', draft:d, made:id};
      line.predState = 'applied';
    }
  }else if(row){
    const route = t.kind==='items' ? 'item' : 'ledger';
    /* keep the row's own pred object: it carries the evidence the row prints
       and the `made` id the confirmation lists */
    if(!row.pred || row.pred.resolution!=='new')
      row.pred = {resolution:'new', evidence:'inferred', route, draft:d, reason:''};
    row.pred.route  = route;
    row.pred.draft  = d;
    row.pred.target = id;
    row.pred.made   = id;                       // the master to sweep if this is undone
    applyPred(row,row.pred,route);
    row.pred.createdReason = createdReason({...master, kind:d.kind});
    row.predState = 'applied';
    /* Creating a master for a line is the strongest answer there is to what
       that line is, so it is remembered like a correction — the next invoice from
       this customer points at the record rather than offering to author it a
       second time. */
    if(d.kind==='item' || d.kind==='ledger') fbRecordLine(row,route,id);
  }

  if(opt?.silent) return id;

  nmDraft = null;
  $('#nm-dialog').close();
  render();
  toast(`${master.name} created`,'ok');
  return true;
}

/* Undoing a creation takes the master back out — but only if it is this invoice's
   and nothing else has since been pointed at it. A master two lines are using
   is no longer one line's to withdraw. */
/* --- the allocation dialog ------------------------------------------------
   Edits a copy, so Cancel really cancels. `slot` says where the answer goes
   and how much there is to divide; the amount comes from the line itself, so
   changing a quantity later re-divides it by the same percentages. */
let ccDraft = null;

function ccSlot(target){
  if(target.kind==='customer')
    return {obj:state, key:'customerCcSplit', plain:'customerCostCentre', amount:compute().subTotal};
  const row = state[target.kind]?.find(r=>r.id===target.id);
  if(!row) return null;
  return {obj:row, key:'ccSplit', plain:'costCentre',
          amount: target.kind==='items' ? lineOf(row).taxable : num(row.amount)};
}

function openCcDialog(target){
  const slot = ccSlot(target); if(!slot) return;
  const existing = slot.obj[slot.key];
  const seed = byId(MASTERS.costCentres, slot.obj[slot.plain]);
  ccDraft = {
    target, amount: r2(slot.amount),
    categories: existing
      ? existing.categories.map(c=>({id:uid(),category:c.category,rows:c.rows.map(r=>({...r,id:uid()}))}))
      // a centre already chosen is the obvious first line of its own category
      : [seed ? {id:uid(),category:seed.group,rows:[{id:uid(),centre:seed.id,pct:100}]}
              : blankCcCat(ccCategories()[0])]
  };
  renderCcDialog();
  $('#cc-dialog').showModal();
  $('#cc-body [data-cc="centre"]')?.focus();     // not the close button
}

const ccShare = pct => ccDraft && ccDraft.amount ? r2(ccDraft.amount*num(pct)/100) : 0;
const ccTick = `<span class="ico ico-12"><svg width="12" height="12"><use href="#i-tick"/></svg></span>`;

/* The badge, the sibling figure and the Save state are the only things a
   keystroke changes, so they are patched in place — re-rendering the body on
   every character would take the caret with it. */
function ccPatch(catEl, source){
  const cat = ccDraft.categories.find(c=>c.id===catEl.dataset.cat);
  const rowEl = source.closest('[data-ccrow]');
  const row = cat.rows.find(r=>r.id===rowEl.dataset.ccrow);
  const sib = rowEl.querySelector(source.dataset.cc==='pct' ? '[data-cc="amt"]' : '[data-cc="pct"]');
  if(sib) sib.value = source.dataset.cc==='pct' ? inr.format(ccShare(row.pct)) : num(row.pct);

  const total = ccCatTotal(cat), done = Math.abs(total-100)<0.005;
  const badge = catEl.querySelector('.ccc__pct');
  badge.className = 'ccc__pct'+(done?' is-done':total>100?' is-over':'');
  badge.innerHTML = total+'%'+(done?ccTick:'');
  ccFootState();
}
function ccFootState(){
  const ok = ccSplitDone({categories:ccDraft.categories});
  $('#cc-save').disabled = !ok;
  $('#cc-warn').hidden = ok;
}

function renderCcDialog(){
  const d = ccDraft; if(!d) return;
  $('#cc-total').textContent = 'Total: '+money(d.amount);
  const share = ccShare;
  const taken = d.categories.map(c=>c.category);
  // a full rebuild loses the caret, so put it back where it was
  const act = document.activeElement;
  const keep = act && act.dataset?.cc
    ? {f:act.dataset.cc, row:act.closest('[data-ccrow]')?.dataset.ccrow,
       cat:act.closest('[data-cat]')?.dataset.cat} : null;

  $('#cc-body').innerHTML = d.categories.map(c=>{
    const total = ccCatTotal(c);
    const cls = Math.abs(total-100)<0.005 ? ' is-done' : total>100 ? ' is-over' : '';
    return `<section class="ccc" data-cat="${c.id}">
      <div class="ccc__head">
        <span class="ccc__lbl">Category</span>
        <span class="ccc__pick">
          <select data-cc="category" aria-label="Cost category">
            ${ccCategories().map(g=>`<option value="${esc(g)}"${g===c.category?' selected':''}${
              taken.includes(g)&&g!==c.category?' disabled':''}>${esc(g)}</option>`).join('')}
          </select>
        </span>
        <span class="ccc__pct${cls}">${total}%${cls===' is-done'?ccTick:''}</span>
        <button type="button" class="ccc__drop" data-cc="del-cat" aria-label="Remove this category">
          <span class="ico ico-14"><svg width="14" height="14"><use href="#i-dash"/></svg></span>
        </button>
      </div>

      <div class="ccrow ccrow--head"><span>Cost Centre</span><span>%</span><span>Amount</span><span></span></div>
      ${c.rows.map(r=>`<div class="ccrow" data-ccrow="${r.id}">
        <label class="cell"><select class="cell__select t-cell" data-cc="centre">
          ${options(ccInCategory(c.category),'Select Cost Centre',r.centre)}
        </select></label>
        <label class="cell cell-num"><input class="cell__input t-cell" data-cc="pct"
               inputmode="decimal" value="${num(r.pct)}" aria-label="Share in percent"></label>
        <label class="cell cell-num${d.amount?'':' is-disabled'}"><input class="cell__input t-cell" data-cc="amt"
               inputmode="decimal" value="${inr.format(share(r.pct))}" aria-label="Share in rupees"></label>
        <button type="button" class="ccrow__del" data-cc="del-row" aria-label="Remove this cost centre">
          <span class="ico ico-14"><svg width="14" height="14"><use href="#i-dash"/></svg></span>
        </button>
      </div>`).join('')}

      <button type="button" class="ccx__add" data-cc="add-row">${plusIco}Add cost centre</button>
    </section>`;
  }).join('') +
  (d.categories.length < ccCategories().length
    ? `<button type="button" class="ccx__add ccx__add--cat" data-cc="add-cat">${plusIco}Add New Category</button>`
    : '');

  ccFootState();
  if(keep){
    const el = $(`#cc-body [data-cat="${keep.cat}"] [data-ccrow="${keep.row}"] [data-cc="${keep.f}"]`)
            || $(`#cc-body [data-cat="${keep.cat}"] [data-cc="${keep.f}"]`);
    if(el){ el.focus(); el.select?.(); }
  }
}

const ccFind = el=>{
  const c = ccDraft.categories.find(x=>x.id===el.closest('[data-cat]').dataset.cat);
  const rowEl = el.closest('[data-ccrow]');
  return {cat:c, row: rowEl ? c.rows.find(r=>r.id===rowEl.dataset.ccrow) : null};
};

/* Whether a breakdown section is showing its lines. Until the user touches a
   caret the section answers for itself — a section holding lines opens, an
   empty one stays shut — so the sheet opens on what the engine actually found
   and stays short where it found nothing. The moment a caret is clicked the
   answer becomes the user's and stops being recomputed under them. */
function secIsOpen(key){
  const set = state.secOpen[key];
  if(typeof set === 'boolean') return set;
  if(key==='gst') return gstLines().length>0;
  if(key==='ded') return dedLines().length>0;
  return state.adjustments.length>0;
}

/* A section subtotal, signed by what it does to the Grand Total. Zero is
   stated as ₹ 0.00 rather than an em-dash: a section with nothing in it has
   still been computed, and the dash read as "not applicable" on rows where
   the real answer is "nil".

   `deducts` is no longer a constant for the statutory section. It was, when
   every head on a purchase bill came off the payable — but TCS is collected
   and adds, so the sign is read off the mode rather than written in. */
function sectionAmt(n,deducts){
  return ((deducts ? n>0 : n<0) ? '− ' : '') + money(Math.abs(n));
}

/* The sheet, drawn to the component. Structure is the frame's: a row, a rule,
   three sections each holding its own lines, a rule, and the answer — all one
   flex column, so the gaps are the container's and no row carries a margin of
   its own. */
function renderBreakdown(calc){
  const chev    = up => `<svg width="16" height="16" aria-hidden="true"><use href="#i-bd-chev${up?'-up':''}"/></svg>`;
  const plus16  = `<svg width="16" height="16" aria-hidden="true"><use href="#i-bd-plus"/></svg>`;
  const trash12 = `<svg width="12" height="12" aria-hidden="true"><use href="#i-bd-trash"/></svg>`;
  const pencil12= `<svg width="12" height="12" aria-hidden="true"><use href="#i-pencil"/></svg>`;
  const chevSm  = `<span class="bd-chev-sm" aria-hidden="true"><svg width="12" height="12"><use href="#i-bd-chev-sm"/></svg></span>`;
  const fldChev = `<span class="bd-chev" aria-hidden="true"><svg width="16" height="16"><use href="#i-bd-chev"/></svg></span>`;
  const rule    = `<div class="bd-rule"></div>`;

  const fig = (id,text,cls='')=>`<span class="bd-fig${cls}" id="${id}">${text}</span>`;
  /* a subtotal the Grand Total does not take is stated but not emphasised —
     under reverse charge the GST is real, it just is not owed to the customer */
  const secFig = (id,n,deducts,excluded)=>
    fig(id, sectionAmt(n,deducts), (n?'':' is-zero')+(excluded?' is-excluded':''));

  const addBtn = (act,label)=>`<button type="button" class="bd-tog bd-tog--add" data-act="${act}"
              title="${esc(label)}" aria-label="${esc(label)}">${plus16}</button>`;

  /* The 16px slot on a section's head row. A section holding lines gets the
     chevron that folds it; an empty one has nothing to fold, so it gets the
     plus that gives it its first line instead — a control whose only outcome
     is that nothing happens is not a control. The sentence explaining why the
     section is empty rides on that plus, where it answers the question at the
     moment it is asked. */
  const secSlot = (key,name,sec)=> sec.empty
    ? `<button type="button" class="bd-tog bd-tog--add" data-act="${sec.add}"
               title="${esc(sec.hint)}" aria-label="${esc(sec.label+' — '+sec.hint)}">${plus16}</button>`
    : `<button type="button" class="bd-tog" data-sec="${key}"
               aria-expanded="${secIsOpen(key)}" aria-controls="bd-body-${key}"
               aria-label="Show or hide the ${esc(name)} lines">${chev(secIsOpen(key))}</button>`;

  const secBody = (key,body)=>
    `<div class="bd-sec__body" id="bd-body-${key}"${secIsOpen(key)?'':' hidden'}>${body}</div>`;

  /* one ledger line: pick the ledger, edit the amount — the rate is set by
     the ledger/section chosen and is shown, not edited.

     Output GST carries no eligibility call: input tax credit is the buyer's
     claim to make, and this invoice is the buying end of nobody's books. */
  const taxLine = (row,i,all)=>{
    const gst = row.type==='gst';
    const tip = gst || !(row.note||row.detail) ? ''
              : ` title="${esc([row.note,row.detail].filter(Boolean).join(' · '))}"`;
    /* The ledger this figure posts to, but only when the book does not hold it.
       A line whose ledger already exists says nothing — it is the same rule the
       charge rows follow, where an existing master that costs nothing applies
       itself and stays quiet.

       Nor does one whose ledger this invoice just wrote. It carried a second
       line naming the record — "Posts to Output CGST 6%" under a field reading
       `Output CGST 6%`, which is the field read back to you, and under a
       withholding row a ledger whose name is its section with three words in
       front. Neither told anybody anything they were not already looking at. */
    const meta = '';
    const addLabel = gst ? 'Add GST ledger' : 'Add '+DEDUCTIONS[row.type].label+' line';
    return `<div class="bd-line" data-kind="taxLines" data-id="${row.id}">
      <div class="bd-line__row">
        <div class="bd-line__lead">
          <div class="bd-line__fld"><label class="bd-fld bd-fld--ledger${
            row.predState==='open'&&row.pred?' cell--pred cell--new':''}"${tip}>${
            taxPredTag(row)}${taxLedgerSelect(row)}${fldChev}${taxPredActs(row)}</label></div>
        </div>
        <span class="bd-line__rate">${row.rate}%</span>
        <div class="bd-line__money">
          <div class="bd-line__amt">
            <label class="bd-fld bd-fld--num"><input class="bd-fld__input" data-f="amount"
                   inputmode="decimal" value="${inr.format(num(row.amount))}"></label>
            <button type="button" class="bd-del" data-act="del-line"
                    title="${esc('Remove '+row.name)}" aria-label="${esc('Remove '+row.name)}">${trash12}</button>
          </div>
          ${i===all.length-1 ? addBtn(gst?'add-gst':'add-ded', addLabel) : '<span class="bd-slot"></span>'}
        </div>
      </div>
      ${meta}
    </div>`;
  };

  const gst = gstLines(), ded = dedLines();

  /* Sub total and Grand Total are the sheet's two brackets — what the invoice came
     to before the ledgers, and what it comes to after them. Neither has a
     section to fold, so both hold the slot open and leave it empty. */
  let html = `
    <div class="bd-row">
      <span class="bd-lbl bd-lbl--sub">Sub total</span>
      <div class="bd-row__amt">${fig('bd-sub',money(calc.subTotal))}<span class="bd-slot"></span></div>
    </div>
    ${rule}`;

  /* GST — reverse charge is a GST-only mechanism, so its switch sits on this
     row rather than above the whole sheet. Saying it is applicable is the whole
     statement, and the statement is the whole row: the GST total greys out
     because it leaves the Grand Total, and the tax is the recipient's to
     account for in their own book. There is no ledger of ours to choose, so
     nothing follows the switch. */
  html += `<section class="bd-sec">
      <div class="bd-row">
        <div class="bd-row__lead">
          <span class="bd-lbl">GST</span>
          
        </div>
        <div class="bd-row__amt">
          ${secFig('bd-gst-amt',calc.gstTotal,false)}
          ${secSlot('gst','GST',
            {empty:!gst.length, add:'add-gst', label:'Add GST ledger',
             hint: !gstApplies() ? 'This GST treatment does not attract GST on the sales.'
                 : isIntraState()===null ? 'Set Source and Destination of Supply to compute GST.'
                 : 'Set a tax rate on a line item or ledger to compute GST.'})}
        </div>
      </div>
      ${gst.length ? secBody('gst', gst.map(taxLine).join('')) : ''}
    </section>
    ${rule}`;

  /* The withholding section names itself by what the invoice is carrying, so the
     three modes ARE the row's label rather than a control sitting next to one:
     a section title of its own would read "TDS · (•)TDS ( )TCS ( )Others". */
  const dedRadios = Object.entries(DEDUCTIONS).map(([id,d])=>`
            <label class="bd-mode${state.deductionMode===id?' is-on':''}">
              <input type="radio" name="ded-mode" value="${id}"${state.deductionMode===id?' checked':''}>
              <span class="bd-mode__dot"></span>${d.label}
            </label>`).join('');

  html += `<section class="bd-sec">
      <div class="bd-row">
        <div class="bd-row__lead">
          <div class="bd-modes" role="radiogroup" aria-label="What this invoice withholds or collects">${dedRadios}</div>
        </div>
        <div class="bd-row__amt">
          ${secFig('bd-ded-amt',calc.dedTotal,calc.dedSign<0)}
          ${secSlot('ded',DEDUCTIONS[state.deductionMode].label,
            {empty:!ded.length, add:'add-ded',
             label:'Add '+DEDUCTIONS[state.deductionMode].label+' line',
             hint: state.deductionMode==='tds'
                 ? 'No TDS on this invoice — pick a customer and an income ledger with a nature of payment.'
                 : state.deductionMode==='tcs'
                 ? 'No TCS on this invoice — the 50 lakh threshold is not crossed, or add a section by hand.'
                 : 'Nothing else withheld — add a statutory head the customer will deduct.'})}
        </div>
      </div>
      ${ded.length ? secBody('ded', ded.map(taxLine).join('')) : ''}
    </section>
    ${rule}`;

  /* An adjustment is a ledger and a figure. It carries no rate — a round-off
     or a freight charge is not a percentage of anything — so the rate slot on
     these rows is held open and empty rather than filled with a number the
     adjustment does not have. */
  html += `<section class="bd-sec">
      <div class="bd-row">
        <div class="bd-row__lead"><span class="bd-lbl">Adjustments</span></div>
        <div class="bd-row__amt">
          ${secFig('bd-adj-amt',calc.adjTotal)}
          ${secSlot('adj','Adjustments',
            {empty:!state.adjustments.length, add:'add-adj', label:'Add adjustment',
             hint:'Add a round-off, a freight charge or a discount settled outside the lines.'})}
        </div>
      </div>
      ${state.adjustments.length ? secBody('adj', state.adjustments.map((a,i,all)=>{
        const p=openPred(a,'ledger');
        const shown=p;
        return `
        <div class="bd-line" data-adj="${a.id}" data-kind="adjustments" data-id="${a.id}">
          <div class="bd-line__row">
            <div class="bd-line__lead">
              <div class="bd-line__fld"><div class="bd-fld bd-fld--ledger${predCellCls(p)}">${
                     p?predTag(p,predReason(a,'ledger')):''}<select class="bd-fld__select" data-af="ledger"
                     aria-label="Adjustment ledger">${ledgerOptions(a.ledger,shown?predName(shown):'')}</select>${fldChev}${
                     wantsNewBtn(a.ledger,shown)
                       ? newLedgerBtn().replace('data-act="new-ledger"','data-act="new-adj-ledger"') : ''}${
                     p?predActions(p):''}</div></div>
              <span class="bd-itc-slot"></span>
            </div>
            <span class="bd-line__rate"></span>
            <div class="bd-line__money">
              <div class="bd-line__amt">
                <label class="bd-fld bd-fld--num"><input class="bd-fld__input" data-af="amount"
                       inputmode="decimal" value="${a.amount?inr.format(num(a.amount)):''}" placeholder="0.00"></label>
                <button type="button" class="bd-del" data-af="del"
                        title="Remove adjustment" aria-label="Remove adjustment">${trash12}</button>
              </div>
              ${i===all.length-1 ? addBtn('add-adj','Add adjustment') : '<span class="bd-slot"></span>'}
            </div>
          </div>
          ${predWhy(a,'ledger')}
        </div>`;}).join('')) : ''}
    </section>
    ${rule}`;

  html += `
    <div class="bd-row">
      <span class="bd-lbl bd-lbl--grand">Grand Total</span>
      <div class="bd-row__amt">${fig('bd-grand',money(calc.grand),' bd-fig--grand')}<span class="bd-slot"></span></div>
    </div>`;

  $('#breakdown').innerHTML = html;
}

/* patch just the figures, for edits made inside the breakdown itself
   (a full re-render there would tear the focused field out from under you) */
function patchTotals(calc){
  const put = (id,text,zero)=>{
    const el = $('#'+id); if(!el) return;
    el.textContent = text;
    if(zero!==undefined) el.classList.toggle('is-zero', zero);
  };
  put('bd-sub',   money(calc.subTotal));
  put('bd-grand', money(calc.grand));
  put('bd-gst-amt', sectionAmt(calc.gstTotal),      !calc.gstTotal);
  put('bd-ded-amt', sectionAmt(calc.dedTotal,calc.dedSign<0), !calc.dedTotal);
  put('bd-adj-amt', sectionAmt(calc.adjTotal),      !calc.adjTotal);
}

/* --- additional details ---------------------------------------------------
   One line standing in for however many optional groups are switched on. It
   says what is available and, once anything has been entered, how much —
   otherwise the sheet would give no sign that a filled group exists at all. */
function extraFilled(){
  const live = new Set(fcLive().flatMap(g=>g.fields.map(f=>f.id)));
  return [...live].filter(id=>String(state.extra[id]??'').trim()!=='').length;
}
const listOf = names => names.length<2 ? (names[0]||'')
  : names.slice(0,-1).join(', ') + ' or ' + names[names.length-1];

function renderAddl(){
  const groups = fcLive().length, filled = extraFilled();
  const bad = extraProblems();
  $('#addl').hidden = groups===0;
  if($('#addl').hidden) return;

  /* The count, and nothing else. Which fields and why is the dialog's business
     — it can show them against the controls they belong to, where a sentence
     out here can only describe them. Like every other error on the sheet, this
     one waits for an allocate: an unfinished invoice is not a wrong one yet. */
  const show = state.validated && bad.length>0;
  $('#addl').classList.toggle('is-invalid', show);
  $('#addl-sub').textContent = show
    ? `${bad.length} mandatory field${bad.length===1?'':'s'} missing`
    : `${groups} section${groups===1?'':'s'} available` +
      (filled ? ` · ${filled} field${filled===1?'':'s'} filled` : '');

  $('#addl-btn-text').textContent =
    show ? 'Resolve Details' : filled ? 'Edit Details' : 'Add Details';
}

function renderHeader(){
  renderAddl();
  $$('[data-bind]').forEach(el=>{
    const k = el.dataset.bind;
    if(el.type==='date'){ el.value = state[k]||''; return; }
    if(document.activeElement===el) return;                 // don't fight the caret
    if(el.value!==(state[k]??'')) el.value = state[k]??'';
  });
  $$('[data-display]').forEach(el=>{
    const v = state[el.dataset.display];
    el.textContent = v ? fmtDate(v) : el.dataset.placeholder;
  });
  /* The customer field's plus is in the markup rather than in a template, so it
     is toggled here — on render rather than on refreshCustomerList, because
     picking a customer the book already holds answers the field without
     changing the list the picker is built from. */
  /* The proposal's own tag, carrying the reason. Same three ways in as a
     line's: hover, focus, tap — and pressing it opens the form that writes it,
     which is what the `+` on a line does. */
  const vtag = $('#customer-suggest-tag');
  if(vtag){
    const vsug = !state.customer && state.customerSuggestion;
    vtag.hidden = !vsug;
    /* The party is a master this invoice would write, exactly as a line's ledger
       is, so the field says so the same way. */
    vtag.closest('.control')?.classList.toggle('control--offer', !!vsug);
    /* The tag is a statement and a reason, never a control that writes — so it
       is not barred by the create right. A reader who cannot create still gets
       to know the invoice names a party this book has no master for, and why. */
    $('#customer-suggest-why').innerHTML = vsug ? state.customerPredReason : '';
  }

  const vplus = $('[data-act="new-customer"]');
  if(vplus){
    /* Hidden only once the field is answered. It stays beside the proposal,
       because on a line the tag and the `+` sit together and the `+` is what
       accepts — hiding it here left the proposal with no way to take it. */
    vplus.hidden = !!state.customer;
    /* A customer is a master in the chart of accounts like any other, so the same
       permission decides it. Barred rather than hidden, for the same reason
       the picker's last option is — and barred rather than disabled, so the
       reason can be hovered. */
    vplus.toggleAttribute('data-barred', !canCreate());
    vplus.setAttribute('aria-disabled', String(!canCreate()));
    vplus.disabled = false;
    vplus.title = canCreate() ? 'Create a new customer' : NO_CREATE;
  }
  $('#voucher-no').placeholder = state.voucherType ? previewVoucherNo() : 'Auto Generated';
  $('#cc-toggle').setAttribute('aria-checked', state.ccMode==='centre');
  $('#cc-label-class').classList.toggle('is-off', state.ccMode==='centre');
  $('#cc-label-centre').classList.toggle('is-off', state.ccMode==='class');
  renderCcPick();                  // after the value loop above — these two own their own value
  renderCustomerCc();
  /* Rebuilt every render for the same reason the sales ledger's is: the
     list can gain a master mid-invoice, and the proposal at its head appears and
     goes as the field is answered. It used to be rebuilt only on creation and
     on restore, which was enough while the customer field had nothing to
     propose — the option would not have shown until something else happened
     to refresh it. */
  refreshCustomerList();
  refreshSalesLedgerList();
  $('#block-items').hidden = state.mode!=='item';
  $$('.modetabs button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.mode===state.mode));
}

/* The toggle does not just enable one control or the other — it decides what
   the control *is*. On Class it lists the saved templates; on Cost Centre it
   lists the centres and stands as the invoice's default. No split here: a split
   belongs to a line with an amount to divide, not to the invoice's default. */
function renderCcPick(){
  const sel = $('#cc-pick'); if(!sel || document.activeElement===sel) return;
  /* The toggle's own position, NOT ccLocked() — a header cost centre locks every
     other field on the form but must leave this one, the control that set it,
     listing centres and editable. */
  const cls = state.ccMode==='class';
  sel.dataset.bind = cls ? 'costCentreClass' : 'invoiceCostCentre';
  sel.setAttribute('aria-label', cls ? 'Cost centre class' : 'Cost centre for the whole invoice');
  sel.innerHTML = cls
    ? options(MASTERS.costCentreClasses,'Select Cost Centre Class',state.costCentreClass)
    : options2(MASTERS.costCentres,'Select Cost Centre',state.invoiceCostCentre);
  sel.value = (cls ? state.costCentreClass : state.invoiceCostCentre) || '';
}
/* the customer's own cost centre — the whole invoice's worth, so it splits too */
function renderCustomerCc(){
  const box = $('#customer-cc'); if(!box || box.contains(document.activeElement)) return;
  const lock = ccLocked();
  box.classList.toggle('is-disabled', lock);
  box.innerHTML = ccSelect({
    cls:'control__select t-value', attrs:'data-bind="customerCostCentre"', disabled:lock,
    placeholder:lock?ccPlaceholder():'Select Cost Centre',
    value:lock?(ccHeader()||''):state.customerCostCentre,
    split:lock?null:state.customerCcSplit});
}

/* flag each table that still has content scrolled off to the right */
function markClipped(){
  $$('.table-scroll').forEach(sc=>{
    const more = sc.scrollWidth - sc.clientWidth - sc.scrollLeft > 2;
    sc.parentElement.classList.toggle('is-clipped', more);
  });
}
addEventListener('resize', markClipped);
document.addEventListener('scroll', e=>{
  if(e.target.classList?.contains('table-scroll')) markClipped();
}, true);

/* The standing one-pass offer. It counts what is actually outstanding, so it
   goes on its own the moment the last suggestion is answered — whether that
   was in the dialog, on a row, or by refusing it.

   §6's RBAC line decides whether it is a button or a sentence: the count is
   visible to everyone, because knowing the invoice names masters the book does
   not hold is not a privilege. Acting on it is. */
/* Where each kind of suggested master is answered, and what to call it in the
   plural. The sales ledger is filed with the items because its picker is —
   it sits at the head of Item Details, not in the ledger table. */
const SUG_BUCKET = {
  item:     {label:'Item',            anchor:'#block-items'},
  ledger:   {label:'Income ledger',   anchor:'#block-ledgers'},
  sales: {label:'Sales ledger', anchor:'#block-items'},
  tax:      {label:'Duties & taxes ledger', anchor:'#block-ledgers'},
  customer:   {label:'Customer',          anchor:'#block-items'}
};

/* The standing one-pass offer. It counts what is actually outstanding, so it
   goes on its own the moment the last suggestion is answered — whether that
   was in the dialog, on a row, or by refusing it.

   §6's RBAC line decides whether the panel carries a button: the count is
   visible to everyone, because knowing the invoice names masters the book does
   not hold is not a privilege. Acting on it is. */
function renderSugBar(){
  const bar = $('#sug-bar'); if(!bar) return;
  const rows = abSuggested();
  const n = rows.length;
  bar.hidden = !n;
  if(!n) return;

  /* Two lines, because the panel asks for two things: what is true, and what
     to do about it. The sentence it replaced said only the first, and said it
     in the book's voice — "records the book does not hold" — where the reader's
     word for the same fact is masters. */
  const many = n !== 1;
  $('#sug-bar-text').innerHTML = `<strong>${n}</strong> ledger${many?'s':''}/item${
    many?'s':''} in this invoice ${many?'aren’t':'isn’t'} in your masters yet.<span
    class="sugsum__next">${canCreate()
      ? (many ? 'Create them now, or add each one below.'
               : 'Create it now, or add it below.')
      : esc(NO_CREATE)}</span>`;

  /* The breakdown is the useful half: nine is a number, "seven income ledgers
     and an item" is a shape, and it tells you which table you are about to
     spend the next minute in. Counted in the order the buckets are declared so
     the list does not reshuffle as answers come in. */
  const counts = new Map();
  rows.forEach(x=>counts.set(x.kind,(counts.get(x.kind)||0)+1));
  $('#sug-bar-list').innerHTML = Object.keys(SUG_BUCKET)
    .filter(k=>counts.get(k))
    .map(k=>{
      const c = counts.get(k), b = SUG_BUCKET[k];
      return `<button type="button" class="suggrp" data-sug="${k}"
        title="Go to where ${c===1?'this one is':'these are'} answered"
        >${esc(b.label)}${c===1?'':'s'} <span class="suggrp__n">${c}</span></button>`;
    })
    .join('<span class="suggrp__sep" aria-hidden="true">·</span>');

  const go = $('#sug-bar-go');
  go.hidden = !canCreate();
  go.textContent = many ? `Create all ${n}` : 'Create it';
}
$('#sug-bar-go').addEventListener('click', ()=>openAbDialog('summary'));
/* A bucket is a destination, exactly as an unresolved-field group is. It scrolls
   and marks rather than opening anything — the answer is on the row, and taking
   somebody there is the whole of what was asked. */
$('#sug-bar-list').addEventListener('click', e=>{
  const btn = e.target.closest('[data-sug]'); if(!btn) return;
  const el = $(SUG_BUCKET[btn.dataset.sug]?.anchor); if(!el) return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  $$('.is-found-warn').forEach(x=>x.classList.remove('is-found-warn'));
  void el.offsetWidth;
  el.classList.add('is-found-warn');
});

function render(){
  whyTip.hide();
  /* the reason panel is anchored to a tag in the sheet, and the sheet is about
     to be rebuilt — left up, it would point at a node that no longer exists */
  const calc = compute();
  renderTopbar();
  renderHeader();
  renderItems();
  renderLedgers();
  renderBulkBar();               // after both tables — it reads the selection in them
  renderBreakdown(calc);
  renderSugBar();
  checkDuplicate();
  markClipped();
  renderErrBanner(validate(state.validated));   /* paint only once allocating has been tried */
  /* Nothing here opens a dialog over the sheet any more. The missing customer
     used to be asked for at this point, by opening the creation form the moment
     the invoice landed; it is a proposal on the field now, so nothing about it
     interrupts — see state.customerSuggestion. Reverse charge was the other
     one, and it no longer has a question to ask: see the GST row. */
  saveDraft();
  return calc;
}

/* ---------------------------------------------------------------------------
   THE DRAFT CACHE

   One extraction, held until the invoice is created or the draft is discarded.
   Both modes live in here — the rows on the page and, while Accounting Mode is
   showing, the item detail stashed behind it — which is what lets the toggle
   be a change of view rather than a re-read of the document. Nothing in the
   switch path calls extraction, and this is the only reason it does not have
   to: the answer is already in the cache.

   Masters drafted on this invoice are cached alongside it, because a restored
   draft pointing at a master the book cannot see is a draft that cannot post.
   ------------------------------------------------------------------------ */
/* v2: the key changed with the sales rewrite, so a draft written by the
   payable version of this sheet is never restored into this one — the two
   hold different state and a stale one would come back as nonsense. */
/* let, not const: under the inbox a draft belongs to the invoice it was opened
   from, so the embed block re-points this at a per-item key. */
let DRAFT_KEY = 'aia.ar.draft.v2';
let draftLoading = false;

function saveDraft(){
  /* `state.document` was the gate here, and it went with the document pane —
     which left this returning early on every call and nothing ever saved.
     What makes a draft worth keeping now is that a customer has been named. */
  if(draftLoading || !state?.customer || state.allocated) return;
  try{
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      v:2, state,
      /* the masters this draft invented, so restoring it restores what it can
         point at — sweeping them back out is still reset()'s job */
      drafted:state.newMasters.map(m=>({kind:m.kind, master:(NM_LIST[m.kind]?.()||[]).find(x=>x.id===m.id)}))
                              .filter(d=>d.master)
    }));
  }catch(e){ /* a full or disabled store is not a reason to stop working */ }
}
function clearDraft(){
  try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
}
function loadDraft(){
  if(AR_PARAMS.get('inboxv2')==='1')return false;
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); }catch(e){ return false; }
  if(!saved || saved.v!==2 || !saved.state?.customer) return false;
  draftLoading = true;
  try{
    /* the drafted masters go back into the book first, so every picker the
       restored rows point through can already see them */
    (saved.drafted||[]).forEach(d=>{
      const list = NM_LIST[d.kind]?.();
      if(list && !list.some(x=>x.id===d.master.id)) list.push(d.master);
    });
    state = saved.state;
  delete state.reverseCharge;
  if(state.voucherType==='sales-rcm') state.voucherType='sales';
  if(state.salesLedger==='led-sales-rcm') state.salesLedger='led-sales-local';
    state.salesLedgerSuggestion ||= null;
    /* A draft written before the sheet allocated bill by bill has no lists to
       restore, and the allocation reads them without checking. */
    state.billRefs ||= []; state.newRefs ||= []; state.knockedRefs ||= [];
    refreshItemsList(); refreshCustomerList(); refreshSalesLedgerList();
    return true;
  }catch(e){ return false; }
  finally{ draftLoading = false; }
}

/* ============================================================================
   6. VALIDATION
   ==========================================================================*/
/* Two strings per rule, and they are not the same string. `name` is the label
   as it reads on the form — it goes in the summary, where a dozen of them run
   together as one sentence. `msg` is the instruction, and it only ever appears
   under the control it belongs to, where there is room to say what to do. */
function validate(paint){
  const errs = [];
  const need = (key,cond,name,msg)=>{ if(!cond) errs.push({key,name,msg}); };

  need('branch', !!state.branch, 'GST Registration', 'Select the branch');
  need('voucherType', !!state.voucherType, 'Voucher Type', 'Select a voucher type');
  need('voucherDate', !!state.voucherDate, 'Voucher Date', 'Pick a voucher date');
  need('invoiceDate', !!state.invoiceDate, 'Invoice Date', 'Pick the invoice date');
  need('dueDate', !!state.dueDate && (!state.invoiceDate || state.dueDate>=state.invoiceDate), 'Due Date', 'Due date cannot be before the invoice date');
  need('customerPoNo', state.customerPoNo.trim().length>0, 'Customer PO No.', 'Enter the customer’s order reference');
  need('customer', !!state.customer, 'Customer Name', 'Select the customer');
  need('gstTreatment', !!state.gstTreatment, 'GST Treatment', 'Select the GST treatment');
  need('gstin', state.gstTreatment!=='registered' || state.gstin.trim().length===15, 'GSTIN', 'A registered customer needs a 15-character GSTIN');
  need('sourceState', !!state.sourceState, 'Source of Supply', 'Select the source of supply');
  need('destState', !!state.destState, 'Destination of Supply', 'Select the destination of supply');
  if(state.mode==='item') need('salesLedger', !!state.salesLedger,
    'Sales Ledger', 'Select or confirm the sales ledger');

  const calc = compute();
  if(calc.subTotal<=0) errs.push({key:'__rows',name:state.mode==='item'?'Item Details':'Ledgers',msg:'Add at least one line with a value'});

  /* one entry per unfinished conditional pair, so the count on the sheet is the
     real number of fields outstanding rather than "additional details: 1" */
  extraProblems().forEach(p=>errs.push({key:'__extra', name:p.field.name,
    msg:`${p.field.name} is required once ${p.trigger.name} is filled`}));

  if(paint){
    const keys = new Set(errs.map(e=>e.key));
    $$('[data-field]').forEach(f=>f.classList.toggle('is-invalid', keys.has(f.dataset.field)));
  }
  return errs;
}

/* Which part of the form each rule belongs to. Ten names in a flat list hide the
   shape of the problem — four unrelated gaps and "the whole customer is missing"
   look identical. Grouped, the cause reads at a glance, and the card stops
   growing with the count. `__rows` follows the mode, since the same failure is
   an Item Details problem in one and a Ledgers problem in the other. */
const FIELD_GROUP = {
  branch:'Invoice Details', voucherType:'Invoice Details', voucherDate:'Invoice Details',
  invoiceDate:'Invoice Details', dueDate:'Invoice Details', customerPoNo:'Invoice Details',
  customer:'Customer Details', gstTreatment:'Customer Details', gstin:'Customer Details',
  sourceState:'Customer Details', destState:'Customer Details',
  salesLedger:'Item Details',
  __extra:'Additional Details'
};
const GROUP_ANCHOR = {
  'Invoice Details':'#sec-invoice', 'Customer Details':'#sec-customer',
  'Additional Details':'#addl',
  'Item Details':'#block-items', 'Ledgers':'#block-ledgers', 'Taxes':'#breakdown'
};
const groupOf = e => e.key==='__rows'
  ? (state.mode==='item' ? 'Item Details' : 'Ledgers')
  : FIELD_GROUP[e.key];
/* the order the sections appear on the sheet. Sorting by this rather than by the
   order the rules happen to fire keeps the row reading down the page — the
   sales ledger is checked early but sits below Additional Details. */
const GROUP_ORDER = ['Invoice Details','Customer Details','Additional Details',
                     'Item Details','Ledgers','Taxes'];

/* The summary above the form. It only draws once allocating has been tried —
   before that the form is unfilled rather than wrong, and naming eleven blank
   fields on arrival would be noise. After that it stays live, dropping each
   name as its field is settled and hiding itself when the last one goes. */
function renderErrBanner(errs){
  const banner = $('#err-banner');
  const show = state.validated && errs.length>0;
  banner.hidden = !show;
  if(!show) return;
  /* the count is the part that changes as you work — it turns the summary from a
     standing complaint into a number you are driving down */
  $('#err-title').innerHTML = errs.length===1
    ? '<strong>1</strong> mandatory field still to map before this invoice can be approved'
    : `<strong>${errs.length}</strong> mandatory fields still to map before this invoice can be approved`;
  const groups = [];
  errs.forEach(e=>{
    const g = groupOf(e);
    const hit = groups.find(x=>x.name===g);
    if(hit) hit.n++; else groups.push({name:g, n:1});
  });
  groups.sort((a,b)=>GROUP_ORDER.indexOf(a.name)-GROUP_ORDER.indexOf(b.name));
  $('#err-list').innerHTML = groups.map(g=>
    `<button type="button" class="errgrp" data-jump-group="${esc(g.name)}">${esc(g.name)}
       <span class="errgrp__n">${g.n}</span></button>`
  ).join('<span class="errgrp__sep" aria-hidden="true">·</span>');
}

/* A group in the summary is the way back to its part of the form. It carries you
   to the section and hands focus to the first field there that is actually wrong,
   so the summary answers "where" and the field itself answers "what". */
function jumpToGroup(group){
  $(GROUP_ANCHOR[group])?.scrollIntoView({behavior:'smooth',block:'center'});

  /* The containers do not line up with the groups — Invoice Details and Customer
     Details are two headings inside one card — so asking the enclosing section
     for its first invalid control hands back the wrong field. The target comes
     from the field map instead, in document order. */
  const field = $$('[data-field].is-invalid')
    .find(el => FIELD_GROUP[el.dataset.field]===group);

  $$('.is-found').forEach(el=>el.classList.remove('is-found'));
  /* a row-count or additional-details failure has no field of its own, so the
     block or the strip is what lights up */
  const anchor = $(GROUP_ANCHOR[group]);
  const mark = field || anchor?.closest('.block') || anchor;
  if(mark){ void mark.offsetWidth; mark.classList.add('is-found'); }

  if(field){ field.querySelector('select,input,textarea')?.focus({preventScroll:true}); return; }
  /* the strip is the sheet's stand-in for the dialog, so its button takes focus
     — it opens on Enter, but landing here does not open anything by itself */
  if(group==='Additional Details'){ $('#btn-add-details').focus({preventScroll:true}); return; }
}

document.addEventListener('click', e=>{
  const jump = e.target.closest('.errgrp');
  if(jump) jumpToGroup(jump.dataset.jumpGroup);
});

function checkDuplicate(){
  const inv = state.customerPoNo.trim().toLowerCase();
  const hit = MASTERS.existingInvoices.find(b=>b.customer===state.customer && b.invoiceNo.toLowerCase()===inv);
  $('#dupe-banner').hidden = !hit;
  if(hit) $('#dupe-text').textContent =
    `${byId(MASTERS.customers,hit.customer).name} already has invoice ${hit.invoiceNo} dated ${fmtDate(hit.date)} for ${money(hit.amount)}.`;
}

/* ============================================================================
   7. BINDINGS
   ==========================================================================*/
document.addEventListener('input', e=>{
  const el = e.target, bind = el.dataset.bind;
  if(!bind || el.closest('.table')) return;
  if(el.tagName==='SELECT') return;      // selects are settled by the change handler
  state[bind] = el.value;
  if(['customerPoNo','narration','billingAddress','gstin','voucherNo'].includes(bind)){
    checkDuplicate();
    /* the summary tracks the keystrokes — toggling classes and rewriting the
       banner leaves the focused control alone, unlike a full render */
    renderErrBanner(validate(state.validated));
    return;                                             // avoid re-render mid-typing
  }
  render();
});

document.addEventListener('change', e=>{
  const el = e.target, bind = el.dataset.bind;
  if(!bind || el.closest('.table')) return;
  if(el.type==='date'){
    state[bind] = el.value;
    if(bind==='invoiceDate'){
      const v = byId(MASTERS.customers,state.customer);
      if(v && el.value) state.dueDate = addDays(el.value, v.credit);
    }

  }else if(bind==='customerCostCentre'){
    if(el.value===CC_SPLIT+'-open'){ openCcDialog({kind:'customer'}); render(); return; }
    if(el.value!==CC_SPLIT){ state.customerCostCentre = el.value; state.customerCcSplit = null; }
  }else if(bind==='salesLedger' && el.value==='__sales-suggestion'){
    if(state.salesLedgerSuggestion)
      openNmDialog(state.salesLedgerSuggestion,{kind:'salesLedger'});
    return;
  }else if(bind==='salesLedger' && el.value===NM_NEW_PURCHASE){
    el.value = state.salesLedger || '';
    openNmDialog(draftSalesLedger(), {kind:'salesLedger'});
    return;
  }else if(bind==='customer' && el.value==='__customer-suggestion'){
    /* Taking the proposal from the list is pressing its tag — the same form,
       pre-filled the same way. */
    openNmDialog(state.customerSuggestion, {kind:'customer'});
    return;
  }else if(bind==='customer' && el.value===NM_NEW_CUSTOMER){
    /* a customer the book has never seen. What the invoice printed is all there
       is to go on, and a GSTIN is most of a customer master already. */
    el.value = state.customer || '';
    openNmDialog(state.customerSuggestion || draftCustomer(state.printedCustomer || {}), {kind:'customer'});
    return;
  }else{
    if(bind==='salesLedger') state.salesLedgerSuggestion=null;
    /* Picking a master the book already holds answers the proposal — the party
       is named, so there is nothing left to create. */
    if(bind==='customer') state.customerSuggestion=null;
    state[bind] = el.value;
    /* §1 L2, the second key. Which sales account this customer's invoices post
       to is a decision about the customer, not about this invoice — and it is the
       one the requirement singles out as learning "across multiple sales
       accounts", because a book with seven of them has no way to guess. */
    if(bind==='salesLedger') fbRecordSalesLedger(state.customer, el.value);
    if(bind==='costCentreClass' && el.value) state.ccMode='class';   // picking a class applies it
    /* naming the customer is naming the evidence, so any line still waiting for
       an answer is read again against them — the rows already answered are
       left alone, which is predictRow's own rule */
    if(bind==='customer'){ applyCustomer(); runPredictions(); }
    if(bind==='branch') applyBranch();
    if(bind==='gstTreatment') applyTreatment();
  }
  render();
});

function applyCustomer(){
  const v = byId(MASTERS.customers,state.customer);
  if(!v) return;
  state.billingAddress = v.address;
  state.gstin          = v.gstin;
  state.gstTreatment   = v.treatment;
  /* The supply moves from our branch to them, so the customer is the
     destination and never the source. It was the other way round when this
     sheet recorded a purchase, and the two states decide CGST/SGST against
     IGST — so getting the direction wrong charges the wrong heads on every
     interstate invoice while looking correct on every local one. */
  state.destState      = v.state;
  if(!state.salesLedger) state.salesLedger = fbSalesLedgerHit(v.id)?.id || v.ledger;
  if(state.invoiceDate) state.dueDate = addDays(state.invoiceDate, v.credit);
  applyTreatment();                        // the treatment decides the GSTIN, not the charge
  syncLedgerToSupply();
}
function applyBranch(){
  const b = byId(MASTERS.branches,state.branch);
  if(b) state.sourceState = b.state;       // we are the supplier now
  syncLedgerToSupply();
}
function applyTreatment(){
  /* An unregistered customer is a B2C sale, not a reverse charge. s.9(4) runs
     the other way — it is what we owe on a purchase from an unregistered
     supplier — so it has no bearing on what we charge here: the full GST goes
     on the invoice, there is simply no GSTIN to print against it. Reverse
     charge on a sale is the supply's own call under s.9(3), which no field on
     this sheet can infer, so the treatment never forces the pill either way. */
  if(state.gstTreatment==='unregistered') state.gstin = '';
  if(state.gstTreatment==='registered' && !state.gstin){
    state.gstin = byId(MASTERS.customers,state.customer)?.gstin || '';
  }
}
/* Read off the ledger's nature rather than its id, so a sales ledger this
   invoice created swaps with the supply exactly as the built-in pair does. Only
   the local/interstate pair moves: the other five are chosen for what the
   supply *is* — an import, an SEZ sale, a reverse charge — and none of those
   stops being true because the two states differ. */
function syncLedgerToSupply(){
  const intra = isIntraState();
  const cur = byId(MASTERS.salesLedgers, state.salesLedger);
  if(!cur || (cur.nature!=='local' && cur.nature!=='inter')) return;
  const want = intra===true ? 'local' : intra===false ? 'inter' : cur.nature;
  if(want===cur.nature) return;
  /* prefer a ledger the user made for that supply over the built-in one, since
     creating it was a statement about which ledger this book posts to */
  const pool = MASTERS.salesLedgers.filter(l=>l.nature===want);
  const next = pool.find(l=>l.isNew) || pool[0];
  if(next) state.salesLedger = next.id;
}

/* --- table rows ---------------------------------------------------------- */
function rowOf(el){
  const tr = el.closest('[data-kind][data-id]');
  if(!tr) return null;
  const list = state[tr.dataset.kind];
  return {tr, list, row:list?.find(r=>r.id===tr.dataset.id)};
}
const LIVE_NUMERIC = ['qty','rate','discount','amount','amountOverride','base'];

/* Pointing a line at an item master, wherever that is done from — the cell, or
   the bulk bar over a whole selection. It is one function because the cascade
   is the interesting part: the master carries a rate, a tax and a kind, and it
   answers the code question, so a proposal made while the line had no master
   stops being about anything. Two copies of that would drift. */
function applyItemMaster(row, master){
  row.item = master.id;
  row.pred = null; row.predState = '';
  if(!row.description) row.description = master.name;
  row.rate = master.rate; row.tax = master.tax; row.kind = master.kind;
  if(!row.godown) row.godown = master.godown;
  if(row.hsnFrom!=='user'){ row.hsn=''; row.hsnFrom=''; row.hsnPred=null; row.hsnPredState=''; }
  row.hsnConsent = '';
}

document.addEventListener('input', e=>{
  const f = e.target.dataset.f;
  if(!f) return;
  if(e.target.tagName==='SELECT') return;
  /* The "create one" options are not values, and a select fires `input` before
     it fires `change`. Written to the row here, the sentinel would be stored as
     though it were a master and the re-render underneath would take the select
     out of the document — so the `change` that opens the form never lands on
     it, and the picker settles on whatever the missing id falls back to. The
     row is left pointing at a ledger nobody chose. So these are left entirely
     to the `change` handler, which knows what they mean. */
  if(String(e.target.value||'').startsWith('__nm-')) return;
  const ctx = rowOf(e.target); if(!ctx?.row) return;
  const row = ctx.row, kind = ctx.tr.dataset.kind;

  if(f==='item'){
    const match = MASTERS.items.find(i=>i.name.toLowerCase()===e.target.value.trim().toLowerCase());
    if(match){ applyItemMaster(row, match); render(); return; }
    row.item = e.target.value; return;                  // free text — no re-render
  }
  /* Repointing a line changes what its code is and where it came from, so the
     meta line, the consent prompt and the tag all have to be redrawn — none of
     them is a value the row is holding, they are all readings of it. */
  if(f==='ledger'){
    row.ledger = e.target.value;
    row.pred=null; row.predState='';
    if(row.hsnFrom!=='user'){ row.hsn=''; row.hsnFrom=''; row.hsnPred=null; row.hsnPredState=''; }
    row.hsnConsent = '';
    predictHsn(row,'ledger');
    render(); return;
  }
  if(LIVE_NUMERIC.includes(f)){
    row[f] = num(e.target.value);
    if(kind==='taxLines') row.touched = true;

    // keep the dependent figure in the same row live, without stealing focus
    const setSibling = (sel,val)=>{
      const el = ctx.tr.querySelector(sel);
      if(el && el!==e.target) el.value = val;
    };
    if(kind==='taxLines' && (f==='base'||f==='rate')){
      row.amount = r2(num(row.base)*num(row.rate)/100);
      setSibling('[data-f="amount"]', inr.format(row.amount));
    }
    if(kind==='items' && f!=='amountOverride'){
      setSibling('[data-f="amountOverride"]', inr.format(lineOf(row).taxable));
    }
    const calc = compute();
    if(e.target.closest('#breakdown')) patchTotals(calc); else renderBreakdown(calc);
    renderErrBanner(validate(state.validated));
    return;
  }
  row[f] = e.target.value;
  if(kind==='taxLines') row.touched = true;
  /* a code you typed is yours, and stops being a prediction the moment you
     type it — including when you type over one */
  if(f==='hsn'){ row.hsnFrom = 'user'; row.hsnDismissed = true; }
});

/* The description is the only evidence a line with no master has, so changing
   it is the one edit that reopens the question — including a question that was
   already dismissed. What was dismissed was a reading of that sentence, and
   the sentence is no longer that one: a line rewritten from "e-waste disposal"
   to "pest control" is a different line, and staying quiet about it because
   the old proposal was refused would be the engine sulking rather than
   reading. A code you typed by hand is yours and survives, because that was a
   statement about the code and not about the wording.

   It reopens on `change` rather than `input`: re-running the engine on every
   keystroke would have the proposal flickering through a different ledger for
   each letter typed. */
/* The Item cell is free text over a suggestion list, so what lands in it is a
   name and not a choice. Three things it can be, and the third is the one that
   had no answer before: a name the book holds, which is resolved to that
   master so the line gets its unit and rate; nothing, which reopens the
   question; or a name the book does not hold — which is not a typo to be
   swallowed, it is a master that does not exist, and the same offer applies as
   when the engine reaches that conclusion on its own. */
document.addEventListener('change', e=>{
  if(e.target.dataset.f!=='item') return;
  const ctx = rowOf(e.target); if(!ctx?.row || ctx.tr.dataset.kind!=='items') return;
  const row = ctx.row, typed = e.target.value.trim();

  if(!typed){
    row.item = ''; row.pred = null; row.predState = '';
    predictRow(row,'item'); render(); return;
  }
  const hit = MASTERS.items.find(m=>m.name.toLowerCase()===typed.toLowerCase());
  if(hit){
    row.item = hit.id;
    row.pred = null; row.predState = '';
    /* the master's own figures, and only into cells the invoice left empty */
    if(row.kind!==hit.kind) row.kind = hit.kind;
    if(!row.hsn && hit.hsn){ row.hsn = hit.hsn; row.hsnFrom = 'master'; }
    if(hit.kind!=='service' && !row.godown) row.godown = hit.godown;
    if(!num(row.rate)) row.rate = hit.rate;
    if(!row.tax) row.tax = hit.tax;
    render(); return;
  }
  /* it posts on what was typed until the master exists, so nothing is lost by
     closing this — and the typed name is what the master would be called */
  row.item = typed;
  const draft = draftItem({...row, description:typed});
  draft.from.name = 'the name you typed';
  openNmDialog(draft, {kind:'items', id:row.id});
});

document.addEventListener('change', e=>{
  if(e.target.dataset.f!=='description') return;
  const ctx = rowOf(e.target); if(!ctx?.row) return;
  const kind = ctx.tr.dataset.kind;
  if(kind!=='items' && kind!=='ledgers') return;
  const row = ctx.row;

  const route = kind==='items' ? 'item' : 'ledger';
  row.pred = null; row.predState = '';
  predictRow(row, route);
  /* the code question reopens on both routes now, and on the same terms */
  if(row.hsnFrom!=='user'){
    if(row.hsnFrom==='pred' || !row.hsn){ row.hsn=''; row.hsnFrom=''; row.hsnDismissed=false; }
    row.hsnPred = null; row.hsnPredState = '';
    predictHsn(row,route);
  }
  render();
});

/* Switching what the invoice withholds. The lines of the mode being left stay in
   taxLines untouched — they are that mode's answer and are waiting there if
   the user switches back — but they stop being drawn and stop counting, so
   the Grand Total follows the switch immediately. The section opens on the
   switch: answering the radio is a statement that this invoice carries the thing,
   and leaving it folded would hide the lines that answer says exist. */
document.addEventListener('change', e=>{
  if(e.target.name!=='ded-mode') return;
  state.deductionMode = e.target.value;
  /* open, not "let it decide" — TCS and Others start empty, and a section
     that folded itself shut the moment you said the invoice carries one would
     put the row you are about to add out of reach */
  state.secOpen.ded = true;
  render();
});

document.addEventListener('change', e=>{
  const f = e.target.dataset.f;
  if(!f || e.target.tagName!=='SELECT') return;
  const ctx = rowOf(e.target); if(!ctx?.row) return;
  const kind = ctx.tr.dataset.kind, row = ctx.row;

  /* the tax picker's value carries the family it came from — "tds:194C" for a
     withholding head, a bare ledger name for GST */
  if(kind==='taxLines' && f==='ledger'){
    row.touched = true;
    const [mode,id] = e.target.value.split(':');
    if(DEDUCTIONS[mode]){
      const sec = byId(dedMaster(mode), id);
      row.type=mode; row.section=sec.id; row.name=sec.name; row.rate=sec.rate;
      row.amount = r2(num(row.base)*sec.rate/100);
      row.note = ''; row.detail = '';
    }else{
      row.type='gst'; row.section=undefined; row.name=e.target.value;
      const m = row.name.match(/([\d.]+)%/);
      if(m){ row.rate = parseFloat(m[1]); row.amount = r2(num(row.base)*row.rate/100); }
    }
    render(); return;
  }

  /* nor are the last two options in a ledger picker ledgers. The expense draft
     is built from the row exactly as the engine would have built it, so
     choosing it and pressing the tick on the row's own offer reach the same
     form; the sales one is built from the supply, because that is what a
     sales ledger is about. */
  if(f==='ledger' && (e.target.value===NM_NEW_LEDGER || e.target.value===NM_NEW_PURCHASE)){
    const wanted = e.target.value;
    e.target.value = row.ledger || '';
    openNmDialog(wanted===NM_NEW_LEDGER ? draftLedger(row) : draftSalesLedger(),
                 {kind, id:row.id});
    return;
  }

  /* the last option in a cost centre picker is not a cost centre */
  if(f==='costCentre'){
    if(e.target.value===CC_SPLIT+'-open'){ openCcDialog({kind, id:row.id}); render(); return; }
    if(e.target.value===CC_SPLIT){ render(); return; }      // re-picked what it already shows
    row.costCentre = e.target.value;
    row.ccSplit = null;                                     // one answer at a time
    render(); return;
  }

  /* §1 L2. Answering the master by hand is the correction, and it is recorded
     before the value lands so the prediction being overruled is still there to
     be asked about — whether it was read off the description is what decides
     if this counts towards switching that reading off for this customer. */
  if((f==='ledger' || f==='item') && e.target.value && kind!=='taxLines'){
    const overruled = row.predState!=='applied' && row.pred;
    fbRecordLine(row, f==='item'?'item':'ledger', e.target.value,
                 {wasInferred: !!(overruled && row.pred.evidence==='inferred')});
  }

  row[f] = e.target.value;
  if(kind==='taxLines') row.touched = true;
  /* Re-pointed by hand, so the prediction that put the old master there is no
     longer a fact about this row. It has to go with the value: the chip it
     carries is a deduction figure for the ledger the line *was* posting to, and
     a sheet about money may not print a figure about somewhere the money is not
     going. Cleared after `fbRecordLine` above, which needs the overruled
     prediction to know what it is learning from. */
  if((f==='ledger' || f==='item') && kind!=='taxLines'){
    row.pred = null; row.predState = '';
  }
  if(f==='ledger'){
    const exp = byId(MASTERS.incomeLedgers,e.target.value);   // carries a default GST rate
    if(exp && !row.tax) row.tax = exp.tax;
    if(!row.description) row.description = ledgerNameOf(e.target.value);
    row.fromItems = false;                                     // re-pointed by hand
  }
  render();
});

/* --- adjustments --------------------------------------------------------- */
document.addEventListener('input', e=>{
  const af = e.target.dataset.af;
  if(!af) return;
  const wrap = e.target.closest('[data-adj]');
  const adj = state.adjustments.find(a=>a.id===wrap.dataset.adj);
  if(!adj) return;
  adj[af] = af==='amount' ? num(e.target.value) : e.target.value;
  if(af==='amount') patchTotals(compute());
});

document.addEventListener('change', e=>{
  if(e.target.dataset.af!=='ledger') return;
  const wrap = e.target.closest('[data-adj]');
  const adj = state.adjustments.find(a=>a.id===wrap.dataset.adj);
  if(!adj) return;
  /* an adjustment draws from the same pool as a ledger line, so it inherits
     the same two ways out of it */
  if(e.target.value===NM_NEW_LEDGER || e.target.value===NM_NEW_PURCHASE){
    const wanted = e.target.value;
    e.target.value = adj.ledger || '';
    openNmDialog(wanted===NM_NEW_LEDGER ? draftLedger(adj) : draftSalesLedger(),
                 {kind:'adjustments', id:adj.id});
    return;
  }
  adj.ledger = e.target.value;
  adj.pred=null; adj.predState='';
  /* the line's own way out of the list goes once the list has answered it, and
     that is drawn rather than toggled — so the section is redrawn */
  render();
});

/* --- the ledger tooltip ---------------------------------------------------
   Reveals what a ledger field is too narrow to print. It reads the value off
   the select rather than off state, so it is right for both kinds of line
   without either of them having to hand it anything, and it stays quiet when
   the name already fits — a tooltip that repeats what is on screen teaches you
   to ignore the ones that do not. */
/* ------------------------------------------------------------------ portal
   Where the popovers, tooltips and pickers live.

   They are positioned in page coordinates and must not be clipped, so they
   cannot sit inside the sheet's own scrolling box — they have to hang off
   <body>. But embedded in the inbox every rule in this stylesheet is rewritten
   to `.ar-sheet <selector>` and the design tokens are declared on `.ar-sheet`
   itself, so anything appended straight to <body> matches nothing: no
   `position:absolute`, so the inline top/left do nothing and the node drops
   into normal flow at the foot of the host page, full width and unstyled.

   One container, carrying the scope class, fixes both: the rules match and the
   tokens inherit, while the box stays a zero-size static child of <body> so
   absolute children still resolve against the page exactly as before.
   Standalone the class is inert.

   It sits at the engine's top level, NOT inside the tooltip below. Written
   inside that closure it was reachable from the tooltip and from nothing else,
   so every other overlay that called it — the pickers, the row menus — threw
   "sheetPortal is not defined" and never opened at all. */
function sheetPortal(){
  let p = document.getElementById('ar-sheet-portal');
  if(!p){
    p = document.createElement('div');
    p.id = 'ar-sheet-portal';
    p.className = 'ar-sheet';
    document.body.append(p);
  }
  return p;
}

const bdTip = (()=>{
  let tip, meas, timer;
  /* Does the chosen name fit the box it is in? Set the same string in the same
     font off screen and compare. The select's own scrollWidth cannot answer
     this: the closed control is painted by the engine, not laid out from its
     option text, so it reports the box back at you whatever is in it. */
  const overflows = (sel, text)=>{
    if(!meas){ meas = document.createElement('span'); meas.className = 'bd-tip__measure'; sheetPortal().appendChild(meas); }
    const cs = getComputedStyle(sel);
    meas.style.fontFamily    = cs.fontFamily;
    meas.style.fontSize      = cs.fontSize;
    meas.style.fontWeight    = cs.fontWeight;
    meas.style.letterSpacing = cs.letterSpacing;
    meas.textContent = text;
    return meas.offsetWidth > sel.clientWidth;
  };
  const hide = ()=>{ clearTimeout(timer); tip?.classList.remove('is-on'); };
  const show = fld=>{
    const sel = fld.querySelector('.bd-fld__select'); if(!sel) return;
    const text = (sel.selectedOptions[0]?.textContent || '').trim();
    if(!text || !overflows(sel, text)) return;
    if(!tip){ tip = document.createElement('div'); tip.className = 'bd-tip'; tip.setAttribute('role','tooltip'); sheetPortal().appendChild(tip); }
    tip.textContent = text;
    const r = fld.getBoundingClientRect();
    tip.style.left = Math.round(r.left) + 'px';
    tip.style.top  = Math.round(r.bottom + 6) + 'px';
    tip.classList.add('is-on');
    // it is fixed to the viewport, so it is the viewport it has to stay inside
    const t = tip.getBoundingClientRect();
    if(t.right > innerWidth - 8) tip.style.left = Math.round(Math.max(8, innerWidth - 8 - t.width)) + 'px';
  };
  return {show, hide};
})();
/* ------------------------------------------------------------- the reason
   Built on bdTip's shape for the same reason bdTip has that shape: it is drawn
   out of a row, and the row is inside a scroller that would clip it.

   Three ways in, and the third is the one that decides the design. Hover is
   the mouse's, focus is the keyboard's, and a click is the finger's — a reason
   a touch user cannot reach is a reason that is not in the product for them,
   and this is the sheet's only account of why a value was proposed. */
const whyTip = (()=>{
  let tip, anchor;
  const el = ()=>{
    if(!tip){ tip = document.createElement('div'); tip.className='whytip'; tip.setAttribute('role','tooltip'); sheetPortal().appendChild(tip); }
    return tip;
  };
  const hide = ()=>{
    tip?.classList.remove('is-on');
    anchor?.setAttribute('aria-expanded','false');
    anchor = null;
  };
  const show = btn=>{
    const src = btn.querySelector('.predtag__why'); if(!src || !src.innerHTML.trim()) return;
    const t = el();
    t.innerHTML = src.innerHTML;
    t.classList.add('is-on');
    anchor = btn; btn.setAttribute('aria-expanded','true');
    const r = btn.getBoundingClientRect();
    t.style.left = Math.round(r.left) + 'px';
    t.style.top  = Math.round(r.bottom + 6) + 'px';
    /* fixed to the viewport, so it is the viewport it has to stay inside — and
       a tag near the bottom of a long sheet flips above its own row */
    const tr = t.getBoundingClientRect();
    if(tr.right > innerWidth - 8)  t.style.left = Math.round(Math.max(8, innerWidth - 8 - tr.width)) + 'px';
    if(tr.bottom > innerHeight - 8) t.style.top = Math.round(Math.max(8, r.top - tr.height - 6)) + 'px';
  };
  return {show, hide, toggle: btn => (anchor===btn ? hide() : show(btn)), isOpen: btn => anchor===btn};
})();
document.addEventListener('mouseover', e=>{
  const btn = e.target.closest?.('.predtag--why');
  if(btn) whyTip.show(btn);
  else if(!e.target.closest?.('.whytip')) whyTip.hide();
});
/* a tag reached by tab is a tag whose reason you cannot read either */
document.addEventListener('focusin',  e=>{ const b=e.target.closest?.('.predtag--why'); if(b) whyTip.show(b); });
document.addEventListener('focusout', e=>{ if(e.target.closest?.('.predtag--why')) whyTip.hide(); });
addEventListener('scroll', ()=>whyTip.hide(), true);
addEventListener('resize', ()=>whyTip.hide());

/* Pointer and keyboard both reveal it: a field reached by tab is a field whose
   name you cannot read either. */
document.addEventListener('mouseover', e=>{
  const fld = e.target.closest?.('#breakdown .bd-fld--ledger');
  if(!fld) return;
  bdTip.hide();
  clearTimeout(bdTip._t);
  bdTip._t = setTimeout(()=>bdTip.show(fld), 300);
});
document.addEventListener('mouseout', e=>{
  if(e.target.closest?.('#breakdown .bd-fld--ledger')){ clearTimeout(bdTip._t); bdTip.hide(); }
});
document.addEventListener('focusin',  e=>{
  const fld = e.target.closest?.('#breakdown .bd-fld--ledger');
  if(fld) bdTip.show(fld);
});
document.addEventListener('focusout', e=>{ if(e.target.closest?.('#breakdown .bd-fld--ledger')) bdTip.hide(); });
/* it is positioned against the viewport, so anything that moves the field
   under it has to take it down */
addEventListener('scroll', ()=>bdTip.hide(), true);
addEventListener('resize', ()=>bdTip.hide());

/* ------------------------------------------------------- the refused reason
   Why a `+` will not open. Built on whyTip's shape, and wearing whyTip's class
   so the two read as one thing: the sheet answers "why this value" and "why
   not this control" in the same voice and the same box.

   It exists because the sentence had nowhere to go. It was in `title` on a
   `disabled` button, and a disabled button receives no mouse events, so the
   tooltip never fired — the control refused the press and said nothing about
   it. The controls carry `aria-disabled` now instead (see `barredAttrs`),
   which keeps them under the pointer and in the tab order, and this is what
   they say when the pointer or the tab key arrives.

   Three ways in, for the same reason whyTip has three: hover is the mouse's,
   focus is the keyboard's, and the click is the finger's — and the click is
   the one that matters most here, because pressing the button is exactly what
   the reader was trying to do when the question came up. */
const permTip = (()=>{
  let tip, anchor;
  const hide = ()=>{ tip?.classList.remove('is-on'); anchor = null; };
  const show = btn=>{
    if(!btn.hasAttribute('data-barred')) return;
    if(!tip){
      tip = document.createElement('div');
      tip.className = 'whytip'; tip.setAttribute('role','tooltip');
      sheetPortal().appendChild(tip);
    }
    tip.textContent = NO_CREATE;
    tip.classList.add('is-on');
    anchor = btn;
    const r = btn.getBoundingClientRect();
    tip.style.left = Math.round(r.left) + 'px';
    tip.style.top  = Math.round(r.bottom + 6) + 'px';
    /* fixed to the viewport, so it is the viewport it has to stay inside — and
       a `+` near the foot of a long sheet flips above its own row */
    const t = tip.getBoundingClientRect();
    if(t.right  > innerWidth  - 8) tip.style.left = Math.round(Math.max(8, innerWidth - 8 - t.width)) + 'px';
    if(t.bottom > innerHeight - 8) tip.style.top  = Math.round(Math.max(8, r.top - t.height - 6)) + 'px';
  };
  return {show, hide, at:()=>anchor};
})();
const barredEl = e => e.target.closest?.('[data-barred]');
/* A control that carries a reason keeps showing it on hover even when barred,
   and answers with the refusal only when pressed. This is the seeing/doing
   line again: what the invoice says and why is not a privilege, so a reader
   without the right must not lose the reason in order to be told they cannot
   act on it. Controls with nothing to say — a bare `+` — show the refusal on
   hover, because that is the only thing they have. */
const hasReason = el => !!el.querySelector?.('.predtag__why')?.innerHTML.trim();
const barredHoverEl = e => { const b = barredEl(e); return b && !hasReason(b) ? b : null; };
document.addEventListener('mouseover', e=>{ const b = barredHoverEl(e); if(b) permTip.show(b); });
document.addEventListener('mouseout',  e=>{ if(barredHoverEl(e)) permTip.hide(); });
document.addEventListener('focusin',   e=>{ const b = barredHoverEl(e); if(b) permTip.show(b); });
document.addEventListener('focusout',  e=>{ if(barredHoverEl(e)) permTip.hide(); });
addEventListener('scroll', ()=>permTip.hide(), true);
addEventListener('resize', ()=>permTip.hide());

/* The press, refused. This runs in the capture phase so it lands before any of
   the handlers below — `aria-disabled` is a statement about the control, not
   an instruction to the browser, so the click is real and has to be stopped
   here rather than relied on to be stopped by the guards inside openNmDialog
   and nmWrite. Those stay: they are the gate, this is the door.

   Showing the tip on the way out matters more than the refusal does. A press
   that is swallowed silently reads as a broken button; a press that answers
   with the reason reads as a rule. */
document.addEventListener('click', e=>{
  const b = barredEl(e); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  permTip.show(b);
}, true);

/* ========================================================== the dropdown
   One panel, shared by every picker on the sheet. It reads the control it is
   opening for rather than being configured per site: a `<select>`'s own
   options and optgroups, or a combo input's datalist. That is the whole reason
   twenty-odd pickers could change at once — there is no list of them.

   The native control is never replaced, only quietened. It keeps the value,
   keeps its CSS, and keeps firing `change`, so every handler on this sheet —
   the ones that read `el.value === NM_NEW_CUSTOMER`, the ones that rebuild the
   list with innerHTML, the RBAC gate riding on `<option disabled>` — carries
   on working without knowing this exists.

   Search appears past eight options and not before. A picker with four
   branches in it does not need a text field to find one of four, and putting
   one there costs a keystroke on every use; a picker with thirty-six states in
   it is unusable without one. `data-find` overrides the count either way. */
const CSEL_FIND_AT = 8;

const cselDrop = (()=>{
  let panel = null, host = null, items = [], active = -1, onPick = null, find = null, more = 0, query = '';

  const close = ()=>{
    if(!panel) return;
    panel.remove();
    host?.classList.remove('is-open');
    host?.removeAttribute('aria-expanded');
    panel = null; items = []; active = -1; onPick = null; find = null; more = 0; query = '';
    const h = host; host = null;
    return h;
  };
  const isOpen = () => !!panel;
  const openFor = el => host === el;

  /* Where the panel goes. Fixed to the viewport, like every other overlay
     here, because the pickers live inside scrollers that would clip it — and
     appended inside the open dialog when there is one, since a modal renders
     in the top layer and anything left on the body paints underneath it. */
  const place = ()=>{
    if(!panel || !host) return;
    /* Measured off the FIELD, not off the control inside it. `.control` carries
       the border, the ground and 16px of padding either side, and the <select>
       is the flexed child within that — so measuring the select opened a panel
       32px narrower than the field and inset from its left edge, reading as a
       list belonging to something slightly to the right of the thing pressed.
       A picker is the field, opened; it starts where the field starts and is at
       least as wide. */
    const r = (host.closest('.control') || host).getBoundingClientRect();
    panel.style.minWidth = Math.max(200, Math.round(r.width)) + 'px';
    panel.style.left = Math.round(r.left) + 'px';
    panel.style.top  = Math.round(r.bottom + 4) + 'px';
    const p = panel.getBoundingClientRect();
    if(p.right > innerWidth - 8)
      panel.style.left = Math.round(Math.max(8, innerWidth - 8 - p.width)) + 'px';
    /* A picker near the foot of a long sheet opens upwards, and only if there
       is more room up there than down here — flipping into less space is how a
       list ends up with two rows in it. */
    const below = innerHeight - r.bottom - 12, above = r.top - 12;
    if(p.height > below && above > below){
      panel.style.top = Math.round(Math.max(8, r.top - p.height - 4)) + 'px';
      panel.querySelector('.cselp__list').style.maxHeight =
        Math.min(308, Math.max(120, above - (find?46:0) - 10)) + 'px';
    }else{
      panel.querySelector('.cselp__list').style.maxHeight =
        Math.min(308, Math.max(120, below - (find?46:0) - 10)) + 'px';
    }
  };

  const rowHtml = (it,i)=>{
    if(it.group) return `<p class="cselp__grp">${esc(it.group)}</p>`;
    /* The Under picker indents sub-groups with leading spaces, which HTML
       collapses — so the depth is read off the label and drawn as padding,
       and the label itself is trimmed. */
    const pad = it.indent ? ` style="padding-left:${12 + it.indent*14}px"` : '';
    return `<button type="button" class="cselp__opt${it.disabled?' is-off':''}${
      it.selected?' is-sel':''}" data-i="${i}"${pad}${
      it.title?` title="${esc(it.title)}"`:''} role="option" aria-selected="${!!it.selected}"${
      it.disabled?' aria-disabled="true"':''}
      ><span class="cselp__lbl">${esc(it.label)}</span
      ><span class="cselp__tick"><svg width="12" height="12" aria-hidden="true"
        ><use href="#i-tick"/></svg></span></button>`;
  };

  const paint = ()=>{
    const q = find ? find.value.trim().toLowerCase() : '';
    const shown = items.map((it,i)=>[it,i]).filter(([it])=>
      it.group ? true : (!q || it.label.toLowerCase().includes(q)));
    /* a group heading with everything under it filtered away is a heading
       over nothing, so it goes too */
    const live = shown.filter(([it],k)=>{
      if(!it.group) return true;
      const next = shown.slice(k+1);
      const upto = next.findIndex(([n])=>n.group);
      return (upto === -1 ? next : next.slice(0,upto)).length > 0;
    });
    const list = panel.querySelector('.cselp__list');
    list.innerHTML = live.length
      ? live.map(([it,i])=>rowHtml(it,i)).join('')
        + (more ? `<p class="cselp__none">${more} more — keep typing to narrow it.</p>` : '')
      : `<p class="cselp__none">Nothing in the book matches${
          (find?.value || query).trim() ? ` “${esc((find?.value || query).trim())}”` : ''}.</p>`;
    /* the active row is the selected one on opening, the first match once
       something has been typed — never nothing, or Enter has no meaning */
    const pickable = live.filter(([it])=>!it.group && !it.disabled).map(([,i])=>i);
    if(!pickable.includes(active))
      active = q ? (pickable[0] ?? -1)
                 : (pickable.find(i=>items[i].selected) ?? pickable[0] ?? -1);
    mark(!q);
  };

  const mark = (toView)=>{
    panel.querySelectorAll('.cselp__opt').forEach(b=>
      b.classList.toggle('is-active', +b.dataset.i === active));
    if(toView) panel.querySelector('.cselp__opt.is-active')
      ?.scrollIntoView({block:'nearest'});
  };

  const step = d=>{
    const ids = [...panel.querySelectorAll('.cselp__opt:not(.is-off)')].map(b=>+b.dataset.i);
    if(!ids.length) return;
    const at = ids.indexOf(active);
    active = ids[(at + d + ids.length * 2) % ids.length];
    if(at === -1) active = d > 0 ? ids[0] : ids[ids.length-1];
    mark(true);
  };

  const take = i=>{
    const it = items[i];
    if(!it || it.group || it.disabled) return;
    const cb = onPick, h = host;
    close();
    cb(it, h);
  };

  /* `spec` is what the control is, read from the control. Nothing about a
     particular picker is written here. */
  function open(el, spec){
    /* A superseded evaluation keeps the listeners it put on the document, so
       every engine the inbox has ever evaluated in this tab answers the same
       press on the same field. Most of what they do is a render, and the newest
       one renders last and wins; this one APPENDS, so the panels stacked up —
       one per invoice opened since the page loaded, all of them at once. Only
       the live engine opens a picker. */
    if(!arLive()) return;
    if(panel && host === el) return close();
    close();
    host = el;
    items = spec.items;
    more   = spec.more || 0;
    query  = spec.query || '';
    onPick = spec.onPick;
    active = items.findIndex(it=>!it.group && !it.disabled && it.selected);

    const count = items.filter(it=>!it.group && !it.disabled).length;
    const wantFind = el.dataset.find === 'yes' ? true
                   : el.dataset.find === 'no'  ? false
                   : spec.alwaysFind || count > CSEL_FIND_AT;

    panel = document.createElement('div');
    panel.className = 'cselp';
    panel.setAttribute('role','listbox');
    if(spec.label) panel.setAttribute('aria-label', spec.label);
    panel.innerHTML = `${wantFind ? `<div class="cselp__find">
        <span class="ico"><svg width="15" height="15" aria-hidden="true"><use href="#i-search"/></svg></span>
        <input type="text" autocomplete="off" spellcheck="false"
               placeholder="${esc(spec.findLabel || 'Search')}" aria-label="${esc(spec.findLabel || 'Search')}">
      </div>` : ''}<div class="cselp__list"></div>`;

    /* sheetPortal(), not <body>: embedded, every rule in this stylesheet is
       rewritten to `.ar-sheet <selector>` and the tokens live on `.ar-sheet`,
       so a panel appended straight to <body> matches nothing — it loses
       position:fixed and drops into normal flow at the foot of the host page,
       full width and unstyled. Same reason the tooltips go through it. */
    (el.closest('dialog[open]') || sheetPortal()).appendChild(panel);
    find = panel.querySelector('.cselp__find input');
    paint();
    place();
    requestAnimationFrame(()=>panel?.classList.add('is-on'));

    el.classList.add('is-open');
    el.setAttribute('aria-expanded','true');
    if(find){ find.focus(); }
    else if(el.tagName === 'SELECT'){ el.focus(); }

    panel.addEventListener('mousedown', e=>{
      /* the row is taken on mousedown so the panel cannot be closed out from
         under the click by the outside-click handler below */
      const b = e.target.closest('.cselp__opt');
      if(b){ e.preventDefault(); take(+b.dataset.i); return; }
      if(!e.target.closest('.cselp__find')) e.preventDefault();  // keep focus where it is
    });
    panel.addEventListener('mousemove', e=>{
      const b = e.target.closest('.cselp__opt:not(.is-off)');
      if(b && +b.dataset.i !== active){ active = +b.dataset.i; mark(false); }
    });
    find?.addEventListener('input', ()=>{ paint(); place(); });
  }

  /* Re-reads the control without reopening. `open` toggles — pressing a field
     whose list is already showing closes it, which is what a picker should do
     — and that made it exactly the wrong function to call on every keystroke
     in a combo: the first letter typed shut the panel. */
  function update(spec){
    if(!panel) return;
    items = spec.items;
    more  = spec.more || 0;
    query = spec.query || '';
    onPick = spec.onPick;
    paint(); place();
  }

  return {open, update, close, isOpen, openFor, place,
          keys(e){
            if(!panel) return false;
            if(e.key === 'Escape'){ e.preventDefault(); const h = close(); h?.focus?.(); return true; }
            if(e.key === 'ArrowDown'){ e.preventDefault(); step(1);  return true; }
            if(e.key === 'ArrowUp'){   e.preventDefault(); step(-1); return true; }
            if(e.key === 'Home'){ e.preventDefault(); active = -1; step(1);  return true; }
            if(e.key === 'End'){  e.preventDefault(); active = -1; step(-1); return true; }
            if(e.key === 'Enter'){ e.preventDefault(); take(active); return true; }
            if(e.key === 'Tab'){ close(); return false; }
            return false;
          }};
})();

/* What a `<select>` is, in the panel's terms. Read off the element every time
   it opens, so a list rebuilt by innerHTML between openings is simply read
   again — there is nothing cached to go stale. */
function cselFromSelect(sel){
  const items = [];
  /* "Select Source of Supply" is a prompt, not a state — an option only
     because a native select has nowhere else to put one. It was listing as the
     first row, above thirty-six real answers and unpickable. It becomes the
     search field's placeholder instead, which is where the reference puts it
     and what it was always for.

     Only the disabled one. A blank option that is *not* disabled is a real
     answer on this sheet — it means "none" — and it stays in the list. */
  let prompt = '';
  const add = o=>{
    if(o.value === '' && o.disabled){ prompt ||= (o.textContent||'').trim(); return; }
    items.push(cselOpt(o,sel));
  };
  [...sel.children].forEach(node=>{
    if(node.tagName === 'OPTGROUP'){
      if(node.label) items.push({group:node.label});
      [...node.children].forEach(add);
    }else if(node.tagName === 'OPTION'){
      add(node);
    }
  });
  return {items, label: sel.getAttribute('aria-label') || prompt,
          findLabel: sel.dataset.findLabel || prompt || 'Search',
          onPick(it){
            /* The one line that matters: the native control is told, and then
               told to say so. Everything downstream is the sheet's own. */
            sel.value = it.value;
            sel.dispatchEvent(new Event('change',{bubbles:true}));
          }};
}
function cselOpt(o,sel){
  const raw = o.textContent ?? '';
  const indent = Math.floor((raw.match(/^ */)[0].length) / 3);
  return {value:o.value, label:raw.trim(), indent,
          disabled:o.disabled, title:o.title || '',
          selected: o.value === sel.value};
}

/* A combo is a select you may also type into. Same panel, always searchable —
   the field itself is the search box, so the panel does not draw a second one
   — and free text is kept, because typing a code the list does not hold is how
   a new master gets made here. */
function cselFromCombo(inp,{filter=true}={}){
  const dl = document.getElementById(inp.dataset.list || '');
  const opts = dl ? [...dl.querySelectorAll('option')] : [];
  /* Pressing the field shows the book; typing narrows it. Filtering by what
     the field already holds meant opening a line that had already been coded
     showed "nothing matches 8504" — the one code it definitely does hold. */
  const q = filter ? inp.value.trim().toLowerCase() : '';
  const all = opts.map(o=>{
    const label = o.getAttribute('label') || o.value;
    /* The HSN list labels each option with the code *and* the description, so
       prefixing the code again read "998532 — 998532 — Window cleaning". */
    const full = label === o.value || label.startsWith(o.value) ? label
                                                                : `${o.value} — ${label}`;
    return {value:o.value, label:full, indent:0, disabled:false, title:'',
            selected:o.value === inp.value};
  }).filter(it=>!q || it.label.toLowerCase().includes(q));
  /* The HSN list is eleven hundred codes. Drawing all of them into the panel
     on an empty field is a second of layout for a list nobody could read, so
     it is cut — and the cut is stated, because a list that silently stops at
     sixty reads as a list with sixty things in it. Typing narrows it. */
  const CAP = 60;
  const items = all.slice(0, CAP);
  const more = all.length - items.length;
  return {items, more, query: filter ? inp.value.trim() : '', alwaysFind:false,
          label: inp.getAttribute('aria-label') || '',
          onPick(it){
            inp.value = it.value;
            inp.dispatchEvent(new Event('input',{bubbles:true}));
            inp.dispatchEvent(new Event('change',{bubbles:true}));
          }};
}
const cselCombo = (inp,opt)=>{
  /* No match keeps the panel open and says so. Closing it was worse than
     unhelpful: on these two fields a value the list does not hold is how a new
     master gets made, so "nothing matches" is a real answer to have on screen
     — and a panel that disappears mid-word reads as a broken field. */
  if(!document.getElementById(inp.dataset.list || '')) return;
  if(cselDrop.openFor(inp)) cselDrop.update(cselFromCombo(inp,opt));
  else cselDrop.open(inp, cselFromCombo(inp,opt));
};

/* --- suppressing the OS popup ---------------------------------------------
   `preventDefault` on mousedown is what stops a select from opening its own
   list, so this runs in the capture phase, before anything else on the sheet
   sees the press. The focus the press would have given the field is given by
   hand, because preventDefault takes that too. */
document.addEventListener('mousedown', e=>{
  const sel = e.target.closest?.('select');
  if(sel && !sel.disabled){
    e.preventDefault();
    if(cselDrop.openFor(sel)) { cselDrop.close(); return; }
    sel.focus();
    cselDrop.open(sel, cselFromSelect(sel));
    return;
  }
  const inp = e.target.closest?.('input[data-list]');
  if(inp && !inp.disabled && !inp.readOnly){
    /* not preventDefault: the caret has to land where the press was, because
       this field is typed into as well as picked from */
    if(cselDrop.openFor(inp)) cselDrop.close();
    else cselCombo(inp,{filter:false});
    return;
  }
  /* anywhere else closes it — but not a press inside the panel, which has
     already been handled by the panel's own listener */
  if(!e.target.closest?.('.cselp')) cselDrop.close();
}, true);

/* The keyboard opens it too, and the same keys that used to drive the OS list
   drive this one. A select with no panel open answers Enter, Space and the
   arrows by opening; once open, the panel takes them. */
document.addEventListener('keydown', e=>{
  if(cselDrop.isOpen() && cselDrop.keys(e)) return;
  const el = e.target;
  if(el?.tagName === 'SELECT' && !el.disabled && !cselDrop.isOpen()){
    if(['ArrowDown','ArrowUp','Enter',' ','Spacebar'].includes(e.key)){
      e.preventDefault();
      cselDrop.open(el, cselFromSelect(el));
    }
    return;
  }
  if(el?.matches?.('input[data-list]') && !cselDrop.isOpen() && e.key === 'ArrowDown'){
    e.preventDefault(); cselCombo(el,{filter:false});
  }
}, true);

/* Typing in a combo re-filters the list that is already open. */
document.addEventListener('input', e=>{
  const inp = e.target;
  if(inp?.matches?.('input[data-list]') && cselDrop.openFor(inp)) cselCombo(inp);
});

/* fixed to the viewport, so anything that moves the field has to move or
   close the panel with it */
addEventListener('scroll', ()=>cselDrop.isOpen() && cselDrop.place(), true);
addEventListener('resize', ()=>cselDrop.close());

/* --- clicks -------------------------------------------------------------- */
document.addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;

  /* The reason, asked for. Hover and focus open it on their own in CSS; this is
     the third way in, for the finger — the reason behind a proposal cannot be
     something only a mouse can reach. It does not re-render: the popover is
     not state the sheet holds, it is a thing being looked at, and rendering
     over it would close it in the act of opening it. */
  /* show, not toggle: a tap fires a synthetic mouseover before its click, so
     the pointer path has already opened this one and a toggle here would shut
     it in the same gesture. It closes by touching anything else, which is what
     the mouseover handler does. */
  if(btn.dataset.act==='why'){
    e.preventDefault(); e.stopPropagation();
    whyTip.show(btn);
    return;
  }
  if(btn.dataset.act==='sales-suggest-create'){
    if(state.salesLedgerSuggestion)
      openNmDialog(state.salesLedgerSuggestion,{kind:'salesLedger'});
    return;
  }

  if(btn.dataset.af==='del'){
    const id = btn.closest('[data-adj]').dataset.adj;
    state.adjustments = state.adjustments.filter(a=>a.id!==id);
    render(); return;
  }
  if(btn.dataset.act==='add-adj'){
    state.adjustments.push({id:uid(),ledger:'',amount:0});
    state.secOpen.adj = true;                 // the row you just asked for has to be visible
    render(); return;
  }
  /* GST and TDS lines live in one list, but they are added from their own
     sections — a ledger you add under GST starts as GST, and one you add
     under TDS starts on a section you are not already deducting under. */
  if(btn.dataset.act==='add-gst'){
    state.taxLines.push({id:uid(),key:uid(),type:'gst',auto:false,touched:true,
                         name:'Output Cess',rate:0,base:0,amount:0});
    state.secOpen.gst = true;
    render(); return;
  }
  if(btn.dataset.act==='add-ded'){
    const mode = state.deductionMode;
    const used = new Set(dedLines().map(t=>t.section));
    const sec  = dedMaster().find(s=>!used.has(s.id)) || dedMaster()[0];
    state.taxLines.push({id:uid(),key:uid(),type:mode,auto:false,touched:true,
                         section:sec.id,name:sec.name,rate:sec.rate,base:0,amount:0,note:'',detail:''});
    state.secOpen.ded = true;                 // you cannot add into a shut section
    render(); return;
  }
  /* the caret and the section name are one control, so the click can land on
     either — and it stops being derived the moment it is answered by hand */
  if(btn.dataset.sec){
    const key = btn.dataset.sec;
    state.secOpen[key] = !secIsOpen(key);
    render(); return;
  }
  if(btn.dataset.act==='del-line'){
    const c = rowOf(btn);
    if(c?.row){
      // remember it, or the engine simply suggests it again on the next pass
      if(c.row.auto && c.row.key) state.dismissedLines.push(c.row.key);
      c.list.splice(c.list.indexOf(c.row),1);
    }
    render(); return;
  }

  const ctx = rowOf(btn);

  if(btn.dataset.f==='discountType' && ctx?.row){
    ctx.row.discountType = ctx.row.discountType==='pct'?'flat':'pct';
    render(); return;
  }
  if(btn.dataset.f==='kind' && ctx?.row){
    ctx.row.kind = ctx.row.kind==='goods'?'service':'goods';
    if(ctx.row.kind==='service') ctx.row.godown='';
    render(); return;
  }
  if(btn.dataset.f==='clearOverride' && ctx?.row){
    ctx.row.amountOverride = null;
    render(); return;
  }
  /* Accepting is the only way a proposal becomes a posting. Dismissing is
     remembered, because a question that has been answered "no" should not be
     asked again on the next render — or on the next keystroke in the field
     next to it. */
  if(btn.dataset.act==='pred-accept' && ctx?.row?.pred){
    const row = ctx.row;
    /* On the fourth tier the tick does not point the line at a master, it
       makes one — so it opens the form rather than committing a record from a
       row that has no room to show what is in it. */
    if(row.pred.resolution==='new'){
      openNmDialog(row.pred.draft, {kind:ctx.tr.dataset.kind, id:row.id});
      return;
    }
    /* §1 L1. This proposal is not "which master" but "which table", so taking
       it moves the line rather than filling a field on it. */
    if(row.pred.crossRoute){
      moveItemToLedger(row,row.pred.target);
      render();
      toast(`Coded to ${ledgerNameOf(row.pred.target)}`,'ok');
      return;
    }
    applyPred(row,row.pred,row.pred.route);
    row.predState = 'applied';
    render(); return;
  }
  /* A tax line's plus always opens the form — there is nothing to point it at
     until the ledger exists, so unlike the tables there is no silent-apply
     branch to take here. */
  if(btn.dataset.act==='tax-pred-accept'){
    const line = state.taxLines.find(l=>l.id===btn.closest('.bd-line')?.dataset.id);
    if(line?.pred) openNmDialog(line.pred.draft, {kind:'taxLines', id:line.id});
    return;
  }
  /* The pencil on an HSN field. Which of the two codes a row can carry is
     decided by the table it is in, exactly as every other HSN call on this
     sheet decides it. */
  if(btn.dataset.act==='hsn-edit' && ctx?.row){
    openHsnMenu(btn, ctx.row, ctx.tr.dataset.kind==='items' ? 'item' : 'ledger');
    return;
  }
  /* The code proposal, answered. Taking it is the only thing that puts an
     inferred code in the field; refusing it closes the question for this
     wording, exactly as refusing a master proposal does. */

  /* Consent. This is the only path in the sheet that writes to a master the
     book already held, so it says what it did rather than doing it quietly. */
  if(btn.dataset.act==='hsn-consent-update' && ctx?.row){
    const route = ctx.tr.dataset.kind==='items' ? 'item' : 'ledger';
    const st = hsnState(ctx.row,route);
    if(consentUpdateMaster(ctx.row,route)){
      render();
      toast(`${st.master.name} now carries ${st.invoiceCode||st.value} — this line syncs as ${SYNC_TAG.masters}`,'ok');
    }
    return;
  }
  if(btn.dataset.act==='hsn-consent-decline' && ctx?.row){
    consentDecline(ctx.row, ctx.tr.dataset.kind==='items' ? 'item' : 'ledger');
    render(); return;
  }
  if(btn.dataset.act==='hsn-reopen' && ctx?.row){ ctx.row.hsnConsent = ''; render(); return; }
  /* The same form the picker's own last option opens, reached without having
     to know the option is down there. */
  if(btn.dataset.act==='new-ledger' && ctx?.row){
    openNmDialog(draftLedger(ctx.row), {kind:ctx.tr.dataset.kind, id:ctx.row.id});
    return;
  }
  if(btn.dataset.act==='new-adj-ledger'){
    const adj = state.adjustments.find(a=>a.id===btn.closest('[data-adj]')?.dataset.adj);
    if(adj) openNmDialog(draftLedger(adj), {kind:'adjustments', id:adj.id});
    return;
  }
  if(btn.dataset.act==='new-customer'){
    openNmDialog(state.customerSuggestion || draftCustomer(state.printedCustomer || {}), {kind:'customer'});
    return;
  }
  if(btn.dataset.act==='unlock'){
    const inp = btn.closest('.control,.hsn').querySelector('input');
    inp.readOnly = false;
    inp.focus(); inp.select();
    inp.addEventListener('blur',()=>{ inp.readOnly = true; },{once:true});
    return;
  }
  /* Chrome filters a datalist down to the options containing whatever is
     already in the field, so on a row carrying a proposal the caret opened an
     empty list and read as broken — a proposed name is one the book does not
     hold yet, so it can never match, and the picker died on exactly the rows
     that most need overriding. Emptying the field first is what makes the
     whole list show. The proposal goes back if the field is left empty, which
     is also what a re-render would put there. */
  if(btn.dataset.act==='pickitem'){
    const inp = btn.closest('.cell').querySelector('input');
    const held = inp.value;
    inp.value = '';
    inp.focus(); inp.showPicker?.();
    inp.addEventListener('blur',()=>{ if(!inp.value) inp.value = held; },{once:true});
    return;
  }
  if(btn.dataset.act==='menu' && ctx?.row){ openRowMenu(btn, ctx); return; }

  if(btn.classList.contains('checkbox')){
    const tr = btn.closest('.trow');
    if(tr.classList.contains('trow--head')){
      const kind = tr.parentElement.id.replace('-table','');
      const list = state[kind];
      const all = list.every(r=>r.sel);
      list.forEach(r=>r.sel=!all);
      bulkKind = kind;
    }else if(ctx?.row){
      ctx.row.sel = !ctx.row.sel;
      bulkKind = ctx.tr.dataset.kind;
    }
    render(); return;
  }

  /* --- the bulk bar --------------------------------------------------- */
  if(btn.dataset.bulk==='apply'){ bulkApply(); return; }

  if(btn.dataset.bulk==='page'){
    const strip = $('#bulkbar-fields'); if(!strip) return;
    /* a page is what is on screen less one field's worth of overlap, so the
       field you were reading stays in view after the jump */
    strip.scrollLeft += Number(btn.dataset.dir) * Math.max(120, strip.clientWidth - 80);
    setTimeout(syncBulkArrows, 260);          // after the smooth scroll settles
    return;
  }

  if(btn.dataset.bulk==='delete'){
    const kind = bulkKind; if(!kind) return;
    const n = bulkCount(kind);
    state[kind] = state[kind].filter(r=>!r.sel);
    if(!state[kind].length) state[kind].push(kind==='items'?blankItem():blankLedger());
    bulkDraft[kind] = {};
    render();
    toast(`${n} ${kind==='items'?`line item${n===1?'':'s'}`:`ledger line${n===1?'':'s'}`} deleted`);
    return;
  }

  if(btn.dataset.bulk==='clear'){
    const kind = bulkKind; if(!kind) return;
    state[kind].forEach(r=>r.sel=false);
    bulkDraft[kind] = {};
    bulkKind = null;
    render(); return;
  }
});

/* The bar's own fields. They are held in a draft rather than written to the
   rows as they are typed — nothing the bar does touches the invoice until Apply,
   which is the only reason it is safe to have it sitting over the sheet. */
document.addEventListener('input', e=>{
  const f = e.target.dataset.bf; if(!f || !bulkKind) return;
  const v = e.target.value;
  if(v) bulkDraft[bulkKind][f] = v; else delete bulkDraft[bulkKind][f];
  e.target.closest('.bulkbar__fld')?.classList.toggle('is-set', !!v);
});
document.addEventListener('change', e=>{
  const f = e.target.dataset.bf; if(!f || !bulkKind) return;
  const v = e.target.value;
  if(v) bulkDraft[bulkKind][f] = v; else delete bulkDraft[bulkKind][f];
  e.target.closest('.bulkbar__fld')?.classList.toggle('is-set', !!v);
});

/* The bar is centred on a pane that moves — under a window resize, and under
   the scrollbar appearing as rows are added. */
addEventListener('resize', placeBulkBar);
addEventListener('scroll', placeBulkBar, {passive:true});

/* --- row menu popup ------------------------------------------------------ */
function closeMenu(){ $('.menu')?.remove(); }


/* The code, asked for on a surface of its own.

   The pencil used to unlock the field in place, which gave the edit no title,
   no way out that was not a click somewhere else, and nowhere to say the two
   things a code carries besides its digits — where this one came from, and
   what the voucher will state about it. Those did not fit on the row, so they
   were either crammed onto it or not said at all: an accepted prediction wore
   `Predicted` and `Undo` beside the field and still wrapped to a second line,
   which made it the one row in the column that did not read like its
   neighbours.

   They fit in here. Which is what lets the row go back to `HSN/SAC 7326 ✏️` and
   the tag it shares with every other row — the dashed rule under the digits
   still says the value is not the book's own, and the sentence that says so in
   words is one click away rather than crowded against it. */
function openHsnMenu(anchor, row, route){
  closeMenu();
  const st = hsnState(row,route);
  /* Read once, on open. The menu is about the value as it stands, and the row
     behind it does not move while it is up. */
  const wasPred = st.from==='pred';
  const reason  = wasPred ? hsnReason(row)
    : st.value ? `<b>From:</b> ${esc(hsnSrcWord(st.from,route))}.` : '';
  let value = st.value, err = '';

  const menu = document.createElement('div');
  menu.className = 'menu menu--hsn';
  const paint = ()=>{
    menu.innerHTML = `
      <p class="menu__ttl">HSN/SAC</p>
      <input class="menu__inp${err?' is-invalid':''}" type="text" inputmode="numeric"
             value="${esc(value)}" aria-label="HSN or SAC code"
             placeholder="2, 4, 6 or 8 digits">
      ${err?`<p class="menu__err">${esc(err)}</p>`
           :reason?`<p class="menu__note">${reason}</p>`
           :`<p class="menu__note">The voucher states this code${
               st.value?` as ${esc(SYNC_TAG[st.tag])}`:''}.</p>`}
      <div class="menu__foot menu__foot--hsn">
        <button type="button" data-a="save" class="is-save">Save</button>
        <button type="button" data-a="cancel">Cancel</button>
        ${wasPred?`<button type="button" data-a="clear" class="is-quiet"
          title="Take the predicted code back off this line">Undo prediction</button>`:''}
      </div>`;
  };
  /* Focus is taken after the menu is in the document, not inside `paint` —
     focusing a node that has not been appended yet does nothing, which left
     the popover opening with the caret still on the pencil behind it: you
     could not type into the field you had just asked for, and Enter and
     Escape went nowhere because the keys never reached the menu. */
  const grab = ()=>{ const i = menu.querySelector('.menu__inp'); i.focus(); i.select(); };
  paint();
  sheetPortal().append(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.left = (window.scrollX + Math.min(r.left, document.documentElement.clientWidth - menu.offsetWidth - 12))+'px';
  /* Below the pencil, unless there is no below — an HSN field is as likely to
     be on the last line of a forty-line table as the first, and a popover that
     opens off the bottom of the screen is a popover the row at the bottom
     cannot use. */
  const below = r.bottom + 6 + menu.offsetHeight <= innerHeight - 8;
  menu.style.top = (window.scrollY + (below ? r.bottom + 6 : Math.max(8, r.top - menu.offsetHeight - 6)))+'px';
  grab();

  const read = ()=>menu.querySelector('.menu__inp').value.trim();
  /* Blank is a real answer — it is the line saying it has no code — so only a
     stated one is held to the shape the rest of the sheet holds codes to. */
  const save = ()=>{
    const v = read();
    if(v && !/^(\d{2}|\d{4}|\d{6}|\d{8})$/.test(v)){
      err = 'HSN/SAC is 2, 4, 6 or 8 digits.'; value = v; paint(); grab(); return;
    }
    /* A code you typed is yours, which is the tier that outranks everything —
       the same rule the field itself follows, written in the same two lines so
       the two ways in cannot disagree about what a typed code means. */
    row.hsn = v;
    row.hsnFrom = v ? 'user' : '';
    row.hsnDismissed = true;
    row.hsnPredState = v ? 'applied' : '';
    if(!v) row.hsnPred = null;
    closeMenu(); render();
  };

  menu.addEventListener('keydown', ev=>{
    if(ev.key==='Enter'){ ev.preventDefault(); save(); }
    if(ev.key==='Escape'){ ev.preventDefault(); closeMenu(); }
  });
  menu.addEventListener('click', ev=>{
    const a = ev.target.closest('button')?.dataset.a;
    if(!a) return;
    if(a==='cancel'){ closeMenu(); return; }
    if(a==='save'){ save(); return; }
    if(a==='clear'){ clearHsn(row); closeMenu(); render(); }
  });
  /* Dismissal, and two things it has to survive that a one-shot `contains`
     check does not.

     The menu repaints itself — an invalid code puts a message in and redraws —
     so by the time a click on Save reaches the document the button that was
     clicked is no longer in the tree, and `contains` says it was outside. The
     path is read from the event instead, which was fixed at dispatch, before
     anything was replaced. And the listener is not `once`: a click on the field
     itself is an inside click, and spending the only dismissal on it would
     leave the menu unclosable by anything but Escape. */
  const onAway = ev=>{
    if(!menu.isConnected) return document.removeEventListener('click',onAway,true);
    if(ev.composedPath().includes(menu)) return;
    document.removeEventListener('click',onAway,true);
    closeMenu();
  };
  setTimeout(()=>document.addEventListener('click',onAway,true));
}

function openRowMenu(anchor, ctx){
  closeMenu();
  const kind = ctx.tr.dataset.kind;
  const i = ctx.list.indexOf(ctx.row);
  const simple = kind==='taxLines';
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = `<button type="button" data-a="dup">Duplicate row</button>` +
    (simple?'':`<button type="button" data-a="clear">Clear row</button>`) +
    `<button type="button" data-a="del" class="is-danger">Delete row</button>`;
  sheetPortal().append(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.top  = (window.scrollY + r.bottom + 6)+'px';
  menu.style.left = (window.scrollX + Math.min(r.left, document.documentElement.clientWidth - menu.offsetWidth - 12))+'px';

  menu.addEventListener('click',ev=>{
    const a = ev.target.closest('button')?.dataset.a;
    if(a==='dup')   ctx.list.splice(i+1,0,{...ctx.row,id:uid(),sel:false,auto:false,touched:true,key:uid()});
    if(a==='clear') ctx.list[i] = kind==='items'?blankItem():blankLedger();
    if(a==='del'){
      ctx.list.splice(i,1);
      if(!ctx.list.length && !simple) ctx.list.push(kind==='items'?blankItem():blankLedger());
    }
    closeMenu(); render();
  });
  setTimeout(()=>document.addEventListener('click',onAway,{once:true}));
  /* the menu this handler was armed for may already be gone, and a click-away
     from a closed menu must not take down whichever one is open now */
  function onAway(ev){ if(menu.isConnected && !menu.contains(ev.target)) closeMenu(); }
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(); });

/* --- date pickers & misc buttons ----------------------------------------- */
$$('.control__date').forEach(inp=>inp.addEventListener('click',()=>inp.showPicker?.()));
$$('[data-display]').forEach(el=>{ el.dataset.placeholder = el.textContent; });

$('#cc-toggle').addEventListener('click',()=>{ state.ccMode = state.ccMode==='class'?'centre':'class'; render(); });
$$('.modetabs button').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('#btn-add-item').addEventListener('click',()=>{ state.items.push(blankItem()); render(); });
$('#btn-add-ledger').addEventListener('click',()=>{ state.ledgers.push(blankLedger()); render(); });

/* ============================================================================
   8. SAMPLE DATA (the bundled figures the form opens on)

   This was an upload → OCR → extraction pipeline when the document pane was
   here. Raising an invoice has no document to read, so the pipeline and its
   progress animation are gone and only the fill-the-form half is kept: the
   same bundled figures, applied once at boot. `file` is retained as a
   parameter and always null — the customer matching, the prediction pass and
   the provenance chips downstream all branch on it.
   ==========================================================================*/

function applyExtraction(file){
  const b = byId(MASTERS.branches,SAMPLE.branch);
  state.branch = SAMPLE.branch;

  /* The customer is picked, not matched. Nothing is being read off anything —
     the sample stands in for a user who has chosen a party from the list, so
     the party is a master this book holds and everything the master knows
     flows from it. */
  state.customer = SAMPLE.customer;
  const v = byId(MASTERS.customers,state.customer);
  state.customerSuggestion = null;
  state.customerPredReason = '';

  state.voucherType  = SAMPLE.voucherType;
  state.customerPoNo = SAMPLE.customerPoNo;

  const party = v;

  state.invoiceDate    = SAMPLE.invoiceDate;
  state.dueDate        = party ? addDays(SAMPLE.invoiceDate, party.credit) : '';
  state.salesLedger    = (v && fbSalesLedgerHit(v.id)?.id) || party?.ledger || SAMPLE.salesLedger;
  state.narration         = SAMPLE.narration;
  state.costCentreClass   = SAMPLE.costCentreClass;
  /* Straight off the master the user picked. */
  state.billingAddress    = v ? v.address : '';
  state.gstin             = v ? v.gstin   : '';
  state.gstTreatment      = party ? party.treatment : '';
  state.sourceState       = b.state;                    // our branch supplies
  state.destState         = party ? party.state : '';   // the customer receives

  /* The optional groups are read the same as everything else, and a group the
     document has data for is switched on to receive it. The default config is
     a default, not a decision — making the user turn a section on before it
     will admit what the invoice already said is a step that answers nothing. */
  state.extra = {}; state.extraFrom = {};
  Object.entries(SAMPLE.extra).forEach(([id,val])=>{
    const g = FIELD_GROUPS.find(x=>x.fields.some(f=>f.id===id));
    if(!g) return;
    fieldConfig[g.id].on = true;
    fieldConfig[g.id].fields[id] = true;
    /* and whatever this value makes mandatory, or the requirement would arrive
       switched off and the invoice would post a reference with nothing behind it */
    g.fields.filter(f=>f.req===id).forEach(f=>{ fieldConfig[g.id].fields[f.id] = true; });
    state.extra[id] = val;
    state.extraFrom[id] = 'invoice';
  });

  /* Each line lands in the table the document puts it in, against the master
     the document names. A line that names none arrives with the cell empty. */
  state.mode    = 'item';
  state.items   = [];
  state.ledgers = [];
  state.adjustments = [];
  SAMPLE.lines.forEach(line=>{
    /* §5. Read before the line's own route is honoured, because a discount the
       customer happened to print in the item block is still a discount — where
       it sat on the page is the customer's layout, not a statement about what
       it is. Freight and the rest fall through: their bucket is Ledgers, which
       is where the route was sending them anyway. */
    const charge = chargeRouteOf(line.text);
    if(charge?.bucket==='adjustment'){
      state.adjustments.push({
        id:uid(), ledger:'', description:line.text, chargeWhat:charge.what,
        ledType:charge.ledType, roundLimit:charge.roundLimit, roundMethod:charge.roundMethod,
        /* A discount reduces the payable, so it arrives signed the way the
           customer printed it and the totals add it as it stands. */
        amount: num(line.amount) || r2(num(line.qty)*num(line.rate))
      });
      return;
    }
    if(line.route==='item'){
      const master = byId(MASTERS.items, line.item);
      state.items.push({...blankItem(),
        description: line.text,
        item: master?master.id:'',
        kind: master?.kind || 'goods',
        /* The code and the rate the customer printed are kept on the row and
           never merged into ours: they are the other side of every comparison
           the consent prompt makes, and a value they have been folded into
           can no longer be compared with. What the line *carries* is derived
           from the masters by `hsnState`, so nothing needs seeding here. */
        invoiceHsn: line.hsn || '',
        invoiceRate: line.gst==null ? null : num(line.gst),
        /* Kept the same way and for the same reason: the unit is the customer's
           word, and whether this book holds a master for it is our question,
           asked later against the list rather than answered here. */
        invoiceUnit: line.unit || '',
        godown: master?.kind==='service' ? '' : (master?.godown || ''),
        costCentre: line.cc||'',
        qty: num(line.qty), rate: num(line.rate),
        discount: num(line.disc), discountType: line.discType||'pct',
        tax: taxIdForRate(line.gst)});
    }else{
      const master = byId(MASTERS.incomeLedgers, line.ledger);
      state.ledgers.push({...blankLedger(),
        description: line.text,
        ledger: master?master.id:'',
        invoiceHsn: line.hsn || '',
        invoiceRate: line.gst==null ? null : num(line.gst),
        costCentre: line.cc||'',
        tax: taxIdForRate(line.gst),
        amount: num(line.amount) || r2(num(line.qty)*num(line.rate))});
    }
  });
  /* Run last, over the finished rows: a prediction is scored against the whole
     invoice — the party, the amounts already on it, the deduction it already
     carries — not against the line in isolation.

     It runs for a proposed party as well as a recorded one. The gate used to be
     `state.customer`, on the argument that the habit tier needs their past coding
     and the pricing needs their PAN and year-to-date. Half of that is right:
     a party with no master has no past coding, so the habit tier simply
     returns nothing and §1 L2 falls through to org history and fuzzy match,
     which is the fallback chain doing its job. The other half is wrong — the
     PAN is on the invoice, and a party with no history has no year-to-date, which
     is a figure of zero and not an unknown.

     What the gate actually did was leave the sheet blank: no line proposals, no
     GST, no withholding, on the one invoice most in need of all three. */
  if(state.customer || state.customerSuggestion) runPredictions();
  if(!state.items.length)   state.items   = [blankItem()];
  if(!state.ledgers.length) state.ledgers = [blankLedger()];
  state.stashedItems = null;
  /* Not adjustments: those are cleared before the line loop now, because the
     loop is what fills them — a discount and a round off the invoice printed are
     extracted the same as any other line, and clearing them here would throw
     away what was just read. */
  state.taxLines = []; state.dismissedLines = [];

  render();

  $$('.control,.cell').forEach(el=>el.classList.add('is-extracted'));
  setTimeout(()=>$$('.is-extracted').forEach(el=>el.classList.remove('is-extracted')),2600);

  /* Nothing is announced on arrival any more. The sheet used to open by
     counting what it had guessed — so many lines coded, so many masters to
     add — because an invoice had just been read and the reader deserved to
     know what had been decided for them. Nothing is decided for them here.
     The form opens with the masters' own values in it and the rest blank, and
     a count of that is a count of the obvious. */
}



/* ============================================================================
   9. ALLOCATE — number the voucher and post the double entry
   ==========================================================================*/
function previewVoucherNo(){
  const vt = byId(MASTERS.voucherTypes,state.voucherType);
  if(!vt) return 'Auto Generated';
  const seq = (MASTERS.lastVoucherSeq[state.voucherType]||0)+1;
  return `${vt.prefix}/${fyLabel(state.voucherDate)}/${String(seq).padStart(3,'0')}`;
}
function nextVoucherNo(){
  if(state.voucherNo.trim()) return state.voucherNo.trim();   // hand-typed wins
  const vt = byId(MASTERS.voucherTypes,state.voucherType);
  const seq = MASTERS.lastVoucherSeq[state.voucherType] = (MASTERS.lastVoucherSeq[state.voucherType]||0)+1;
  return `${vt.prefix}/${fyLabel(state.voucherDate)}/${String(seq).padStart(3,'0')}`;
}

/* The classification a line posts under, as the voucher will carry it. Only
   the code's standing decides the wording — the value is the same either way,
   and what differs is whether the book is vouching for it. */
function voucherHsn(row,route){
  const st = hsnState(row,route);
  if(!st.value) return null;
  return {code:st.value, rate:st.ourRate, tag:SYNC_TAG[st.tag]};
}

/* How the invoice will go out, counted. A reviewer should be able to see at a
   glance how much of this voucher the book is vouching for. */
function syncTagSummary(){
  const rows = state.mode==='item'
    ? state.items.map(r=>[r,'item']).concat(state.ledgers.map(r=>[r,'ledger']))
    : state.ledgers.map(r=>[r,'ledger']);
  const live = rows.filter(([r,route])=>hsnState(r,route).value);
  const masters = live.filter(([r,route])=>hsnState(r,route).tag==='masters').length;
  return {masters, specify:live.length-masters, total:live.length};
}

/* The entry a sales invoice posts, which is the sales entry turned around.
   Buying, the expense was debited and the customer credited. Selling, the
   customer is debited with everything they owe and the income is credited —
   so the party line leads rather than closes, and every ledger that was a Dr
   on the invoice is a Cr here.

   The two statutory heads part company at this point. TCS was added to what the
   customer owes, so it is inside the debit to them and credits a payable we
   will settle with the department. TDS was taken off what they owe, so it is
   not in their debit at all — it is a second debit, to an asset, standing for
   the tax they will remit in our name. Either way the entry balances, which is
   the check worth making on this function: the customer's debit plus TDS
   receivable equals income plus output GST plus TCS payable. */
function journalEntries(calc){
  const lines = [];
  const ded = DEDUCTIONS[state.deductionMode];
  const dedTotal = r2(dedLines().reduce((s,t)=>s+num(t.amount),0));

  /* The party the voucher debits, and the first line because that is the way
     round a sales voucher reads. Named off the proposal when the master does
     not exist yet, because the preview has to show what this invoice would
     post and "the party" is not a blank line. */
  lines.push({account:(byId(MASTERS.customers,state.customer)||state.customerSuggestion)?.name||'—',
              dr:calc.grand,cr:0,party:true});

  /* Withheld heads are the rest of the debit side: the customer is paying us
     less than the invoice is worth, and the difference is tax standing to our
     credit with the department rather than income we never earned. */
  if(ded.posts==='dr' && dedTotal)
    dedLines().forEach(t=>num(t.amount) &&
      lines.push({account:`${ded.account} — ${t.section||t.name}`,dr:num(t.amount),cr:0}));

  /* Only the mode being posted reaches the voucher. The other mode's rows are
     still in the draft and are simply not read here — creating the invoice is
     what drops them. */
  if(state.mode==='item' && calc.itemsTaxable)
    lines.push({account:byId(MASTERS.salesLedgers,state.salesLedger)?.name||'Sales',dr:0,cr:calc.itemsTaxable,
                hsnOf:state.items.map(r=>voucherHsn(r,'item')).filter(Boolean)});

  state.ledgers.forEach(r=>{
    const amt = num(r.amount); if(!amt) return;
    lines.push({account:ledgerNameOf(r.ledger)||'Unallocated income',dr:0,cr:amt,
                hsn:voucherHsn(r,'ledger')});
  });

  /* Output GST credits the tax liability on the sales voucher. */
    gstLines().forEach(t=>num(t.amount) && lines.push({account:t.name,dr:0,cr:num(t.amount)}));

  /* Collected heads sit on the credit side with the tax: money we are holding
     for the department and never earned. */
  if(ded.posts==='cr' && dedTotal)
    dedLines().forEach(t=>num(t.amount) &&
      lines.push({account:`${ded.account} — ${t.section||t.name}`,dr:0,cr:num(t.amount)}));

  /* A discount reduces what we are owed and a round off nudges it, so the sign
     that debited an expense on the invoice credits the party's side here. */
  state.adjustments.forEach(a=>{
    const amt = num(a.amount); if(!amt) return;
    lines.push({account:ledgerNameOf(a.ledger)||'Adjustment',dr:amt<0?-amt:0,cr:amt>0?amt:0});
  });

  return lines;
}

/* --- the allocation confirmation -------------------------------------------
   Rows write their own masters now, so nothing on the sheet stops to ask. This
   is where the asking went: the one screen on which every record this invoice adds
   is listed together, at the one moment the records stop being the invoice's and
   become the book's.

   It is a review and not a notice, which means it has to be possible to say no
   to a single line — a confirmation whose only exit is "cancel the whole invoice"
   is a confirmation people learn to click through.

   Nothing in here writes or withdraws a record except the Create button on the
   summary. */

/* This dialog used to have a third state. 'approve' opened on the way to the
   voucher and listed what the invoice had added to the book, with an Approve
   button under it — but by then every record on the list was already written,
   so the pass wrote nothing and withdrew nothing. A confirmation that cannot
   change the thing it is confirming is a step, not a check, and it stood
   between the reader and the one question the invoice still had to answer. It is
   gone. What is left is the bulk create it was modelled on and the receipt that
   create produces. */
let abMode = 'summary';
/* What the last Create pass did, for the result state to report. */
let abResult = {made:0, blocked:[]};

/* The drafts a freshly-extracted invoice is carrying: a row whose prediction is to
   author a master, that nobody has confirmed, refused, or already made. */
function abSuggested(){
  const out = [];
  const add = row=>{
    const p = row.pred;
    if(!p || p.resolution!=='new' || !p.draft || p.made) return;
    if(row.predState==='dismissed') return;
    const kind = abRowKind(row); if(!kind) return;
    out.push({key:'sug:'+kind+':'+row.id, made:false, suggested:true,
              kind:p.draft.kind, obj:p.draft, name:p.draft.name, id:row.id,
              row, target:{kind, id:row.id}});
  };
  state.items.forEach(add);
  state.ledgers.forEach(add);
  state.adjustments.forEach(add);
  /* The totals panel proposes masters too — a GST head this book has no ledger
     for, a withholding section with no payable ledger behind it — and they are
     records this invoice would add exactly as a line's ledger is. Leaving them out
     of the one pass meant "create all" did not, and the two GST ledgers a
     12%-rated invoice needs had to be answered one at a time in a panel where they
     are the easiest thing on the sheet to miss. */
  state.taxLines.forEach(line=>{
    const p = line.pred;
    if(!p || p.resolution!=='new' || !p.draft || p.made) return;
    if(line.predState!=='open') return;
    out.push({key:'sug:taxLines:'+line.id, made:false, suggested:true,
              kind:p.draft.kind, obj:p.draft, name:p.draft.name, id:line.id,
              row:null, target:{kind:'taxLines', id:line.id}});
  });
  /* The sales ledger is not a line, but it is a suggested master on this
     invoice and §1 L3 names it, so it belongs in the one pass with the rest. */
  const pl = state.salesLedgerSuggestion;
  if(pl && !state.salesLedger)
    out.push({key:'sug:salesLedger', made:false, suggested:true,
              kind:pl.kind, obj:pl, name:pl.name, id:'salesLedger',
              row:null, target:{kind:'salesLedger'}});
  /* The party, for the same reason. It is the largest record this invoice would
     add and the one every other prediction on the sheet leans on, so leaving
     it out of the one pass meant "create all" left behind the master that
     mattered most — and §6's bulk create asks for every pending suggestion in
     one go, not most of them. It goes first because abSort ranks a customer
     ahead of an item, which is also the order they have to be made in. */
  if(state.customerSuggestion && !state.customer)
    out.push({key:'sug:customer', made:false, suggested:true,
              kind:'customer', obj:state.customerSuggestion,
              name:state.customerSuggestion.name, id:'customer',
              row:null, target:{kind:'customer'}});
  return out;
}

/* The drafts, and only the drafts. The other branch this had — the records the
   invoice has already written — was what the approval pass listed, and nothing
   reads it now that the pass is gone. */
function abEntries(){ return abSuggested(); }
const abRowKind = row => state.items.includes(row) ? 'items'
  : state.ledgers.includes(row) ? 'ledgers'
  : state.adjustments.includes(row) ? 'adjustments' : '';

/* Only a draft can be blocked. A master already in the book was written through
   the form, which asked these same questions before it let go — re-asking them
   of a record that exists would be the dialog doubting its own book.

   Two reasons a draft does not get written, and they are different in kind. One
   is a value nobody supplied, which the person reading this can go and supply.
   The other is that they may not author masters at all — nothing on this screen
   will fix that, so the row says so plainly and offers no way to try. Both stop
   one record and neither stops the invoice. */
/* What each kind is called in this list. Shorter than `NM_LABEL`, which names
   the record in a sentence — here the word sits in a fixed column beside a
   group picker that already says "Indirect Expenses", so "income ledger" is
   spelling out what the row states twice over. The longest of these sets the
   column, and the column is fixed rather than `auto`: every row is its own
   grid, so `auto` sizes each one to its own label and puts eight names on two
   different left edges — which is the ragged list this was meant to fix. */
const AB_KIND = {item:'item', ledger:'ledger', sales:'sales ledger',
                 tax:'tax ledger', customer:'customer'};
const abKind = k => AB_KIND[k] || NM_LABEL[k] || k;

/* One wording for "this record still needs something", and one panel to put it
   in, because there are two places that say it: the summary, where it is a
   caveat before the fact, and the receipt, where it is the same caveat after
   it. They were written separately and drifted — the receipt still had the red
   tick, the wide kind column and "Unit is missing / Fill it in" long after the
   summary had stopped saying any of that. */
const abNeedText = labels => labels.length
  ? `Needs ${labels.length>1?'':'a '}${labels.map(l=>l.toLowerCase()).join(' and ')}.`
  : '';
const abFixLabel = labels =>
  labels.length===1 ? `Add ${labels[0].toLowerCase()}` : 'Add details';

function abLeftPanel(items){
  if(!items.length) return '';
  const rows = items.map(x=>`
    <div class="abd__row is-blocked"${x.key?` data-key="${esc(x.key)}"`:''}>
      <span class="abd__kind">${esc(abKind(x.kind))}</span
      ><span class="abd__name" title="${esc(x.name)}">${esc(x.name)}</span>
      <p class="abd__err">${esc(x.why)}${x.key && x.act
        ? `<button type="button" class="abd__fix" data-ab="fix" data-key="${esc(x.key)
          }">${esc(x.act)}</button>` : ''}</p>
    </div>`).join('');
  return `<div class="abd__left"><p class="abd__left-ttl"
      ><span class="ico"><svg width="13" height="13" aria-hidden="true"
        ><use href="#i-info"/></svg></span>${
      items.length===1 ? 'One more isn’t ready yet'
                       : `${items.length} more aren’t ready yet`
    }</p>${rows}</div>`;
}

const abFault = x => {
  if(x.made) return null;
  if(!canCreate()) return {perm:true, labels:[], msg:NO_CREATE,
    short:'No Create permission'};
  const f = nmFaults(x.obj);
  /* Named, and nothing else. The sentence this replaced spent fifteen words
     restating a rule the dialog states once underneath — that one bad record
     stops one record — on every blocked row. The field is the part that is
     about this row, so the field is what is left. */
  return f && {...f, short:`${f.labels.join(' and ')} ${
    f.labels.length>1?'are':'is'} missing`};
};

/* Whether the list still has something under the fold. Asked after every paint
   and on every scroll, because both change the answer. */
function abScrollShade(){
  const b = $('#ab-body'); if(!b) return;
  b.classList.toggle('has-more', b.scrollHeight - b.clientHeight - b.scrollTop > 2);
}
$('#ab-body').addEventListener('scroll', abScrollShade);

/* The dialog is one surface in two states, and the state is `abMode`.

     summary — what will be added to the book, before anything is
     result  — what was added, and what could not be

   `summary` is a summary and not a worksheet. It used to be an editable table:
   a group picker on every row, a refusal on every row, a count in the button
   that moved as you used them. That is a fine thing to have and it is not what
   somebody pressing "Create all" is asking for — they have read the sheet and
   want to know what is about to happen. So the rows state the record and the
   shelf, and the one thing that is not a statement is the one thing that needs
   an answer: a master missing a mandatory value, named with its field and a way
   into the form that has it. */
function renderAbDialog(){
  const rows    = abEntries();
  const n       = rows.length;
  const blocked = rows.filter(abFault);
  const ready   = n - blocked.length;
  const dlg     = $('#ab-dialog');
  dlg.classList.toggle('is-result', abMode==='result');

  if(abMode==='result'){
    const made = abResult.made, out = abResult.blocked;
    $('#ab-title').textContent = made
      ? `${made} master${made===1?'':'s'} created`
      : 'Nothing was created';
    /* Set here rather than inherited. This branch returns before the lines
       below run, so whatever the previous state put under the title stayed
       there — including, if you arrived from the barred state, a sentence
       about not having permission sitting under "14 masters created". */
    $('#ab-sub').textContent = made
      ? `${made===1?'It is':'They are'} in your book now${out.length?', and will stay there.':'.'}`
      : 'Nothing was added to your book.';
    $('#ab-sub').hidden = false;
    $('#ab-body').innerHTML = abLeftPanel(out.map(x=>({
      key:x.key, kind:x.kind, name:x.name,
      why: abNeedText(x.labels||[]) || x.why,
      act: abFixLabel(x.labels||[])})));
    $('#ab-tally').textContent = '';
    $('#ab-tally').hidden = true;
    $('#ab-go').hidden = true;
    $('#ab-cancel').textContent = 'Done';
    abScrollShade();
    return;
  }

  $('#ab-go').hidden = false;

  /* The title counted every suggestion and the button counted the ones that
     could actually be made, so an invoice with one incomplete record asked "Add 14
     masters?" over a button reading "Create 13" and explained the gap nowhere.
     A confirmation that cannot be reconciled with its own button is the one
     kind of confirmation nobody should ship.

     So the title is the button: both say what will happen. The one that will
     not is named underneath, where it can say why. */
  /* A reader without the right is not looking at fourteen held-up records —
     they are looking at fourteen records somebody else will have to make. The
     row-by-row treatment repeated one sentence fourteen times down a
     seven-hundred-pixel dialog and still offered a Create button. So this case
     is its own: the count and the breakdown, which §6 says everyone may see,
     the reason once, and no offer. */
  const barred = !canCreate() && n > 0;

  $('#ab-title').textContent =
      barred ? `This invoice would add ${n} master${n===1?'':'s'}`
    : ready ? `Create ${ready} master${ready===1?'':'s'}?` : 'Nothing can be created yet';

  /* The consequence worth naming — the reason this is asked at all. A voucher
     is this invoice; a master is every invoice after it. */
  $('#ab-sub').textContent =
      barred ? NO_CREATE
    : ready ? `${ready===1?'It stays':'They stay'} in your book after this invoice.`
            : 'Every record this invoice names still needs a value filled in.';
  $('#ab-sub').hidden = !$('#ab-sub').textContent;


  /* One line per master: what kind it is, what it is called, and the shelf it
     goes on — stated, not asked. The group is set from the bucket the record
     was drafted in and is editable on the creation form, which is where a
     record is edited. */
  /* A count per kind, not a register.

     It listed every record — name, kind, shelf — which for twelve masters is a
     scrolling table in front of a button, and the scroll is the tell: a summary
     you have to scroll is a document. Nobody reads twelve names to decide
     whether to press Create; they want to know the shape of what is about to
     happen, and the shape is *how many of what*. The names are on the sheet
     behind this, on the rows the records came from, where they can be read
     against the lines that produced them.

     What survives per-record is the one thing the sheet behind cannot say: a
     master that will be left out, which is named because "1 is missing a value"
     makes somebody hunt for which. */
  /* Counted over what will be created, not over every suggestion. The chips
     used to sum to fourteen beside a button offering thirteen — the same
     contradiction the title had, in a second place. What is left out is not
     absent from the dialog; it is named below, which is where it belongs. */
  const order = Object.keys(AB_KIND);
  const tally = new Map();
  /* Barred, the count is every record the invoice names — none of them is being
     left out for want of a value, so none of them is an exception. */
  rows.filter(x=>barred || !abFault(x)).forEach(x=>tally.set(x.kind, (tally.get(x.kind)||0) + 1));
  const counts = order.filter(k=>tally.get(k)).map(k=>{
    const c = tally.get(k);
    const label = abKind(k);
    return `<span class="abd__count">${
      esc(label.charAt(0).toUpperCase()+label.slice(1))}${c===1?'':'s'
      }<span class="suggrp__n">${c}</span></span>`;
  }).join('');

  /* "Unit is missing / Fill it in" named a field and an instruction and left
     the reader to join them. What they need is the consequence — this one is
     not being created — and the single thing that would change it. So the
     reason reads as a sentence and the action names what it adds. */
  const blockedRows = abLeftPanel((barred ? [] : blocked).map(x=>{
    const f = abFault(x);
    return {key: x.target ? x.key : '', kind:x.kind, name:x.name,
            why: f.perm ? NO_CREATE : (abNeedText(f.labels) || f.msg),
            act: f.perm ? '' : abFixLabel(f.labels)};
  }));

  /* The heading on the blocked panel does the work the old layout left to a
     hairline: these are not part of the count above, they are what the count
     leaves out. */
  /* Approve mode counts the masters this invoice has already created, which on a
     invoice that created none is nothing — and an empty wrapper still costs a gap.
     So the row only exists when there is something in it, and the dialog
     collapses to a title and two buttons, which is all a plain confirmation
     needs. */
  $('#ab-body').innerHTML = (counts ? `<div class="abd__counts">${counts}</div>` : '')
    + blockedRows;

  const kindCh = Math.max(4, ...blocked.map(x=>abKind(x.kind).length));
  $('#ab-body').style.setProperty('--abd-kind', (kindCh + 1) + 'ch');
  abScrollShade();

  /* Named once, at the foot, because the rows already say which — this is the
     count, so that pressing the button is not a surprise. */
  /* An empty paragraph is still a flex child, and a flex child still takes a
     gap on each side — forty pixels of nothing between the panel and the
     buttons, which is most of what read as "too much whitespace" here. */
  $('#ab-tally').textContent = barred
    ? 'The invoice still posts without them — ask somebody with Create permission to add them.'
    : '';
  $('#ab-tally').hidden = !$('#ab-tally').textContent;

  $('#ab-go').hidden = barred;                 // nothing to offer
  $('#ab-go').disabled = !ready;
  $('#ab-go').textContent = ready ? `Create ${ready}` : 'Create';
  /* "Not now" implies a later yes, which is not this reader's to give — with
     no Create permission the only thing left to do is close. */
  $('#ab-cancel').textContent = barred ? 'Done' : 'Not now';
}

function openAbDialog(mode='summary'){
  const dlg = $('#ab-dialog'); if(!dlg || dlg.open) return;
  abMode = mode;
  renderAbDialog();
  dlg.showModal();
}
const abClose = ()=>{ abMode = 'summary';
                      $('#ab-dialog').close(); render(); };

$('#ab-x').addEventListener('click', abClose);
$('#ab-cancel').addEventListener('click', abClose);
$('#ab-dialog').addEventListener('cancel', e=>{ e.preventDefault(); abClose(); });

/* Confirming the review pass writes every draft on it, through the same
   `nmWrite` the create form calls — so a master made here and one made by
   filling the form in are the same record, written by the same function, and
   the field ends up holding it either way.

   One at a time, and a failure is that master's alone. A draft the book cannot
   accept is left where it is: the row keeps its offer, the line posts on its
   description, and every other draft on this invoice is still written. The field
   it is missing is named while the person is still looking at the list.

   The whole pass is one Undo, because it is one gesture — pressing Create all
   is not eight decisions, and taking eight records back out one row at a time
   would be. */
function abReviewCommit(){
  if(!canCreate()){ toast(NO_CREATE,'err'); return; }
  const blocked = [];
  let made = 0;
  abEntries().forEach(x=>{
    const fault = nmFaults(x.obj);
    if(fault){
      /* The fields, not a sentence built here — the dialog words it, in the
         one place that words it for the summary too. */
      blocked.push({key:x.key, kind:x.kind, name:x.name, labels:fault.labels,
                    why:abNeedText(fault.labels)});
      return;
    }
    if(nmWrite(x.obj,{target:x.target, silent:true})) made++;
  });
  /* The dialog stays open and becomes the receipt. A toast would say the same
     thing and take it away again, and the half of it that matters — which
     record could not be added, and the way into the form that fixes it — is
     the half nobody can act on in four seconds. */
  abResult = {made, blocked};
  abMode = 'result';
  render();
  renderAbDialog();
}

/* Confirming is what writes the drafts. It goes through `nmWrite` with the row
   as the target, which is the same call the create form makes — so a master
   nobody looked at and a master somebody filled in by hand are the same record,
   written by the same function, and the row ends up pointing at it either way.
   The ones already created are left alone; they were written when the tick was
   pressed. */
/* Creating is now the only thing this button does. It used to have a second
   job — the approval pass, where the same surface listed what the invoice had
   already added and asked to be let through — and that pass wrote nothing, so
   what it amounted to was a screen between the reader and the voucher restating
   decisions they had already made. It is gone, and with it the only reason this
   dialog ever needed to know what to run next. */
$('#ab-form').addEventListener('submit', e=>{
  e.preventDefault();
  abReviewCommit();
});

/* Filing from in here writes to whichever object this row is about — the master
   if it exists, the draft if it does not. Both are what the creation will read,
   so the shelf chosen here is the shelf it lands on. */
$('#ab-body').addEventListener('change', e=>{
  const sel = e.target.closest('[data-ab="group"]'); if(!sel) return;
  const hit = abEntries().find(x=>x.key===sel.dataset.key); if(!hit) return;
  hit.obj.group = sel.value;
  /* A ledger's group decides which of the eight shapes the record takes, so the
     rest of the draft is brought in line with it — the same call the create
     form makes when that field moves. And the group decides which *list* it is,
     so Sales Accounts turns an expense draft into a sales ledger here
     exactly as it does on the form; without this the confirmation could file a
     record under a group its own kind does not belong to. */
  if(!hit.made && LEDGER_KIND[hit.kind]){
    const next = kindForGroup(sel.value, hit.obj.kind);
    if(next && next!==hit.obj.kind){
      hit.obj.kind = next;
      if(next==='sales'){ hit.obj.nature ||= supplyNature(); hit.obj.drcr = 'Dr'; }
    }
    applyGroupDefaults(hit.obj);
  }
  renderAbDialog();
});

/* The only control on a row in here: the way into the form that holds the
   value the record is missing. The dialog steps out of the way rather than
   stacking a form on top of itself, and confirming that form brings it back
   with the record made. */
$('#ab-body').addEventListener('click', e=>{
  const btn = e.target.closest('[data-ab="fix"]'); if(!btn) return;
  const hit = abEntries().find(x=>x.key===btn.dataset.key);
  if(!hit || hit.made) return;
  abMode = 'summary';
  $('#ab-dialog').close();
  openNmDialog(hit.obj, hit.target, {});
});

/* --- bill-wise allocation ---------------------------------------------------
   The last question an invoice asks, and the only one whose answer is about the
   party rather than the supply. A ledger kept bill by bill holds a list of
   references instead of a balance, so a voucher that credits it has to say
   which entries on that list it moves — otherwise the money lands on the party
   as a lump and every ageing report downstream is guessing.

   Tally's four answers are all here, and the difference between them is what
   each one does to the list:

     New Reference     adds an entry that ages towards a due date — the invoice
                       itself, the ordinary case, and the only type that has a
                       due date at all
     Against Reference moves an entry that is already there. The list it offers
                       is not the party's whole list: an allocation can only
                       settle a reference leaning the other way, so an invoice
                       sees advances received and credit notes raised and nothing
                       else. The amount cannot exceed what is left on it
     Advance           adds an entry that is not owed on any date — money moving
                       ahead of the supply. A New Reference minus the due date,
                       and what a later invoice's Against Reference will find
     On Account        adds nothing to the list. It is the honest name for an
                       amount nobody can attribute yet, and it stays visible as
                       unattributed rather than being spread across invoices that
                       did not earn it

   One rule holds over all four, and it is Tally's: the allocation has to come
   to the party's own figure on this voucher, on the party's own side. Rows can
   lean either way — a Dr row on a sales is unusual but legal — so it is the
   net that has to agree, not the sum.

   The one place this parts company with Tally is the opening state. Tally opens
   the screen empty and makes you remember what the party is holding; the book
   already knows, so the dialog opens with the answer written and the reader's
   job is to disagree with it rather than reconstruct it. */
const BR_TYPES = [
  {id:'new',     name:'New Reference'},
  {id:'agst',    name:'Against Reference'},
  {id:'advance', name:'Advance'},
  {id:'onacct',  name:'On Account'}
];
const BR_KIND = {invoice:'Invoice', advance:'Advance received', note:'Credit note', onacct:'On account'};
const BR_TYPE_NAME = id=>BR_TYPES.find(t=>t.id===id)?.name || '';

let brRows = [];                 // the dialog edits a copy, so Cancel really cancels
let brGo   = null;               // what to run once this is confirmed
let brShowErrs = false;          // faults are shown on the first refused Confirm, not while typing

/* Dr, because a sales invoice puts the party in debit. On a sales invoice
   this opened on Cr and everything downstream reads the side off it. */
const brBlank = ()=>({id:uid(), type:'new', ref:'', refId:'', dueDate:'', amount:'', drcr:'Dr'});

/* The party the voucher credits, master or proposal — the same fallback the
   journal's party line uses, and for the same reason: an invoice from a stranger
   still allocates. */
function brParty(){ return byId(MASTERS.customers,state.customer) || state.customerSuggestion || null; }

/* What has to be allocated, and which way it leans. Read off the party line of
   the voucher rather than recomputed, because that line is already net of the
   withholding and the adjustments and it is the figure Tally balances the
   allocation against. Positive is a credit to the party. */
function brTarget(){
  const party = journalEntries(compute()).find(l=>l.party);
  /* Dr less Cr now: the party line is a debit on a sales invoice, so the
     figure this has to place is what the customer owes us. */
  return party ? r2(party.dr - party.cr) : 0;
}

/* Bill-wise is a property of the ledger. A book that was never asked keeps its
   parties bill by bill, so the flag is read as "not switched off" — which is
   also what the create-customer form writes when the switch is left alone. */
function brApplies(){
  const p = brParty();
  return !!p && p.billByBill !== false && Math.abs(brTarget()) >= .005;
}

function brBook(){
  const p = byId(MASTERS.customers,state.customer);
  return p ? (MASTERS.billRefs[p.id] || []) : [];
}
const brRefById = id=>brBook().find(r=>r.id===id);

/* What a row may be set against: a reference with something left on it, leaning
   the other way from the row, and not already spoken for by another row on this
   invoice. Settling one reference twice on one voucher is the fault this last
   clause exists to prevent. */
function brCandidates(row){
  const taken = new Set(brRows.filter(r=>r!==row && r.type==='agst' && r.refId).map(r=>r.refId));
  return brBook().filter(r=>r.pending > .004 && r.side !== row.drcr && !taken.has(r.id));
}

/* Every figure in here is signed onto the target's side, so the balance is one
   subtraction rather than two running totals that have to be compared. */
const brRowAmt   = r=>{ const a = r2(num(r.amount)); return r.drcr==='Cr' ? a : -a; };
const brSum      = rows=>r2(rows.reduce((s,r)=>s+brRowAmt(r),0));
const brAllocated= ()=>brSum(brRows);
const brBalance  = ()=>r2(brTarget() - brAllocated());
/* Cr and Dr rather than a minus sign: this is a ledger, and the side is the
   half of the figure an accountant reads first. */
const brSide = n=>n < 0 ? 'Dr' : 'Cr';

/* Every way a row can be wrong, named per field so the row can point at the
   cell rather than the dialog pointing at the row. */
function brFaults(){
  const out = [];
  const seen = new Set();
  const held = new Set(brBook().map(r=>r.name.trim().toLowerCase()));
  brRows.forEach(r=>{
    const amt = r2(num(r.amount));
    if(r.type==='agst'){
      if(!r.refId){
        out.push({id:r.id, f:'ref', msg:'Pick the reference this settles.'});
      }else{
        const hit = brRefById(r.refId);
        /* Tally's one refusal on this type: a reference cannot give up more
           than it is holding, and the excess has nowhere to go. */
        if(hit && amt > r2(hit.pending) + .004)
          out.push({id:r.id, f:'amount',
                    msg:`${hit.name} has only ${money(hit.pending)} left to settle.`});
      }
    }else if(r.type !== 'onacct'){
      const nm = r.ref.trim(), key = nm.toLowerCase();
      if(!nm){
        out.push({id:r.id, f:'ref', msg:'A reference needs a name.'});
      }else if(seen.has(key)){
        out.push({id:r.id, f:'ref', msg:`This invoice names “${nm}” twice.`});
      }else if(held.has(key)){
        /* Two live references under one name are two things the party can pay
           and one thing the book can find. */
        out.push({id:r.id, f:'ref', msg:`“${nm}” is already pending against this party.`});
      }else{
        seen.add(key);
      }
    }
    /* Only a new reference ages, so only a new reference is asked when. */
    if(r.type === 'new'){
      if(!r.dueDate)
        out.push({id:r.id, f:'due', msg:'A new reference needs a due date.'});
      else if(state.invoiceDate && r.dueDate < state.invoiceDate)
        out.push({id:r.id, f:'due', msg:'A due date cannot fall before the invoice date.'});
    }
    if(amt <= 0) out.push({id:r.id, f:'amount', msg:'An allocation has to be more than zero.'});
  });
  return out;
}

/* The dialog opens on one empty row. It used to open on an answer — the party's
   pending advances knocked off oldest first, the remainder written as a new
   reference off the customer's PO number and the credit period's due date — and
   a banner above the rows explaining what it had done.

   Which is a split nobody asked for, presented as one already made. An
   allocation is a statement about which entries this invoice moves, and the only
   person who knows that is the person entering it: the book can see that an
   advance is pending, but not that this invoice is what settles it. Proposing it
   in the rows themselves makes the wrong answer the default and the right one an
   edit, and an allocation confirmed because it was already filled in is the one
   kind of error this dialog exists to prevent.

   The pending references are still there to be chosen — that is what the
   Against Reference picker lists. They are offered, not applied. */

function brPaintTotals(){
  const target = brTarget(), alloc = brAllocated(), bal = brBalance();
  const square = Math.abs(bal) < .005;
  $('#br-totals').innerHTML =
    `<span class="brx__fig">Net Invoice/voucher amount: <b>${money(Math.abs(target))} ${brSide(target)}</b></span>`
  + `<span class="brx__fig ${square?'brx__fig--ok':'brx__fig--off'}">Total Allocated: `
  + `<b>${money(Math.abs(alloc))} ${brSide(alloc)}</b></span>`
  /* The third figure exists only while there is a disagreement, because a
     balance of zero is not a fact worth a slot on the line. */
  + (square ? '' : `<span class="brx__fig brx__fig--off">Balance to allocate: `
                 + `<b>${money(Math.abs(bal))} ${brSide(bal)}</b></span>`);

  const warn = $('#br-warn');
  const msgs = brShowErrs ? [...new Set(brFaults().map(f=>f.msg))] : [];
  if(brShowErrs && !square)
    msgs.unshift(`${money(Math.abs(bal))} ${brSide(bal)} is still unallocated — the references have to come to the invoice amount exactly.`);
  warn.hidden = !msgs.length;
  warn.textContent = msgs.join('  ');
}

function brRender(){
  const p = brParty();
  $('#br-title').textContent = p ? `Invoice Allocation for ${p.name}` : 'Invoice Allocation';
  const faults = brShowErrs ? brFaults() : [];
  const bad = (id,f)=>faults.some(x=>x.id===id && x.f===f) ? ' is-bad' : '';
  const cal = `<span class="ico ico-12 ico--muted"><svg width="10.5" height="11.5"><use href="#i-calendar"/></svg></span>`;

  $('#br-rows').innerHTML = brRows.map(r=>{
    const hit   = r.type==='agst' ? brRefById(r.refId) : null;
    const cands = r.type==='agst' ? brCandidates(r) : [];
    /* The reference this row already holds stays on its own list even when the
       filter would now drop it — a picker that cannot show its own value is a
       picker that looks empty. */
    const list  = (hit && !cands.includes(hit) ? [hit] : []).concat(cands);
    const due   = r.type==='agst' ? (hit?.dueDate || '') : r.dueDate;

    /* The name cell is a different control per type, because the type decides
       whether the reference is being named or being found. */
    const nameCell = r.type==='agst'
      ? `<label class="cell"><select class="cell__select" data-brf="refId">
           <option value=""${r.refId?'':' selected'} disabled>${
             list.length ? 'Select a pending reference' : 'Nothing pending to set against'}</option>
           ${list.map(c=>`<option value="${c.id}"${c.id===r.refId?' selected':''}>${
             esc(`${c.name} · ${BR_KIND[c.kind]||c.kind} · ${money(c.pending)} ${c.side}`)}</option>`).join('')}
         </select></label>`
      : r.type==='onacct'
      ? `<div class="cell is-disabled"><span class="t-cell">On Account</span></div>`
      : `<label class="cell"><input class="cell__input" data-brf="ref" value="${esc(r.ref)}"
           placeholder="Enter reference no." aria-label="Reference number"></label>`;

    /* Only a new reference has a due date to set. An against-reference inherits
       the one it is settling, and an advance and an on-account amount are not
       owed on any date — so the cell says so rather than offering a picker
       whose answer would mean nothing. */
    const dueCell = (r.type==='advance' || r.type==='onacct')
      ? `<div class="cell is-disabled"><span class="t-cell">—</span></div>`
      : r.type==='agst'
      ? `<div class="cell is-disabled">${cal}<span class="t-cell">${due?esc(fmtDate(due)):'—'}</span></div>`
      : `<label class="cell">${cal}
           <span class="t-cell">${due?esc(fmtDate(due)):'Select due date'}</span>
           <input type="date" class="control__date" data-brf="dueDate" value="${esc(due)}" aria-label="Due date"></label>`;

    return `<div class="brrow" data-br="${r.id}">
      <div class="brcell${bad(r.id,'type')}">
        <label class="cell"><select class="cell__select" data-brf="type" aria-label="Type of reference">${
          BR_TYPES.map(t=>`<option value="${t.id}"${t.id===r.type?' selected':''}>${esc(t.name)}</option>`).join('')
        }</select></label>
      </div>
      <div class="brcell${bad(r.id,'ref')}">${nameCell}</div>
      <div class="brcell${bad(r.id,'due')}">${dueCell}</div>
      <div class="brcell${bad(r.id,'amount')}">
        <label class="cell cell-num"><span class="t-cell" style="flex:none">₹</span>
          <input class="cell__input" data-brf="amount" inputmode="decimal" value="${esc(r.amount)}"
                 placeholder="0.00" aria-label="Amount"></label>
      </div>
      <div class="brcell">
        <label class="cell"><select class="cell__select" data-brf="drcr" aria-label="Debit or credit">
          <option value="Cr"${r.drcr==='Cr'?' selected':''}>Cr</option>
          <option value="Dr"${r.drcr==='Dr'?' selected':''}>Dr</option>
        </select></label>
      </div>
      <button type="button" class="brrow__del" data-br-del="${r.id}" aria-label="Remove this reference"${
        brRows.length<2?' disabled':''}>
        <span class="ico ico-14"><svg width="14" height="14"><use href="#i-trash"/></svg></span>
      </button>
    </div>`;
  }).join('');

  $$('#br-rows .control__date').forEach(inp=>inp.addEventListener('click',()=>inp.showPicker?.()));
  brPaintTotals();
}

const brRowOf = el=>{
  const node = el.closest('[data-br]');
  return node ? brRows.find(r=>r.id===node.dataset.br) : null;
};

/* Typing repaints the totals and nothing else. Rebuilding the rows on every
   keystroke would take the caret out of the field being typed into. */
$('#br-rows').addEventListener('input', e=>{
  const f = e.target.dataset.brf, row = brRowOf(e.target);
  if(!row || (f!=='amount' && f!=='ref')) return;
  row[f === 'amount' ? 'amount' : 'ref'] = e.target.value;
  if(f==='amount') brPaintTotals();
});

$('#br-rows').addEventListener('change', e=>{
  const f = e.target.dataset.brf, row = brRowOf(e.target);
  if(!row || !f) return;

  if(f==='type'){
    row.type = e.target.value;
    /* The fields do not carry over, because each type means something different
       by them. A reference picked as an against-reference is not a name a new
       reference should inherit, and a due date belongs to one type only. */
    row.refId = '';
    /* A new reference used to arrive named off the customer's PO number and
       dated off the credit period. Both were guesses about what this row is —
       the PO number is not the reference this invoice raises, it is the one the
       customer sent — so the row stays empty and says so. */
    if(row.type==='advance'){ row.dueDate = ''; }
    if(row.type==='onacct'){ row.ref = ''; row.dueDate = ''; }
  }
  else if(f==='refId'){
    row.refId = e.target.value;
    const hit = brRefById(row.refId);
    if(hit){
      row.dueDate = hit.dueDate || '';
      /* What this row is offered is the smaller of what the reference is
         holding and what the invoice still has left to place — which is the
         answer in almost every case, and a ceiling in the rest. */
      const others = brSum(brRows.filter(r=>r!==row));
      const want   = (row.drcr==='Dr' ? 1 : -1) * r2(brTarget() - others);
      row.amount   = String(r2(Math.min(hit.pending, want > .004 ? want : hit.pending)));
    }
  }
  else if(f==='drcr'){
    row.drcr = e.target.value;
    /* Flipping the side flips which half of the party's list this row can
       reach, so what it was pointing at is no longer on offer. */
    if(row.type==='agst') row.refId = '';
  }
  else if(f==='dueDate'){ row.dueDate = e.target.value; }
  else if(f==='ref' || f==='amount'){ row[f] = e.target.value; }

  brRender();
});

$('#br-rows').addEventListener('click', e=>{
  const btn = e.target.closest('[data-br-del]');
  if(!btn || brRows.length < 2) return;
  brRows = brRows.filter(r=>r.id !== btn.dataset.brDel);
  brRender();
});

/* Blank, like the first one. It used to open holding whatever was still
   unallocated — but a dialog whose first row is empty and whose second arrives
   filled in is answering a question it just declined to answer, and the balance
   it would have written is already stated on the totals line to be read. */
$('#br-add').addEventListener('click', ()=>{
  brRows.push(brBlank());
  brRender();
  $('#br-rows [data-br]:last-child [data-brf="ref"]')?.focus();
});

function openBrDialog(go){
  const dlg = $('#br-dialog');
  if(!dlg || dlg.open) return;
  brGo = go;

  /* An allocation already made is kept — unless the invoice has moved under it.
     A split that no longer comes to the invoice amount is not a saved answer but
     a stale one, and asking the reader to work out which of their own rows the
     edit invalidated is asking them to do the arithmetic twice. */
  const stale = Math.abs(r2(brTarget() - brSum(state.billRefs))) >= .005;
  if(state.billRefs.length && !stale){
    brRows = state.billRefs.map(r=>({...r}));
  }else{
    /* A stale split is cleared rather than carried forward, so it is said out
       loud — on a toast rather than inside the dialog, because it is news about
       what just happened to the previous answer and not part of the form. */
    if(state.billRefs.length && stale)
      toast('The invoice amount changed, so the earlier allocation was cleared.','warn');
    brRows = [brBlank()];
  }
  brShowErrs = false;
  brRender();
  dlg.showModal();
}

/* Confirming is the only thing that writes the split onto the voucher, and it
   refuses rather than warns: an allocation that does not come to the invoice is
   not an invoice Tally would take. */
$('#br-form').addEventListener('submit', e=>{
  e.preventDefault();
  brShowErrs = true;
  if(brFaults().length || Math.abs(brBalance()) >= .005){ brRender(); return; }
  state.billRefs = brRows.map(r=>({...r, amount:String(r2(num(r.amount)))}));
  const go = brGo;
  brGo = null;
  $('#br-dialog').close();
  render();
  go && go();
});

/* Closing without allocating leaves the invoice exactly where it was. Tally holds
   you in this screen until it balances; there the screen *is* the voucher, and
   here it is one step of an invoice nothing has posted yet — so the way out is the
   way back to the sheet, not a trap. */
const brClose = ()=>{ brGo = null; $('#br-dialog').close(); render(); };
$('#br-x').addEventListener('click', brClose);
$('#br-cancel').addEventListener('click', brClose);
$('#br-dialog').addEventListener('cancel', e=>{ e.preventDefault(); brClose(); });

/* What the allocation does to the party's list, done once, at the moment the
   voucher becomes real. New references and advances join the list; an
   against-reference takes its amount off the one it settles and leaves it
   there at nil rather than removing it, so discarding the invoice can put it
   back exactly as it stood. */
function brCommit(){
  const p = byId(MASTERS.customers,state.customer);
  if(!p || !state.billRefs.length) return;
  const book = MASTERS.billRefs[p.id] ||= [];
  state.billRefs.forEach(r=>{
    const amt = r2(num(r.amount));
    if(r.type==='agst'){
      const hit = book.find(x=>x.id===r.refId);
      if(!hit) return;
      state.knockedRefs.push({customer:p.id, id:hit.id, by:amt});
      hit.pending = r2(hit.pending - amt);
      return;
    }
    const made = {
      id:      'br-'+uid(),
      name:    r.type==='onacct' ? 'On Account' : r.ref.trim(),
      date:    state.invoiceDate || state.voucherDate,
      dueDate: r.type==='new' ? r.dueDate : '',
      amount:  amt, pending: amt,
      kind:    r.type==='new' ? 'invoice' : r.type==='advance' ? 'advance' : 'onacct',
      side:    r.drcr
    };
    book.push(made);
    state.newRefs.push({customer:p.id, id:made.id});
  });
}

$('#btn-allocate').addEventListener('click',()=>{
  /* Same button, second job. Once the invoice has posted there is nothing left to
     create, and what the primary action means is sending it. */
  if(state.allocated) return openSyncDialog();
  state.validated = true;
  const errs = validate(true);
  if(errs.length){
    /* the banner replaces the toast it used to raise — it says the same thing,
       names every field rather than the first, and stays until they are fixed */
    renderErrBanner(errs);
    renderAddl();          // the strip waits on state.validated too, and this is the flip
    const banner = $('#err-banner');
    banner.scrollIntoView({behavior:'smooth',block:'center'});
    banner.querySelector('.errlist__item')?.focus({preventScroll:true});
    return;
  }
  /* Straight to the allocation. There was a confirmation between here and the
     voucher — a list of what the invoice had added to the book, with an Approve on
     it — and it was asking a question that had already been answered: every
     record on that list went in when somebody pressed a tick or confirmed the
     review pass, and a summary of decisions already taken is a click, not a
     check. What is left in the way of the voucher is the one question nothing
     else has asked, which is how the party's credit divides.

     Masters still come first, because they always did — a record is written the
     moment it is created, well before this button. The allocation reads the
     party's ledger and finds it there. */
  if(!brApplies()){ state.billRefs = []; allocateNow(); return; }
  openBrDialog(allocateNow);
});

function allocateNow(){
  const calc = compute();
  const voucherNo = nextVoucherNo();
  state.voucherNo = voucherNo;
  $('#voucher-no').value = voucherNo;
  $('#voucher-ref').textContent = `${voucherNo} · ${fmtDate(state.voucherDate)}`;

  /* Creating the invoice is what settles the two modes into one. The voucher is
     built from the mode on screen, and the other mode's cached rows are
     dropped here rather than lingering as a second answer to a question that
     now has one. The draft cache goes with them. */
  const entries = journalEntries(calc);
  /* The party's list moves here and nowhere earlier. Everything before this
     was a proposal about how the credit divides; this is the voucher, and the
     voucher is what the outstandings are made of. */
  brCommit();
  state.allocated = true;
  if(state.mode==='accounting') state.stashedItems = null;
  clearDraft();
  /* Posting changes New to Created in the existing fields, and it changes what
     the topbar is for: the invoice is no longer being made, it is made. The two
     things left to do with it — send it, or start the next one — are what the
     two buttons become. */
  render();
  toast('Invoice approved — '+voucherNo,'ok');
}


/* ---------------------------------------------------------------------------
   SYNC — hierarchical, and after the fact
   ----------------------------------------------------------------------------
   Two things this screen has been careful about all along meet here.

   A master created from an invoice is live in AIA the moment it is created, because
   a master you cannot post to is not one. It is *not* in Tally. Nothing on this
   sheet has spoken to Tally, and pretending otherwise would be the one lie the
   feature could tell that an accountant would find out about later, at the
   worst moment, from Tally.

   So sync is its own act, and it carries the whole invoice at once: the masters
   first, in the order Tally needs them — a party and a stock item before the
   voucher that names them — and the voucher last. That ordering is the whole of
   what "hierarchical" means, and it is why this cannot happen at the moment of
   creation: a master synced on its own would arrive in Tally attached to
   nothing, and if the invoice were then abandoned it would stay there.

   The other half is the classification each line goes out under, which
   `hsnState` has been deciding row by row since the invoice was read. It is
   restated here because this is the moment it stops being a plan. */
function syncPlan(){
  const masters = state.newMasters.map(rec=>({
    rank: rec.kind==='customer' ? 0 : rec.kind==='item' ? 1 : 2,
    kind: rec.kind, name: rec.name,
    what: rec.kind==='customer' ? 'a party the voucher names'
        : rec.kind==='item'   ? 'a stock item the voucher lines name'
        : 'a ledger the voucher posts to'
  })).sort((a,b)=>a.rank-b.rank);
  const tags = syncTagSummary();
  return {masters, tags};
}
function renderSyncDialog(){
  const {masters,tags} = syncPlan();
  $('#sync-sub').textContent = `${state.voucherNo} · ${masters.length
    ? `${masters.length} master${masters.length===1?'':'s'} and the voucher`
    : 'the voucher alone'}`;
  $('#sync-body').innerHTML = `
    <p class="sync__lead">${masters.length
      ? `These ${masters.length===1?'record has':'records have'} existed in AI Accountant
         since ${masters.length===1?'it was':'they were'} created and ${
         masters.length===1?'has':'have'} not been sent anywhere. Tally needs them before
         the voucher that names them, so they go first, in this order.`
      : `Every line on this invoice posts to a master Tally already holds, so there is
         nothing to send but the voucher.`}</p>
    <ol class="sync__list">
      ${masters.map(m=>`<li class="sync__step">
        <span class="sync__kind">${esc(NM_LABEL[m.kind]||m.kind)}</span>
        <span class="sync__name">${esc(m.name)}</span>
        <span class="sync__why">${esc(m.what)}</span></li>`).join('')}
      <li class="sync__step sync__step--voucher">
        <span class="sync__kind">Voucher</span>
        <span class="sync__name">${esc(state.voucherNo)}</span>
        <span class="sync__why">${tags.total
          ? esc(`${tags.total} line${tags.total===1?'':'s'} carrying an HSN/SAC code`)
          : 'no HSN/SAC on any line'}</span></li>
    </ol>`;
  $('#sync-go').textContent = masters.length
    ? `Sync ${masters.length} & the voucher` : 'Sync the voucher';
}
function openSyncDialog(){
  if(!state.allocated) return;
  renderSyncDialog();
  $('#sync-dialog').showModal();
}
$('#sync-close').addEventListener('click',()=>$('#sync-dialog').close());
$('#sync-dialog').addEventListener('cancel',e=>{ e.preventDefault(); $('#sync-dialog').close(); });
$('#sync-go').addEventListener('click',()=>{
  const {masters} = syncPlan();
  state.synced = true;
  $('#sync-dialog').close();
  /* Said as one sentence, in the order it happened, because the order is the
     part worth reporting. */
  toast(masters.length
    ? `Synced to Tally — ${masters.length} master${masters.length===1?'':'s'}, then ${state.voucherNo}`
    : `Synced to Tally — ${state.voucherNo}`, 'ok');
  renderTopbar();                  // the button reports what it has just done
});

/* What the two topbar buttons are, which is a question about the invoice's stage
   rather than about the buttons. Before it posts they make the invoice or throw it
   away; after, it is made, and the only two things left to do with it are send
   it and start the next one. Sending twice is not one of them, so once it has
   gone the button says so and stops offering. */
function renderTopbar(){
  const done = state.allocated;
  $('#btn-discard').textContent = done ? 'New Invoice' : 'Discard';
  const go = $('#btn-allocate');
  go.textContent = !done ? 'Create Invoice'
    : state.synced ? 'Synced to Tally' : 'Sync to Tally';
  go.disabled = !!(done && state.synced);
}

/* --- the create-master dialog ---------------------------------------------
   Closing without creating is a real answer and leaves the line where it was:
   posting on its description, with the offer still standing in the field. The
   sheet never traps you in a master you did not want to make. */
const nmClose = ()=>{ nmDraft = null; $('#nm-dialog').close(); render(); };
$('#nm-x').addEventListener('click', nmClose);
$('#nm-cancel').addEventListener('click', nmClose);
$('#nm-dialog').addEventListener('cancel', e=>{ e.preventDefault(); nmClose(); });
$('#nm-form').addEventListener('submit', e=>{
  e.preventDefault();                          // the form validates itself, in its own words
  nmCommit();
});
$('#nm-create-anyway').addEventListener('click',()=>{
  if(!nmDraft) return;
  nmDraft.ignoreNear=true;
  $('#nm-near').hidden=true;
  $('#nm-save').focus();
});
$('#nm-use-existing').addEventListener('click',()=>{
  const hit=nmDraft?.near, t=nmDraft?.target;
  if(!hit || !t) return;
  const row=rowOfTarget(t);
  if(t.kind==='items' && row){
    row.item=hit.id; row.pred=null; row.predState='';
    row.kind=hit.kind||row.kind; row.rate ||= hit.rate||0; row.tax ||= hit.tax||'';
    if(row.kind!=='service') row.godown ||= hit.godown||'';
    fbRecordLine(row,'item',hit.id);
  }else if((t.kind==='ledgers'||t.kind==='adjustments') && row){
    row.ledger=hit.id; row.pred=null; row.predState='';
    if(t.kind==='ledgers') fbRecordLine(row,'ledger',hit.id);
  }else if(t.kind==='salesLedger'){
    state.salesLedger=hit.id;
    fbRecordSalesLedger(state.customer,hit.id);
  }else if(t.kind==='taxLines'){
    const line=state.taxLines.find(l=>l.id===t.id);
    if(line){ line.taxLedger=hit.id; line.pred=null; line.predState='applied'; }
  }
  const name=hit.name;
  nmDraft=null; $('#nm-dialog').close(); render();
  toast(`Using existing master — ${name}`,'ok');
});

/* --- the company's two switches -------------------------------------------
   Turning one on or off changes which questions the ledger form asks, so an
   open form redraws under it rather than keeping a field the company no longer
   has. Nothing else on the invoice reads these. */
const devFlags = show=>{
  const el = $('#devflags'); if(!el) return;
  el.hidden = show===undefined ? !el.hidden : !show;
  if(!el.hidden){
    $$('#devflags [data-flag]').forEach(i=>i.checked = !!COMPANY[i.dataset.flag]);
    $$('#devflags [data-perm]').forEach(i=>i.checked = !!PERMS[i.dataset.perm]);
  }
};
if(AR_PARAMS.has('dev')) devFlags(true);
document.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.shiftKey && (e.key==='D' || e.key==='d')){ e.preventDefault(); devFlags(); }
});
document.addEventListener('change', e=>{
  const f = e.target.dataset?.flag; if(!f) return;
  COMPANY[f] = e.target.checked;
  if(nmDraft) renderNmDialog();
});
document.addEventListener('change', e=>{
  const p=e.target.dataset?.perm; if(!p) return;
  PERMS[p]=e.target.checked;
  render();
});
/* --- the GST rate details dialog ------------------------------------------
   Opens on top of the ledger being written and closes back into it. Cancelling
   leaves the ledger's details as they were, which for a new ledger is unset —
   and unset is what the required check on that field then refuses. */
document.addEventListener('click', e=>{
  const b = e.target.closest?.('[data-nmstat]');
  if(b && !b.disabled) openStDialog(b.dataset.nmstat);
});
const stClose = ()=>{ stDraft = null; $('#st-dialog').close(); };
$('#st-x').addEventListener('click', stClose);
$('#st-cancel').addEventListener('click', stClose);
$('#st-dialog').addEventListener('cancel', e=>{ e.preventDefault(); stClose(); });
$('#st-form').addEventListener('submit', e=>{
  e.preventDefault();
  if(stCommit()) $('#st-dialog').close();
});
/* A tax type is on or off, and turning one on is what makes its rate field
   exist — so the body redraws rather than the rate hiding in a disabled box. */
document.addEventListener('click', e=>{
  const t = e.target.closest?.('[data-sttype]'); if(!t || !stDraft) return;
  const id = t.dataset.sttype, on = stDraft.data.types.includes(id);
  stDraft.data.types = on ? stDraft.data.types.filter(x=>x!==id)
                          : [...stDraft.data.types, id];
  $('#st-warn').hidden = true;
  renderStDialog();
});
document.addEventListener('input', e=>{
  const k = e.target.dataset?.st; if(!k || !stDraft) return;
  stDraft.data[k] = e.target.value;
  $('#st-warn').hidden = true;
});
document.addEventListener('change', e=>{
  const k = e.target.dataset?.st; if(!k || !stDraft) return;
  stDraft.data[k] = e.target.value;
  $('#st-warn').hidden = true;
  if(k==='cessVal') renderStDialog();
});

/* --- the cost centre allocation dialog ------------------------------------ */
$('#cc-x').addEventListener('click',()=>$('#cc-dialog').close());
$('#cc-cancel').addEventListener('click',()=>$('#cc-dialog').close());
$('#cc-dialog').addEventListener('close',()=>{ ccDraft = null; render(); });

$('#cc-save').addEventListener('click',()=>{
  const d = ccDraft; if(!d || !ccSplitDone({categories:d.categories})) return;
  const slot = ccSlot(d.target); if(!slot) return;
  slot.obj[slot.key]   = {categories:d.categories};
  slot.obj[slot.plain] = '';                    // the split is the answer now
  $('#cc-dialog').close();
  toast('Allocated across '+ccSplitCentres({categories:d.categories}).size+' cost centres','ok');
});

$('#cc-body').addEventListener('input',e=>{
  const f = e.target.dataset.cc; if(f!=='pct' && f!=='amt') return;
  const {row} = ccFind(e.target);
  // the two columns are one number seen twice — whichever you type in leads
  row.pct = f==='pct' ? num(e.target.value)
                      : (ccDraft.amount ? r2(num(e.target.value)/ccDraft.amount*100) : 0);
  ccPatch(e.target.closest('[data-cat]'), e.target);
});

$('#cc-body').addEventListener('change',e=>{
  const f = e.target.dataset.cc; if(f!=='centre' && f!=='category') return;
  const {cat,row} = ccFind(e.target);
  if(f==='centre'){ row.centre = e.target.value; }
  else{
    cat.category = e.target.value;              // the centres below no longer apply
    cat.rows = [blankCcRow()];
  }
  renderCcDialog();
});

$('#cc-body').addEventListener('click',e=>{
  const f = e.target.closest('button')?.dataset.cc; if(!f) return;
  const d = ccDraft;
  if(f==='add-cat'){
    const free = ccCategories().find(g=>!d.categories.some(c=>c.category===g));
    if(free) d.categories.push(blankCcCat(free));
  }else{
    const {cat,row} = ccFind(e.target);
    if(f==='add-row') cat.rows.push(blankCcRow());
    if(f==='del-row'){
      cat.rows = cat.rows.filter(r=>r!==row);
      if(!cat.rows.length) cat.rows = [blankCcRow()];
    }
    if(f==='del-cat'){
      d.categories = d.categories.filter(c=>c!==cat);
      if(!d.categories.length) d.categories = [blankCcCat(ccCategories()[0])];
    }
  }
  renderCcDialog();
});
/* --- field configuration --------------------------------------------------
   A setting, so it commits on Save and not before: every switch here edits a
   draft, and Cancel — or Esc, or the X — throws the draft away. Save stays
   disabled until the draft differs from what is already in force, which is
   also what makes Reset to Default legible: press it on a default sheet and
   Save stays down, because nothing changed. */
let fcDraft = null, fcTab = FIELD_GROUPS[0].id;

const fcSwitch = (on,label,attrs)=>`<button type="button" class="switch" role="switch"
  aria-checked="${on?'true':'false'}" aria-label="${esc(label)}" ${attrs}></button>`;
const fcCount = g=>{
  const c = fcDraft[g.id];
  return c.on ? `${g.fields.filter(f=>c.fields[f.id]).length}/${g.fields.length}` : 'Off';
};

function openFieldConfig(){
  fcDraft = fcClone(fieldConfig);
  renderFcDialog();
  $('#fc-dialog').showModal();
  /* left to itself the dialog focuses the close button, which is the one
     control here that does nothing — start on the group being read instead */
  $(`#fc-nav [data-fc-tab="${fcTab}"]`).focus();
}

function renderFcDialog(){
  $('#fc-nav').innerHTML = FIELD_GROUPS.map(g=>
    `<button type="button" role="tab" data-fc-tab="${g.id}" aria-selected="${g.id===fcTab}">
       ${esc(g.name)}<span class="fcd__n">${fcCount(g)}</span></button>`).join('');

  const g = FIELD_GROUPS.find(x=>x.id===fcTab), c = fcDraft[g.id];
  $('#fc-panel').innerHTML =
    `<div class="fcrow fcrow--master">
       <span class="fcrow__lbl">${esc(g.name)}</span>
       ${fcSwitch(c.on, `Show ${g.name} on the invoice`, 'data-fc="group"')}
     </div>` +
    g.fields.map(f=>`<div class="fcrow${c.on?'':' is-off'}">
       <span class="fcrow__lbl">${esc(f.name)}${
         f.note?`<span class="fcrow__note">${esc(f.note)}</span>`:''}</span>
       ${fcSwitch(c.fields[f.id], f.name, `data-fc="field" data-fid="${f.id}"`)}
     </div>`).join('');

  fcSyncFoot();
}
/* the counts and the Save button are the only things a single switch changes
   outside its own row, so flipping one patches rather than redraws — a redraw
   would take the focus off the switch that was just pressed */
/* Switching a conditional field off while the field that requires it still holds
   a value would retire the rule instead of satisfying it — the invoice would post
   with a document number and no date against it, and nothing would ever say so.
   Turning BOTH off is fine: the trigger's value goes with it, so the pair leaves
   the invoice whole rather than half. */
function fcConflicts(){
  const live = (gid,fid)=>fcDraft[gid].on && fcDraft[gid].fields[fid];
  return FIELD_GROUPS.flatMap(g=>g.fields.filter(f=>f.req &&
      String(state.extra[f.req]??'').trim()!=='' &&
      live(g.id,f.req) && !live(g.id,f.id))
    .map(f=>({field:f, trigger:fieldById(f.req)})));
}

function fcSyncFoot(){
  FIELD_GROUPS.forEach(g=>{
    const el = $(`#fc-nav [data-fc-tab="${g.id}"] .fcd__n`);
    if(el) el.textContent = fcCount(g);
  });
  const clash = fcConflicts();
  const warn = $('#fc-warn');
  warn.hidden = !clash.length;
  if(clash.length) warn.textContent = clash.length===1
    ? `${clash[0].field.name} is required while ${clash[0].trigger.name} has a value. Clear that value first, or leave this field on.`
    : `${clash.length} fields are required by values already entered. Clear those values first, or leave the fields on.`;
  $('#fc-save').disabled = fcSame(fcDraft, fieldConfig) || clash.length>0;
}

$('#btn-field-config').addEventListener('click', openFieldConfig);

$('#fc-nav').addEventListener('click', e=>{
  const btn = e.target.closest('[data-fc-tab]'); if(!btn) return;
  fcTab = btn.dataset.fcTab;
  renderFcDialog();
  $(`#fc-nav [data-fc-tab="${fcTab}"]`).focus();
});

$('#fc-panel').addEventListener('click', e=>{
  const btn = e.target.closest('[data-fc]'); if(!btn) return;
  const c = fcDraft[fcTab];
  if(btn.dataset.fc==='group'){
    c.on = !c.on;
    // the fields keep their answers; the group just stops asking them
    $$('#fc-panel .fcrow:not(.fcrow--master)').forEach(r=>r.classList.toggle('is-off', !c.on));
  }else{
    c.fields[btn.dataset.fid] = !c.fields[btn.dataset.fid];
  }
  btn.setAttribute('aria-checked',
    (btn.dataset.fc==='group' ? c.on : c.fields[btn.dataset.fid]) ? 'true' : 'false');
  fcSyncFoot();
});

$('#fc-reset').addEventListener('click',()=>{ fcDraft = fcDefaults(); renderFcDialog(); });
$('#fc-cancel').addEventListener('click',()=>$('#fc-dialog').close());
$('#fc-x').addEventListener('click',()=>$('#fc-dialog').close());
$('#fc-dialog').addEventListener('close',()=>{ fcDraft = null; render(); });

$('#fc-save').addEventListener('click',()=>{
  fieldConfig = fcClone(fcDraft);
  /* a field that is no longer on the sheet stops being part of the invoice.
     Keeping the value would post something nobody can see, and bring it back
     unannounced the next time the group is switched on. */
  const live = new Set(fcLive().flatMap(g=>g.fields.map(f=>f.id)));
  Object.keys(state.extra).forEach(k=>{
    if(live.has(k)) return;
    delete state.extra[k]; delete state.extraFrom[k];
  });
  render();                    // the close event renders too, but it is queued —
  $('#fc-dialog').close();     // this is the edit, so the sheet changes with it

  const n = fcLive().length;
  toast(n ? `Field configuration saved — ${n} optional group${n===1?'':'s'} on the invoice`
          : 'Field configuration saved — no optional groups on the invoice', 'ok');
});

/* --- the additional fields dialog -----------------------------------------
   Everything the optional groups collect, entered in one place and committed
   in one step. The draft carries the values *and* the on/off state of each
   group, because working through a group is when you find out you do not
   need it — and switching it off there should behave exactly like switching
   it off in Field Configuration, Cancel included. */
let afDraft = null, afTab = null, afOpen = true;   // afOpen: the From Your Invoice card

function openAdditional(){
  const live = fcLive();
  if(!live.length) return;
  afDraft = {values:{...state.extra}, cfg:fcClone(fieldConfig)};
  if(!live.some(g=>g.id===afTab)) afTab = live[0].id;
  $('#af-sub').textContent = byId(MASTERS.voucherTypes,state.voucherType)?.name || 'Sales';
  renderAfDialog();
  $('#af-dialog').showModal();
  $(`#af-nav [data-af-tab="${afTab}"]`)?.focus();
}

/* the invoice's own answers, as chips — the consignee is judged against them
   (is the ship-to the billing address or not?) and cannot be edited here */
function fromYourInvoice(){
  const chip = (label,value)=>`<span class="fyb__chip">${esc(label)}:
    <b class="${value?'':'is-missing'}">${esc(value||'N/A')}</b></span>`;
  const st = id=>byId(MASTERS.states,id)?.plain || '';
  return `<div class="fyb">
    <div class="fyb__head">
      <span class="fyb__ttl">From Your Invoice</span>
      <button type="button" class="fyb__toggle" id="fyb-toggle" aria-expanded="${afOpen}"
              aria-controls="fyb-grid">${afOpen?'Collapse':'Expand'}
        <span class="ico ico-13 ico--muted"><svg width="13" height="13"><use href="#i-caret"/></svg></span>
      </button>
    </div>
    <div class="fyb__grid" id="fyb-grid"${afOpen?'':' hidden'}>
      ${chip('Customer / Customer', byId(MASTERS.customers,state.customer)?.name)}
      ${chip('Billing Address', state.billingAddress)}
      ${chip('GST Treatment', byId(MASTERS.gstTreatments,state.gstTreatment)?.name)}
      ${chip('GSTIN', state.gstin)}
      ${chip('Source of Supply', st(state.sourceState))}
      ${chip('Destination of Supply', st(state.destState))}
    </div>
  </div>`;
}

function afControl(f){
  const v = afDraft.values[f.id] ?? '';
  if(f.type==='date') return `<label class="control">
      <span class="t-value" data-xfd="${f.id}" data-placeholder="${esc(f.ph)}">${v?esc(fmtDate(v)):esc(f.ph)}</span>
      <span class="ico ico-12 ico--muted"><svg width="10.5" height="11.5"><use href="#i-calendar"/></svg></span>
      <input type="date" class="control__date" data-xf="${f.id}" value="${esc(v)}" aria-label="${esc(f.name)}">
    </label>`;
  if(f.type==='select') return `<label class="control">
      <select class="control__select t-value" data-xf="${f.id}" aria-label="${esc(f.name)}">
        ${options(MASTERS[f.list], f.ph, v)}</select>
    </label>`;
  if(f.type==='textarea')
    return `<textarea data-xf="${f.id}" placeholder="${esc(f.ph)}" aria-label="${esc(f.name)}">${esc(v)}</textarea>`;
  return `<label class="control">
      <input class="control__input t-value" type="text" data-xf="${f.id}" value="${esc(v)}"
             placeholder="${esc(f.ph)}"${f.mode?` inputmode="${f.mode}"`:''}>
    </label>`;
}

function renderAfDialog(){
  const live = fcLive(afDraft.cfg);
  /* a group switched off in this dialog leaves the rail, so the tab has to
     move somewhere — but only once the switch is saved, or the panel would
     vanish under the hand that switched it */
  const nav = live.some(g=>g.id===afTab) ? live : [...live, FIELD_GROUPS.find(g=>g.id===afTab)];
  const owing = new Set(afProblems().map(p=>p.group.id));
  $('#af-nav').innerHTML = nav.map(g=>
    `<button type="button" role="tab" data-af-tab="${g.id}" aria-selected="${g.id===afTab}">
       ${esc(g.name)}${owing.has(g.id)
         ? `<span class="afd__dot" role="img" aria-label="has missing fields"></span>` : ''}</button>`).join('');
  renderAfPanel();
}

function renderAfPanel(){
  const g = FIELD_GROUPS.find(x=>x.id===afTab), c = afDraft.cfg[g.id];
  const fields = g.fields.filter(f=>c.fields[f.id]);
  $('#af-panel').innerHTML = fromYourInvoice() + `
    <div class="afg">
      <h3 class="afg__ttl">${esc(g.name)}</h3>
      <span class="afg__switch">${c.on?'Disable all':'Enable all'}
        <button type="button" class="switch" role="switch" aria-checked="${c.on}" id="af-group"
                aria-label="${c.on?'Disable':'Enable'} ${esc(g.name)}"></button></span>
    </div>
    <div class="afd__fields${c.on?'':' is-off'}">
      ${fields.map(f=>`<div class="field${f.wide?' field--wide':''}" data-xfield="${f.id}">
        <p class="t-label">${esc(f.name)}</p>
        ${afControl(f)}
        ${f.note?`<p class="field__note">${esc(f.note)}</p>`:''}
        <p class="field__error"></p>
      </div>`).join('')}
    </div>`;
  afCheck();
}

/* `req` fields are mandatory only in the company of the field that names them.
   One rule, two callers: the dialog runs it over its draft to decide whether
   Save is allowed, and the sheet runs it over committed state so an unfinished
   pair can be named outside without opening anything. */
function reqProblems(values, cfg){
  return fcLive(cfg).flatMap(g=>g.fields.filter(f=>f.req &&
      String(values[f.req]??'').trim()!=='' &&
      String(values[f.id]??'').trim()==='')
    .map(f=>({group:g, field:f, trigger:fieldById(f.req)})));
}
const afProblems    = ()=>reqProblems(afDraft.values, afDraft.cfg);
const extraProblems = ()=>reqProblems(state.extra, fieldConfig);
function afCheck(){
  const bad = afProblems();
  const here = new Set(bad.filter(p=>p.group.id===afTab).map(p=>p.field.id));
  $$('#af-panel [data-xfield]').forEach(el=>{
    const f = fieldById(el.dataset.xfield);
    const on = here.has(f.id);
    el.classList.toggle('is-invalid', on);
    if(on) el.querySelector('.field__error').textContent = `Required once ${f.req && fieldById(f.req).name} is filled.`;
  });
  const warn = $('#af-warn');
  warn.hidden = !bad.length;
  /* the same sentence the sheet uses. Which sections they are in is the rail's
     job now, so the band does not have to list them */
  if(bad.length) warn.textContent =
    `${bad.length} mandatory field${bad.length===1?'':'s'} missing`;

  /* the rail marks itself as fields are settled, without a full re-render that
     would take the caret out of whatever is being typed into */
  const owing = new Set(bad.map(p=>p.group.id));
  $$('#af-nav [data-af-tab]').forEach(tab=>{
    const on = owing.has(tab.dataset.afTab);
    const dot = tab.querySelector('.afd__dot');
    if(on && !dot) tab.insertAdjacentHTML('beforeend',
      '<span class="afd__dot" role="img" aria-label="has missing fields"></span>');
    if(!on && dot) dot.remove();
  });

  $('#af-save').disabled = bad.length>0;
}

$('#btn-add-details').addEventListener('click', openAdditional);

$('#af-nav').addEventListener('click', e=>{
  const btn = e.target.closest('[data-af-tab]'); if(!btn) return;
  afTab = btn.dataset.afTab;
  renderAfDialog();
  $(`#af-nav [data-af-tab="${afTab}"]`).focus();
});

$('#af-panel').addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  if(btn.id==='fyb-toggle'){ afOpen = !afOpen; renderAfPanel(); $('#fyb-toggle').focus(); return; }
  if(btn.id==='af-group'){
    const c = afDraft.cfg[afTab];
    c.on = !c.on;
    renderAfPanel();
    $('#af-group').focus();
  }
});

$('#af-panel').addEventListener('input', e=>{
  const id = e.target.dataset.xf; if(!id) return;
  afDraft.values[id] = e.target.value;
  afCheck();
});
$('#af-panel').addEventListener('change', e=>{
  const id = e.target.dataset.xf; if(!id) return;
  afDraft.values[id] = e.target.value;
  if(e.target.type==='date'){
    const disp = $(`#af-panel [data-xfd="${id}"]`);
    disp.textContent = e.target.value ? fmtDate(e.target.value) : disp.dataset.placeholder;
  }
  /* the ship-to on a sales is one of our own locations, so naming it
     answers the five fields under it — overwriting only what is still blank */
  if(id==='consigneeName'){
    const b = byId(MASTERS.branches, e.target.value);
    if(b){
      const fill = (k,v)=>{ if(!String(afDraft.values[k]??'').trim()) afDraft.values[k] = v; };
      fill('consigneeAddress', b.address);
      fill('consigneeState',   b.state);
      fill('consigneeCountry', 'IN');
      fill('consigneePincode', b.pin);
      fill('consigneeGstin',   b.gstin);
      fill('placeOfSupply',    b.state);
      renderAfPanel();
      return;
    }
  }
  afCheck();
});

$('#af-cancel').addEventListener('click',()=>$('#af-dialog').close());
$('#af-x').addEventListener('click',()=>$('#af-dialog').close());
$('#af-dialog').addEventListener('close',()=>{ afDraft = null; render(); });

$('#af-save').addEventListener('click',()=>{
  if(afProblems().length) return;
  fieldConfig = fcClone(afDraft.cfg);
  /* a value the user has changed is theirs now, whatever the document said —
     the standing has to move with the edit or the sheet keeps crediting the
     invoice for an answer the user typed over */
  Object.keys(afDraft.values).forEach(k=>{
    if(state.extraFrom[k]==='invoice' && afDraft.values[k]!==state.extra[k]) delete state.extraFrom[k];
  });
  state.extra = {...afDraft.values};
  // a group or field switched off here drops its value, exactly as it does in
  // Field Configuration — nothing invisible rides along on the posting
  const live = new Set(fcLive().flatMap(g=>g.fields.map(f=>f.id)));
  Object.keys(state.extra).forEach(k=>{
    if(!live.has(k) || String(state.extra[k]).trim()===''){
      delete state.extra[k]; delete state.extraFrom[k];
    }
  });
  render();
  $('#af-dialog').close();
  const n = extraFilled();
  toast(n ? `${n} additional field${n===1?'':'s'} saved` : 'Additional fields cleared','ok');
});

$('#btn-discard').addEventListener('click',()=>{
  /* Nothing is lost once the invoice has posted, so nothing is asked. The warning
     is about unsaved work, and after the voucher there is none. */
  if(state.allocated) return reset();
  if(confirm('Discard this invoice? All entered data will be lost.')) reset();
});

function reset(){
  /* Masters drafted on an invoice belong to that invoice until it posts, so a new
     invoice starts from the book as it was — otherwise the second invoice of the day
     is choosing from masters the first one only proposed. Sweep before the
     state goes, because the state is the only record of what was added. */
  state.newMasters.slice().reverse().forEach(m=>{
    const list = NM_LIST[m.kind]?.(); if(!list) return;
    const i = list.findIndex(x=>x.id===m.id);
    if(i>=0) list.splice(i,1);
  });
  /* The party's outstandings go back the same way and for the same reason. A
     reference this invoice wrote is removed; a reference it settled gets its
     pending returned. Undone in reverse so two rows against one reference add
     back to what they took off. */
  state.newRefs.slice().reverse().forEach(x=>{
    const book = MASTERS.billRefs[x.customer]; if(!book) return;
    const i = book.findIndex(r=>r.id===x.id);
    if(i>=0) book.splice(i,1);
  });
  state.knockedRefs.slice().reverse().forEach(x=>{
    const hit = MASTERS.billRefs[x.customer]?.find(r=>r.id===x.id);
    if(hit) hit.pending = r2(hit.pending + x.by);
  });
  /* A party this invoice invented has just been swept out of the customers; the
     empty list left under its id would outlive the master it belongs to. */
  Object.keys(MASTERS.billRefs).forEach(id=>{
    if(!MASTERS.billRefs[id].length) delete MASTERS.billRefs[id];
  });
  clearDraft();                  // discarding the draft is what empties the cache
  state = freshState();
  nmDraft = null;
  refreshItemsList(); refreshCustomerList(); refreshSalesLedgerList();
  $('#voucher-ref').textContent = '';
  /* The next sheet is laid out with the bundled figures again rather than left
     blank. Blank is the truthful answer — but the upload that used to refill it
     is gone, so a blank reset would strand the prototype on an empty form with
     no way back to the populated screens short of a reload. */
  applyExtraction(null);
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ============================================================================
   11. BOOT
   ==========================================================================*/
function boot(){
  $('[data-bind="branch"]').innerHTML           = options(MASTERS.branches,'Select Location','');
  $('[data-bind="voucherType"]').innerHTML      = options(MASTERS.voucherTypes,'Select Voucher Type','sales');
  $('[data-bind="gstTreatment"]').innerHTML     = options(MASTERS.gstTreatments,'Select GST Treatment','');
  $('[data-bind="sourceState"]').innerHTML      = options(MASTERS.states,'Select Source of Supply','');
  $('[data-bind="destState"]').innerHTML        = options(MASTERS.states,'Select Destination of Supply','');

  /* Before anything reads a prediction. The loop is the book's memory of what
     it has been told, so it is older than this invoice and outlives it — it is
     loaded here and never cleared by `reset()`, which is what "the next invoice"
     depends on meaning. */
  fbLoad();
  state = freshState();
  /* these three are rebuilt rather than written once, because an invoice can add to
     any of them — and they read their selection off state, so they come after
     freshState rather than before it */
  refreshItemsList();
  refreshCustomerList();
  refreshSalesLedgerList();
  /* A draft outlives the tab it was opened in: it is held until the invoice is
     created or the draft is discarded, and closing the window is neither. */
  if(loadDraft()){
    render();
    toast('Draft restored');
  }else{
    /* No draft, so the sheet is laid out with the bundled figures. This is the
       half of the old extraction that survived the document pane — the same
       values, minus the pipeline that used to claim it read them off paper. */
    applyExtraction(null);
  }
}

/* ============================================================================
   EMBED MODE — this sheet, hosted inside the Unified Inbox
   ----------------------------------------------------------------------------
   The inbox already supplies the furniture around a sales invoice: the source
   document on the left, the title and the cohort pager above, and Convert /
   Delete / Save draft / Approve & Next below. So when this file is loaded with
   ?embed=1 it drops its own topbar and renders the sheet alone, and the two
   halves talk over postMessage.

   Nothing above this block knows it is embedded. Opening index.html directly
   behaves exactly as it did — this is additive, and the guard is the first
   line of it.

   The shape is the AP sheet's, deliberately: two sheets in one inbox that
   answer different protocols would be two things to remember. What differs is
   what the two sheets are, and there is one difference worth naming here.

   The AP sheet owns a document pane, because a bill is *read off* a supplier's
   paper. This one has none — standalone, an invoice is raised rather than read,
   and the form is the whole workspace. Under the inbox there IS a source
   document, so the inbox keeps its own preview beside the sheet and the sheet
   stays what it is. That is why there is no `preview` message here and no
   `--topbar-h` sticky-offset fix for a pane that does not exist.

   The inbox sends:
     seed       {customerName, invoiceNo, invoiceDate, lines, …} — a SAMPLE-
                shaped document; the real extraction pipeline runs on it, so
                every prediction, HSN call and threshold test is the same one
                the standalone sheet makes.
     approve    press Create Invoice
     saveDraft  hold the draft against this inbox item
     discard    press Discard

   This sheet sends back:
     ready      the sheet is up and listening
     totals     after every render, so the inbox header can show the figure
     dirty      something was edited — the inbox marks the item unsaved
     approved   the invoice was created
   ========================================================================== */
(function(){
  const params = AR_PARAMS;
  if(params.get('embed') !== '1') return;

  /* --- one live engine at a time -----------------------------------------
     Only the newest evaluation drives the sheet; see arLive() at the top of
     this file for why there is more than one. Without this, paging through
     four invoices left four engines alive on the same ids in the same
     document, and every one of them answered the next seed. */
  const current = arLive;

  /* A draft belongs to the inbox item it was opened from, not to the browser.
     One shared key would restore item 2041's draft over item 2042's sheet. */
  const itemId = params.get('item') || '';
  if(itemId) DRAFT_KEY = 'aia.ar.draft.v2:' + itemId;

  const post = (type, payload) =>
    parent.postMessage({source:'aia-ar', type, payload}, '*');

  /* --- what the inbox already draws, this sheet stops drawing -------------
     Only the topbar. It held the title and Discard / Create Invoice, and the
     inbox supplies both — the title with the cohort pager above, the actions
     in the footer below. */
  /* These rules have to out-rank the sheet's own stylesheet in both the places
     this block runs. Loaded into the inbox's document that stylesheet is
     scoped — every selector sits under .ar-sheet — so a bare `.topbar` is a
     weaker selector than `.ar-sheet .topbar` and lost, and `:root{--topbar-h}`
     was shadowed outright by the `--topbar-h` the wrapper itself declares.
     Hence !important on the hide, and the wrapper named alongside :root for
     the variable. In an iframe there is no wrapper and the :root half still
     does the work, so one block covers both. */
  const style = document.createElement('style');
  style.textContent = `
    .topbar{display:none!important}
    /* Nothing here is sticky under the topbar — there is no document pane to
       offset — but the variable is read in a handful of measurements, and a
       51px allowance for a bar that is not drawn is 51px of nothing. */
    :root,.ar-sheet{--topbar-h:0px}
    /* Two surfaces are pinned to the bottom of the viewport — the line-item
       bulk bar and the toast stack — from when this sheet owned the window.
       That band is the inbox's footer now, so both clear it by the footer's
       own measured height (published as --inbox-footer-h by the Footer
       component). The 24 / 16 / 93 are the sheet's own offsets, kept and added
       to rather than replaced, so the spacing it was tuned with survives. */
    .ar-sheet .bulkbar{bottom:calc(24px + var(--inbox-footer-h, 0px))}
    .ar-sheet .toasts{bottom:calc(16px + var(--inbox-footer-h, 0px))}
    .ar-sheet.has-bulkbar .toasts{bottom:calc(93px + var(--inbox-footer-h, 0px))}
  `;
  document.head.append(style);

  /* --- resolving what the inbox names ------------------------------------
     The inbox holds parties and ledgers as the names printed on a document;
     this sheet holds them as masters with ids. Matching happens here rather
     than in the inbox because the book is here — the inbox has no way to know
     which of these names this company actually keeps a master for.

     Nothing is forced. A name with no master resolves to '', which is a state
     the sheet is built for: several of its own sample lines arrive with the
     ledger cell empty and offer to create one. */
  const norm = s => String(s||'').trim().toLowerCase();
  const byName = (list, name) => {
    const want = norm(name);
    if(!want) return null;
    return list.find(x => norm(x.name) === want)
        || list.find(x => norm(x.name).startsWith(want))
        || null;
  };

  /* --- seeding ----------------------------------------------------------- */
  /* The inbox hands over what its extraction read.

     Built field by field rather than as `{...SAMPLE, ...doc}`, which is how the
     AP sheet does it and is wrong for this one. The bills sheet's sample is a
     bill whose every field the inbox also supplies, so a spread is a total
     replacement. This sheet's sample is a *demonstration* — it carries a
     customer PO number, a consignee, a delivery note, a narration about a
     desktop refresh — and an inbox invoice supplies none of those. Spread, they
     survive: the screen printed PO/ANV/2026/0442 on an oil invoice from a
     customer who never raised it, which is an invented fact on a voucher about
     to be posted.

     So only three values carry over, and each because it is the company's
     rather than the document's: which of our branches supplies, that a sale is
     a sale, and the sales ledger it posts to when the customer master names
     none. Everything else is the inbox's or is empty. */
  function seed(doc){
    if(!doc) return;
    const base = SAMPLE;

    /* The customer, resolved against this book. A match is picked the way the
       user would have picked it and everything downstream — address, GSTIN,
       treatment, their state, their credit period — is read off the master.
       No match leaves the field empty and hands the printed header to
       `printedCustomer`, which is the state this sheet already keeps for
       exactly this: the evidence a new customer master would be built from. */
    const customerMatch = matchCustomer({name:doc.customerName, gstin:doc.customerGstin});
    const customer = customerMatch ? byId(MASTERS.customers, customerMatch.id) : null;

    const lines = Array.isArray(doc.lines) && doc.lines.length
      ? doc.lines.map(l => ({
          text:   l.text || '',
          hsn:    l.hsn || '',
          amount: l.amount,
          gst:    l.gst == null ? 18 : l.gst,
          route:  'ledger',
          /* Income first: a sales invoice's own lines are income heads, and
             the sales ledger is the one the voucher posts against, not the one
             a line names. */
          ledger: (byName(MASTERS.incomeLedgers, l.ledger)
                || byName(MASTERS.salesLedgers,  l.ledger)
                || {}).id || ''
        }))
      : base.lines;

    SAMPLE = {
      /* the company's, not the document's */
      branch:          base.branch,
      voucherType:     base.voucherType,
      salesLedger:     base.salesLedger,

      customer:        customer ? customer.id : '',
      invoiceDate:     doc.invoiceDate || '',
      narration:       doc.narration || '',
      /* Blank, not the sample's. A cost centre class is a decision about how
         this voucher is split, and the inbox states it on `context.form` if it
         has one — see the bridge below. */
      costCentreClass: '',
      customerPoNo:    doc.customerPoNo || '',
      /* The optional groups are switched on by what the document carries. An
         inbox invoice carries none of them, so none of them appear — rather
         than the sample's consignee and delivery note appearing on every
         invoice the queue opens. */
      extra:           doc.extra || {},
      lines
    };
    applyExtraction(null);

    /* A few values the extraction cannot reach on its own, because it reads
       them off a master this book may not hold. */
    if(!customer && doc.customerName){
      state.printedCustomer = {
        name:  doc.customerName,
        gstin: doc.customerGstin || '',
        pan:   doc.customerPan || ''
      };
      /* And offered as a master this invoice would add, rather than left as a
         blank required field with nothing to say about itself. This is the
         sheet's own shape for an unmatched party — a proposal on the field,
         carrying its reason, with the `+` beside it that writes it — and the
         alternative was a Select Customer the reader has to work out for
         themselves is unanswerable. */
      state.customerSuggestion = draftCustomer(state.printedCustomer);
      state.customerPredReason =
        'the invoice names this customer, and this book has no master for them';
      refreshCustomerList();
    }
    /* The due date is the document's, not the credit period's, when the
       document states one; and the place of supply is a column in the upload
       rather than something derivable from a GSTIN — a row whose GSTIN is
       missing still states which state it went to. */
    if(doc.dueDate)        state.dueDate   = doc.dueDate;
    if(doc.placeOfSupply)  state.destState = doc.placeOfSupply;
    if(doc.voucherNo)      state.voucherNo = doc.voucherNo;

    /* Item Mode bills stock, and stock is quantities, units and rates. An
       inbox extraction carries a description and an amount — that is a ledger
       line, and Accounting Mode is the view built for it. Switched with the
       sheet's own setMode so the fold happens as it does for a user, rather
       than by assigning state.mode and leaving the two tables disagreeing. */
    if(state.customer || state.customerSuggestion) runPredictions();
    const hasStock = state.items.some(r => r.item || num(r.qty) || num(r.rate));
    if(!hasStock) setMode('accounting');

    render();
  }

  /* --- render → totals --------------------------------------------------- */
  /* Wrapped rather than called from each site: every path that changes a
     figure already ends in render(), so this is the one place the inbox can
     be told without hunting for the others. */
  const innerRender = render;
  render = function(){
    const calc = innerRender.apply(this, arguments);
    if(calc) post('totals', {
      subTotal: calc.subTotal, gstTotal: calc.gstTotal,
      dedTotal: calc.dedTotal, adjTotal: calc.adjTotal, grand: calc.grand,
      voucherNo: state.voucherNo,
      invoiceNo: state.voucherNo,
      customer: (byId(MASTERS.customers,state.customer)
              || state.customerSuggestion
              || state.printedCustomer || {}).name || ''
    });
    return calc;
  };

  /* --- inbound ----------------------------------------------------------- */
  addEventListener('message', (ev)=>{
    if(!current()) return;   /* superseded: the seed is not ours to answer */
    const msg = ev.data;
    /* `aia-inbox-ar`, not `aia-inbox`. The two sheets are siblings built from
       the same file, so this listener and the bills sheet's are the same
       listener on the same document — and for as long as a route switch is
       settling, both engines are in it. Under one shared name each answered
       the other's seed: the bills engine ran an invoice through its own
       applyExtraction against a DOM that had been unmounted under it, and
       threw on the first node it reached for. A name per sheet is what makes a
       message addressed rather than broadcast.

       The generation gate above is the other half and not a substitute: it
       stops a *superseded* engine, and during the swap there is a moment when
       both are current. */
    if(ev.source!==parent||ev.origin!==location.origin||!msg || msg.source !== 'aia-inbox-ar') return;
    if(msg.type === 'seed')      seed(msg.payload);
    if(msg.type === 'approve')   $('#btn-allocate')?.click();
    if(msg.type === 'saveDraft'){ saveDraft(); toast('Draft saved'); }
    if(msg.type === 'discard')   $('#btn-discard')?.click();
    /* A hand-raised invoice: the sheet's own fresh state, without the sample
       figures reset() lays back in. There is no document to seed it from. */
    if(msg.type === 'blank'){
      state = freshState(); nmDraft = null;
      refreshItemsList(); refreshCustomerList(); refreshSalesLedgerList();
      render();
    }
  });

  /* An edit anywhere in the sheet is an edit — the inbox only needs to know
     that one happened, not what it was. */
  let dirty = false;
  const markDirty = ()=>{ if(!current()) return; if(!dirty){ dirty = true; post('dirty'); } };
  addEventListener('input',  markDirty, true);
  addEventListener('change', markDirty, true);

  /* Create Invoice is the sheet's own button; the inbox's Approve presses it,
     and either way the inbox is told the invoice was made. */
  document.addEventListener('click', (ev)=>{
    if(!current()) return;
    if(ev.target.closest('#btn-allocate')) setTimeout(()=>{
      if(state.allocated) post('approved', {voucherNo: state.voucherNo});
    }, 0);
  }, true);

  /* Announced once. Posting on both `load` and immediately seeded the sheet
     twice, which ran the extraction twice and stacked two identical toasts. */
  if(document.readyState === 'complete') queueMicrotask(()=>{ if(current()) post('ready'); });
  else addEventListener('load', ()=>{ if(current()) post('ready'); }, {once:true});
})();


/* PRD v2 bridge: local draft state and reviewed values belong to an Inbox item. */
(function(){
 if(AR_PARAMS.get('inboxv2')!=='1')return;
 /* Same generation gate — see arLive() at the top of this file. A superseded
    bridge must stop writing snapshots most of all: it would keep pushing the
    previous invoice's form onto whichever item is open now. */
 const current = arLive;
 let context=null, sent='', readyForSnapshots=false;
 const post=(type,payload)=>parent.postMessage({source:'aia-ar-v2',type,payload},location.origin);
 /* The invoice's lines, as the inbox's flat `form.lines` — one row per thing
    billed, whichever table it is sitting in. Sales credits, so `cr` carries
    the amount and `dr` is zero; the AP bridge is the mirror of this. */
 const snapLines=()=>{
  const out=[];
  const salesName=byId(MASTERS.salesLedgers,state.salesLedger)?.name||'';
  if(state.mode==='item')
   state.items.filter(r=>num(r.qty)*num(r.rate)||num(r.amountOverride)).forEach(r=>{
    const amt=num(r.amountOverride)||r2(num(r.qty)*num(r.rate));
    out.push({description:r.description||'',ledger:salesName,amount:amt,dr:0,cr:amt,costCentre:r.costCentre||''});
   });
  state.ledgers.filter(r=>num(r.amount)).forEach(r=>{
   const amt=num(r.amount);
   out.push({description:r.description||'',ledger:ledgerNameOf(r.ledger)||salesName,amount:amt,dr:0,cr:amt,costCentre:r.costCentre||''});
  });
  return out;
 };
 const snapshot=()=>{
  if(!current())return;
  if(!readyForSnapshots||!context)return;
  const calc=compute();
  const party=(byId(MASTERS.customers,state.customer)||state.customerSuggestion||state.printedCustomer||{}).name||'';
  const payload={
   sheet:JSON.parse(JSON.stringify({...state,__drafted:state.newMasters.map(m=>({kind:m.kind,master:(NM_LIST[m.kind]?.()||[]).find(x=>x.id===m.id)})).filter(d=>d.master)})),
   form:{
    gst:byId(MASTERS.branches,state.branch)?.name||'',
    voucherType:byId(MASTERS.voucherTypes,state.voucherType)?.name||state.voucherType,
    voucherNo:state.voucherNo||previewVoucherNo(),
    /* Our own invoice number. On a sale there is no supplier's equivalent —
       the field the AP sheet fills from the vendor's paper is the number this
       voucher is about to be given, so the two agree on one name. */
    invoiceNo:state.voucherNo||previewVoucherNo(),
    date:state.invoiceDate,
    due:state.dueDate,
    party,
    costClass:state.costCentreClass,
    costCentre:state.invoiceCostCentre,
    narration:state.narration,
    lines:snapLines()
   },
   amount:calc.grand};
  const key=JSON.stringify(payload);if(key!==sent){sent=key;post('snapshot',payload);}
 };
 const originalExtract=applyExtraction;
 applyExtraction=function(){
  const result=originalExtract.apply(this,arguments);
  if(context){
   if(context.sheet){for(const d of context.sheet.__drafted||[]){const list=NM_LIST[d.kind]?.();if(list&&d.master&&!list.some(x=>x.id===d.master.id))list.push(d.master);}state=JSON.parse(JSON.stringify(context.sheet));state.allocated=false;delete state.reverseCharge;if(state.voucherType==='sales-rcm')state.voucherType='sales';if(state.salesLedger==='led-sales-rcm')state.salesLedger='led-sales-local';refreshCustomerList();refreshItemsList();refreshSalesLedgerList();}
   else if(context.manual){state=freshState();state.document={name:context.fileName};state.voucherType='sales';state.voucherNo=context.form?.voucherNo||'';}
   else if(context.form){
    state.voucherNo=context.form.voucherNo;state.invoiceDate=context.form.date;state.dueDate=context.form.due;state.costCentreClass=context.form.costClass;state.invoiceCostCentre=context.form.costCentre;
   }
   readyForSnapshots=true;render();snapshot();
  }
  return result;
 };
 /* The sheet flags one state with a class on document.body — has-bulkbar, so
    the toast stack steps up rather than covering Apply. Its rule is written as
    `body.has-bulkbar`, and under the inbox the sheet's CSS is scoped, which
    rewrites that to `.ar-sheet.has-bulkbar` — a selector a class on <body> can
    never satisfy.

    Mirroring onto the wrapper is the fix, and it is done with an observer
    rather than by wrapping the function that sets the flag: the list of flags
    is upstream's to grow, and the next one added there should work here
    without anyone remembering this file exists. Body keeps its own class, so
    standalone behaviour is untouched. */
 (function(){
  const wrap = document.querySelector('.ar-sheet');
  if(!wrap) return;   /* not embedded — `body.x` matches body, as written */
  const sync = () => ['has-bulkbar'].forEach(c =>
   wrap.classList.toggle(c, document.body.classList.contains(c)));
  sync();
  const obs = new MutationObserver(()=>{
   /* Disconnects itself once superseded, rather than leaving one observer per
      invoice ever opened all writing the same class. */
   if(!current()){ obs.disconnect(); return; }
   sync();
  });
  obs.observe(document.body, {attributes:true, attributeFilter:['class']});
 })();
 const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);queueMicrotask(snapshot);return result;};
 const originalAllocate=allocateNow;allocateNow=function(){const result=originalAllocate.apply(this,arguments);snapshot();post('approved',{voucherNo:state.voucherNo});return result;};
 addEventListener('message',ev=>{
  if(!current())return;
  /* Addressed to this sheet, for the reason given on the embed block's
     listener above. */
  if(ev.source!==parent||ev.origin!==location.origin||ev.data?.source!=='aia-inbox-ar-v2')return;
  const {type,payload}=ev.data;
  if(type==='context'){
   context=payload;
   MASTERS.branches.forEach(b=>{b.name=b.name.replace('Karbon Business',context.company);});
   $('[data-bind="branch"]').innerHTML=options(MASTERS.branches,'Select Location',state.branch);
   refreshCustomerList();
   const style=document.createElement('style');style.textContent='.inbox-edited{color:#8a5300;font-size:11px}';document.head.append(style);
  }
 });
 document.addEventListener('change',ev=>{if(!current())return;post('edited',{field:ev.target.dataset.bind||'lines'});const field=ev.target.closest('.field');if(field&&!field.querySelector('.inbox-edited')){const tag=document.createElement('span');tag.className='inbox-edited';tag.textContent='Edited by you';field.append(tag);}setTimeout(snapshot,0);});
})();

boot();

})();

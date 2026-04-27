// Static country data keyed by Natural Earth GeoJSON "NAME" field.
// GDP in billion USD (approx), population in millions, stability 0–100.

export interface CountryInfo {
  code:        string     // ISO 3166-1 alpha-2, used for flagcdn.com URLs
  capital:     string
  populationM: number
  gdpB:        number
  govType:     string[]  // e.g. ['DEMOCRACY','FEDERAL']
  stability:   number    // 0–100
  industries:  Array<{ label: string; pct: number }>
  queries:     string[]  // region-specific suggested queries
}

const COUNTRY_DATA: Record<string, CountryInfo> = {
  'United States of America': {
    code: 'US', capital: 'Washington D.C.', populationM: 335, gdpB: 27360,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 72,
    industries: [{ label: 'Services', pct: 77 }, { label: 'Industry', pct: 19 }, { label: 'Agriculture', pct: 4 }],
    queries: ['美中關係走向', '選舉政治影響', '軍事部署動態', '科技出口管制'],
  },
  'China': {
    code: 'CN', capital: 'Beijing', populationM: 1412, gdpB: 17700,
    govType: ['SINGLE-PARTY STATE', 'COMMUNIST'], stability: 68,
    industries: [{ label: 'Industry', pct: 39 }, { label: 'Services', pct: 54 }, { label: 'Agriculture', pct: 7 }],
    queries: ['台海緊張局勢', '半導體戰略', '一帶一路動態', '外交政策走向'],
  },
  'Russia': {
    code: 'RU', capital: 'Moscow', populationM: 144, gdpB: 2240,
    govType: ['AUTHORITARIAN', 'FEDERAL'], stability: 42,
    industries: [{ label: 'Energy', pct: 36 }, { label: 'Industry', pct: 32 }, { label: 'Services', pct: 28 }, { label: 'Agriculture', pct: 4 }],
    queries: ['烏克蘭戰線動態', '制裁影響評估', '能源武器化', '核威懾態勢'],
  },
  'Ukraine': {
    code: 'UA', capital: 'Kyiv', populationM: 44, gdpB: 161,
    govType: ['DEMOCRACY', 'ACTIVE CONFLICT'], stability: 22,
    industries: [{ label: 'Agriculture', pct: 26 }, { label: 'Industry', pct: 31 }, { label: 'Services', pct: 43 }],
    queries: ['前線戰況', '西方援助規模', '戰後重建計畫', '難民動向'],
  },
  'Taiwan': {
    code: 'TW', capital: 'Taipei', populationM: 24, gdpB: 760,
    govType: ['DEMOCRACY', 'HIGH TENSION'], stability: 61,
    industries: [{ label: 'Tech/Semi', pct: 45 }, { label: 'Manufacturing', pct: 30 }, { label: 'Services', pct: 23 }, { label: 'Agriculture', pct: 2 }],
    queries: ['半導體供應鏈', '兩岸軍事動態', '外交承認現況', '半導體出口管制'],
  },
  'Japan': {
    code: 'JP', capital: 'Tokyo', populationM: 125, gdpB: 4230,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 82,
    industries: [{ label: 'Services', pct: 70 }, { label: 'Industry', pct: 27 }, { label: 'Agriculture', pct: 3 }],
    queries: ['日本防衛政策', '日中關係', '核電政策走向', '人口下降影響'],
  },
  'South Korea': {
    code: 'KR', capital: 'Seoul', populationM: 52, gdpB: 1709,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 74,
    industries: [{ label: 'Industry', pct: 38 }, { label: 'Services', pct: 58 }, { label: 'Agriculture', pct: 4 }],
    queries: ['朝鮮半島局勢', '韓美同盟動態', '半導體競爭', '薩德部署'],
  },
  'North Korea': {
    code: 'KP', capital: 'Pyongyang', populationM: 26, gdpB: 18,
    govType: ['TOTALITARIAN', 'COMMUNIST'], stability: 31,
    industries: [{ label: 'Military', pct: 40 }, { label: 'Industry', pct: 35 }, { label: 'Agriculture', pct: 25 }],
    queries: ['核武試驗動態', '彈道導彈發射', '對外糧食援助', '俄朝軍事合作'],
  },
  'Germany': {
    code: 'DE', capital: 'Berlin', populationM: 84, gdpB: 4430,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 80,
    industries: [{ label: 'Industry', pct: 30 }, { label: 'Services', pct: 68 }, { label: 'Agriculture', pct: 2 }],
    queries: ['德國能源轉型', '歐洲防衛角色', '工業競爭力', '移民政策'],
  },
  'France': {
    code: 'FR', capital: 'Paris', populationM: 68, gdpB: 3050,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 71,
    industries: [{ label: 'Services', pct: 78 }, { label: 'Industry', pct: 19 }, { label: 'Agriculture', pct: 3 }],
    queries: ['核威懾政策', '非洲影響力', '歐盟領導地位', '社會動盪'],
  },
  'United Kingdom': {
    code: 'GB', capital: 'London', populationM: 68, gdpB: 3090,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 75,
    industries: [{ label: 'Services', pct: 80 }, { label: 'Industry', pct: 17 }, { label: 'Agriculture', pct: 3 }],
    queries: ['脫歐後貿易', '英美特殊關係', '北愛爾蘭問題', '核力量更新'],
  },
  'India': {
    code: 'IN', capital: 'New Delhi', populationM: 1430, gdpB: 3730,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 60,
    industries: [{ label: 'Services', pct: 49 }, { label: 'Industry', pct: 28 }, { label: 'Agriculture', pct: 23 }],
    queries: ['中印邊境', '印巴緊張', 'G20戰略角色', '科技製造崛起'],
  },
  'Pakistan': {
    code: 'PK', capital: 'Islamabad', populationM: 231, gdpB: 341,
    govType: ['REPUBLIC', 'POLITICAL INSTABILITY'], stability: 28,
    industries: [{ label: 'Agriculture', pct: 22 }, { label: 'Industry', pct: 20 }, { label: 'Services', pct: 58 }],
    queries: ['核武安全', '塔利班關係', '軍政關係', '經濟危機'],
  },
  'Iran': {
    code: 'IR', capital: 'Tehran', populationM: 88, gdpB: 401,
    govType: ['THEOCRACY', 'AUTHORITARIAN'], stability: 33,
    industries: [{ label: 'Energy', pct: 35 }, { label: 'Industry', pct: 34 }, { label: 'Services', pct: 27 }, { label: 'Agriculture', pct: 4 }],
    queries: ['核計畫進展', '對外代理人網路', '制裁規避', '以伊衝突'],
  },
  'Israel': {
    code: 'IL', capital: 'Jerusalem', populationM: 10, gdpB: 509,
    govType: ['DEMOCRACY', 'ACTIVE CONFLICT'], stability: 40,
    industries: [{ label: 'Tech', pct: 38 }, { label: 'Industry', pct: 27 }, { label: 'Services', pct: 32 }, { label: 'Agriculture', pct: 3 }],
    queries: ['加薩衝突', '地區聯盟動態', '核武模糊政策', '伊朗威脅'],
  },
  'Palestine': {
    code: 'PS', capital: 'Ramallah', populationM: 5, gdpB: 18,
    govType: ['OCCUPIED TERRITORY', 'ACTIVE CONFLICT'], stability: 8,
    industries: [{ label: 'Services', pct: 72 }, { label: 'Industry', pct: 15 }, { label: 'Agriculture', pct: 13 }],
    queries: ['人道危機規模', '停火談判', '國際承認現況', '重建資金'],
  },
  'Saudi Arabia': {
    code: 'SA', capital: 'Riyadh', populationM: 36, gdpB: 1069,
    govType: ['ABSOLUTE MONARCHY'], stability: 62,
    industries: [{ label: 'Energy', pct: 50 }, { label: 'Industry', pct: 26 }, { label: 'Services', pct: 22 }, { label: 'Agriculture', pct: 2 }],
    queries: ['石油產量政策', '沙以正常化', '也門衝突', 'Vision 2030進展'],
  },
  'Turkey': {
    code: 'TR', capital: 'Ankara', populationM: 85, gdpB: 1113,
    govType: ['REPUBLIC', 'HYBRID REGIME'], stability: 48,
    industries: [{ label: 'Services', pct: 62 }, { label: 'Industry', pct: 30 }, { label: 'Agriculture', pct: 8 }],
    queries: ['北約立場', '庫德族問題', '通貨膨脹危機', '中東調解角色'],
  },
  'Syria': {
    code: 'SY', capital: 'Damascus', populationM: 22, gdpB: 22,
    govType: ['TRANSITIONAL', 'POST-CONFLICT'], stability: 18,
    industries: [{ label: 'Agriculture', pct: 35 }, { label: 'Industry', pct: 25 }, { label: 'Services', pct: 40 }],
    queries: ['政權重建', '難民回流', '重建援助', '外國勢力撤軍'],
  },
  'Iraq': {
    code: 'IQ', capital: 'Baghdad', populationM: 42, gdpB: 264,
    govType: ['FEDERAL REPUBLIC', 'FRAGILE STATE'], stability: 30,
    industries: [{ label: 'Energy', pct: 55 }, { label: 'Industry', pct: 18 }, { label: 'Services', pct: 24 }, { label: 'Agriculture', pct: 3 }],
    queries: ['親伊朗民兵', '石油收入分配', '庫德族自治', '美軍駐紮'],
  },
  'Afghanistan': {
    code: 'AF', capital: 'Kabul', populationM: 41, gdpB: 14,
    govType: ['THEOCRACY', 'AUTHORITARIAN'], stability: 10,
    industries: [{ label: 'Agriculture', pct: 45 }, { label: 'Industry', pct: 16 }, { label: 'Services', pct: 39 }],
    queries: ['塔利班治理', '人道危機', '毒品出口', '邊境安全'],
  },
  'Brazil': {
    code: 'BR', capital: 'Brasília', populationM: 215, gdpB: 2174,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 55,
    industries: [{ label: 'Services', pct: 63 }, { label: 'Industry', pct: 21 }, { label: 'Agriculture', pct: 6 }, { label: 'Energy', pct: 10 }],
    queries: ['亞馬遜森林砍伐', '拉美政治角色', '農業出口', 'BRICS擴張'],
  },
  'Mexico': {
    code: 'MX', capital: 'Mexico City', populationM: 130, gdpB: 1327,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 44,
    industries: [{ label: 'Services', pct: 62 }, { label: 'Industry', pct: 31 }, { label: 'Agriculture', pct: 7 }],
    queries: ['販毒集團勢力', '邊境移民', '近岸外包趨勢', '美墨貿易'],
  },
  'Argentina': {
    code: 'AR', capital: 'Buenos Aires', populationM: 46, gdpB: 622,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 38,
    industries: [{ label: 'Services', pct: 61 }, { label: 'Industry', pct: 23 }, { label: 'Agriculture', pct: 9 }, { label: 'Energy', pct: 7 }],
    queries: ['經濟通膨危機', '鋰三角資源', 'IMF債務', '外交走向'],
  },
  'Venezuela': {
    code: 'VE', capital: 'Caracas', populationM: 29, gdpB: 92,
    govType: ['AUTHORITARIAN', 'HYBRID REGIME'], stability: 18,
    industries: [{ label: 'Energy', pct: 55 }, { label: 'Industry', pct: 15 }, { label: 'Services', pct: 28 }, { label: 'Agriculture', pct: 2 }],
    queries: ['石油制裁解除', '難民危機', '邊境緊張', '選舉合法性'],
  },
  'Colombia': {
    code: 'CO', capital: 'Bogotá', populationM: 51, gdpB: 363,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 46,
    industries: [{ label: 'Services', pct: 59 }, { label: 'Industry', pct: 26 }, { label: 'Agriculture', pct: 7 }, { label: 'Energy', pct: 8 }],
    queries: ['毒品走私路線', '游擊隊談判', '農村安全', '美哥關係'],
  },
  'Nigeria': {
    code: 'NG', capital: 'Abuja', populationM: 222, gdpB: 477,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 33,
    industries: [{ label: 'Energy', pct: 37 }, { label: 'Agriculture', pct: 25 }, { label: 'Services', pct: 32 }, { label: 'Industry', pct: 6 }],
    queries: ['波科哈拉姆威脅', '石油收入腐敗', '薩赫勒安全', '人口增長壓力'],
  },
  'Ethiopia': {
    code: 'ET', capital: 'Addis Ababa', populationM: 126, gdpB: 156,
    govType: ['FEDERAL REPUBLIC', 'FRAGILE STATE'], stability: 25,
    industries: [{ label: 'Agriculture', pct: 38 }, { label: 'Services', pct: 43 }, { label: 'Industry', pct: 19 }],
    queries: ['提格雷衝突', '尼羅河水壩爭議', '糧食安全', '內部族群衝突'],
  },
  'Sudan': {
    code: 'SD', capital: 'Khartoum', populationM: 46, gdpB: 33,
    govType: ['MILITARY JUNTA', 'ACTIVE CONFLICT'], stability: 8,
    industries: [{ label: 'Agriculture', pct: 43 }, { label: 'Energy', pct: 25 }, { label: 'Services', pct: 28 }, { label: 'Industry', pct: 4 }],
    queries: ['內戰傷亡', '人道走廊', '外部介入勢力', '難民安置'],
  },
  'South Africa': {
    code: 'ZA', capital: 'Pretoria', populationM: 60, gdpB: 405,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 50,
    industries: [{ label: 'Services', pct: 65 }, { label: 'Industry', pct: 28 }, { label: 'Agriculture', pct: 7 }],
    queries: ['非盟領導角色', '電力基礎設施', '犯罪率', 'BRICS合作'],
  },
  'Egypt': {
    code: 'EG', capital: 'Cairo', populationM: 105, gdpB: 397,
    govType: ['AUTHORITARIAN', 'REPUBLIC'], stability: 45,
    industries: [{ label: 'Services', pct: 54 }, { label: 'Industry', pct: 35 }, { label: 'Agriculture', pct: 11 }],
    queries: ['蘇伊士運河安全', '加薩緩衝區', '尼羅河水源', '伊斯蘭激進主義'],
  },
  'Libya': {
    code: 'LY', capital: 'Tripoli', populationM: 7, gdpB: 29,
    govType: ['DIVIDED GOVERNMENT', 'ACTIVE CONFLICT'], stability: 12,
    industries: [{ label: 'Energy', pct: 65 }, { label: 'Services', pct: 26 }, { label: 'Industry', pct: 7 }, { label: 'Agriculture', pct: 2 }],
    queries: ['東西政府統一', '外國傭兵撤退', '石油設施安全', '移民走廊'],
  },
  'Somalia': {
    code: 'SO', capital: 'Mogadishu', populationM: 18, gdpB: 11,
    govType: ['FRAGILE STATE', 'ACTIVE CONFLICT'], stability: 7,
    industries: [{ label: 'Agriculture', pct: 60 }, { label: 'Services', pct: 35 }, { label: 'Industry', pct: 5 }],
    queries: ['青年軍勢力', '海上盜版', '乾旱糧食危機', '非盟維和'],
  },
  'Kenya': {
    code: 'KE', capital: 'Nairobi', populationM: 55, gdpB: 118,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 55,
    industries: [{ label: 'Services', pct: 54 }, { label: 'Agriculture', pct: 23 }, { label: 'Industry', pct: 17 }, { label: 'Energy', pct: 6 }],
    queries: ['東非區域穩定', '恐攻威脅', '科技中心崛起', '氣候變遷衝擊'],
  },
  'Poland': {
    code: 'PL', capital: 'Warsaw', populationM: 38, gdpB: 811,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 72,
    industries: [{ label: 'Services', pct: 63 }, { label: 'Industry', pct: 32 }, { label: 'Agriculture', pct: 5 }],
    queries: ['東翼防禦部署', '烏克蘭難民', '北約增兵', '歐盟法治爭議'],
  },
  'Indonesia': {
    code: 'ID', capital: 'Jakarta', populationM: 277, gdpB: 1371,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 62,
    industries: [{ label: 'Services', pct: 45 }, { label: 'Industry', pct: 40 }, { label: 'Agriculture', pct: 15 }],
    queries: ['南海主權主張', '鎳資源戰略', 'ASEAN主席角色', '首都遷移'],
  },
  'Malaysia': {
    code: 'MY', capital: 'Kuala Lumpur', populationM: 33, gdpB: 447,
    govType: ['CONSTITUTIONAL MONARCHY', 'DEMOCRACY'], stability: 64,
    industries: [{ label: 'Industry', pct: 38 }, { label: 'Services', pct: 54 }, { label: 'Agriculture', pct: 8 }],
    queries: ['南海島礁爭議', '半導體供應鏈', '美中平衡外交', '能源出口'],
  },
  'Vietnam': {
    code: 'VN', capital: 'Hanoi', populationM: 98, gdpB: 433,
    govType: ['SINGLE-PARTY STATE', 'COMMUNIST'], stability: 67,
    industries: [{ label: 'Industry', pct: 38 }, { label: 'Services', pct: 43 }, { label: 'Agriculture', pct: 19 }],
    queries: ['南海主權', '製造業轉移', '美越關係深化', '領導層更迭'],
  },
  'Thailand': {
    code: 'TH', capital: 'Bangkok', populationM: 72, gdpB: 574,
    govType: ['CONSTITUTIONAL MONARCHY', 'HYBRID REGIME'], stability: 54,
    industries: [{ label: 'Services', pct: 55 }, { label: 'Industry', pct: 35 }, { label: 'Agriculture', pct: 10 }],
    queries: ['軍民關係', '緬甸難民湧入', '旅遊業復甦', '王室政治'],
  },
  'Myanmar': {
    code: 'MM', capital: 'Naypyidaw', populationM: 55, gdpB: 65,
    govType: ['MILITARY JUNTA', 'ACTIVE CONFLICT'], stability: 10,
    industries: [{ label: 'Agriculture', pct: 37 }, { label: 'Industry', pct: 36 }, { label: 'Services', pct: 27 }],
    queries: ['軍政府控制範圍', '反抗軍推進', '人道危機', '中緬走廊'],
  },
  'Philippines': {
    code: 'PH', capital: 'Manila', populationM: 113, gdpB: 435,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 56,
    industries: [{ label: 'Services', pct: 62 }, { label: 'Industry', pct: 28 }, { label: 'Agriculture', pct: 10 }],
    queries: ['南海仁愛礁對峙', '美菲同盟強化', '民答那峨叛亂', '中菲關係'],
  },
  'Australia': {
    code: 'AU', capital: 'Canberra', populationM: 26, gdpB: 1707,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 85,
    industries: [{ label: 'Services', pct: 66 }, { label: 'Industry', pct: 25 }, { label: 'Agriculture', pct: 3 }, { label: 'Resources', pct: 6 }],
    queries: ['AUKUS核潛艦', '對中關係', '礦產資源出口', '太平洋外交'],
  },
  'Canada': {
    code: 'CA', capital: 'Ottawa', populationM: 38, gdpB: 2140,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 84,
    industries: [{ label: 'Services', pct: 70 }, { label: 'Industry', pct: 26 }, { label: 'Agriculture', pct: 4 }],
    queries: ['北極主權聲索', '油砂能源出口', '中加間諜活動', '美加貿易'],
  },
  'Kazakhstan': {
    code: 'KZ', capital: 'Astana', populationM: 19, gdpB: 261,
    govType: ['AUTHORITARIAN', 'REPUBLIC'], stability: 50,
    industries: [{ label: 'Energy', pct: 48 }, { label: 'Industry', pct: 28 }, { label: 'Services', pct: 20 }, { label: 'Agriculture', pct: 4 }],
    queries: ['俄羅斯影響力', '鈾礦出口', '中亞地緣政治', '抗議鎮壓'],
  },
  'Uzbekistan': {
    code: 'UZ', capital: 'Tashkent', populationM: 35, gdpB: 90,
    govType: ['AUTHORITARIAN', 'REPUBLIC'], stability: 48,
    industries: [{ label: 'Agriculture', pct: 28 }, { label: 'Industry', pct: 30 }, { label: 'Services', pct: 42 }],
    queries: ['俄羅斯制裁迴避', '中亞新絲路', '棉花產業', '地區整合'],
  },
  'Spain': {
    code: 'ES', capital: 'Madrid', populationM: 47, gdpB: 1580,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 68,
    industries: [{ label: 'Services', pct: 74 }, { label: 'Industry', pct: 22 }, { label: 'Agriculture', pct: 4 }],
    queries: ['加泰隆尼亞獨立', '移民問題', '北非安全', '電動車產業'],
  },
  'Italy': {
    code: 'IT', capital: 'Rome', populationM: 59, gdpB: 2170,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 65,
    industries: [{ label: 'Services', pct: 73 }, { label: 'Industry', pct: 24 }, { label: 'Agriculture', pct: 3 }],
    queries: ['移民登陸危機', '北非政策', '能源替代計畫', '政府穩定性'],
  },
  'Greece': {
    code: 'GR', capital: 'Athens', populationM: 11, gdpB: 238,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 63,
    industries: [{ label: 'Services', pct: 79 }, { label: 'Industry', pct: 14 }, { label: 'Agriculture', pct: 7 }],
    queries: ['土希領海爭議', '難民過境', '國防現代化', '旅遊依賴'],
  },
  'Romania': {
    code: 'RO', capital: 'Bucharest', populationM: 19, gdpB: 350,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 62,
    industries: [{ label: 'Services', pct: 58 }, { label: 'Industry', pct: 35 }, { label: 'Agriculture', pct: 7 }],
    queries: ['北約東翼', '烏克蘭穀物走廊', '能源安全', '黑海安全'],
  },
  'Belarus': {
    code: 'BY', capital: 'Minsk', populationM: 9, gdpB: 73,
    govType: ['AUTHORITARIAN', 'HYBRID WAR'], stability: 25,
    industries: [{ label: 'Industry', pct: 39 }, { label: 'Services', pct: 51 }, { label: 'Agriculture', pct: 10 }],
    queries: ['俄羅斯核武部署', '移民武器化', '反對派鎮壓', '制裁影響'],
  },
  'Serbia': {
    code: 'RS', capital: 'Belgrade', populationM: 7, gdpB: 75,
    govType: ['REPUBLIC', 'HYBRID REGIME'], stability: 50,
    industries: [{ label: 'Services', pct: 59 }, { label: 'Industry', pct: 33 }, { label: 'Agriculture', pct: 8 }],
    queries: ['科索沃緊張', '歐盟入盟進程', '俄中平衡外交', '鋰礦開採'],
  },
  'Kosovo': {
    code: 'XK', capital: 'Pristina', populationM: 2, gdpB: 10,
    govType: ['PARTIAL RECOGNITION', 'REPUBLIC'], stability: 38,
    industries: [{ label: 'Services', pct: 63 }, { label: 'Industry', pct: 25 }, { label: 'Agriculture', pct: 12 }],
    queries: ['塞科邊境衝突', '北約維和', '聯合國承認', '族群緊張'],
  },
  'Morocco': {
    code: 'MA', capital: 'Rabat', populationM: 37, gdpB: 139,
    govType: ['CONSTITUTIONAL MONARCHY'], stability: 58,
    industries: [{ label: 'Services', pct: 52 }, { label: 'Industry', pct: 30 }, { label: 'Agriculture', pct: 12 }, { label: 'Phosphate', pct: 6 }],
    queries: ['西撒哈拉主權', '歐洲移民門戶', '磷灰石出口', '正常化進程'],
  },
  'Algeria': {
    code: 'DZ', capital: 'Algiers', populationM: 45, gdpB: 232,
    govType: ['AUTHORITARIAN', 'REPUBLIC'], stability: 44,
    industries: [{ label: 'Energy', pct: 55 }, { label: 'Industry', pct: 11 }, { label: 'Services', pct: 30 }, { label: 'Agriculture', pct: 4 }],
    queries: ['天然氣出口', '馬格里布緊張', '薩赫勒政策', '內部政治壓力'],
  },
  'Chad': {
    code: 'TD', capital: "N'Djamena", populationM: 18, gdpB: 12,
    govType: ['MILITARY JUNTA', 'FRAGILE STATE'], stability: 18,
    industries: [{ label: 'Agriculture', pct: 54 }, { label: 'Energy', pct: 28 }, { label: 'Services', pct: 16 }, { label: 'Industry', pct: 2 }],
    queries: ['薩赫勒勢力真空', '法國撤軍影響', '人道危機', '石油管線'],
  },
  'Dem. Rep. Congo': {
    code: 'CD', capital: 'Kinshasa', populationM: 100, gdpB: 65,
    govType: ['REPUBLIC', 'FRAGILE STATE'], stability: 14,
    industries: [{ label: 'Mining', pct: 42 }, { label: 'Agriculture', pct: 43 }, { label: 'Services', pct: 12 }, { label: 'Industry', pct: 3 }],
    queries: ['鈷礦控制權', '武裝勢力格局', 'M23叛軍動向', '礦產資源外交'],
  },
  'Sweden': {
    code: 'SE', capital: 'Stockholm', populationM: 10, gdpB: 597,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 86,
    industries: [{ label: 'Services', pct: 70 }, { label: 'Industry', pct: 27 }, { label: 'Agriculture', pct: 3 }],
    queries: ['北約新成員動態', '瑞典防衛轉型', '波羅的海安全', '北極政策'],
  },
  'Finland': {
    code: 'FI', capital: 'Helsinki', populationM: 6, gdpB: 301,
    govType: ['DEMOCRACY', 'REPUBLIC'], stability: 88,
    industries: [{ label: 'Services', pct: 70 }, { label: 'Industry', pct: 27 }, { label: 'Agriculture', pct: 3 }],
    queries: ['俄芬邊境安全', '北約整合', '能源替代', '電池產業'],
  },
  'Norway': {
    code: 'NO', capital: 'Oslo', populationM: 5, gdpB: 546,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 90,
    industries: [{ label: 'Energy', pct: 44 }, { label: 'Services', pct: 48 }, { label: 'Industry', pct: 6 }, { label: 'Agriculture', pct: 2 }],
    queries: ['北海油氣出口', '北極資源', '北約重要性', '主權財富基金'],
  },
  'Netherlands': {
    code: 'NL', capital: 'Amsterdam', populationM: 18, gdpB: 1092,
    govType: ['DEMOCRACY', 'CONSTITUTIONAL MONARCHY'], stability: 82,
    industries: [{ label: 'Services', pct: 71 }, { label: 'Industry', pct: 19 }, { label: 'Agriculture', pct: 2 }, { label: 'Energy', pct: 8 }],
    queries: ['ASML晶片設備出口', '歐洲物流樞紐', '農業出口限制', '氮危機'],
  },
  'Switzerland': {
    code: 'CH', capital: 'Bern', populationM: 9, gdpB: 905,
    govType: ['DEMOCRACY', 'FEDERAL REPUBLIC'], stability: 92,
    industries: [{ label: 'Finance', pct: 26 }, { label: 'Industry', pct: 25 }, { label: 'Services', pct: 47 }, { label: 'Agriculture', pct: 2 }],
    queries: ['制裁中立立場', '金融中心地位', '斡旋調解角色', '銀行保密制度'],
  },
}

export function getCountryInfo(name: string): CountryInfo | null {
  return COUNTRY_DATA[name] ?? null
}

// ── Approximate country centroids (lat, lng) ─────────────────────────────────
// Used as fallback when an event lacks explicit coordinates.
const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  'United States of America': [38.9, -77.0],
  'China':            [35.9, 104.2],
  'Russia':           [61.5, 105.3],
  'Ukraine':          [48.4,  31.2],
  'Taiwan':           [23.7, 120.9],
  'Japan':            [36.2, 138.3],
  'South Korea':      [35.9, 127.8],
  'North Korea':      [40.3, 127.5],
  'Germany':          [51.2,  10.5],
  'France':           [46.2,   2.2],
  'United Kingdom':   [51.5,  -0.1],
  'India':            [20.6,  78.9],
  'Pakistan':         [30.4,  69.3],
  'Iran':             [32.4,  53.7],
  'Israel':           [31.0,  35.0],
  'Palestine':        [31.9,  35.2],
  'Lebanon':          [33.9,  35.5],
  'Jordan':           [31.0,  36.1],
  'Saudi Arabia':     [23.9,  45.1],
  'Turkey':           [38.9,  35.2],
  'Syria':            [34.8,  38.9],
  'Iraq':             [33.2,  43.7],
  'Afghanistan':      [33.9,  67.7],
  'Brazil':           [-14.2, -51.9],
  'Mexico':           [23.6, -102.6],
  'Argentina':        [-38.4, -63.6],
  'Venezuela':        [6.4,  -66.6],
  'Colombia':         [4.1,  -72.3],
  'Nigeria':          [9.1,    8.7],
  'Ethiopia':         [9.1,   40.5],
  'Sudan':            [12.9,  30.2],
  'South Africa':     [-30.6,  22.9],
  'Egypt':            [26.8,  30.8],
  'Libya':            [26.3,  17.2],
  'Somalia':          [5.2,   46.2],
  'Kenya':            [-0.0,  37.9],
  'Poland':           [51.9,  19.1],
  'Indonesia':        [-0.8, 113.9],
  'Malaysia':         [4.2,  108.0],
  'Vietnam':          [14.1, 108.3],
  'Thailand':         [13.0, 100.5],
  'Myanmar':          [19.2,  96.7],
  'Philippines':      [12.9, 121.8],
  'Australia':        [-25.3, 133.8],
  'Canada':           [56.1, -106.3],
  'Kazakhstan':       [48.0,  66.9],
  'Uzbekistan':       [41.4,  64.6],
  'Spain':            [40.5,  -3.7],
  'Italy':            [41.9,  12.6],
  'Greece':           [39.1,  21.8],
  'Romania':          [45.9,  24.9],
  'Belarus':          [53.7,  28.0],
  'Serbia':           [44.0,  21.0],
  'Kosovo':           [42.6,  20.9],
  'Morocco':          [31.8,  -7.1],
  'Algeria':          [28.0,   1.7],
  'Chad':             [15.5,  18.7],
  'Dem. Rep. Congo':  [-4.0,  21.8],
  'Sweden':           [60.1,  18.6],
  'Finland':          [61.9,  25.7],
  'Norway':           [60.5,   8.5],
  'Netherlands':      [52.1,   5.3],
  'Switzerland':      [46.8,   8.2],
  // Common news locations not in COUNTRY_DATA
  'United States':    [38.9, -77.0],
  'USA':              [38.9, -77.0],
  'UK':               [51.5,  -0.1],
  'Beirut':           [33.9,  35.5],
  'Gaza':             [31.4,  34.4],
  'West Bank':        [31.9,  35.2],
  'Yemen':            [15.6,  48.5],
  'Myanmar/Burma':    [19.2,  96.7],
  'Taiwan Strait':    [24.0, 120.5],
  'South China Sea':  [15.0, 115.0],
  'Persian Gulf':     [26.5,  52.0],

  // ── Chinese-language location labels ─────────────────────────────────────
  // Cities
  '北京':   [39.9,  116.4],  // Beijing
  '上海':   [31.2,  121.5],  // Shanghai
  '台北':   [25.0,  121.5],  // Taipei
  '香港':   [22.3,  114.2],  // Hong Kong
  '澳門':   [22.2,  113.5],  // Macau
  '澳门':   [22.2,  113.5],
  '廣州':   [23.1,  113.3],  // Guangzhou
  '广州':   [23.1,  113.3],
  '深圳':   [22.5,  114.1],  // Shenzhen
  '武漢':   [30.6,  114.3],  // Wuhan
  '武汉':   [30.6,  114.3],
  '莫斯科': [55.8,   37.6],  // Moscow
  '华盛顿': [38.9,  -77.0],  // Washington DC
  '華盛頓': [38.9,  -77.0],
  '紐約':   [40.7,  -74.0],  // New York
  '纽约':   [40.7,  -74.0],
  '倫敦':   [51.5,   -0.1],  // London
  '伦敦':   [51.5,   -0.1],
  '巴黎':   [48.9,    2.3],  // Paris
  '柏林':   [52.5,   13.4],  // Berlin
  '東京':   [35.7,  139.7],  // Tokyo
  '东京':   [35.7,  139.7],
  '首爾':   [37.6,  127.0],  // Seoul
  '首尔':   [37.6,  127.0],
  '平壤':   [39.0,  125.8],  // Pyongyang
  '德黑蘭': [35.7,   51.4],  // Tehran
  '德黑兰': [35.7,   51.4],
  '基輔':   [50.5,   30.5],  // Kyiv
  '基辅':   [50.5,   30.5],
  '特拉維夫':[32.1,  34.8],  // Tel Aviv
  '特拉维夫':[32.1,  34.8],
  '耶路撒冷':[31.8,  35.2],  // Jerusalem
  // Countries
  '中國':   [35.9,  104.2],  // China
  '中国':   [35.9,  104.2],
  '台灣':   [23.7,  120.9],  // Taiwan
  '台湾':   [23.7,  120.9],
  '俄羅斯': [61.5,  105.3],  // Russia
  '俄罗斯': [61.5,  105.3],
  '美國':   [38.9,  -77.0],  // USA
  '美国':   [38.9,  -77.0],
  '烏克蘭': [48.4,   31.2],  // Ukraine
  '乌克兰': [48.4,   31.2],
  '以色列': [31.0,   35.0],  // Israel
  '巴勒斯坦':[31.9,  35.2],  // Palestine
  '黎巴嫩': [33.9,   35.5],  // Lebanon
  '伊朗':   [32.4,   53.7],  // Iran
  '伊拉克': [33.2,   43.7],  // Iraq
  '敘利亞': [34.8,   38.9],  // Syria
  '叙利亚': [34.8,   38.9],
  '葉門':   [15.6,   48.5],  // Yemen
  '也门':   [15.6,   48.5],
  '沙烏地阿拉伯':[23.9, 45.1], // Saudi Arabia
  '沙特阿拉伯':[23.9, 45.1],
  '土耳其': [38.9,   35.2],  // Turkey
  '日本':   [36.2,  138.3],  // Japan
  '韓國':   [35.9,  127.8],  // South Korea
  '韩国':   [35.9,  127.8],
  '朝鮮':   [40.3,  127.5],  // North Korea
  '北韓':   [40.3,  127.5],
  '北朝鲜': [40.3,  127.5],
  '印度':   [20.6,   78.9],  // India
  '巴基斯坦':[30.4,  69.3],  // Pakistan
  '阿富汗': [33.9,   67.7],  // Afghanistan
  '英國':   [51.5,   -0.1],  // UK
  '英国':   [51.5,   -0.1],
  '法國':   [46.2,    2.2],  // France
  '法国':   [46.2,    2.2],
  '德國':   [51.2,   10.5],  // Germany
  '德国':   [51.2,   10.5],
  '歐盟':   [50.9,    4.4],  // EU (Brussels)
  '欧盟':   [50.9,    4.4],
  '加薩':   [31.4,   34.4],  // Gaza
  '加沙':   [31.4,   34.4],
  '約旦河西岸':[31.9, 35.2], // West Bank
  '南海':   [15.0,  115.0],  // South China Sea
  '台海':   [24.0,  120.5],  // Taiwan Strait
  '波斯灣': [26.5,   52.0],  // Persian Gulf
}

/**
 * Return approximate [lat, lng] centroid for a country name,
 * trying both the exact key and a resolved alias.
 */
export function getCountryCentroid(name: string): { lat: number; lng: number } | null {
  // Direct lookup
  const direct = COUNTRY_CENTROIDS[name]
  if (direct) return { lat: direct[0], lng: direct[1] }

  // Try resolving via country alias
  const resolved = resolveCountryName(name)
  if (resolved) {
    const c = COUNTRY_CENTROIDS[resolved]
    if (c) return { lat: c[0], lng: c[1] }
  }

  return null
}

/**
 * Try to resolve a free-text location label (from Ollama) to a known
 * COUNTRY_DATA key.  Returns the canonical key or null if no match.
 * Matching order:
 *   1. Exact match
 *   2. Case-insensitive exact
 *   3. A COUNTRY_DATA key that starts with the label (or vice-versa)
 *   4. A COUNTRY_DATA key that contains the label as a whole word
 */
export function resolveCountryName(label: string): string | null {
  if (!label) return null

  // Search COUNTRY_DATA keys first, then COUNTRY_CENTROIDS keys as fallback
  const dataKeys     = Object.keys(COUNTRY_DATA)
  const centroidKeys = Object.keys(COUNTRY_CENTROIDS)
  const allKeys      = [...new Set([...dataKeys, ...centroidKeys])]

  // 1. Exact
  if (COUNTRY_DATA[label] || COUNTRY_CENTROIDS[label]) return label

  // 2. Case-insensitive exact
  const lower = label.toLowerCase()
  const exact = allKeys.find(k => k.toLowerCase() === lower)
  if (exact) return exact

  // 3. Prefix match (e.g. "United States" → "United States of America")
  const prefix = allKeys.find(k => k.toLowerCase().startsWith(lower) || lower.startsWith(k.toLowerCase()))
  if (prefix) return prefix

  // 4. Whole-word containment
  const word = allKeys.find(k => {
    const kl = k.toLowerCase()
    return kl.includes(lower) || lower.includes(kl)
  })
  return word ?? null
}

/** Derive dynamic status tags from live events (e.g. ACTIVE CONFLICT) */
export function getDynamicTags(
  countryName: string,
  events: Array<{ location_label?: string | null; category: string; intensity: string }>
): string[] {
  const relevant = events.filter(e =>
    e.location_label?.toLowerCase().includes(countryName.toLowerCase()) ||
    countryName.toLowerCase().includes((e.location_label ?? '').toLowerCase())
  )
  const tags: string[] = []
  if (relevant.some(e => e.category === 'ARMED_CONFLICT')) tags.push('ACTIVE CONFLICT')
  if (relevant.some(e => e.intensity === 'CRITICAL'))      tags.push('CRITICAL ALERT')
  if (relevant.some(e => e.category === 'ECONOMIC' && (e.intensity === 'HIGH' || e.intensity === 'CRITICAL'))) tags.push('ECONOMIC STRESS')
  return tags
}

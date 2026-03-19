export interface PuzzleData {
  chapter: number;
  stage: number;
  gridSize: number;
  word: string;
  timeLimit: number;
  meanings: Record<string, string>;
}

const chapter1Data = [
  { word: "ALI", meanings: { ko: "알리", ar: "علي", fr: "Ali", es: "Alí", zh: "阿里", ja: "アリ" } },
  { word: "OIL", meanings: { ko: "기름", ar: "زيت", fr: "Huile", es: "Aceite", zh: "油", ja: "油" } },
  { word: "JAR", meanings: { ko: "항아리", ar: "جرة", fr: "Jarre", es: "Jarra", zh: "罐子", ja: "壺" } },
  { word: "BOY", meanings: { ko: "소년", ar: "صبي", fr: "Garçon", es: "Chico", zh: "男孩", ja: "少年" } },
  { word: "RUN", meanings: { ko: "달리다", ar: "يركض", fr: "Courir", es: "Correr", zh: "跑", ja: "走る" } },
  { word: "GEM", meanings: { ko: "보석", ar: "جوهرة", fr: "Gemme", es: "Gema", zh: "宝石", ja: "宝石" } },
  { word: "KEY", meanings: { ko: "열쇠", ar: "مفتاح", fr: "Clé", es: "Llave", zh: "钥匙", ja: "鍵" } },
  { word: "MAP", meanings: { ko: "지도", ar: "خريطة", fr: "Carte", es: "Mapa", zh: "地图", ja: "地図" } },
  { word: "BAG", meanings: { ko: "가방", ar: "حقيبة", fr: "Sac", es: "Bolsa", zh: "袋子", ja: "袋" } }
];

const chapter2Data = [
  { word: "OPENSES!", meanings: { ko: "열려라 참깨!", ar: "افتح يا سمسم!", fr: "Sésame, ouvre-toi!", es: "¡Ábrete sésamo!", zh: "芝麻开门！", ja: "ひらけごま！" } },
  { word: "FORTYTHI", meanings: { ko: "40인의 도적", ar: "الأربعون لصاً", fr: "Quarante voleurs", es: "Cuarenta ladrones", zh: "四十大盗", ja: "40人の盗賊" } },
  { word: "GOLDCOIN", meanings: { ko: "금화", ar: "عملة ذهبية", fr: "Pièce d'or", es: "Moneda de oro", zh: "金币", ja: "金貨" } },
  { word: "MAGICCAV", meanings: { ko: "마법의 동굴", ar: "الكهف السحري", fr: "Grotte magique", es: "Cueva mágica", zh: "魔法洞穴", ja: "魔法の洞窟" } },
  { word: "MORGANA!", meanings: { ko: "모르지아나!", ar: "مرجانة!", fr: "Morgiane!", es: "¡Morgiana!", zh: "莫吉安娜！", ja: "モルジアナ！" } },
  { word: "CASSIM!!", meanings: { ko: "카심!!", ar: "قاسم!!", fr: "Cassim!!", es: "¡¡Cassim!!", zh: "卡西姆！！", ja: "カシム！！" } },
  { word: "TREASURE", meanings: { ko: "보물", ar: "كنز", fr: "Trésor", es: "Tesoro", zh: "宝藏", ja: "宝物" } },
  { word: "RICHES!!", meanings: { ko: "부귀영화!!", ar: "ثروات!!", fr: "Richesses!!", es: "¡¡Riquezas!!", zh: "财富！！", ja: "富！！" } },
  { word: "SECRET!!", meanings: { ko: "비밀!!", ar: "سر!!", fr: "Secret!!", es: "¡¡Secreto!!", zh: "秘密！！", ja: "秘密！！" } }
];

const chapter3Data = [
  { word: "ALIBABAANDTHIEF", meanings: { ko: "알리바바와 도적", ar: "علي بابا واللص", fr: "Ali Baba et le voleur", es: "Alí Babá y el ladrón", zh: "阿里巴巴与大盗", ja: "アリババと盗賊" } },
  { word: "OPENSESAMEDOOR!", meanings: { ko: "열려라 참깨 문!", ar: "افتح باب سمسم!", fr: "Ouvre la porte Sésame!", es: "¡Abre la puerta sésamo!", zh: "芝麻开门！", ja: "ひらけごまの扉！" } },
  { word: "FORTYTHIEVES!!!", meanings: { ko: "40인의 도적들!!!", ar: "الأربعون لصاً!!!", fr: "Quarante voleurs!!!", es: "¡¡¡Cuarenta ladrones!!!", zh: "四十大盗！！！", ja: "40人の盗賊たち！！！" } },
  { word: "LOTSOFGOLDCOINS", meanings: { ko: "수많은 금화들", ar: "الكثير من العملات الذهبية", fr: "Beaucoup de pièces d'or", es: "Muchas monedas de oro", zh: "许多金币", ja: "たくさんの金貨" } },
  { word: "MORGIANASAVES!!", meanings: { ko: "모르지아나가 구하다!!", ar: "مرجانة تنقذ!!", fr: "Morgiane sauve!!", es: "¡¡Morgiana salva!!", zh: "莫吉安娜的拯救！！", ja: "モルジアナが救う！！" } },
  { word: "CASSIMFORGOT!!!", meanings: { ko: "카심이 잊어버리다!!!", ar: "قاسم نسي!!!", fr: "Cassim a oublié!!!", es: "¡¡¡Cassim olvidó!!!", zh: "卡西姆忘记了！！！", ja: "カシムは忘れた！！！" } },
  { word: "BOILINGOILJARS!", meanings: { ko: "끓는 기름 항아리!", ar: "جرار الزيت المغلي!", fr: "Jarres d'huile bouillante!", es: "¡Jarras de aceite hirviendo!", zh: "沸油罐！", ja: "煮えたぎる油の壺！" } },
  { word: "MAGICWORDSPOKEN", meanings: { ko: "마법의 주문을 말하다", ar: "قيلت الكلمة السحرية", fr: "Mot magique prononcé", es: "Palabra mágica pronunciada", zh: "说出魔法词", ja: "魔法の言葉が語られた" } },
  { word: "SECRETCAVEFOUND", meanings: { ko: "비밀 동굴을 찾다", ar: "تم العثور على الكهف السري", fr: "Grotte secrète trouvée", es: "Cueva secreta encontrada", zh: "发现秘密洞穴", ja: "秘密の洞窟発見" } }
];

const calculateTimeLimit = (baseTime: number, stage: number) => {
  const maxTime = baseTime * 1.5;
  const minTime = baseTime * 0.5;
  const step = (maxTime - minTime) / 8;
  return Math.round(maxTime - step * (stage - 1));
};

export const puzzles: PuzzleData[] = [];

for (let i = 1; i <= 9; i++) {
  puzzles.push({
    chapter: 1,
    stage: i,
    gridSize: 2,
    word: chapter1Data[i - 1].word,
    meanings: chapter1Data[i - 1].meanings,
    timeLimit: calculateTimeLimit(10, i)
  });
}

for (let i = 1; i <= 9; i++) {
  puzzles.push({
    chapter: 2,
    stage: i,
    gridSize: 3,
    word: chapter2Data[i - 1].word,
    meanings: chapter2Data[i - 1].meanings,
    timeLimit: calculateTimeLimit(60, i)
  });
}

for (let i = 1; i <= 9; i++) {
  puzzles.push({
    chapter: 3,
    stage: i,
    gridSize: 4,
    word: chapter3Data[i - 1].word,
    meanings: chapter3Data[i - 1].meanings,
    timeLimit: calculateTimeLimit(180, i)
  });
}

export const getPuzzle = (chapter: number, stage: number) => {
  return puzzles.find(p => p.chapter === chapter && p.stage === stage);
};

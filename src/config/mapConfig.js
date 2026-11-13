export const DISTRICTS = [
  "Алатауский",
  "Алмалинский",
  "Ауэзовский",
  "Бостандыкский",
  "Жетысуский",
  "Медеуский",
  "Наурызбайский",
  "Турксибский",
];

export const DISTRICT_COORDINATES = {
  Алатауский: [76.8347886720185, 43.2987364390376],
  Алмалинский: [76.9087951573108, 43.2522310686198],
  Ауэзовский: [76.8504995220839, 43.223745973742],
  Бостандыкский: [76.923470827708, 43.1557279031715],
  Жетысуский: [76.9247715410888, 43.3089271719003],
  Медеуский: [77.0214117650313, 43.1639355276689],
  Наурызбайский: [76.8309409706471, 43.1744182686828],
  Турксибский: [76.9856814001376, 43.3409268951072],
};

export const RISK_LABEL_MAP = {
  high: "высокий",
  medium: "средний",
  low: "низкий",
};

export const CATEGORY_LABEL_MAP = {
  mudflow: "сель",
  landslide: "оползни",
  fault: "разломы",
};

export const INITIAL_FILTERS = {
  districts: [],
  riskLevels: {
    high: true,
    medium: true,
    low: true,
  },
  categories: {
    mudflow: true,
    landslide: true,
    fault: true,
  },
};

export const INITIAL_BUILDING_RISK_FILTER = {
  showHighRisk: true,
  showLowRisk: true,
};

export const INITIAL_ENGINEERING_NODES = {
  Канализация: false,
  Электроснабжение: false,
  "ИКТ инфраструктура города": false,
  Теплоснабжение: false,
  Газоснабжение: false,
};

export const INITIAL_SOCIAL_CATEGORIES = {
  Школы: false,
  ДДО: false,
  Больницы: false,
  ПППН: false,
};

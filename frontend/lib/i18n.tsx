"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface Language {
  code: string;
  name: string;
  flag: string;
}

// Kept short/curated, mirroring the reference dropdown design (flag + name + code).
export const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "so", name: "Soomaali", flag: "🇸🇴" },
];

type TranslationKey =
  | "askAnything"
  | "admin"
  | "layer"
  | "leadersOption"
  | "servicesOption"
  | "expenditureOption"
  | "showingLeaders"
  | "showingServices"
  | "showingExpenditure"
  | "countrywide"
  | "jumpToCounty"
  | "mapKey"
  | "askChungaGava"
  | "thinking"
  | "signOut"
  | "toggleLayer"
  | "mapProjection"
  | "synced"
  | "quickJump";

const DICTIONARY: Record<string, Record<TranslationKey, string>> = {
  en: {
    askAnything: "Ask anything",
    admin: "Admin",
    layer: "Layer",
    leadersOption: "Leaders (Governors / MCAs)",
    servicesOption: "Public Services",
    expenditureOption: "Public Expenditure",
    showingLeaders: "Showing leaders",
    showingServices: "Showing services",
    showingExpenditure: "Showing public expenditure",
    countrywide: "Countrywide",
    jumpToCounty: "Jump to county...",
    mapKey: "Map Key",
    askChungaGava: "Ask Chunga Gava",
    thinking: "Thinking...",
    signOut: "Sign out",
    toggleLayer: "Toggle Layer",
    mapProjection: "Map Projection",
    synced: "Synced",
    quickJump: "Quick Jump",
  },
  sw: {
    askAnything: "Uliza chochote",
    admin: "Msimamizi",
    layer: "Tabaka",
    leadersOption: "Viongozi (Magavana / MCA)",
    servicesOption: "Huduma za Umma",
    expenditureOption: "Matumizi ya Umma",
    showingLeaders: "Inaonyesha viongozi",
    showingServices: "Inaonyesha huduma",
    showingExpenditure: "Inaonyesha matumizi ya umma",
    countrywide: "Nchi nzima",
    jumpToCounty: "Nenda kaunti...",
    mapKey: "Ufunguo wa Ramani",
    askChungaGava: "Uliza Chunga Gava",
    thinking: "Inafikiri...",
    signOut: "Toka",
    toggleLayer: "Badilisha Tabaka",
    mapProjection: "Mchoro wa Ramani",
    synced: "Imesawazishwa",
    quickJump: "Ruka Haraka",
  },
  fr: {
    askAnything: "Posez une question",
    admin: "Administrateur",
    layer: "Couche",
    leadersOption: "Dirigeants (Gouverneurs / MCA)",
    servicesOption: "Services publics",
    expenditureOption: "Dépenses publiques",
    showingLeaders: "Affichage des dirigeants",
    showingServices: "Affichage des services",
    showingExpenditure: "Affichage des dépenses publiques",
    countrywide: "Tout le pays",
    jumpToCounty: "Aller au comté...",
    mapKey: "Légende de la carte",
    askChungaGava: "Demander à Chunga Gava",
    thinking: "Réflexion...",
    signOut: "Déconnexion",
    toggleLayer: "Changer de couche",
    mapProjection: "Projection cartographique",
    synced: "Synchronisé",
    quickJump: "Accès rapide",
  },
  ar: {
    askAnything: "اسأل أي شيء",
    admin: "المسؤول",
    layer: "طبقة",
    leadersOption: "القادة (الحكام / أعضاء المجلس)",
    servicesOption: "الخدمات العامة",
    expenditureOption: "الإنفاق العام",
    showingLeaders: "عرض القادة",
    showingServices: "عرض الخدمات",
    showingExpenditure: "عرض الإنفاق العام",
    countrywide: "على مستوى البلاد",
    jumpToCounty: "الانتقال إلى المقاطعة...",
    mapKey: "مفتاح الخريطة",
    askChungaGava: "اسأل تشونغا غافا",
    thinking: "يفكر...",
    signOut: "تسجيل الخروج",
    toggleLayer: "تبديل الطبقة",
    mapProjection: "إسقاط الخريطة",
    synced: "متزامن",
    quickJump: "الانتقال السريع",
  },
  so: {
    askAnything: "Wax kasta weydii",
    admin: "Maamule",
    layer: "Lakabka",
    leadersOption: "Hoggaamiyeyaal (Gudoomiyeyaal / MCA)",
    servicesOption: "Adeegyada Dadweynaha",
    expenditureOption: "Kharashka Dadweynaha",
    showingLeaders: "Tusaya hoggaamiyeyaal",
    showingServices: "Tusaya adeegyada",
    showingExpenditure: "Tusaya kharashka dadweynaha",
    countrywide: "Guud ahaan dalka",
    jumpToCounty: "U gudub gobolka...",
    mapKey: "Furaha Khariidada",
    askChungaGava: "Weydii Chunga Gava",
    thinking: "Fikirid...",
    signOut: "Ka bax",
    toggleLayer: "Beddel Lakabka",
    mapProjection: "Muuqaalka Khariidada",
    synced: "La isku waafajiyay",
    quickJump: "Booda Degdegga ah",
  },
};

// Backend-sourced names (service classes, expenditure categories) aren't part of the static
// dictionary above since they come from the DB; translate the known seeded names here so the
// Map Key legend contents change language too. Unknown/admin-added names fall back to as-is.
const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  Schools: { sw: "Shule", fr: "Écoles", ar: "المدارس", so: "Dugsiyada" },
  "Huduma Centers": {
    sw: "Vituo vya Huduma",
    fr: "Centres Huduma",
    ar: "مراكز هودوما",
    so: "Xarumaha Huduma",
  },
  "Government Offices": {
    sw: "Ofisi za Serikali",
    fr: "Bureaux gouvernementaux",
    ar: "المكاتب الحكومية",
    so: "Xafiisyada Dawladda",
  },
  "Police Stations": {
    sw: "Vituo vya Polisi",
    fr: "Postes de police",
    ar: "مراكز الشرطة",
    so: "Xarumaha Booliska",
  },
  Roads: { sw: "Barabara", fr: "Routes", ar: "الطرق", so: "Waddooyinka" },
  Hospitals: { sw: "Hospitali", fr: "Hôpitaux", ar: "المستشفيات", so: "Isbitaallada" },
  Stadiums: { sw: "Viwanja vya Michezo", fr: "Stades", ar: "الملاعب", so: "Garoomada" },
  Initiatives: { sw: "Miradi", fr: "Initiatives", ar: "المبادرات", so: "Hindisayaal" },
};

interface LanguageContextValue {
  language: Language;
  setLanguageCode: (code: string) => void;
  t: (key: TranslationKey) => string;
  tCategory: (name: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "cg_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) setCode(stored);
  }, []);

  function setLanguageCode(next: string) {
    setCode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  const language = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
  const t = (key: TranslationKey) => DICTIONARY[code]?.[key] ?? DICTIONARY.en[key];
  const tCategory = (name: string) => CATEGORY_TRANSLATIONS[name]?.[code] ?? name;

  return (
    <LanguageContext.Provider value={{ language, setLanguageCode, t, tCategory }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

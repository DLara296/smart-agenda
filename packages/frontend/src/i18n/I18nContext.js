import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supportedLanguages, translations } from './locales';

const fallbackValue = { language: 'en', languages: supportedLanguages, setLanguage: () => {}, t: key => translations.en[key] || key, formatDate: date => new Date(date).toLocaleDateString('en-US') };
const LanguageContext = createContext(fallbackValue);

function detectLanguage() {
  const saved = localStorage.getItem('smartAgendaLanguage');
  if (saved && translations[saved]) return saved;
  const browser = (navigator.language || 'en').toLowerCase().split('-')[0];
  return translations[browser] ? browser : 'en';
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(detectLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = next => {
    const selected = translations[next] ? next : 'en';
    setLanguageState(selected);
    localStorage.setItem('smartAgendaLanguage', selected);
    document.documentElement.lang = selected;
  };
  const value = useMemo(() => ({ language, languages: supportedLanguages, setLanguage, t: (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, value), translations[language][key] || translations.en[key] || key), formatDate: date => new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium' }).format(new Date(date)) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  return context;
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'vi', // Default to Vietnamese
    debug: false, // Disable debugging to see what's happening
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18nextLng',
      caches: ['localStorage', 'cookie'],
    },

    ns: ['common', 'users', 'organizations', 'dashboard', 'classes', 'departments', 'auth'],
    defaultNS: 'common',
  });

export default i18n;

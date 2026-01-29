import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'vi', // Default to Vietnamese
    debug: true, // Disable debugging to see what's happening

    detection: {
      // Check localStorage first, then browser language
      order: ['localStorage', 'navigator'],
      // Key to store language in localStorage
      lookupLocalStorage: 'i18nextLng',
      // Cache user language
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

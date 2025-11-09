import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    lng: 'vi', // Default language
    fallbackLng: 'vi', // Default to Vietnamese
    debug: true, // Disable debugging to see what's happening

    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;

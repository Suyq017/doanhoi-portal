import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    // lng: 'vi',
    fallbackLng: 'vi', // Default to Vietnamese
    debug: true, // Disable debugging to see what's happening

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    detection: {
      order: ['localStorage', 'cookie', 'querystring', 'path', 'htmlTag', 'subdomain'],
      
      caches: ['localStorage', 'cookie'], 
    },

    ns: ['common', 'users', 'organizations', 'dashboard', 'classes', 'departments', 'auth', 'permissions', 'paymentCampaigns', 'feeLevels', 'memberAssignments', 'payosConfig', 'userPermissions', 'myPayments', 'ctxh', 'student-reports'],
    defaultNS: 'common',
  });

export default i18n;

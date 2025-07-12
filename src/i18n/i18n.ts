import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en.json';
import frTranslation from './locales/fr.json';
import noTranslation from './locales/no.json';
import esTranslation from './locales/es.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  fr: {
    translation: frTranslation,
  },
  no: {
    translation: noTranslation,
  },
  es: {
    translation: esTranslation,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (lng) => {
        // Map common language variants to our supported languages
        const languageMap: { [key: string]: string } = {
          'en-US': 'en',
          'en-GB': 'en',
          'en-CA': 'en',
          'en-AU': 'en',
          'fr-FR': 'fr',
          'fr-CA': 'fr',
          'es-ES': 'es',
          'es-MX': 'es',
          'es-AR': 'es',
          'nb-NO': 'no',
          'nn-NO': 'no',
          'no-NO': 'no',
        };

        return languageMap[lng] || lng.split('-')[0];
      },
    },
  });

export default i18n;

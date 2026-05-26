import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'zh-TW',
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-TW'],
    interpolation: { escapeValue: false },
    // Locale JSON files are served from /public/locales/{lng}/translation.json
    // Only the active locale is fetched on startup; others load on language switch.
    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },
    // Wait for the first locale to load before the instance is considered ready,
    // so components receive translated strings on first render.
    initImmediate: false,
  })

export default i18n

import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'

const LANGS = [
  { code: 'zh-TW', label: '繁中' },
  { code: 'en',    label: 'EN' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const { language, setLanguage } = useAppStore()

  const toggle = () => {
    const next = language === 'zh-TW' ? 'en' : 'zh-TW'
    setLanguage(next)
    void i18n.changeLanguage(next)
  }

  return (
    <button
      onClick={toggle}
      style={{ height: '28px' }}
      className="px-2 text-[9px] tracking-widest font-mono text-[#4a6070] hover:text-[#00d4ff] border border-[rgba(0,180,255,0.15)] hover:border-[rgba(0,180,255,0.4)] rounded transition-colors bg-[rgba(4,9,22,0.8)]"
    >
      {LANGS.find((l) => l.code !== language)?.label}
    </button>
  )
}

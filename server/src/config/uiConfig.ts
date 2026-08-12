/**
 * The client's currently selected display language, mirrored to the server
 * so LLM-generated content (the intel brief, which has no per-request
 * question to infer a language from) can match it instead of guessing.
 */
import { loadPersistedConfig, persistConfig } from './configStore'

export type UiLanguage = 'en' | 'zh-TW'

const SUPPORTED: UiLanguage[] = ['en', 'zh-TW']

const savedLanguage = (loadPersistedConfig().ui as { language?: string } | undefined)?.language
let language: UiLanguage = SUPPORTED.includes(savedLanguage as UiLanguage) ? (savedLanguage as UiLanguage) : 'zh-TW'

export function getUiLanguage(): UiLanguage {
  return language
}

export function setUiLanguage(lang: string): void {
  if (!SUPPORTED.includes(lang as UiLanguage)) return
  language = lang as UiLanguage
  persistConfig({ ui: { language } })
}

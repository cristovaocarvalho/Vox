import en, { type TranslationKeys } from './locales/en'
import ptBR from './locales/pt-BR'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'
import zhCN from './locales/zh-CN'
import ja from './locales/ja'
import it from './locales/it'
import { useVoxStore, type AppLocale } from '../stores/useVoxStore'

export type Locale = AppLocale

const catalogs: Record<Locale, TranslationKeys> = {
  en,
  'pt-BR': ptBR,
  es,
  fr,
  de,
  'zh-CN': zhCN,
  ja,
  it
}

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return 'pt-BR'
  const v = value.toLowerCase()
  if (v === 'en' || v.startsWith('en-')) return 'en'
  if (v === 'pt-br' || v === 'pt' || v.startsWith('pt')) return 'pt-BR'
  if (v === 'es' || v.startsWith('es-')) return 'es'
  if (v === 'fr' || v.startsWith('fr-')) return 'fr'
  if (v === 'de' || v.startsWith('de-')) return 'de'
  if (v === 'zh-cn' || v === 'zh' || v.startsWith('zh')) return 'zh-CN'
  if (v === 'ja' || v.startsWith('ja-')) return 'ja'
  if (v === 'it' || v.startsWith('it-')) return 'it'
  return 'pt-BR'
}

type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
        : Prefix extends ''
          ? K
          : `${Prefix}.${K}`
    }[keyof T & string]
  : never

export type TranslationKey = NestedKeyOf<TranslationKeys>

function getByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split('.')
  let cur: any = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[p]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function translate(
  locale: Locale,
  key: TranslationKey | string,
  vars?: Record<string, string | number>
): string {
  const catalog = catalogs[locale] || catalogs['pt-BR']
  let text = getByPath(catalog, key) ?? getByPath(catalogs.en, key) ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return text
}

const LOCALE_TAG_MAP: Record<Locale, string> = {
  en: 'en-US',
  'pt-BR': 'pt-BR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  'zh-CN': 'zh-CN',
  ja: 'ja-JP',
  it: 'it-IT'
}

export function useI18n() {
  const language = useVoxStore((s) => s.language)
  const locale = normalizeLocale(language)

  const t = (key: TranslationKey | string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars)

  const localeTag = LOCALE_TAG_MAP[locale] || 'pt-BR'

  return { t, locale, localeTag, language: locale }
}

export { en, ptBR, es, fr, de, zhCN, ja, it }

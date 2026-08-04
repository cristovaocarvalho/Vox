import en, { type TranslationKeys } from './locales/en'
import ptBR from './locales/pt-BR'
import { useVoxStore, type AppLocale } from '../stores/useVoxStore'

export type Locale = AppLocale

const catalogs: Record<Locale, TranslationKeys> = {
  en,
  'pt-BR': ptBR
}

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return 'pt-BR'
  const v = value.toLowerCase()
  if (v === 'en' || v.startsWith('en-')) return 'en'
  if (v === 'pt-br' || v === 'pt' || v.startsWith('pt')) return 'pt-BR'
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

export function useI18n() {
  const language = useVoxStore((s) => s.language)
  const locale = normalizeLocale(language)

  const t = (key: TranslationKey | string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars)

  const localeTag = locale === 'en' ? 'en-US' : 'pt-BR'

  return { t, locale, localeTag, language: locale }
}

export { en, ptBR }

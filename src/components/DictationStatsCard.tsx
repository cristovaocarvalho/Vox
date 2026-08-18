import React, { useMemo } from 'react'
import { LiquidGlassCard } from './LiquidGlassCard'
import { useI18n } from '../i18n'

export interface DictationStatsData {
  totalWords: number
  totalSessions: number
  dailyContributions: Record<string, { count: number; words: number }>
}

export interface DictationStatsCardProps {
  stats: DictationStatsData
  className?: string
}

const getIntensityLevel = (words: number): number => {
  if (words <= 0) return 0
  if (words <= 30) return 1
  if (words <= 100) return 2
  if (words <= 250) return 3
  return 4
}

const CELL_COLOR_CLASSES: Record<number, string> = {
  0: 'bg-white/[0.04] border-white/[0.06] hover:border-white/20',
  1: 'bg-white/20 border-white/30 hover:border-white/45',
  2: 'bg-white/45 border-white/55 hover:border-white/70',
  3: 'bg-white/70 border-white/80 hover:border-white/95',
  4: 'bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.65)] hover:scale-125'
}

export const DictationStatsCard: React.FC<DictationStatsCardProps> = ({
  stats,
  className = ''
}) => {
  const { t, localeTag } = useI18n()

  // Gerar os últimos 30 dias em ordem cronológica
  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const list: Array<{ dateStr: string; date: Date; words: number; count: number }> = []

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayData = stats.dailyContributions[dateStr] || { words: 0, count: 0 }

      list.push({
        dateStr,
        date: d,
        words: dayData.words,
        count: dayData.count
      })
    }

    return list
  }, [stats.dailyContributions])

  const formattedTotalWords = useMemo(() => {
    return new Intl.NumberFormat(localeTag).format(stats.totalWords || 0)
  }, [stats.totalWords, localeTag])

  const formattedTotalSessions = useMemo(() => {
    return new Intl.NumberFormat(localeTag).format(stats.totalSessions || 0)
  }, [stats.totalSessions, localeTag])

  return (
    <LiquidGlassCard glowIntensity="sm" blurIntensity="md" className={`p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4 h-full">
        {/* Lado esquerdo: Métricas All-time */}
        <div className="flex flex-col justify-between min-w-0">
          <div>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-label-wide block mb-1">
              {t('stats.title')}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-heading tracking-tight text-text-primary">
                {formattedTotalWords}
              </span>
              <span className="text-xs text-text-muted font-medium">
                {t('stats.words')}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-border/60 text-[10px] font-medium text-text-secondary">
              {formattedTotalSessions} {t('stats.sessions')}
            </span>
          </div>
        </div>

        {/* Lado direito: Heatmap GitHub Style (30 dias em 6 colunas x 5 linhas de 11px) */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[10px] text-text-muted mb-2 font-medium">
            {t('stats.last30Days')}
          </span>

          <div className="grid grid-flow-col grid-rows-5 gap-[4px] p-2 bg-background/40 border border-border/40 rounded-xl">
            {days.map((day) => {
              const level = getIntensityLevel(day.words)
              const formattedDate = day.date.toLocaleDateString(localeTag, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
              const tooltipText = day.words > 0
                ? `${day.words} ${t('stats.words')} (${day.count} ${t('stats.sessions')}) • ${formattedDate}`
                : `${t('stats.noActivity')} • ${formattedDate}`

              return (
                <div
                  key={day.dateStr}
                  title={tooltipText}
                  className={`w-[11px] h-[11px] rounded-[2px] border transition-transform duration-150 cursor-pointer ${CELL_COLOR_CLASSES[level]}`}
                />
              )
            })}
          </div>
        </div>
      </div>
    </LiquidGlassCard>
  )
}

export default DictationStatsCard

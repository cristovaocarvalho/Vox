import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconCopy } from '../../components'
import { useI18n } from '../../i18n'

interface ClipboardItem {
  id: string
  text: string
  createdAt: string
}

const formatTimeAgo = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export const ClipboardWindow: React.FC = () => {
  const { t } = useI18n()
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistory = async () => {
    try {
      const sessions = await window.vox?.listSessions(10, 'dictation')
      setItems((sessions || []) as ClipboardItem[])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    const unsub = window.vox?.onClipboardRefresh?.(() => {
      setLoading(true)
      fetchHistory()
    })
    return () => unsub?.()
  }, [])

  const insert = (text: string) => {
    window.vox?.insertClipboardItem?.(text)
  }

  return (
    <div className="w-full h-full flex flex-col select-none drag-region p-0 bg-transparent">
      <div className="w-full h-full flex flex-col bg-[#16161A]/95 backdrop-blur-xl backdrop-saturate-150 border border-border shadow-none overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <IconCopy className="w-3.5 h-3.5 text-white/70" />
            <span className="text-xs font-semibold font-heading tracking-tight text-white">{t('type.history')}</span>
          </div>
          <button
            type="button"
            onClick={() => window.vox?.hideClipboard?.()}
            className="text-white/50 hover:text-white p-1 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {loading ? (
            <p className="text-[11px] text-white/50 py-10 text-center">…</p>
          ) : items.length === 0 ? (
            <p className="text-[11px] text-white/40 py-10 text-center">{t('type.historyEmpty')}</p>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item, idx) => (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.18 }}
                  onClick={() => insert(item.text)}
                  className="w-full text-left px-3 py-2.5 bg-white/[0.04] hover:bg-white/[0.1] border border-white/5 hover:border-white/15 transition-colors duration-150 cursor-pointer group"
                >
                  <p className="text-xs text-white/90 leading-snug line-clamp-2 break-words">
                    {item.text}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/35 font-mono tnum">{formatTimeAgo(item.createdAt)}</span>
                    <span className="text-[10px] text-white/0 group-hover:text-white/50 transition-colors duration-150 flex items-center gap-1">
                      <IconCopy className="w-3 h-3" />
                      {t('type.copy')}
                    </span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClipboardWindow

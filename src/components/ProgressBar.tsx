import React from 'react'

export interface ProgressBarProps {
  progress: number // 0 a 100
  label?: string
  sublabel?: string
  status?: 'normal' | 'success' | 'error'
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  sublabel,
  status = 'normal'
}) => {
  const barColors = {
    normal: 'bg-accent',
    success: 'bg-success',
    error: 'bg-error'
  }

  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className="w-full space-y-2">
      {(label || sublabel) && (
        <div className="flex justify-between items-baseline text-xs">
          {label && <span className="font-medium text-text-primary">{label}</span>}
          {sublabel && <span className="text-text-secondary font-mono text-[11px] tnum">{sublabel}</span>}
        </div>
      )}
      <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-smooth ${barColors[status]} shadow-[0_0_8px_rgba(255,255,255,0.35)]`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar

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
    <div className="w-full space-y-1.5">
      {(label || sublabel) && (
        <div className="flex justify-between text-xs">
          {label && <span className="font-medium text-text-primary">{label}</span>}
          {sublabel && <span className="text-text-secondary">{sublabel}</span>}
        </div>
      )}
      <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden border border-border">
        <div
          className={`h-full transition-all duration-300 ${barColors[status]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar

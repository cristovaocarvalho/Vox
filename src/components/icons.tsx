import React from 'react'

export interface IconProps {
  className?: string
  strokeWidth?: number
}

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({
  className = '',
  strokeWidth = 1.8,
  children
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
)

export const IconCheck: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M5 13l4 4L19 7" />
  </Svg>
)

export const IconClock: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)

export const IconDownload: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 4v11" />
    <path d="M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </Svg>
)

export const IconMic: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Svg>
)

export const IconFile: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Svg>
)

export const IconFolder: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
)

export const IconGlobe: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14.5 14.5 0 0 1 0 18a14.5 14.5 0 0 1 0-18" />
  </Svg>
)

export const IconFilm: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5" />
  </Svg>
)

export const IconUpload: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 16V5" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 20h16" />
  </Svg>
)

export const IconTrash: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M4 7h16" />
    <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
    <path d="M6.5 7l1 12a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8l1-12" />
  </Svg>
)

export const IconChevronDown: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
)

export const IconAlert: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 4L2.5 20h19z" />
    <path d="M12 10v4" />
    <path d="M12 17.2v.1" />
  </Svg>
)

export const IconX: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const IconCopy: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
)

export const IconShield: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 3l7.5 3v5.5c0 4.5-3 8-7.5 9.5c-4.5-1.5-7.5-5-7.5-9.5V6z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
)

export const IconTerminal: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M7 9l3 3-3 3" />
    <path d="M12.5 15H17" />
  </Svg>
)


export const IconGear: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" />
  </Svg>
)

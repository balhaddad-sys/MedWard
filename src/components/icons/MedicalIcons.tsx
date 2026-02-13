interface MedIconProps {
  className?: string
}

export function StethoscopeIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 2v4a6 6 0 0 0 12 0V2" />
      <path d="M12 10v4" />
      <circle cx="12" cy="18" r="4" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function HeartbeatIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12h4l2-6 2 12 2-4 2 2h8" />
    </svg>
  )
}

export function LungsIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 4v8" />
      <path d="M12 8c-3 0-5 2-6 5s-2 6 0 7 4 0 6-1" />
      <path d="M12 8c3 0 5 2 6 5s2 6 0 7-4 0-6-1" />
    </svg>
  )
}

export function BrainIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2C8 2 5 5 5 8c0 1.5.5 3 1.5 4S5 14.5 5 16c0 2.5 3 4 7 4s7-1.5 7-4c0-1.5-1-2.5-1.5-4S19 9.5 19 8c0-3-3-6-7-6z" />
      <path d="M12 2v18" />
      <path d="M8 6c2 1.5 4 1.5 6 0" />
      <path d="M7 12h10" />
    </svg>
  )
}

export function BloodPressureIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="7" width="8" height="10" rx="2" />
      <circle cx="17" cy="12" r="5" />
      <path d="M11 12h1" />
      <path d="M17 9v3l2 1" />
    </svg>
  )
}

export function FlaskIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3h6" />
      <path d="M10 3v7l-5 8a1.5 1.5 0 0 0 1.3 2.2h11.4a1.5 1.5 0 0 0 1.3-2.2l-5-8V3" />
      <path d="M7 16h10" />
    </svg>
  )
}

export function LightningIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2 4 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  )
}

export function HeartRhythmIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      <path d="M5 12h3l1.5-3 2 6 1.5-3h6" />
    </svg>
  )
}

export function BloodClotIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2c0 0-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z" />
      <path d="M9.5 12l5-3" />
      <path d="M9.5 15l5-3" />
    </svg>
  )
}

export function SyringeIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2l4 4" />
      <path d="M17 7l-10 10" />
      <path d="M15 5l-10 10" />
      <rect x="5" y="13" width="6" height="6" rx="1" transform="rotate(-45 8 16)" />
      <path d="M3 21l2-2" />
      <path d="M12 8l4 4" />
    </svg>
  )
}

export function ClipboardMedicalIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3h6v2H9z" />
      <path d="M12 10v6" />
      <path d="M9 13h6" />
    </svg>
  )
}

export function BedPatientIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 20v-8h18v8" />
      <path d="M3 12V8a2 2 0 0 1 2-2h4" />
      <path d="M21 12V8a2 2 0 0 0-2-2H9" />
      <circle cx="7" cy="8" r="2" />
      <path d="M3 20h0" />
      <path d="M21 20h0" />
    </svg>
  )
}

export function EmergencySignIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l10 10-10 10L2 12z" />
      <path d="M12 8v4" />
      <path d="M10 10h4" />
    </svg>
  )
}

export function StopwatchIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M10 2h4" />
      <path d="M12 2v3" />
      <path d="M19.4 6.6l1-1" />
    </svg>
  )
}

export function PhoneCallIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function SirenIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v4" />
      <path d="M5 5l2.5 2.5" />
      <path d="M19 5l-2.5 2.5" />
      <path d="M6 12H4" />
      <path d="M20 12h-2" />
      <path d="M7 17h10" />
      <path d="M12 6a6 6 0 0 1 6 6v5H6v-5a6 6 0 0 1 6-6z" />
      <path d="M5 20h14" />
    </svg>
  )
}

export function PillIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.5 1.5l-8 8a4.95 4.95 0 0 0 7 7l8-8a4.95 4.95 0 0 0-7-7z" />
      <path d="M6.5 12.5l5-5" />
      <path d="M18 13v6" />
      <path d="M15 16h6" />
    </svg>
  )
}

export function CheckIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function WarningTriangleIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  )
}

export function CopyIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function NoteIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function FileListIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  )
}

export function ExternalLinkIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </svg>
  )
}

export function ChevronUpIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

export function ChevronDownIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function CloseIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

export function SearchIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export function PlayIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

export function PauseIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

export function ResetIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

export function PlusIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function MedicalCrossIcon({ className = 'w-6 h-6' }: MedIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
    </svg>
  )
}

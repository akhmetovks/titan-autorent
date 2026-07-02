import { useId } from 'react'

export default function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <path d="M9 10h14v3.2h-5.4V23h-3.2V13.2H9V10Z" fill="#111827" />
    </svg>
  )
}

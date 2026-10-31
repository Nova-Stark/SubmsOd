import React from 'react'
import { cn } from '@/lib/utils'

export type StatusType =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED'
  | 'PAID'
  | 'CANCELLED'
  | 'OVERDUE'
  | 'PENDING'

interface StatusBadgeProps {
  status: StatusType | string
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const normalized = status.toUpperCase()

  const configMap: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    DRAFT: {
      label: 'Draft',
      bg: 'bg-slate-100 border-slate-200',
      text: 'text-slate-700',
      dot: 'bg-slate-400',
    },
    QUOTATION: {
      label: 'Quotation Sent',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    },
    CONFIRMED: {
      label: 'Confirmed',
      bg: 'bg-sky-50 border-sky-200',
      text: 'text-sky-800',
      dot: 'bg-sky-500',
    },
    ACTIVE: {
      label: 'Active',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    PAUSED: {
      label: 'Paused',
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-800',
      dot: 'bg-orange-500',
    },
    CLOSED: {
      label: 'Closed',
      bg: 'bg-slate-100 border-slate-300',
      text: 'text-slate-600',
      dot: 'bg-slate-500',
    },
    PAID: {
      label: 'Paid',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-800',
      dot: 'bg-rose-500',
    },
    OVERDUE: {
      label: 'Overdue',
      bg: 'bg-rose-100 border-rose-300',
      text: 'text-rose-900 font-semibold',
      dot: 'bg-rose-600 animate-pulse',
    },
  }

  const badge = configMap[normalized] || {
    label: status,
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none',
        badge.bg,
        badge.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', badge.dot)} />
      {badge.label}
    </span>
  )
}


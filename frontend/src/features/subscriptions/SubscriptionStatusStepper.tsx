import React from 'react'
import { SubscriptionStatus } from '@/types/subscription'
import { Check, PauseCircle, XCircle } from 'lucide-react'

interface SubscriptionStatusStepperProps {
  currentStatus: SubscriptionStatus
}

const STEPS: { status: SubscriptionStatus; label: string }[] = [
  { status: 'DRAFT', label: '1. Draft' },
  { status: 'QUOTATION', label: '2. Quotation' },
  { status: 'CONFIRMED', label: '3. Confirmed' },
  { status: 'ACTIVE', label: '4. Active' },
  { status: 'CLOSED', label: '5. Closed' },
]

export const SubscriptionStatusStepper: React.FC<SubscriptionStatusStepperProps> = ({ currentStatus }) => {
  const isPaused = currentStatus === 'PAUSED'
  const isClosed = currentStatus === 'CLOSED'

  const getStepIndex = (status: SubscriptionStatus) => {
    switch (status) {
      case 'DRAFT':
        return 0
      case 'QUOTATION':
        return 1
      case 'CONFIRMED':
        return 2
      case 'ACTIVE':
      case 'PAUSED':
        return 3
      case 'CLOSED':
        return 4
      default:
        return 0
    }
  }

  const currentIndex = getStepIndex(currentStatus)

  return (
    <div className="w-full bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Contract Lifecycle Engine
        </span>
        <div className="flex items-center gap-2">
          {isPaused && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
              <PauseCircle className="w-3.5 h-3.5 text-orange-600" /> Subscription Temporarily Paused
            </span>
          )}
          {isClosed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
              <XCircle className="w-3.5 h-3.5 text-slate-500" /> Contract Closed
            </span>
          )}
        </div>
      </div>

      {/* Stepper bar */}
      <div className="relative flex items-center justify-between w-full">
        {/* Connecting track background */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0" />

        {/* Progress track */}
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-[#714b67] transition-all duration-300 z-0"
          style={{ width: `${(Math.min(currentIndex, 4) / 4) * 88}%` }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex || (idx === 4 && isClosed)
          const isCurrent = idx === currentIndex

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  isCompleted
                    ? 'bg-[#714b67] text-white ring-4 ring-[#f5eff3]'
                    : isCurrent
                    ? 'bg-white border-2 border-[#714b67] text-[#714b67] ring-4 ring-[#f5eff3]'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
              </div>
              <span
                className={`text-[11px] font-medium mt-1.5 whitespace-nowrap ${
                  isCurrent
                    ? 'text-[#714b67] font-bold'
                    : isCompleted
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

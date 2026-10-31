import React from 'react'
import { Check, X } from 'lucide-react'
import { evaluatePassword } from '@/lib/password'

interface PasswordStrengthChecklistProps {
  password?: string
}

export const PasswordStrengthChecklist: React.FC<PasswordStrengthChecklistProps> = ({ password = '' }) => {
  const { criteria, score, isStrong } = evaluatePassword(password)

  if (!password) {
    return (
      <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
        <span className="font-medium text-slate-700">Password requirements:</span>
        <ul className="mt-1 list-disc list-inside space-y-0.5">
          {criteria.map((c) => (
            <li key={c.id}>{c.label}</li>
          ))}
        </ul>
      </div>
    )
  }

  const strengthColor =
    score <= 1
      ? 'bg-rose-500'
      : score === 2
      ? 'bg-amber-500'
      : score === 3
      ? 'bg-sky-500'
      : 'bg-emerald-500'

  const strengthLabel =
    score <= 1
      ? 'Weak'
      : score === 2
      ? 'Moderate'
      : score === 3
      ? 'Good'
      : 'Strong & Compliant'

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs flex flex-col gap-2">
      <div className="flex items-center justify-between text-slate-600 font-medium">
        <span>Password Strength:</span>
        <span className={isStrong ? 'text-emerald-600 font-semibold' : 'text-slate-600'}>
          {strengthLabel} ({score}/4)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strengthColor}`}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
        {criteria.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              c.met ? 'text-emerald-700 font-medium' : 'text-slate-400'
            }`}
          >
            {c.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


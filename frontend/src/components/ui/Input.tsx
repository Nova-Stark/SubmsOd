import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700">
            {label} {props.required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-md border bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-[#714b67] focus:border-[#714b67]',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
            error ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400' : 'border-slate-300',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-500">{helperText}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'

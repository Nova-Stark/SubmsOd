import { z } from 'zod'

export interface PasswordCriterion {
  id: string
  label: string
  met: boolean
}

export interface PasswordEvaluation {
  score: number // 0 to 4
  isStrong: boolean
  criteria: PasswordCriterion[]
}

export function evaluatePassword(password: string): PasswordEvaluation {
  const criteria: PasswordCriterion[] = [
    {
      id: 'length',
      label: 'More than 8 characters (at least 9)',
      met: password.length > 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&*...)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ]

  const score = criteria.filter((c) => c.met).length
  const isStrong = score === 4

  return {
    score,
    isStrong,
    criteria,
  }
}

export const passwordValidationSchema = z
  .string()
  .min(9, 'Password must be more than 8 characters')
  .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Must contain at least 1 lowercase letter')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least 1 special character')

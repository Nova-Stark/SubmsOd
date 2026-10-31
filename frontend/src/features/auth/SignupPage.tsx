import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from './AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthChecklist } from './PasswordStrengthChecklist'
import { passwordValidationSchema, evaluatePassword } from '@/lib/password'
import { useToast } from '@/components/feedback/Toast'
import { Info, UserCheck } from 'lucide-react'

const signupSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: passwordValidationSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof signupSchema>

export const SignupPage: React.FC = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  // Live watch password to update checklist dynamically
  const watchedPassword = useWatch({ control, name: 'password', defaultValue: '' })
  const pwdEvaluation = evaluatePassword(watchedPassword || '')

  const onSubmit = async (data: SignupFormValues) => {
    setServerError(null)
    try {
      const user = await signup({
        email: data.email,
        password: data.password,
      })
      success(`Welcome to Brightloop, ${user.email}!`)
      navigate('/portal/subscriptions')
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ||
        'Registration could not be completed. Please check your details.'
      setServerError(message)
      toastError(message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#714b67] text-white flex items-center justify-center font-bold text-xl shadow-md">
            BL
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Brightloop</span>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-800">
          Create Customer Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Sign up to manage your subscriptions and view billing invoices
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {serverError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 font-medium">
              {serverError}
            </div>
          )}

          <div className="mb-4 p-3 bg-[#e6f3f4] border border-[#a4d4d6] rounded-md text-xs text-[#01656a] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#017e84]" />
            <span>
              <strong>Customer Portal Access:</strong> Public registration provisions customer accounts. Internal staff accounts are created exclusively by the Administrator.
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Business Email Address"
              type="email"
              autoComplete="email"
              placeholder="billing@yourcompany.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Create Password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              {/* Live interactive checklist */}
              <div className="mt-2.5">
                <PasswordStrengthChecklist password={watchedPassword} />
              </div>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              isLoading={isSubmitting}
              disabled={isSubmitting || !pwdEvaluation.isStrong}
            >
              <UserCheck className="w-4 h-4" /> Complete Registration
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-[#714b67] hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


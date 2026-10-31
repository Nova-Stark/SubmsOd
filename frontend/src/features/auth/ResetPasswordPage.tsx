import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthChecklist } from './PasswordStrengthChecklist'
import { passwordValidationSchema, evaluatePassword } from '@/lib/password'
import { useToast } from '@/components/feedback/Toast'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

const resetSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    tokenCode: z.string().min(1, 'Reset code is required'),
    newPassword: passwordValidationSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormValues = z.infer<typeof resetSchema>

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    mode: 'onChange',
    defaultValues: {
      email: searchParams.get('email') || '',
      tokenCode: searchParams.get('code') || '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const codeParam = searchParams.get('code')
    if (emailParam) setValue('email', emailParam)
    if (codeParam) setValue('tokenCode', codeParam)
  }, [searchParams, setValue])

  const watchedPassword = useWatch({ control, name: 'newPassword', defaultValue: '' })
  const pwdEvaluation = evaluatePassword(watchedPassword || '')

  const onSubmit = async (data: ResetFormValues) => {
    setServerError(null)
    try {
      const res = await authService.resetPassword({
        email: data.email,
        tokenCode: data.tokenCode,
        newPassword: data.newPassword,
      })
      success(res.message)
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Password reset failed. Please check token.'
      setServerError(msg)
      toastError(msg)
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
          Set New Password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enter your verification code and choose a new secure password
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {serverError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 font-medium">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Registered Email"
              type="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Reset Verification Code"
              placeholder="e.g. RESET-123456"
              error={errors.tokenCode?.message}
              {...register('tokenCode')}
            />

            <div>
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••••••"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />

              <div className="mt-2.5">
                <PasswordStrengthChecklist password={watchedPassword} />
              </div>
            </div>

            <Input
              label="Confirm New Password"
              type="password"
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
              <CheckCircle2 className="w-4 h-4" /> Save New Password & Log In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-[#714b67] hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/feedback/Toast'
import { ArrowLeft, MailCheck, KeyRound } from 'lucide-react'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [dispatchedCode, setDispatchedCode] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotFormValues) => {
    try {
      const res = await authService.forgotPassword({ email: data.email })
      setSubmittedEmail(data.email)
      setDispatchedCode(res.resetCode || null)
      success(res.message)
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message || 'Failed to dispatch reset request.')
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
          Reset your password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          We will send a secure verification code to your registered business email
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {dispatchedCode ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <MailCheck className="w-4 h-4 text-emerald-600" /> Reset Code Dispatched!
                </div>
                <p>
                  A reset verification code was sent to <strong>{submittedEmail}</strong>.
                </p>
                <div className="mt-2.5 p-2 bg-white border border-emerald-300 rounded font-mono text-center text-emerald-900 font-bold tracking-wider">
                  {dispatchedCode}
                </div>
              </div>

              <Button
                variant="teal"
                className="w-full"
                onClick={() =>
                  navigate(
                    `/reset-password?email=${encodeURIComponent(submittedEmail)}&code=${encodeURIComponent(
                      dispatchedCode
                    )}`
                  )
                }
              >
                <KeyRound className="w-4 h-4" /> Proceed to Enter New Password
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="billing@yourcompany.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-2"
                isLoading={isSubmitting}
              >
                Send Verification Code
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

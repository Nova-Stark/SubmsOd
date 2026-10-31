import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from './AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/feedback/Toast'
import { ENV } from '@/config/env'
import { Sparkles } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const { login, switchRoleMock } = useAuth()
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null)
    try {
      const user = await login(data)
      success(`Welcome back, ${user.name || user.email}!`)
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard')
      } else if (user.role === 'STAFF') {
        navigate('/staff/subscriptions')
      } else {
        navigate('/portal/subscriptions')
      }
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Login failed. Please check credentials.'
      setServerError(message)
      toastError(message)
    }
  }

  const fillQuickDemo = (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => {
    switchRoleMock(role)
    if (role === 'ADMIN') {
      setValue('email', 'admin@brightloop.io')
      setValue('password', 'AdminPassword123!')
      navigate('/admin/dashboard')
    } else if (role === 'STAFF') {
      setValue('email', 'staff@brightloop.io')
      setValue('password', 'StaffPassword123!')
      navigate('/staff/subscriptions')
    } else {
      setValue('email', 'sarah@acme.inc')
      setValue('password', 'CustomerPassword123!')
      navigate('/portal/subscriptions')
    }
    success(`Switched to demo ${role} account`)
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
          Sign in to your billing workspace
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Automated subscription, billing and revenue operations
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
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#714b67] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <Link to="/signup" className="font-semibold text-[#714b67] hover:underline">
              Sign up as Customer
            </Link>
          </div>

          {/* Quick Demo Switcher for Hackathon Review (Only visible when VITE_USE_MOCK=true) */}
          {ENV.USE_MOCK && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5 font-medium">
                <span className="flex items-center gap-1 text-[#017e84] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Hackathon 1-Click Role Switch
                </span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Mock Mode</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickDemo('ADMIN')}
                  className="px-2.5 py-1.5 bg-[#f5eff3] border border-[#d4b8cc] text-[#714b67] rounded text-xs font-medium hover:bg-[#ebdbe7] transition-colors text-center"
                >
                  Admin / Finance
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('STAFF')}
                  className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-200 transition-colors text-center"
                >
                  Staff (Sales/Ops)
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo('CUSTOMER')}
                  className="px-2.5 py-1.5 bg-[#e6f3f4] border border-[#a4d4d6] text-[#017e84] rounded text-xs font-medium hover:bg-[#d0eaeb] transition-colors text-center"
                >
                  Customer Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

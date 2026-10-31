import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useToast } from '@/components/feedback/Toast'
import { formatDate } from '@/lib/formatters'
import { PasswordStrengthChecklist } from '@/features/auth/PasswordStrengthChecklist'
import { evaluatePassword } from '@/lib/password'
import { Users, UserPlus, Shield, Mail, CheckCircle2 } from 'lucide-react'

const staffSchema = z.object({
  name: z.string().max(60, 'Name cannot exceed 60 characters').optional(),
  email: z.string().min(1, 'Work email is required').email('Please enter a valid work email address'),
  password: z
    .string()
    .min(9, 'Password must be more than 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
})

type StaffFormData = z.infer<typeof staffSchema>

export const StaffManagerView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })

  const watchPassword = watch('password')
  const pwdCheck = evaluatePassword(watchPassword || '')

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => authService.listStaff(),
  })

  const createStaffMutation = useMutation({
    mutationFn: (data: StaffFormData) =>
      authService.createStaff({
        email: data.email,
        name: data.name || undefined,
        password: data.password,
      }),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      success(`Staff account for ${newUser.name || newUser.email} created successfully!`)
      setShowCreateModal(false)
      reset()
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to create staff account.')
    },
  })

  const onSubmit = (data: StaffFormData) => {
    createStaffMutation.mutate(data)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Account Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Only: Provision and manage internal team members for operations and sales
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <UserPlus className="w-4 h-4" /> Provision Staff Account
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Active Staff Directory ({staffList.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Role: <strong className="text-slate-700">STAFF</strong> (Standard Ops Access)
            </span>
          </div>

          {isLoading ? (
            <div className="p-6">
              <SkeletonLoader rows={4} />
            </div>
          ) : staffList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Staff Accounts Found"
              description="Click 'Provision Staff Account' above to create internal credentials for operations staff."
              actionLabel="Add First Staff Member"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {staffList.map((st) => (
                <div key={st.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#714b67]/10 text-[#714b67] flex items-center justify-center font-bold text-xs uppercase">
                      {(st.name || st.email).charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{st.name || 'Staff Member'}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-[#714b67] px-1.5 py-0.5 rounded font-semibold border border-purple-200">
                          <Shield className="w-2.5 h-2.5" /> STAFF
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" /> {st.email}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Joined {st.createdAt ? formatDate(st.createdAt) : 'Recently'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provision Staff Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          reset()
        }}
        title="Provision Internal Staff Account"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              label="Staff Full Name"
              type="text"
              placeholder="e.g. Maya Iyer"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <div>
            <Input
              label="Work Email Address"
              type="email"
              placeholder="e.g. maya.ops@brightloop.io"
              required
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div>
            <Input
              label="Temporary Password"
              type="password"
              placeholder="••••••••••••"
              required
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="mt-2.5">
              <PasswordStrengthChecklist password={watchPassword || ''} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createStaffMutation.isPending}
              disabled={!isValid || !pwdCheck.isStrong}
            >
              <UserPlus className="w-4 h-4" /> Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

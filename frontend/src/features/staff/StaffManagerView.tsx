import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

export const StaffManagerView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const pwdCheck = evaluatePassword(password)

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => authService.listStaff(),
  })

  const createStaffMutation = useMutation({
    mutationFn: () =>
      authService.createStaff({
        email,
        name: name || undefined,
        password,
      }),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      success(`Staff account for ${newUser.name || newUser.email} created successfully!`)
      setShowCreateModal(false)
      setName('')
      setEmail('')
      setPassword('')
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to create staff account.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toastError('Please fill in all required fields.')
      return
    }
    if (!pwdCheck.isStrong) {
      toastError('Password does not satisfy all complexity requirements.')
      return
    }
    createStaffMutation.mutate()
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
          {isLoading ? (
            <div className="p-6"><SkeletonLoader rows={4} /></div>
          ) : staffList.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="No Staff Accounts Found"
                description="Click 'Provision Staff Account' above to onboard your first team member."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Staff Name & Email</th>
                    <th className="py-3 px-4">Role Access</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{member.name || member.email.split('@')[0]}</div>
                        <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" /> {member.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                            member.role === 'ADMIN'
                              ? 'bg-[#f5eff3] text-[#714b67] border border-[#d4b8cc]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Shield className="w-3 h-3" /> {member.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {formatDate(member.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provision Staff Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision Internal Staff Account"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Staff Full Name"
            type="text"
            placeholder="e.g. Maya Iyer"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Work Email Address"
            type="email"
            placeholder="e.g. maya.ops@brightloop.io"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <Input
              label="Temporary Password"
              type="password"
              placeholder="••••••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-2.5">
              <PasswordStrengthChecklist password={password} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createStaffMutation.isPending}
              disabled={!email || !password || !pwdCheck.isStrong}
            >
              <UserPlus className="w-4 h-4" /> Create Staff Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

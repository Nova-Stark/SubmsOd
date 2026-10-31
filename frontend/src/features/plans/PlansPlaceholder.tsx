import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'

export const PlansPlaceholder: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-xs text-slate-500 mt-0.5">Configure recurring intervals, renewal rules, and lifecycle flags</p>
        </div>
        {isAdmin && (
          <Link to="/admin/plans/new">
            <Button variant="primary">
              <Plus className="w-4 h-4" /> Create Plan
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Plan Manager Initialized</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Daily, weekly, monthly, and yearly recurring plan engines ready for Hour 1-3.
        </p>
      </div>
    </div>
  )
}

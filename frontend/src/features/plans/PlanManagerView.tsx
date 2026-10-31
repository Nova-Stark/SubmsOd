import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/services'
import { useAuth } from '@/features/auth/AuthContext'
import { CreatePlanModal } from './CreatePlanModal'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Plan, BillingPeriod } from '@/types/catalog'
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Tag,
  ShieldAlert,
} from 'lucide-react'

export const PlanManagerView: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<string>('ALL')

  const {
    data: plans = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['plans'],
    queryFn: () => catalogService.listPlans(),
  })

  const filteredPlans = plans.filter((p: Plan) => {
    return filterPeriod === 'ALL' || p.billingPeriod === filterPeriod
  })

  const getPeriodBadge = (period: BillingPeriod) => {
    const map = {
      DAILY: { label: 'Daily', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
      WEEKLY: { label: 'Weekly', bg: 'bg-sky-50 text-sky-800 border-sky-200' },
      MONTHLY: { label: 'Monthly', bg: 'bg-[#f5eff3] text-[#714b67] border-[#d4b8cc]' },
      YEARLY: { label: 'Yearly', bg: 'bg-[#e6f3f4] text-[#017e84] border-[#a4d4d6]' },
    }
    const config = map[period] || map.MONTHLY
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${config.bg}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Plans</h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {plans.length} plans
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated recurring billing frequencies, minimum quantities, and lifecycle termination flags
          </p>
        </div>

        {isAdmin ? (
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" /> Create Plan
          </Button>
        ) : (
          <div className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Staff View (Reference only)
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Billing Cadence:</span>
          {['ALL', 'MONTHLY', 'YEARLY', 'DAILY'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterPeriod === p
                  ? 'bg-[#714b67] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p === 'ALL' ? 'All Frequencies' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <SkeletonLoader rows={4} />
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-lg border border-rose-200">
          <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Failed to load subscription plans</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No Plans Configured"
          description="Create recurring subscription plans to define automated billing cycles."
          actionLabel={isAdmin ? 'Create New Plan' : undefined}
          onAction={isAdmin ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{plan.name}</CardTitle>
                  {getPeriodBadge(plan.billingPeriod)}
                </div>
                <div className="mt-2 font-mono">
                  <span className="text-2xl font-bold text-slate-900">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-xs text-slate-500 font-sans ml-1">
                    / {plan.billingPeriod === 'DAILY' ? 'day' : plan.billingPeriod.toLowerCase().replace('ly', '')}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-3 flex-1 text-xs">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded border border-slate-100">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Min Quantity</span>
                    <span className="font-semibold text-slate-700">{plan.minQty} seat(s)</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Availability</span>
                    <span className="font-semibold text-slate-700">
                      {formatDate(plan.startDate)} {plan.endDate ? `to ${formatDate(plan.endDate)}` : '(Open)'}
                    </span>
                  </div>
                </div>

                {/* Lifecycle Flags */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Lifecycle Permissions
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Self-Serve Pause:</span>
                      {plan.flags.allowPause ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Allowed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" /> Disallowed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Self-Serve Renewal:</span>
                      {plan.flags.allowRenew ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Allowed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" /> Disallowed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Early Termination:</span>
                      {plan.flags.allowEarlyClose ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Permitted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" /> Restricted
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Auto-Close on Expiry:</span>
                      {plan.flags.autoCloseOnEnd ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#017e84] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#017e84]" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" /> Manual
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plan Creation Modal (Admin Only) */}
      {isAdmin && (
        <CreatePlanModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}

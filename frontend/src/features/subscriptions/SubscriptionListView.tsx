import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subscriptionService } from '@/services'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Subscription } from '@/types/subscription'
import {
  Repeat,
  Plus,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'

export const SubscriptionListView: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const {
    data: subResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['subscriptions', statusFilter, search],
    queryFn: () =>
      subscriptionService.listSubscriptions({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
      }),
  })

  const subscriptions: Subscription[] = subResponse?.data || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscriptions Management</h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {subscriptions.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated recurring contracts: Draft → Quotation → Confirmed → Active → Closed
          </p>
        </div>

        <Link to="/staff/subscriptions/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" /> New Subscription
          </Button>
        </Link>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by SUB number, customer, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-[#714b67] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All Contracts' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <SkeletonLoader rows={6} />
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-lg border border-rose-200">
          <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Failed to load subscriptions</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No Subscriptions Found"
          description={
            search || statusFilter !== 'ALL'
              ? 'No subscription contracts match your filter criteria.'
              : 'Create your first subscription or convert a quotation template to begin.'
          }
          actionLabel="Create Subscription"
          onAction={() => navigate('/staff/subscriptions/new')}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Contract #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan Schedule</th>
                  <th className="py-3 px-4 text-center">Lifecycle Status</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Recurring Value</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/staff/subscriptions/${sub.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#714b67]">
                      {sub.subscriptionNumber}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{sub.customerName}</div>
                      {sub.customerEmail && (
                        <div className="text-[11px] text-slate-500 font-normal">{sub.customerEmail}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-medium">{sub.planName}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={sub.status} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {formatDate(sub.startDate)} → {formatDate(sub.expiryDate)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(sub.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/staff/subscriptions/${sub.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

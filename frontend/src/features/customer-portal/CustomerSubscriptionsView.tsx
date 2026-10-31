import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionService } from '@/services'
import { useAuth } from '@/features/auth/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useToast } from '@/components/feedback/Toast'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { SubscriptionAction, Subscription } from '@/types/subscription'
import {
  Repeat,
  PauseCircle,
  RotateCw,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react'

export const CustomerSubscriptionsView: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const {
    data: subsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['portal-subscriptions', user?.id],
    queryFn: () =>
      subscriptionService.listSubscriptions({
        customerId: user?.role === 'CUSTOMER' ? (user.email || user.id) : undefined,
        page: 1,
        limit: 50,
      }),
  })

  const subscriptions = subsData?.data || []

  const transitionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: SubscriptionAction }) =>
      subscriptionService.transitionSubscription(id, action),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['portal-subscriptions'] })
      success(`Subscription ${updated.subscriptionNumber} updated to ${updated.status}!`)
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Action failed.')
    },
  })

  const handleAction = (sub: Subscription, action: SubscriptionAction) => {
    const label = action === 'pause' ? 'Pause' : action === 'renew' ? 'Renew' : action
    if (confirm(`Are you sure you want to ${label} subscription ${sub.subscriptionNumber}?`)) {
      transitionMutation.mutate({ id: sub.id, action })
    }
  }

  if (isLoading) return <SkeletonLoader rows={4} />
  if (isError) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <p className="text-sm text-rose-600 font-medium">Failed to load your subscriptions.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => queryClient.invalidateQueries({ queryKey: ['portal-subscriptions'] })}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Subscriptions</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View and manage your active service contracts. Pause or renew when your plan allows it.
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No Subscriptions Found"
          description="You don't have any subscriptions yet. Contact our sales team to get started."
        />
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const isExpanded = expandedId === sub.id
            return (
              <Card key={sub.id} className="overflow-hidden">
                {/* Collapsed Row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#f5eff3] flex items-center justify-center shrink-0">
                      <Repeat className="w-4 h-4 text-[#714b67]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 font-mono">{sub.subscriptionNumber}</span>
                        <StatusBadge status={sub.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {sub.planName} • {formatDate(sub.startDate)} → {formatDate(sub.expiryDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-bold font-mono text-[#714b67]">{formatCurrency(sub.totalAmount)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/30">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-xs">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#017e84] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-slate-500">Contract Period</div>
                          <div className="font-semibold text-slate-900">{formatDate(sub.startDate)} – {formatDate(sub.expiryDate)}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Layers className="w-3.5 h-3.5 text-[#714b67] mt-0.5 shrink-0" />
                        <div>
                          <div className="text-slate-500">Plan</div>
                          <div className="font-semibold text-slate-900">{sub.planName}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-slate-500">Payment Terms</div>
                          <div className="font-semibold text-slate-900">{sub.paymentTerms}</div>
                        </div>
                      </div>
                    </div>

                    {/* Order Lines */}
                    <table className="w-full text-xs border-collapse mb-4">
                      <thead className="text-[11px] text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="text-left py-2">Product</th>
                          <th className="text-center py-2">Qty</th>
                          <th className="text-right py-2">Unit Price</th>
                          <th className="text-right py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sub.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="py-2">
                              <div className="font-medium text-slate-800">{line.productName}</div>
                              {line.variantName && <div className="text-[11px] text-[#714b67]">{line.variantName}</div>}
                            </td>
                            <td className="py-2 text-center font-semibold">{line.qty}</td>
                            <td className="py-2 text-right font-mono">{formatCurrency(line.unitPrice)}</td>
                            <td className="py-2 text-right font-mono font-bold">{formatCurrency(line.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end mb-4">
                      <div className="w-52 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatCurrency(sub.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tax:</span>
                          <span className="font-mono">{formatCurrency(sub.taxTotal)}</span>
                        </div>
                        {sub.discountTotal > 0 && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Discount:</span>
                            <span className="font-mono">-{formatCurrency(sub.discountTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-[#714b67]">
                          <span>Total:</span>
                          <span className="font-mono">{formatCurrency(sub.totalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Self-serve Actions — only shown if plan flags allow */}
                    {sub.status === 'ACTIVE' && (sub.flags.allowPause || sub.flags.allowRenew) && (
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                        <span className="text-[11px] text-slate-500 font-medium">Self-serve actions:</span>
                        {sub.flags.allowPause && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(sub, 'pause')}
                            isLoading={transitionMutation.isPending}
                          >
                            <PauseCircle className="w-3.5 h-3.5 text-orange-500" /> Pause Subscription
                          </Button>
                        )}
                        {sub.flags.allowRenew && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(sub, 'renew')}
                            isLoading={transitionMutation.isPending}
                          >
                            <RotateCw className="w-3.5 h-3.5 text-emerald-600" /> Renew (+1 Year)
                          </Button>
                        )}
                      </div>
                    )}

                    {sub.status === 'PAUSED' && sub.flags.allowRenew && (
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                        <span className="text-[11px] text-slate-500 font-medium">Self-serve actions:</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(sub, 'renew')}
                          isLoading={transitionMutation.isPending}
                        >
                          <RotateCw className="w-3.5 h-3.5 text-emerald-600" /> Renew Subscription
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}


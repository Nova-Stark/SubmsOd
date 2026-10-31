import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoiceService } from '@/services'
import { useAuth } from '@/features/auth/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Invoice } from '@/types/invoice'
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
} from 'lucide-react'

export const CustomerInvoicesView: React.FC = () => {
  const { user } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const { data: invoicesData, isLoading, isError } = useQuery({
    queryKey: ['portal-invoices', statusFilter, user?.id],
    queryFn: () =>
      invoiceService.listInvoices({
        customerId: user?.role === 'CUSTOMER' ? (user.email || user.id) : undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: 1,
        limit: 50,
      }),
  })

  const invoices = invoicesData?.data || []

  const getPaymentIcon = (invoice: Invoice) => {
    if (invoice.status === 'PAID') return <CheckCircle className="w-4 h-4 text-emerald-500" />
    if (invoice.isOverdue) return <AlertTriangle className="w-4 h-4 text-rose-500" />
    return <Clock className="w-4 h-4 text-amber-500" />
  }

  if (isLoading) return <SkeletonLoader rows={4} />
  if (isError) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <p className="text-sm text-rose-600 font-medium">Failed to load your invoices.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices & Receipts</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View billing invoices, payment status, and outstanding balances.
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2">
        {['ALL', 'DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#714b67] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'ALL' ? 'All Invoices' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Invoices Found"
          description={statusFilter === 'ALL' ? 'No invoices have been issued yet.' : `No ${statusFilter.toLowerCase()} invoices found.`}
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const isExpanded = expandedId === inv.id
            return (
              <Card key={inv.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {getPaymentIcon(inv)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 font-mono">{inv.invoiceNumber}</span>
                        <StatusBadge status={inv.status} />
                        {inv.isOverdue && inv.status !== 'PAID' && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Issued {formatDate(inv.issueDate)} • Due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-slate-900">{formatCurrency(inv.totalAmount)}</div>
                      {inv.amountDue > 0 && inv.status !== 'PAID' && (
                        <div className="text-[11px] font-mono text-rose-600">
                          Due: {formatCurrency(inv.amountDue)}
                        </div>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/30">
                    {/* Invoice Lines */}
                    <table className="w-full text-xs border-collapse mb-4">
                      <thead className="text-[11px] text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="text-left py-2">Description</th>
                          <th className="text-center py-2">Qty</th>
                          <th className="text-right py-2">Unit Price</th>
                          <th className="text-right py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inv.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="py-2 font-medium text-slate-800">{line.description}</td>
                            <td className="py-2 text-center">{line.qty}</td>
                            <td className="py-2 text-right font-mono">{formatCurrency(line.unitPrice)}</td>
                            <td className="py-2 text-right font-mono font-bold">{formatCurrency(line.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Payment Summary */}
                    <div className="flex justify-end mb-4">
                      <div className="w-56 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatCurrency(inv.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tax:</span>
                          <span className="font-mono">{formatCurrency(inv.taxAmount)}</span>
                        </div>
                        {inv.discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount:</span>
                            <span className="font-mono">-{formatCurrency(inv.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                          <span>Total:</span>
                          <span className="font-mono">{formatCurrency(inv.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Paid:</span>
                          <span className="font-mono">{formatCurrency(inv.amountPaid)}</span>
                        </div>
                        {inv.amountDue > 0 && (
                          <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-slate-200">
                            <span>Outstanding:</span>
                            <span className="font-mono">{formatCurrency(inv.amountDue)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payments History */}
                    {inv.payments.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Payment History</div>
                        <div className="space-y-1">
                          {inv.payments.map((pay) => (
                            <div key={pay.id} className="flex items-center justify-between bg-white rounded border border-slate-100 px-3 py-2 text-xs">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-medium text-slate-700">{pay.method.replace('_', ' ')}</span>
                                <span className="text-slate-400">{formatDate(pay.date)}</span>
                              </div>
                              <span className="font-mono font-bold text-emerald-700">{formatCurrency(pay.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Print / Download Receipt Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <div className="text-[11px] text-slate-500">
                        {inv.subscriptionNumber && <span>Linked Contract: <strong className="font-mono text-slate-700">{inv.subscriptionNumber}</strong></span>}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Receipt
                      </Button>
                    </div>
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


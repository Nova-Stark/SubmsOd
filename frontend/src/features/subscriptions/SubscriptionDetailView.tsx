import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionService, invoiceService } from '@/services'
import { SubscriptionStatusStepper } from './SubscriptionStatusStepper'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useToast } from '@/components/feedback/Toast'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { SubscriptionAction } from '@/types/subscription'
import {
  ArrowLeft,
  Send,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  RotateCw,
  XCircle,
  Receipt,
  Building,
  Calendar,
  Layers,
} from 'lucide-react'

export const SubscriptionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)

  const {
    data: subscription,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['subscription', id],
    queryFn: () => subscriptionService.getSubscription(id!),
    enabled: !!id,
  })

  // State Transition Mutation
  const transitionMutation = useMutation({
    mutationFn: ({ action }: { action: SubscriptionAction }) =>
      subscriptionService.transitionSubscription(id!, action),
    onSuccess: (updated) => {
      queryClient.setQueryData(['subscription', id], updated)
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      success(`Subscription transitioned to ${updated.status}!`)
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to update contract status.')
    },
  })

  // Generate single invoice
  const handleGenerateInvoice = async () => {
    if (!subscription) return
    setIsGeneratingInvoice(true)
    try {
      const inv = await invoiceService.generateInvoiceFromSubscription(subscription.id)
      success(`Invoice ${inv.invoiceNumber} generated for ${subscription.subscriptionNumber}!`)
      navigate('/staff/invoices')
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message || 'Failed to generate invoice.')
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  if (isLoading) return <SkeletonLoader rows={6} />
  if (isError || !subscription) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200">
        <p className="text-sm text-slate-800">Subscription contract not found.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/staff/subscriptions')}>
          Back to List
        </Button>
      </div>
    )
  }

  const { status, flags } = subscription

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/staff/subscriptions')}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                {subscription.subscriptionNumber}
              </h1>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                {subscription.planName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Contract with {subscription.customerName} ({subscription.paymentTerms})
            </p>
          </div>
        </div>

        {/* State Machine Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              isLoading={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate({ action: 'send_quotation' })}
            >
              <Send className="w-3.5 h-3.5" /> Send Quotation
            </Button>
          )}

          {status === 'QUOTATION' && (
            <Button
              variant="primary"
              size="sm"
              isLoading={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate({ action: 'confirm' })}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Confirm Contract
            </Button>
          )}

          {status === 'CONFIRMED' && (
            <Button
              variant="teal"
              size="sm"
              isLoading={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate({ action: 'activate' })}
            >
              <PlayCircle className="w-3.5 h-3.5" /> Activate Subscription
            </Button>
          )}

          {status === 'ACTIVE' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateInvoice}
                isLoading={isGeneratingInvoice}
              >
                <Receipt className="w-3.5 h-3.5" /> Generate Invoice
              </Button>

              {flags.allowPause && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={transitionMutation.isPending}
                  onClick={() => transitionMutation.mutate({ action: 'pause' })}
                >
                  <PauseCircle className="w-3.5 h-3.5 text-orange-600" /> Pause
                </Button>
              )}

              {flags.allowRenew && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={transitionMutation.isPending}
                  onClick={() => transitionMutation.mutate({ action: 'renew' })}
                >
                  <RotateCw className="w-3.5 h-3.5 text-emerald-600" /> Renew (+1 Yr)
                </Button>
              )}

              {flags.allowEarlyClose && (
                <Button
                  variant="destructive"
                  size="sm"
                  isLoading={transitionMutation.isPending}
                  onClick={() => transitionMutation.mutate({ action: 'close' })}
                >
                  <XCircle className="w-3.5 h-3.5" /> Close Contract
                </Button>
              )}
            </>
          )}

          {status === 'PAUSED' && (
            <Button
              variant="teal"
              size="sm"
              isLoading={transitionMutation.isPending}
              onClick={() => transitionMutation.mutate({ action: 'activate' })}
            >
              <PlayCircle className="w-3.5 h-3.5" /> Resume Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Visual State Engine Stepper */}
      <SubscriptionStatusStepper currentStatus={status} />

      {/* Contract Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <Card>
          <CardHeader className="py-3 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xs flex items-center gap-1.5 text-slate-700">
              <Building className="w-3.5 h-3.5 text-[#714b67]" /> Customer Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-3">
            <div className="font-bold text-sm text-slate-900">{subscription.customerName}</div>
            <div className="text-slate-500">{subscription.customerEmail || 'billing@customer.com'}</div>
            <div className="text-[11px] text-slate-400 font-mono">ID: {subscription.customerId}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xs flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#017e84]" /> Contract Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-3 font-mono">
            <div>
              <span className="text-slate-400">Start Date:</span>{' '}
              <span className="font-semibold text-slate-800">{formatDate(subscription.startDate)}</span>
            </div>
            <div>
              <span className="text-slate-400">Expiry Date:</span>{' '}
              <span className="font-semibold text-slate-800">{formatDate(subscription.expiryDate)}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-sans">
              Terms: <strong>{subscription.paymentTerms}</strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-xs flex items-center gap-1.5 text-slate-700">
              <Layers className="w-3.5 h-3.5 text-[#714b67]" /> Billing & Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-3">
            <div className="font-semibold text-slate-900">{subscription.planName}</div>
            <div className="text-slate-500">
              Total Contract: <strong className="text-slate-900 font-mono">{formatCurrency(subscription.totalAmount)}</strong>
            </div>
            <div className="text-[11px] text-slate-400">
              Status: <span className="font-semibold text-[#714b67]">{subscription.status}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Itemized Order Lines Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Contract Order Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">Item & Variant Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Tax (GST)</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscription.lines.map((line) => (
                <tr key={line.id}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{line.productName}</div>
                    {line.variantName && (
                      <div className="text-[11px] text-[#714b67] font-medium flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3" /> {line.variantName}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-800">{line.qty}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">{formatCurrency(line.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCurrency(line.taxAmount)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(line.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary Footer */}
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col items-end gap-1.5 text-xs">
            <div className="flex justify-between w-64 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">{formatCurrency(subscription.subtotal)}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-600">
              <span>GST Taxes:</span>
              <span className="font-mono font-medium">{formatCurrency(subscription.taxTotal)}</span>
            </div>
            {subscription.discountTotal > 0 && (
              <div className="flex justify-between w-64 text-emerald-700 font-semibold">
                <span>Discount Applied:</span>
                <span className="font-mono">-{formatCurrency(subscription.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 pt-2 border-t border-slate-200 text-sm font-bold text-[#714b67]">
              <span>Recurring Total:</span>
              <span className="font-mono">{formatCurrency(subscription.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

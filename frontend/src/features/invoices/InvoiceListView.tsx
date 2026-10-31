import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoiceService } from '@/services'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useToast } from '@/components/feedback/Toast'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Invoice, InvoiceStatus, PaymentMethod } from '@/types/invoice'
import {
  Receipt,
  Search,
  CheckCircle,
  XCircle,
  Send,
  Printer,
  CreditCard,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Building,
  FileText,
} from 'lucide-react'

export const InvoiceListView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)

  // Payment form state
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [payNote, setPayNote] = useState('')

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    const timeout = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
    return () => clearTimeout(timeout)
  }, [])

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, debouncedSearch, page],
    queryFn: () =>
      invoiceService.listInvoices({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        page,
        limit: 15,
      }),
    staleTime: 1000 * 30,
  })

  const invoices = invoicesData?.data || []
  const meta = invoicesData?.meta || { page: 1, limit: 15, total: 0, totalPages: 1 }

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      invoiceService.updateInvoiceStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      if (selectedInvoice?.id === updated.id) setSelectedInvoice(updated)
      success(`Invoice ${updated.invoiceNumber} → ${updated.status}`)
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Status update failed.')
    },
  })

  // Record payment mutation
  const paymentMutation = useMutation({
    mutationFn: () => {
      if (!paymentInvoiceId) throw new Error('No invoice selected')
      return invoiceService.recordPayment(paymentInvoiceId, {
        method: payMethod,
        amount: Math.round(parseFloat(payAmount) * 100),
        date: payDate,
        note: payNote || undefined,
      })
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      if (selectedInvoice?.id === result.invoice.id) setSelectedInvoice(result.invoice)
      success(`Payment of ${formatCurrency(result.payment.amount)} recorded!`)
      setShowPaymentModal(false)
      resetPaymentForm()
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to record payment.')
    },
  })

  const resetPaymentForm = () => {
    setPayMethod('BANK_TRANSFER')
    setPayAmount('')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayNote('')
  }

  const openPaymentModal = (inv: Invoice) => {
    setPaymentInvoiceId(inv.id)
    setPayAmount((inv.amountDue / 100).toFixed(2))
    setShowPaymentModal(true)
  }

  const handlePrint = () => {
    window.print()
  }

  // Detail View
  if (selectedInvoice) {
    const inv = selectedInvoice
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Print-friendly header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedInvoice(null)} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 font-mono">{inv.invoiceNumber}</h1>
                <StatusBadge status={inv.status} />
                {inv.isOverdue && inv.status !== 'PAID' && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">OVERDUE</span>
                )}
              </div>
              <p className="text-xs text-slate-500">{inv.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inv.status === 'DRAFT' && (
              <Button variant="primary" size="sm" isLoading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: inv.id, status: 'CONFIRMED' })}>
                <CheckCircle className="w-3.5 h-3.5" /> Confirm
              </Button>
            )}
            {inv.status === 'CONFIRMED' && (
              <>
                <Button variant="outline" size="sm" onClick={() => openPaymentModal(inv)}>
                  <CreditCard className="w-3.5 h-3.5" /> Record Payment
                </Button>
                <Button variant="outline" size="sm" onClick={() => toastError('Email sending is handled by the backend.')}>
                  <Send className="w-3.5 h-3.5" /> Send
                </Button>
              </>
            )}
            {(inv.status === 'DRAFT' || inv.status === 'CONFIRMED') && (
              <Button variant="destructive" size="sm" isLoading={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ id: inv.id, status: 'CANCELLED' })}>
                <XCircle className="w-3.5 h-3.5" /> Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          </div>
        </div>

        {/* Printable Invoice Card */}
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-6 sm:p-8">
            {/* Header row */}
            <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded bg-[#714b67] text-white flex items-center justify-center text-sm font-bold">BL</div>
                  <span className="text-lg font-bold text-slate-900">Brightloop</span>
                </div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div>Subscription & Revenue Operations Platform</div>
                  <div>GSTIN: 32ZZZZ0000Z9Z9</div>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-[#714b67] font-mono">{inv.invoiceNumber}</h2>
                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                  <div>Issue Date: <strong>{formatDate(inv.issueDate)}</strong></div>
                  <div>Due Date: <strong>{formatDate(inv.dueDate)}</strong></div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                  <Building className="w-3 h-3" /> Bill To
                </div>
                <div className="text-sm font-bold text-slate-900">{inv.customerName}</div>
                <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                  <div>{inv.customerEmail}</div>
                  {inv.customerAddress && <div>{inv.customerAddress}</div>}
                  {inv.gstin && <div>GSTIN: {inv.gstin}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Status</div>
                <StatusBadge status={inv.status} />
                {inv.subscriptionNumber && (
                  <div className="text-xs text-slate-500 mt-2 flex items-center gap-1 justify-end">
                    <FileText className="w-3 h-3" /> Ref: {inv.subscriptionNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Lines */}
            <table className="w-full text-sm border-collapse mb-6">
              <thead>
                <tr className="border-b-2 border-slate-300 text-[11px] text-slate-600 uppercase">
                  <th className="text-left py-3">Description</th>
                  <th className="text-center py-3 w-16">Qty</th>
                  <th className="text-right py-3">Unit Price</th>
                  <th className="text-right py-3">Tax</th>
                  <th className="text-right py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {inv.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-3 text-slate-800 font-medium">{line.description}</td>
                    <td className="py-3 text-center">{line.qty}</td>
                    <td className="py-3 text-right font-mono">{formatCurrency(line.unitPrice)}</td>
                    <td className="py-3 text-right font-mono text-slate-500">{(line.taxRate / 100).toFixed(0)}%</td>
                    <td className="py-3 text-right font-mono font-bold">{formatCurrency(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{formatCurrency(inv.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-mono">{formatCurrency(inv.taxAmount)}</span></div>
                {inv.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Discount</span><span className="font-mono">-{formatCurrency(inv.discountAmount)}</span></div>
                )}
                <div className="flex justify-between pt-2 border-t-2 border-slate-300 text-sm font-bold">
                  <span>Total</span><span className="font-mono text-[#714b67]">{formatCurrency(inv.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Amount Paid</span><span className="font-mono">{formatCurrency(inv.amountPaid)}</span>
                </div>
                {inv.amountDue > 0 && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-rose-600 font-bold text-sm">
                    <span>Amount Due</span><span className="font-mono">{formatCurrency(inv.amountDue)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payments */}
            {inv.payments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200 print:break-inside-avoid">
                <div className="text-[11px] font-semibold text-slate-500 uppercase mb-3">Payment Records</div>
                <div className="space-y-2">
                  {inv.payments.map((pay) => (
                    <div key={pay.id} className="flex items-center justify-between bg-slate-50 rounded border border-slate-100 px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="font-semibold text-slate-700">{pay.method.replace('_', ' ')}</span>
                          <span className="ml-2 text-slate-400">{formatDate(pay.date)}</span>
                          {pay.note && <span className="ml-2 text-slate-500 italic">{pay.note}</span>}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">{formatCurrency(pay.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Payment Modal */}
        <Modal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); resetPaymentForm() }}
          title="Record Payment"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 px-3"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              min="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <Input
              label="Payment Date"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
            <Input
              label="Reference / Note"
              type="text"
              placeholder="e.g. NEFT ref #998822001"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowPaymentModal(false); resetPaymentForm() }}>Cancel</Button>
              <Button
                variant="primary"
                isLoading={paymentMutation.isPending}
                onClick={() => paymentMutation.mutate()}
                disabled={!payAmount || parseFloat(payAmount) <= 0}
              >
                <CreditCard className="w-4 h-4" /> Record Payment
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  // List View
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices & Billing</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage invoice lifecycle, record payments, and track outstanding balances</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-[#714b67] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search invoices..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:ring-1 focus:ring-[#714b67] focus:outline-none"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><SkeletonLoader rows={5} /></div>
          ) : invoices.length === 0 ? (
            <div className="p-8">
              <EmptyState icon={Receipt} title="No Invoices" description="No invoices match your current filters." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-700">{inv.customerName}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={inv.status} />
                        {inv.isOverdue && inv.status !== 'PAID' && (
                          <AlertTriangle className="inline w-3 h-3 text-rose-500 ml-1" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(inv.issueDate)}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{formatCurrency(inv.totalAmount)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${inv.amountDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {inv.amountDue > 0 ? formatCurrency(inv.amountDue) : 'Paid'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


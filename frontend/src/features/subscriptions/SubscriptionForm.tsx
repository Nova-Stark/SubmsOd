import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerService, catalogService, subscriptionService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useToast } from '@/components/feedback/Toast'
import { formatCurrency } from '@/lib/formatters'
import { OrderLine, SubscriptionStatus } from '@/types/subscription'
import {
  Plus,
  Trash2,
  Tag,
  Check,
  AlertCircle,
  FileCheck,
  ArrowLeft,
} from 'lucide-react'

interface FormOrderLine {
  id: string
  productId: string
  variantId: string
  qty: number
  unitPrice: number // in cents/paise
  taxRate: number   // basis points (e.g. 1800 for 18%)
}

export const SubscriptionForm: React.FC = () => {
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split('T')[0]
  })
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Order lines state
  const [lines, setLines] = useState<FormOrderLine[]>([
    {
      id: `line_${Date.now()}_1`,
      productId: 'prod_erp',
      variantId: 'var_erp_odoo', // defaults to Brand: Odoo (+₹560)
      qty: 1,
      unitPrice: 555900,
      taxRate: 1800,
    },
  ])

  // Discount state
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null)
  const [discountValidating, setDiscountValidating] = useState(false)

  // Fetch customers, products, plans
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.listCustomers({ limit: 100 }),
  })
  const customers = customersData?.data || []

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => catalogService.listProducts(),
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => catalogService.listPlans(),
  })

  // Handle plan change
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId)
    const plan = plans.find((p) => p.id === planId)
    if (plan) {
      // Set end date according to billing period
      const start = new Date(startDate)
      if (plan.billingPeriod === 'MONTHLY') {
        start.setMonth(start.getMonth() + 1)
      } else if (plan.billingPeriod === 'YEARLY') {
        start.setFullYear(start.getFullYear() + 1)
      } else if (plan.billingPeriod === 'DAILY') {
        start.setDate(start.getDate() + 30)
      }
      setExpiryDate(start.toISOString().split('T')[0])
    }
  }

  // Handle line item updates
  const handleProductChange = (lineId: string, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const defaultVariant = product.variants?.[0]
    const price = product.salesPrice + (defaultVariant?.priceExtra || 0)

    setLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? {
              ...l,
              productId,
              variantId: defaultVariant?.id || '',
              unitPrice: price,
            }
          : l
      )
    )
  }

  const handleVariantChange = (lineId: string, variantId: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const product = products.find((p) => p.id === l.productId)
        if (!product) return l

        const variant = product.variants?.find((v) => v.id === variantId)
        const price = product.salesPrice + (variant?.priceExtra || 0)

        return {
          ...l,
          variantId,
          unitPrice: price,
        }
      })
    )
  }

  const handleQtyChange = (lineId: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, qty: Math.max(1, qty) } : l))
    )
  }

  const handleTaxChange = (lineId: string, taxRate: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, taxRate } : l))
    )
  }

  const addLine = () => {
    const firstProduct = products[0]
    const defaultVariant = firstProduct?.variants?.[0]
    const price = (firstProduct?.salesPrice || 0) + (defaultVariant?.priceExtra || 0)

    setLines((prev) => [
      ...prev,
      {
        id: `line_${Date.now()}_${prev.length + 1}`,
        productId: firstProduct?.id || '',
        variantId: defaultVariant?.id || '',
        qty: 1,
        unitPrice: price,
        taxRate: 1800,
      },
    ])
  }

  const removeLine = (lineId: string) => {
    if (lines.length === 1) {
      toastError('A subscription must have at least one order line.')
      return
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  // Live total calculations
  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.qty, 0)
  const taxTotal = lines.reduce(
    (acc, l) => acc + Math.round((l.unitPrice * l.qty * l.taxRate) / 10000),
    0
  )
  const discountTotal = appliedDiscount?.amount || 0
  const grandTotal = Math.max(0, subtotal + taxTotal - discountTotal)

  // Validate discount code
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return
    setDiscountValidating(true)
    try {
      const totalQty = lines.reduce((acc, l) => acc + l.qty, 0)
      const res = await catalogService.validateDiscount(discountCode, subtotal, totalQty)
      if (res.valid) {
        setAppliedDiscount({ code: discountCode.toUpperCase(), amount: res.discountAmount })
        success(`Discount code "${discountCode.toUpperCase()}" applied! (Saved ${formatCurrency(res.discountAmount)})`)
      } else {
        toastError(res.message || 'Invalid discount coupon.')
      }
    } catch {
      toastError('Failed to validate discount coupon.')
    } finally {
      setDiscountValidating(false)
    }
  }

  const handleSave = async (initialStatus: SubscriptionStatus) => {
    if (!selectedCustomerId) {
      toastError('Please select a customer.')
      return
    }
    if (!selectedPlanId) {
      toastError('Please select a subscription plan.')
      return
    }
    if (lines.length === 0) {
      toastError('Please add at least one product order line.')
      return
    }

    const customer = customers.find((c) => c.id === selectedCustomerId)
    const plan = plans.find((p) => p.id === selectedPlanId)

    if (!customer || !plan) return

    setIsSubmitting(true)
    try {
      // Map order lines
      const mappedLines: OrderLine[] = lines.map((l) => {
        const prod = products.find((p) => p.id === l.productId)
        const variant = prod?.variants.find((v) => v.id === l.variantId)
        const lineTotal = l.unitPrice * l.qty
        const lineTax = Math.round((lineTotal * l.taxRate) / 10000)

        return {
          id: l.id,
          productId: l.productId,
          productName: prod?.name || 'Product',
          variantId: l.variantId || undefined,
          variantName: variant?.variantName,
          qty: l.qty,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
          taxAmount: lineTax,
          totalAmount: lineTotal + lineTax,
        }
      })

      const newSub = await subscriptionService.createSubscription({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        planId: plan.id,
        planName: plan.name,
        status: initialStatus,
        startDate,
        expiryDate,
        paymentTerms,
        currency: 'INR',
        subtotal,
        taxTotal,
        discountTotal,
        totalAmount: grandTotal,
        lines: mappedLines,
        flags: plan.flags,
        notes,
      })

      success(
        `Subscription ${newSub.subscriptionNumber} created in ${initialStatus} status!`
      )
      navigate('/staff/subscriptions')
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message || 'Failed to create subscription.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/staff/subscriptions')}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Subscription Contract</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft recurring service agreements with live variant price calculations and tax schedules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave('DRAFT')}
            isLoading={isSubmitting}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave('QUOTATION')}
            isLoading={isSubmitting}
          >
            <FileCheck className="w-4 h-4" /> Generate Quotation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Plan Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contract Parameters & Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Customer Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email}) {c.company ? `— ${c.company}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Subscription Plan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
                  >
                    <option value="">-- Choose Plan Schedule --</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.price)} / {p.billingPeriod.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Contract Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <Input
                  label="Contract Expiration Date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
                  >
                    <option value="Immediate">Immediate / Upon Receipt</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Order Lines Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Subscription Order Lines</CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Selecting product variants (e.g. Brand: Odoo) automatically recalculates unit pricing
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3.5 h-3.5" /> Add Order Line
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Variant (Price Adder)</th>
                      <th className="py-2.5 px-3 text-center w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Tax</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line) => {
                      const product = products.find((p) => p.id === line.productId)
                      const variants = product?.variants || []
                      const lineTax = Math.round((line.unitPrice * line.qty * line.taxRate) / 10000)
                      const lineTotal = line.unitPrice * line.qty + lineTax

                      return (
                        <tr key={line.id} className="hover:bg-slate-50/50">
                          {/* Product select */}
                          <td className="py-2.5 px-3">
                            <select
                              value={line.productId}
                              onChange={(e) => handleProductChange(line.id, e.target.value)}
                              className="w-full text-xs h-8 rounded border border-slate-300 bg-white px-2 focus:ring-1 focus:ring-[#714b67]"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Variant select */}
                          <td className="py-2.5 px-3">
                            {variants.length > 0 ? (
                              <select
                                value={line.variantId}
                                onChange={(e) => handleVariantChange(line.id, e.target.value)}
                                className="w-full text-xs h-8 rounded border border-slate-300 bg-white px-2 focus:ring-1 focus:ring-[#714b67]"
                              >
                                {variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.variantName} (+{formatCurrency(v.priceExtra)})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Base standard</span>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => handleQtyChange(line.id, parseInt(e.target.value) || 1)}
                              className="w-16 text-center text-xs h-8 rounded border border-slate-300 px-1 font-semibold"
                            />
                          </td>

                          {/* Unit Price */}
                          <td className="py-2.5 px-3 text-right font-mono font-medium">
                            {formatCurrency(line.unitPrice)}
                          </td>

                          {/* Tax rate */}
                          <td className="py-2.5 px-3 text-center">
                            <select
                              value={line.taxRate}
                              onChange={(e) => handleTaxChange(line.id, parseInt(e.target.value))}
                              className="text-xs h-8 rounded border border-slate-300 bg-white px-1.5"
                            >
                              <option value={1800}>GST 18%</option>
                              <option value={0}>Zero 0%</option>
                            </select>
                          </td>

                          {/* Line Total */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(lineTotal)}
                          </td>

                          {/* Delete Action */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(line.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="Remove item line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs">Contract Terms & Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional customer terms, SLA guarantees, or special billing exceptions..."
                className="w-full text-xs rounded-md border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-[#714b67]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Live Calculation Sidebar (1 col) */}
        <div className="space-y-6">
          <Card className="border-[#714b67]/20 shadow-sm sticky top-6">
            <CardHeader className="bg-[#f5eff3] border-b border-[#d4b8cc] py-3.5">
              <CardTitle className="text-sm text-[#714b67] flex items-center justify-between">
                <span>Live Order Summary</span>
                <span className="text-[11px] font-normal text-slate-500">Auto-Calculated</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="space-y-2 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Lines Subtotal:</span>
                  <span className="font-mono font-medium text-slate-900">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>Taxes (GST 18%):</span>
                  <span className="font-mono font-medium text-slate-900">{formatCurrency(taxTotal)}</span>
                </div>

                {appliedDiscount && (
                  <div className="flex items-center justify-between text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Discount ({appliedDiscount.code}):
                    </span>
                    <span className="font-mono">-{formatCurrency(appliedDiscount.amount)}</span>
                  </div>
                )}
              </div>

              {/* Coupon / Discount Code Box */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Apply Discount Rule
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DIWALI2026"
                    className="flex-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 font-mono uppercase focus:ring-1 focus:ring-[#714b67]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleApplyDiscount}
                    isLoading={discountValidating}
                  >
                    Apply
                  </Button>
                </div>
                {appliedDiscount && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Code applied successfully!
                  </p>
                )}
              </div>

              {/* Grand Total */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-900">Total Recurring Value:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-[#714b67]">
                      {formatCurrency(grandTotal)}
                    </div>
                    <span className="text-[10px] text-slate-400">Inclusive of all applied taxes</span>
                  </div>
                </div>
              </div>

              {/* State Machine Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#017e84]" /> Subscription State Engine
                </div>
                <p>
                  Saving as <strong>Draft</strong> lets internal sales edit order lines. Generating a <strong>Quotation</strong> locks preset terms for customer review and approval.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

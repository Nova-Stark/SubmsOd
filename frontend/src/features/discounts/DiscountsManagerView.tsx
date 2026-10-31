import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogService } from '@/services'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useToast } from '@/components/feedback/Toast'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Percent, Plus, Tag, Calendar } from 'lucide-react'

export const DiscountsManagerView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [code, setCode] = useState('')
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
  const [value, setValue] = useState('15')
  const [minSpend, setMinSpend] = useState('1000')
  const [minQty, setMinQty] = useState('1')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 2)
    return d.toISOString().split('T')[0]
  })
  const [maxUsage, setMaxUsage] = useState('100')
  const [target, setTarget] = useState<'SUBSCRIPTION' | 'PRODUCT'>('SUBSCRIPTION')

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => catalogService.listDiscounts(),
  })

  const createDiscountMutation = useMutation({
    mutationFn: () => {
      const parsedValue =
        type === 'PERCENTAGE'
          ? Math.round(parseFloat(value) * 100) // 15% -> 1500
          : Math.round(parseFloat(value) * 100) // ₹500 -> 50000 paise

      return catalogService.createDiscount({
        code: code.trim().toUpperCase(),
        type,
        value: parsedValue,
        minSpend: Math.round(parseFloat(minSpend || '0') * 100),
        minQty: parseInt(minQty || '1', 10),
        startDate,
        endDate,
        maxUsage: parseInt(maxUsage || '100', 10),
        target,
      })
    },
    onSuccess: (newDisc) => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] })
      success(`Coupon code "${newDisc.code}" created successfully!`)
      setShowModal(false)
      setCode('')
      setValue('15')
      setMinSpend('1000')
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to create discount coupon.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) {
      toastError('Coupon code is required.')
      return
    }
    createDiscountMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Discounts & Promotion Rules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Only: Configure coupon codes, spend hurdles, and usage capacity
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Create Discount Rule
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><SkeletonLoader rows={4} /></div>
          ) : discounts.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Percent}
                title="No Discount Rules Found"
                description="Click 'Create Discount Rule' above to establish promotional incentives."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Coupon Code</th>
                    <th className="py-3 px-4">Type & Benefit</th>
                    <th className="py-3 px-4">Qualification Hurdles</th>
                    <th className="py-3 px-4">Validity Window</th>
                    <th className="py-3 px-4 text-center">Usage Burn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discounts.map((disc) => (
                    <tr key={disc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#714b67]" /> {disc.code}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Target: <span className="font-medium text-slate-700">{disc.target}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-700">
                          {disc.type === 'PERCENTAGE'
                            ? `${(disc.value / 100).toFixed(0)}% Off`
                            : `${formatCurrency(disc.value)} Off`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>Min Spend: <span className="font-mono font-medium">{formatCurrency(disc.minSpend)}</span></div>
                        <div className="text-[11px] text-slate-400">Min Qty: {disc.minQty} units</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(disc.startDate)} → {formatDate(disc.endDate)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="font-mono font-bold text-slate-800">
                          {disc.currentUsage} / {disc.maxUsage}
                        </div>
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                          <div
                            className="bg-[#714b67] h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round((disc.currentUsage / disc.maxUsage) * 100))}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Promotional Discount Rule"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Coupon Code"
            type="text"
            placeholder="e.g. DIWALI2026"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Benefit Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                className="w-full text-xs h-9 rounded-md border border-slate-300 px-3 bg-white"
              >
                <option value="PERCENTAGE">Percentage (%) Off</option>
                <option value="FIXED">Fixed Amount (₹) Off</option>
              </select>
            </div>
            <Input
              label={type === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
              type="number"
              step="any"
              min="1"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Min Spend (₹)"
              type="number"
              step="any"
              min="0"
              value={minSpend}
              onChange={(e) => setMinSpend(e.target.value)}
            />
            <Input
              label="Min Units Qty"
              type="number"
              min="1"
              value={minQty}
              onChange={(e) => setMinQty(e.target.value)}
            />
            <Input
              label="Max Redemptions"
              type="number"
              min="1"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Active From"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Valid Until"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Apply Target</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as 'SUBSCRIPTION' | 'PRODUCT')}
              className="w-full text-xs h-9 rounded-md border border-slate-300 px-3 bg-white"
            >
              <option value="SUBSCRIPTION">Whole Subscription Order</option>
              <option value="PRODUCT">Specific Product Lines</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createDiscountMutation.isPending}
              disabled={!code.trim() || !value}
            >
              <Percent className="w-4 h-4" /> Save Discount Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

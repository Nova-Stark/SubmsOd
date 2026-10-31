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
import { formatTaxRate } from '@/lib/formatters'
import { Coins, Plus, Check } from 'lucide-react'

export const TaxesManagerView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [ratePercent, setRatePercent] = useState('18')
  const [computation, setComputation] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
  const [isIncluded, setIsIncluded] = useState(false)

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ['taxes'],
    queryFn: () => catalogService.listTaxes(),
  })

  const createTaxMutation = useMutation({
    mutationFn: () =>
      catalogService.createTax({
        name,
        rate: Math.round(parseFloat(ratePercent) * 100),
        computation,
        isIncludedInPrice: isIncluded,
      }),
    onSuccess: (newTax) => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] })
      success(`Tax rule "${newTax.name}" created successfully!`)
      setShowModal(false)
      setName('')
      setRatePercent('18')
      setIsIncluded(false)
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to create tax rule.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toastError('Tax rule name is required.')
      return
    }
    createTaxMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tax Rules & Calculation</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Only: Configure GST, VAT, and inclusive/exclusive price calculation schedules
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Add Tax Rule
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><SkeletonLoader rows={4} /></div>
          ) : taxes.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Coins}
                title="No Tax Rules Defined"
                description="Click 'Add Tax Rule' above to establish system-wide tax schedules."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Tax Schedule Name</th>
                    <th className="py-3 px-4">Computation Type</th>
                    <th className="py-3 px-4 text-right">Applicable Rate</th>
                    <th className="py-3 px-4 text-center">Tax Included in Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {taxes.map((tax) => (
                    <tr key={tax.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{tax.name}</td>
                      <td className="py-3 px-4 text-slate-600">{tax.computation}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#714b67]">
                        {formatTaxRate(tax.rate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tax.isIncludedInPrice ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                            <Check className="w-3.5 h-3.5" /> Included
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Excluded (Added at checkout)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Tax Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Fiscal Tax Rule"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tax Schedule Name"
            type="text"
            placeholder="e.g. GST @ 18% (Standard SaaS Rate)"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tax Rate Percentage (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
            />
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Computation</label>
              <select
                value={computation}
                onChange={(e) => setComputation(e.target.value as 'PERCENTAGE' | 'FIXED')}
                className="w-full text-xs h-9 rounded-md border border-slate-300 px-3 bg-white"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isIncluded}
              onChange={(e) => setIsIncluded(e.target.checked)}
              className="rounded border-slate-300 text-[#714b67] focus:ring-[#714b67]"
            />
            <span className="text-xs text-slate-700">Tax is already included in catalog sales price</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createTaxMutation.isPending}
              disabled={!name.trim()}
            >
              <Coins className="w-4 h-4" /> Save Tax Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

const taxSchema = z.object({
  name: z.string().min(2, 'Tax name must be at least 2 characters').max(50, 'Tax name cannot exceed 50 characters'),
  ratePercent: z
    .string()
    .min(1, 'Rate is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 100, {
      message: 'Rate must be between 0% and 100%',
    }),
  computation: z.enum(['PERCENTAGE', 'FIXED']),
  isIncluded: z.boolean(),
})

type TaxFormData = z.infer<typeof taxSchema>

export const TaxesManagerView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [showModal, setShowModal] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<TaxFormData>({
    resolver: zodResolver(taxSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      ratePercent: '18',
      computation: 'PERCENTAGE',
      isIncluded: false,
    },
  })

  const isIncludedWatch = watch('isIncluded')

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ['taxes'],
    queryFn: () => catalogService.listTaxes(),
  })

  const createTaxMutation = useMutation({
    mutationFn: (data: TaxFormData) =>
      catalogService.createTax({
        name: data.name,
        rate: Math.round(parseFloat(data.ratePercent) * 100),
        computation: data.computation,
        isIncludedInPrice: data.isIncluded,
      }),
    onSuccess: (newTax) => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] })
      success(`Tax rule "${newTax.name}" created successfully!`)
      setShowModal(false)
      reset()
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to create tax rule.')
    },
  })

  const onSubmit = (data: TaxFormData) => {
    createTaxMutation.mutate(data)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tax Schedules & Rules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Only: Configure GST, VAT, and fiscal tax rates applied to subscription order lines
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Add Tax Rule
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Configured Fiscal Tax Rules ({taxes.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Standard GST 18% applied by default</span>
          </div>

          {isLoading ? (
            <div className="p-6">
              <SkeletonLoader rows={3} />
            </div>
          ) : taxes.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No Tax Rules Defined"
              description="Add your first tax rate to ensure compliant invoicing and automated order line tax computation."
              actionLabel="Add Tax Rule"
              onAction={() => setShowModal(true)}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {taxes.map((tax) => (
                <div key={tax.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#017e84] flex items-center justify-center font-bold text-xs">
                      %
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{tax.name}</span>
                        {tax.isIncludedInPrice && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            Included in Price
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Type: {tax.computation} • Rate Schedule: {formatTaxRate(tax.rate)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-[#017e84]">
                      {formatTaxRate(tax.rate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Tax Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          reset()
        }}
        title="Add Fiscal Tax Rule"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              label="Tax Rule Name"
              type="text"
              placeholder="e.g. GST 18% (Standard Rate)"
              required
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Tax Rate (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                error={errors.ratePercent?.message}
                {...register('ratePercent')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Computation</label>
              <select
                {...register('computation')}
                className="w-full text-xs h-9 rounded-md border border-slate-300 px-3 bg-white"
              >
                <option value="PERCENTAGE">Percentage of Price</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isIncludedWatch}
                onChange={(e) => setValue('isIncluded', e.target.checked, { shouldValidate: true })}
                className="rounded border-slate-300 text-[#017e84] focus:ring-[#017e84]"
              />
              <span>Tax is already included in catalog sales price (Tax-Inclusive)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="teal"
              isLoading={createTaxMutation.isPending}
              disabled={!isValid}
            >
              <Check className="w-4 h-4" /> Save Tax Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

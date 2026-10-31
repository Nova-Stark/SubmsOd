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
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Percent, Plus, Tag, Calendar } from 'lucide-react'

const discountSchema = z
  .object({
    code: z
      .string()
      .min(2, 'Code must be at least 2 characters')
      .max(30, 'Code cannot exceed 30 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, and hyphens'),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z
      .string()
      .min(1, 'Value is required')
      .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
        message: 'Value must be greater than 0',
      }),
    minSpend: z
      .string()
      .refine((v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0), {
        message: 'Minimum spend must be 0 or higher',
      }),
    minQty: z
      .string()
      .refine((v) => !v || (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1), {
        message: 'Minimum quantity must be at least 1',
      }),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    maxUsage: z
      .string()
      .refine((v) => !v || (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1), {
        message: 'Max usage must be at least 1',
      }),
    target: z.enum(['SUBSCRIPTION', 'PRODUCT']),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      if (data.type === 'PERCENTAGE') {
        return parseFloat(data.value || '0') <= 100
      }
      return true
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['value'],
    }
  )

type DiscountFormData = z.infer<typeof discountSchema>

const getDefaultDates = () => {
  const start = new Date().toISOString().split('T')[0]
  const endD = new Date()
  endD.setMonth(endD.getMonth() + 2)
  return {
    startDate: start,
    endDate: endD.toISOString().split('T')[0],
  }
}

export const DiscountsManagerView: React.FC = () => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [showModal, setShowModal] = useState(false)

  const defaultDates = getDefaultDates()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
      type: 'PERCENTAGE',
      value: '15',
      minSpend: '1000',
      minQty: '1',
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
      maxUsage: '100',
      target: 'SUBSCRIPTION',
    },
  })

  const watchType = watch('type')

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => catalogService.listDiscounts(),
  })

  const createDiscountMutation = useMutation({
    mutationFn: (data: DiscountFormData) => {
      const parsedValue =
        data.type === 'PERCENTAGE'
          ? Math.round(parseFloat(data.value) * 100) // 15% -> 1500
          : Math.round(parseFloat(data.value) * 100) // ₹500 -> 50000 paise

      return catalogService.createDiscount({
        code: data.code.trim().toUpperCase(),
        type: data.type,
        value: parsedValue,
        minSpend: Math.round(parseFloat(data.minSpend || '0') * 100),
        minQty: parseInt(data.minQty || '1', 10),
        startDate: data.startDate,
        endDate: data.endDate,
        maxUsage: parseInt(data.maxUsage || '100', 10),
        target: data.target,
      })
    },
    onSuccess: (newDisc) => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] })
      success(`Coupon code "${newDisc.code}" created successfully!`)
      setShowModal(false)
      reset()
    },
    onError: (err: unknown) => {
      toastError((err as { message?: string })?.message || 'Failed to create discount.')
    },
  })

  const onSubmit = (data: DiscountFormData) => {
    createDiscountMutation.mutate(data)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Promotions & Discounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Only: Manage coupon codes, volume incentives, and subscription-level price reductions
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Create Coupon / Discount
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                Configured Promotion Rules ({discounts.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Auto-validated in Subscription Form</span>
          </div>

          {isLoading ? (
            <div className="p-6">
              <SkeletonLoader rows={4} />
            </div>
          ) : discounts.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No Discount Rules"
              description="Create promotional coupon codes to offer price reductions on subscriptions and products."
              actionLabel="Create First Discount"
              onAction={() => setShowModal(true)}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {discounts.map((disc) => {
                const isExpired = new Date(disc.endDate) < new Date()
                const isLimitReached = disc.currentUsage >= disc.maxUsage

                return (
                  <div key={disc.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 text-[#714b67] flex items-center justify-center font-bold text-sm">
                        <Percent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-slate-900">{disc.code}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            {disc.target}
                          </span>
                          {isExpired ? (
                            <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded font-semibold border border-rose-200">
                              Expired
                            </span>
                          ) : isLimitReached ? (
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold border border-amber-200">
                              Limit Reached
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>
                            Min Spend: <strong>{formatCurrency(disc.minSpend)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Min Qty: <strong>{disc.minQty}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3 h-3" /> {formatDate(disc.startDate)} → {formatDate(disc.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#714b67]">
                        {disc.type === 'PERCENTAGE'
                          ? `${(disc.value / 100).toFixed(0)}% OFF`
                          : `-${formatCurrency(disc.value)}`}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Used: <strong>{disc.currentUsage}</strong> / {disc.maxUsage}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          reset()
        }}
        title="Create Promotional Discount"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Coupon Code"
                type="text"
                placeholder="e.g. DIWALI2026"
                required
                error={errors.code?.message}
                {...register('code')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Discount Target</label>
              <select
                {...register('target')}
                className="w-full text-xs h-9 rounded-md border border-slate-300 px-3 bg-white"
              >
                <option value="SUBSCRIPTION">Whole Subscription Contract</option>
                <option value="PRODUCT">Specific Product Lines Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Calculation Type</label>
              <select
                {...register('type')}
                className="w-full text-xs h-9 rounded-md border border-slate-300 px-3 bg-white"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <Input
                label={watchType === 'PERCENTAGE' ? 'Discount Value (%)' : 'Discount Value (₹)'}
                type="number"
                step="0.01"
                min="0.01"
                max={watchType === 'PERCENTAGE' ? '100' : undefined}
                required
                error={errors.value?.message}
                {...register('value')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Minimum Spend (₹)"
                type="number"
                step="1"
                min="0"
                error={errors.minSpend?.message}
                {...register('minSpend')}
              />
            </div>
            <div>
              <Input
                label="Minimum Quantity"
                type="number"
                step="1"
                min="1"
                error={errors.minQty?.message}
                {...register('minQty')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Start Date"
                type="date"
                required
                error={errors.startDate?.message}
                {...register('startDate')}
              />
            </div>
            <div>
              <Input
                label="End Date"
                type="date"
                required
                error={errors.endDate?.message}
                {...register('endDate')}
              />
            </div>
          </div>

          <div>
            <Input
              label="Maximum Allowed Redemptions"
              type="number"
              step="1"
              min="1"
              required
              error={errors.maxUsage?.message}
              {...register('maxUsage')}
            />
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
              variant="primary"
              isLoading={createDiscountMutation.isPending}
              disabled={!isValid}
            >
              <Plus className="w-4 h-4" /> Save Discount Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

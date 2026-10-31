import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { catalogService } from '@/services'
import { useToast } from '@/components/feedback/Toast'
import { BillingPeriod } from '@/types/catalog'
import { CalendarDays, ShieldCheck } from 'lucide-react'

const planSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters'),
  price: z.number().positive('Plan price must be greater than zero'),
  billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  minQty: z.number().int().min(1, 'Minimum quantity must be at least 1'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  autoCloseOnEnd: z.boolean(),
  allowEarlyClose: z.boolean(),
  allowPause: z.boolean(),
  allowRenew: z.boolean(),
})

type PlanFormValues = z.infer<typeof planSchema>

interface CreatePlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { success, error: toastError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      price: 12000,
      billingPeriod: 'MONTHLY',
      minQty: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      autoCloseOnEnd: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenew: true,
    },
  })

  const onSubmit = async (values: PlanFormValues) => {
    setIsSubmitting(true)
    try {
      const allowedActions: string[] = []
      if (values.allowPause) allowedActions.push('pause')
      if (values.allowRenew) allowedActions.push('renew')
      if (values.allowEarlyClose) allowedActions.push('close')

      await catalogService.createPlan({
        name: values.name,
        price: Math.round(values.price * 100), // convert to cents/paise
        billingPeriod: values.billingPeriod as BillingPeriod,
        minQty: values.minQty,
        startDate: values.startDate,
        endDate: values.endDate ? values.endDate : null,
        flags: {
          autoCloseOnEnd: values.autoCloseOnEnd,
          allowEarlyClose: values.allowEarlyClose,
          allowPause: values.allowPause,
          allowRenew: values.allowRenew,
        },
        allowedActions,
      })

      success(`Plan "${values.name}" created successfully!`)
      reset()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message || 'Failed to create plan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Subscription Plan"
      description="Configure recurring billing schedule, commitment terms and self-serve flags"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Plan Title"
          placeholder="e.g. Enterprise Monthly Growth"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Input
              label="Recurring Price (₹)"
              type="number"
              step="0.01"
              placeholder="12000.00"
              error={errors.price?.message}
              required
              {...register('price', { valueAsNumber: true })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Billing Period <span className="text-rose-500">*</span>
            </label>
            <select
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
              {...register('billingPeriod')}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div>
            <Input
              label="Minimum Quantity"
              type="number"
              min="1"
              error={errors.minQty?.message}
              required
              {...register('minQty', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Availability Start Date"
            type="date"
            error={errors.startDate?.message}
            required
            {...register('startDate')}
          />
          <Input
            label="Availability End Date (Optional)"
            type="date"
            helperText="Leave blank for open-ended plans"
            {...register('endDate')}
          />
        </div>

        {/* Lifecycle Policy Flags */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 mb-2">
            <ShieldCheck className="w-4 h-4 text-[#017e84]" />
            Subscription Lifecycle Flags & Permissions
          </div>

          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="mt-0.5 rounded text-[#714b67] focus:ring-[#714b67] w-4 h-4"
                {...register('allowPause')}
              />
              <div>
                <span className="font-semibold text-slate-800">Allow Self-Serve Pause</span>
                <p className="text-slate-500 text-[11px]">
                  Customer or staff can pause recurring invoices temporarily without closing the contract.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="mt-0.5 rounded text-[#714b67] focus:ring-[#714b67] w-4 h-4"
                {...register('allowRenew')}
              />
              <div>
                <span className="font-semibold text-slate-800">Allow Self-Serve Renewal</span>
                <p className="text-slate-500 text-[11px]">
                  Customer can click 1-click renew in portal to extend the subscription period.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="mt-0.5 rounded text-[#714b67] focus:ring-[#714b67] w-4 h-4"
                {...register('allowEarlyClose')}
              />
              <div>
                <span className="font-semibold text-slate-800">Allow Early Termination</span>
                <p className="text-slate-500 text-[11px]">
                  Allows closing the contract before the designated expiration date.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                className="mt-0.5 rounded text-[#714b67] focus:ring-[#714b67] w-4 h-4"
                {...register('autoCloseOnEnd')}
              />
              <div>
                <span className="font-semibold text-slate-800">Auto-Close on Expiration Date</span>
                <p className="text-slate-500 text-[11px]">
                  The automated state engine marks the subscription as CLOSED once expiry is reached.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            <CalendarDays className="w-4 h-4" /> Save Plan
          </Button>
        </div>
      </form>
    </Modal>
  )
}

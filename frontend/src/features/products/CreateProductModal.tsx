import React, { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { catalogService } from '@/services'
import { useToast } from '@/components/feedback/Toast'
import { ProductType } from '@/types/catalog'
import { Plus, Trash2, Sparkles, Layers } from 'lucide-react'

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  type: z.enum(['SOFTWARE', 'ADDON', 'SERVICE']),
  salesPrice: z.number().positive('Sales price must be greater than zero'),
  costPrice: z.number().min(0, 'Cost price cannot be negative'),
  notes: z.string().optional(),
  variants: z.array(
    z.object({
      variantName: z.string().min(1, 'Variant name is required'),
      priceExtra: z.number().min(0, 'Extra price must be zero or positive'),
    })
  ),
})

type ProductFormValues = z.infer<typeof productSchema>

interface CreateProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { success, error: toastError } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      type: 'SOFTWARE',
      salesPrice: 4999,
      costPrice: 2000,
      notes: '',
      variants: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  })

  const watchedBasePrice = watch('salesPrice') || 0

  const handleAddOdooPreset = () => {
    append({
      variantName: 'Brand: Odoo Enterprise Connector',
      priceExtra: 560, // Hackathon scenario: brand Odoo adds +560
    })
  }

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true)
    try {
      await catalogService.createProduct({
        name: values.name,
        type: values.type as ProductType,
        salesPrice: Math.round(values.salesPrice * 100), // convert to cents/paise
        costPrice: Math.round(values.costPrice * 100),
        notes: values.notes,
        variants: values.variants.map((v) => ({
          id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId: '',
          variantName: v.variantName,
          priceExtra: Math.round(v.priceExtra * 100),
        })),
      })
      success(`Product "${values.name}" created successfully with ${values.variants.length} variant(s)!`)
      reset()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message || 'Failed to create product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Catalog Product"
      description="Add a subscription software module, addon, or service with variant pricing"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Product Name"
          placeholder="e.g. Brightloop Payroll Suite"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Product Type <span className="text-rose-500">*</span>
            </label>
            <select
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
              {...register('type')}
            >
              <option value="SOFTWARE">Software (Core)</option>
              <option value="ADDON">Add-on Module</option>
              <option value="SERVICE">Professional Service</option>
            </select>
          </div>

          <div>
            <Input
              label="Base Sales Price (₹)"
              type="number"
              step="0.01"
              placeholder="4999.00"
              error={errors.salesPrice?.message}
              required
              {...register('salesPrice', { valueAsNumber: true })}
            />
          </div>

          <div>
            <Input
              label="Cost Price (₹)"
              type="number"
              step="0.01"
              placeholder="2000.00"
              error={errors.costPrice?.message}
              {...register('costPrice', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">Notes & Specifications</label>
          <textarea
            rows={2}
            className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
            placeholder="Technical details, billing scope, or compliance notes..."
            {...register('notes')}
          />
        </div>

        {/* Product Variants Engine */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#714b67]" />
              <span className="text-xs font-bold text-slate-900">Product Variants (Price Adders)</span>
              <span className="text-[11px] text-slate-500">({fields.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddOdooPreset}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#714b67] bg-[#f5eff3] border border-[#d4b8cc] rounded hover:bg-[#ebdbe7] transition-colors"
                title="Scenario: Brand 'Odoo' adds +₹560 to price"
              >
                <Sparkles className="w-3 h-3 text-[#714b67]" /> Add Brand "Odoo" (+₹560)
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ variantName: '', priceExtra: 0 })}
              >
                <Plus className="w-3.5 h-3.5" /> Add Variant
              </Button>
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-md text-center text-xs text-slate-500">
              No variants defined. This product will be sold at its base price of ₹{Number(watchedBasePrice).toFixed(2)}.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {fields.map((field, index) => {
                const currentExtra = watch(`variants.${index}.priceExtra`) || 0
                const calculatedFinal = Number(watchedBasePrice) + Number(currentExtra)

                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md"
                  >
                    <div className="flex-1">
                      <input
                        className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#714b67]"
                        placeholder="Variant name (e.g. Brand: Odoo Enterprise)"
                        {...register(`variants.${index}.variantName`)}
                      />
                    </div>

                    <div className="w-32">
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-semibold">+₹</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full text-xs bg-white border border-slate-300 rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#714b67]"
                          placeholder="Extra price"
                          {...register(`variants.${index}.priceExtra`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] font-mono font-medium text-slate-700 w-24 text-right">
                      = ₹{calculatedFinal.toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Product
          </Button>
        </div>
      </form>
    </Modal>
  )
}

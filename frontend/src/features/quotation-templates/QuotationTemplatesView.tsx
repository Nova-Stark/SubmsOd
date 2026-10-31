import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subscriptionService, customerService, catalogService } from '@/services'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useToast } from '@/components/feedback/Toast'
import { formatCurrency } from '@/lib/formatters'
import { QuotationTemplate } from '@/types/subscription'
import {
  FileSpreadsheet,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'

export const QuotationTemplatesView: React.FC = () => {
  const navigate = useNavigate()
  const { success, error: toastError } = useToast()

  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplate | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [isConverting, setIsConverting] = useState(false)

  const {
    data: templates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['quotationTemplates'],
    queryFn: () => subscriptionService.listQuotationTemplates(),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.listCustomers({ limit: 100 }),
  })
  const customers = customersData?.data || []

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => catalogService.listProducts(),
  })

  const handleOpenConvert = (template: QuotationTemplate) => {
    setSelectedTemplate(template)
    if (customers.length > 0) {
      setSelectedCustomerId(customers[0].id)
    }
  }

  const handleConvert = async () => {
    if (!selectedTemplate || !selectedCustomerId) {
      toastError('Please select a customer for this subscription.')
      return
    }

    setIsConverting(true)
    try {
      const newSub = await subscriptionService.convertQuotationTemplate(
        selectedTemplate.id,
        selectedCustomerId,
        startDate
      )
      success(
        `Quotation ${newSub.subscriptionNumber} generated from "${selectedTemplate.name}"!`
      )
      setSelectedTemplate(null)
      navigate(`/staff/subscriptions/${newSub.id}`)
    } catch (err: unknown) {
      toastError((err as { message?: string })?.message || 'Failed to convert template to subscription.')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quotation Templates</h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {templates.length} templates
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configured product bundles and validity terms for instant sales quote conversion
          </p>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={4} />
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-lg border border-rose-200">
          <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Failed to load quotation templates</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No Quotation Templates"
          description="Create preset quotation bundles to enable quick sales reps conversion."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map((tpl) => {
            const bundleTotal = tpl.lines.reduce((acc, l) => acc + l.unitPrice * l.qty, 0)

            return (
              <Card key={tpl.id} className="flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#714b67]" /> {tpl.name}
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <Clock className="w-3 h-3 text-slate-500" /> {tpl.validityDays} days valid
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Preset Plan: <strong className="text-slate-700">{tpl.planName}</strong>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-2 flex-1 text-xs">
                  <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    Included Product Lines:
                  </div>

                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-md border border-slate-100">
                    {tpl.lines.map((line, idx) => {
                      const prod = products.find((p) => p.id === line.productId)
                      const variant = prod?.variants.find((v) => v.id === line.variantId)

                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{line.qty}x</span>
                            <span className="text-slate-700">{prod?.name || 'Product'}</span>
                            {variant && (
                              <span className="text-[10px] text-[#714b67] bg-[#f5eff3] px-1 py-0.2 rounded font-medium flex items-center gap-0.5">
                                <Layers className="w-2.5 h-2.5" /> {variant.variantName}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-slate-600">{formatCurrency(line.unitPrice * line.qty)}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Preset Subtotal</span>
                      <span className="text-base font-bold font-mono text-[#714b67]">
                        {formatCurrency(bundleTotal)}
                      </span>
                    </div>

                    <Button variant="teal" size="sm" onClick={() => handleOpenConvert(tpl)}>
                      Convert to Subscription <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Convert to Subscription Modal */}
      {selectedTemplate && (
        <Modal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={`Convert "${selectedTemplate.name}"`}
          description="Initialize a live subscription contract with pre-populated order lines"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Select Customer Account <span className="text-rose-500">*</span>
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
                Contract Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-300 bg-white px-3 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
              <span className="font-semibold text-slate-800">Template Details:</span>
              <p className="text-slate-500">
                Plan: <strong>{selectedTemplate.planName}</strong>
              </p>
              <p className="text-slate-500">
                Validity: <strong>{selectedTemplate.validityDays} days</strong> from start date
              </p>
              <p className="text-slate-500">
                Includes <strong>{selectedTemplate.lines.length} preset lines</strong> (Draft/Quotation state)
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
                disabled={isConverting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConvert}
                isLoading={isConverting}
              >
                Create Quotation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

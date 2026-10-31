import React from 'react'
import { FileSpreadsheet } from 'lucide-react'

export const QuotationTemplatesPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quotation Templates</h1>
        <p className="text-xs text-slate-500 mt-0.5">Preset product lines, plans, and validity periods for quick sales conversion</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Quotation Template Converter</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. 1-click template-to-subscription converter scheduled for Hour 1-3.
        </p>
      </div>
    </div>
  )
}


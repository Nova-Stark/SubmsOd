import React from 'react'
import { Receipt } from 'lucide-react'

export const InvoicesPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices & Billing</h1>
        <p className="text-xs text-slate-500 mt-0.5">Recurring billing ledger: Draft → Confirmed → Paid, send, print & payments</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Invoices & Billing Ledger</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Invoice batch runner, payment recorder, and print preview ready for development.
        </p>
      </div>
    </div>
  )
}

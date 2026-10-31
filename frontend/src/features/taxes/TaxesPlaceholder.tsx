import React from 'react'
import { Coins } from 'lucide-react'

export const TaxesPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tax Rules & Computation</h1>
        <p className="text-xs text-slate-500 mt-0.5">Admin-only: Configure GST, VAT, and inclusive/exclusive price calculations</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Coins className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Admin Tax Manager</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Admin permission enforced via RoleGuard.
        </p>
      </div>
    </div>
  )
}

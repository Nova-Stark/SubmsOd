import React from 'react'
import { Percent } from 'lucide-react'

export const DiscountsPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Discounts & Coupon Rules</h1>
        <p className="text-xs text-slate-500 mt-0.5">Admin-only: Fixed/percentage discounts, minimum spend thresholds, and usage caps</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Percent className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Admin Discount Rule Manager</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Admin permission enforced via RoleGuard.
        </p>
      </div>
    </div>
  )
}


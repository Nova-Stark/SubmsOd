import React from 'react'
import { LayoutDashboard } from 'lucide-react'

export const FinanceDashboardPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Finance Lead Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">Admin-only: High-frequency MRR, active contracts, overdue receivables, and revenue projections</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <LayoutDashboard className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Finance Lead Analytics Engine</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. KPI cards, revenue chart, debounced filter bar, and overdue invoice chaser ready for Hour 5-6.
        </p>
      </div>
    </div>
  )
}


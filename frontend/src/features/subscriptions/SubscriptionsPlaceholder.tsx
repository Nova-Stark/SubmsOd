import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const SubscriptionsPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subscriptions Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">Automated lifecycle management: Draft → Quotation → Confirmed → Active → Closed</p>
        </div>
        <Link to="/staff/subscriptions/new">
          <Button variant="primary">
            <Plus className="w-4 h-4" /> New Subscription
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Repeat className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Subscriptions State Engine</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Dynamic multi-line order calculation and lifecycle stepper ready for Hour 1-3.
        </p>
      </div>
    </div>
  )
}


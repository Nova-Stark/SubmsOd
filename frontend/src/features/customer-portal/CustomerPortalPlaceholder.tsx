import React from 'react'
import { Repeat } from 'lucide-react'

export const CustomerPortalPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Portal — My Subscriptions</h1>
        <p className="text-xs text-slate-500 mt-0.5">Self-serve contract view with 1-click pause and renewal actions</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Repeat className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Customer Self-Serve Portal Initialized</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Subscriptions list, status pills, and self-serve pause/renew actions scheduled for Hour 3-5.
        </p>
      </div>
    </div>
  )
}

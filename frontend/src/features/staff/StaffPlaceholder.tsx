import React from 'react'
import { Users } from 'lucide-react'

export const StaffPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Account Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">Admin-only: Provision and manage internal team members</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Admin Staff Creation Engine</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Staff can only be created by Admin via POST /api/v1/admin/staff.
        </p>
      </div>
    </div>
  )
}


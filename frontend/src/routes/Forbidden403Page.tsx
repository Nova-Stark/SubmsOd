import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Forbidden403Page: React.FC = () => {
  const { user } = useAuth()

  const getHomeLink = () => {
    if (user?.role === 'ADMIN') return '/admin/dashboard'
    if (user?.role === 'STAFF') return '/staff/subscriptions'
    return '/portal/subscriptions'
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">403 — Access Denied</h1>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Your active account role is <span className="font-semibold text-rose-700">{user?.role || 'GUEST'}</span>. You do not have permissions to access this administrative resource.
        </p>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 mb-6 text-left">
          <strong>Security Policy:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Finance Dashboard & Rules: Admin only</li>
            <li>Subscription & Invoice ops: Staff & Admin</li>
            <li>Customer Portal: Customers only</li>
          </ul>
        </div>

        <Link to={getHomeLink()}>
          <Button variant="primary" className="w-full">
            <ArrowLeft className="w-4 h-4" /> Return to Authorized Workspace
          </Button>
        </Link>
      </div>
    </div>
  )
}


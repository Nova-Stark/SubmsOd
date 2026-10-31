import React from 'react'
import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const NotFound404Page: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">404 — Page Not Found</h1>
        <p className="text-xs text-slate-500 mb-6">
          The requested page or resource could not be found in the Brightloop workspace.
        </p>

        <Link to="/login">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4" /> Go to Login / Home
          </Button>
        </Link>
      </div>
    </div>
  )
}

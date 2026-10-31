import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'

export const ProductsPlaceholder: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog & Variants</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage software tiers, addons, and price-adjusting variants</p>
        </div>
        {isAdmin && (
          <Link to="/admin/products/new">
            <Button variant="primary">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <Boxes className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Product Catalog Module Initialized</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Hour 0-1 setup complete. Product and Variant manager with Odoo brand adder (+₹560 rule) scheduled for Hour 1-3.
        </p>
      </div>
    </div>
  )
}

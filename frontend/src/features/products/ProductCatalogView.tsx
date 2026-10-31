import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/services'
import { useAuth } from '@/features/auth/AuthContext'
import { CreateProductModal } from './CreateProductModal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { formatCurrency } from '@/lib/formatters'
import { Product, ProductType } from '@/types/catalog'
import {
  Boxes,
  Plus,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldAlert,
} from 'lucide-react'

export const ProductCatalogView: React.FC = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)

  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => catalogService.listProducts(),
  })

  const filteredProducts = products.filter((p: Product) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()))
    const matchesType = selectedType === 'ALL' || p.type === selectedType
    return matchesSearch && matchesType
  })

  const toggleExpand = (id: string) => {
    setExpandedProductId((prev) => (prev === id ? null : id))
  }

  const getTypeBadge = (type: ProductType) => {
    switch (type) {
      case 'SOFTWARE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f5eff3] text-[#714b67] border border-[#d4b8cc]">
            Software
          </span>
        )
      case 'ADDON':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#e6f3f4] text-[#017e84] border border-[#a4d4d6]">
            Add-on
          </span>
        )
      case 'SERVICE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Service
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog & Variants</h1>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
              {products.length} products
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure subscription software, add-on modules, and attribute-based price variations
          </p>
        </div>

        {isAdmin ? (
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        ) : (
          <div className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Staff View (Catalog read-only for subscription orders)
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search products by name or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#714b67]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Type:</span>
          {['ALL', 'SOFTWARE', 'ADDON', 'SERVICE'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                selectedType === t
                  ? 'bg-[#714b67] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <SkeletonLoader rows={5} />
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-lg border border-rose-200">
          <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">Failed to load product catalog</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No Products Found"
          description={
            search
              ? `No products match your filter "${search}".`
              : 'The product catalog is currently empty. Define products to enable subscription billing.'
          }
          actionLabel={isAdmin ? 'Create First Product' : undefined}
          onAction={isAdmin ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Product Name & Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Sales Price (Base)</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Gross Margin</th>
                  <th className="py-3 px-4 text-center">Variants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredProducts.map((product) => {
                  const isExpanded = expandedProductId === product.id
                  const variantCount = product.variants?.length || 0
                  const marginPercent =
                    product.salesPrice > 0
                      ? Math.round(((product.salesPrice - product.costPrice) / product.salesPrice) * 100)
                      : 0

                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          <div>{product.name}</div>
                          {product.notes && (
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5 line-clamp-1">
                              {product.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">{getTypeBadge(product.type)}</td>

                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                          {formatCurrency(product.salesPrice)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                          {formatCurrency(product.costPrice)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-medium">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                              marginPercent >= 50
                                ? 'bg-emerald-50 text-emerald-700'
                                : marginPercent > 20
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {marginPercent}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {variantCount > 0 ? (
                            <button
                              onClick={() => toggleExpand(product.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#f5eff3] text-[#714b67] border border-[#d4b8cc] hover:bg-[#ebdbe7] transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>{variantCount} variant{variantCount > 1 ? 's' : ''}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">None</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Variant Breakdown Row */}
                      {isExpanded && variantCount > 0 && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={6} className="p-4 pl-10">
                            <div className="bg-white rounded-md border border-slate-200 p-3 shadow-xs">
                              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-[#714b67]" />
                                Variant Price Modifiers for "{product.name}"
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {product.variants.map((variant) => {
                                  const effectivePrice = product.salesPrice + variant.priceExtra
                                  return (
                                    <div
                                      key={variant.id}
                                      className="p-2.5 rounded border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                                    >
                                      <div className="font-semibold text-slate-800 text-xs">
                                        {variant.variantName}
                                      </div>
                                      <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                                        <span className="text-slate-500 font-mono text-[11px]">
                                          Extra: +{formatCurrency(variant.priceExtra)}
                                        </span>
                                        <span className="font-bold text-[#714b67] font-mono">
                                          {formatCurrency(effectivePrice)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Creation Modal (Admin Only) */}
      {isAdmin && (
        <CreateProductModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}

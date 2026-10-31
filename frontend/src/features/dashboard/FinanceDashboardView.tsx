import React, { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService, invoiceService } from '@/services'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { formatCurrency, formatCompactCurrency, formatDate } from '@/lib/formatters'
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Repeat,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export const FinanceDashboardView: React.FC = () => {
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'daily'>('monthly')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  // Debounced search handler for sub-second query performance
  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val)
    const timer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['finance-kpis'],
    queryFn: () => dashboardService.getFinanceKpis(),
    staleTime: 1000 * 60 * 2,
  })

  const { data: revenueData, isLoading: chartLoading } = useQuery({
    queryKey: ['revenue-chart', chartPeriod],
    queryFn: () => dashboardService.getRevenueChart(chartPeriod),
    staleTime: 1000 * 60 * 5,
  })

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-invoices', debouncedSearch, page],
    queryFn: () =>
      invoiceService.listInvoices({
        isOverdue: true,
        search: debouncedSearch || undefined,
        page,
        limit: 5,
      }),
    staleTime: 1000 * 60 * 2,
  })

  const overdueInvoices = overdueData?.data || []
  const overdueMeta = overdueData?.meta || { page: 1, limit: 5, total: 0, totalPages: 1 }

  // Memoized max revenue for chart bar scaling
  const maxRevenue = useMemo(() => {
    if (!revenueData) return 1
    return Math.max(...revenueData.map((d) => Math.max(d.revenue, d.projected)), 1)
  }, [revenueData])

  // KPI cards configuration
  const kpiCards = useMemo(() => {
    if (!kpis) return []
    return [
      {
        label: 'Active Subscriptions',
        value: kpis.activeSubscriptions.toLocaleString('en-IN'),
        icon: Repeat,
        color: 'text-[#714b67]',
        bgColor: 'bg-[#f5eff3]',
        borderColor: 'border-[#d4b8cc]',
      },
      {
        label: 'Revenue Collected',
        value: formatCompactCurrency(kpis.revenueCollected),
        icon: DollarSign,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        trend: '+12.4%',
        trendUp: true,
      },
      {
        label: 'Outstanding Amount',
        value: formatCompactCurrency(kpis.outstandingAmount),
        icon: Receipt,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
      },
      {
        label: 'Overdue Invoices',
        value: kpis.overdueInvoicesCount.toString(),
        icon: AlertTriangle,
        color: kpis.overdueInvoicesCount > 0 ? 'text-rose-600' : 'text-slate-500',
        bgColor: kpis.overdueInvoicesCount > 0 ? 'bg-rose-50' : 'bg-slate-50',
        borderColor: kpis.overdueInvoicesCount > 0 ? 'border-rose-200' : 'border-slate-200',
      },
    ]
  }, [kpis])

  const getBarHeight = useCallback(
    (value: number) => `${Math.max((value / maxRevenue) * 100, 2)}%`,
    [maxRevenue]
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="w-5 h-5 text-[#714b67]" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Finance Dashboard</h1>
          <p className="text-xs text-slate-500">Real-time revenue and subscription health metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <SkeletonLoader rows={1} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label} className={`border ${card.borderColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                      {card.trend && (
                        <p className={`text-[11px] mt-1 font-medium flex items-center gap-0.5 ${card.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {card.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {card.trend} vs last period
                        </p>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MRR Badge */}
      {kpis && (
        <div className="flex items-center gap-2 text-xs">
          <TrendingUp className="w-4 h-4 text-[#017e84]" />
          <span className="text-slate-600">Monthly Recurring Revenue (MRR):</span>
          <span className="font-bold font-mono text-[#017e84] text-sm">{formatCompactCurrency(kpis.mrr)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#714b67]" /> Revenue Trend
            </CardTitle>
            <div className="flex gap-1">
              {(['monthly', 'daily'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                    chartPeriod === p ? 'bg-[#714b67] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <SkeletonLoader rows={3} />
            ) : revenueData && revenueData.length > 0 ? (
              <div className="h-52 flex items-end gap-3 px-2">
                {revenueData.map((dp) => (
                  <div key={dp.period} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-1 h-40">
                      {/* Actual revenue bar */}
                      <div
                        className="flex-1 bg-[#714b67] rounded-t transition-all duration-300"
                        style={{ height: getBarHeight(dp.revenue) }}
                        title={`Revenue: ${formatCurrency(dp.revenue)}`}
                      />
                      {/* Projected bar */}
                      <div
                        className="flex-1 bg-[#017e84]/30 rounded-t border border-[#017e84]/50 border-dashed transition-all duration-300"
                        style={{ height: getBarHeight(dp.projected) }}
                        title={`Projected: ${formatCurrency(dp.projected)}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium truncate w-full text-center">
                      {dp.period.split(' ')[0]?.substring(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No chart data available</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#714b67] rounded-sm" /> Actual</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-[#017e84]/30 rounded-sm border border-[#017e84]/50 border-dashed" /> Projected</span>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Invoices Table (1 col) */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Overdue Invoices
              </CardTitle>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                {overdueMeta.total} Due
              </span>
            </div>
            {/* Debounced live filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search overdue..."
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#714b67]"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col justify-between">
            {overdueLoading ? (
              <div className="p-4"><SkeletonLoader rows={3} /></div>
            ) : overdueInvoices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {debouncedSearch ? 'No matching overdue invoices' : 'No overdue invoices 🎉'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 overflow-y-auto">
                {overdueInvoices.map((inv) => (
                  <div key={inv.id} className="px-4 py-2.5 hover:bg-slate-50/50 text-xs transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-800">{inv.invoiceNumber}</span>
                        <span className="ml-1.5"><StatusBadge status="OVERDUE" /></span>
                      </div>
                      <span className="font-mono font-bold text-rose-600">{formatCurrency(inv.amountDue)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {inv.customerName} • Due {formatDate(inv.dueDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {overdueMeta.totalPages > 1 && (
              <div className="p-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/50">
                <span>Page {page} of {overdueMeta.totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-1.5 text-xs"
                    disabled={page >= overdueMeta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleGuard } from './RoleGuard'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/AuthContext'
import { Loader2 } from 'lucide-react'

// Auth Pages (small, loaded eagerly for instant first paint)
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { Forbidden403Page } from './Forbidden403Page'
import { NotFound404Page } from './NotFound404Page'

// Lazy-loaded feature modules for code-splitting
const ProductCatalogView = lazy(() =>
  import('@/features/products/ProductCatalogView').then((m) => ({ default: m.ProductCatalogView }))
)
const PlanManagerView = lazy(() =>
  import('@/features/plans/PlanManagerView').then((m) => ({ default: m.PlanManagerView }))
)
const SubscriptionListView = lazy(() =>
  import('@/features/subscriptions/SubscriptionListView').then((m) => ({ default: m.SubscriptionListView }))
)
const SubscriptionForm = lazy(() =>
  import('@/features/subscriptions/SubscriptionForm').then((m) => ({ default: m.SubscriptionForm }))
)
const SubscriptionDetailView = lazy(() =>
  import('@/features/subscriptions/SubscriptionDetailView').then((m) => ({ default: m.SubscriptionDetailView }))
)
const QuotationTemplatesView = lazy(() =>
  import('@/features/quotation-templates/QuotationTemplatesView').then((m) => ({ default: m.QuotationTemplatesView }))
)

// Placeholders (lazy for consistent splitting)
const FinanceDashboardPlaceholder = lazy(() =>
  import('@/features/dashboard/FinanceDashboardPlaceholder').then((m) => ({ default: m.FinanceDashboardPlaceholder }))
)
const InvoicesPlaceholder = lazy(() =>
  import('@/features/invoices/InvoicesPlaceholder').then((m) => ({ default: m.InvoicesPlaceholder }))
)
const DiscountsPlaceholder = lazy(() =>
  import('@/features/discounts/DiscountsPlaceholder').then((m) => ({ default: m.DiscountsPlaceholder }))
)
const TaxesPlaceholder = lazy(() =>
  import('@/features/taxes/TaxesPlaceholder').then((m) => ({ default: m.TaxesPlaceholder }))
)
const StaffPlaceholder = lazy(() =>
  import('@/features/staff/StaffPlaceholder').then((m) => ({ default: m.StaffPlaceholder }))
)
const CustomerPortalPlaceholder = lazy(() =>
  import('@/features/customer-portal/CustomerPortalPlaceholder').then((m) => ({ default: m.CustomerPortalPlaceholder }))
)

// Shared loading fallback for lazy routes
const RouteFallback: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-6 h-6 text-[#714b67] animate-spin" />
      <span className="text-xs text-slate-500 font-medium">Loading module...</span>
    </div>
  </div>
)

// Redirect root to role-specific default landing
const RoleHomeRedirect: React.FC = () => {
  const { user } = useAuth()
  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
  if (user?.role === 'STAFF') return <Navigate to="/staff/subscriptions" replace />
  return <Navigate to="/portal/subscriptions" replace />
}

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/403" element={<Forbidden403Page />} />

      {/* Authenticated Application Shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<RoleHomeRedirect />} />

          {/* Admin-only Routes (Finance Lead & System Controls) */}
          <Route element={<RoleGuard allowedRoles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<Suspense fallback={<RouteFallback />}><FinanceDashboardPlaceholder /></Suspense>} />
            <Route path="/admin/products/new" element={<Suspense fallback={<RouteFallback />}><ProductCatalogView /></Suspense>} />
            <Route path="/admin/plans/new" element={<Suspense fallback={<RouteFallback />}><PlanManagerView /></Suspense>} />
            <Route path="/admin/discounts" element={<Suspense fallback={<RouteFallback />}><DiscountsPlaceholder /></Suspense>} />
            <Route path="/admin/taxes" element={<Suspense fallback={<RouteFallback />}><TaxesPlaceholder /></Suspense>} />
            <Route path="/admin/staff" element={<Suspense fallback={<RouteFallback />}><StaffPlaceholder /></Suspense>} />
          </Route>

          {/* Staff & Admin Operational Views */}
          <Route element={<RoleGuard allowedRoles={['STAFF', 'ADMIN']} />}>
            <Route path="/staff/subscriptions" element={<Suspense fallback={<RouteFallback />}><SubscriptionListView /></Suspense>} />
            <Route path="/staff/subscriptions/new" element={<Suspense fallback={<RouteFallback />}><SubscriptionForm /></Suspense>} />
            <Route path="/staff/subscriptions/:id" element={<Suspense fallback={<RouteFallback />}><SubscriptionDetailView /></Suspense>} />
            <Route path="/staff/quotation-templates" element={<Suspense fallback={<RouteFallback />}><QuotationTemplatesView /></Suspense>} />
            <Route path="/staff/invoices" element={<Suspense fallback={<RouteFallback />}><InvoicesPlaceholder /></Suspense>} />
            <Route path="/staff/products" element={<Suspense fallback={<RouteFallback />}><ProductCatalogView /></Suspense>} />
            <Route path="/staff/plans" element={<Suspense fallback={<RouteFallback />}><PlanManagerView /></Suspense>} />
          </Route>

          {/* Customer Portal (Customer Only) */}
          <Route element={<RoleGuard allowedRoles={['CUSTOMER']} />}>
            <Route path="/portal/subscriptions" element={<Suspense fallback={<RouteFallback />}><CustomerPortalPlaceholder /></Suspense>} />
            <Route path="/portal/invoices" element={<Suspense fallback={<RouteFallback />}><InvoicesPlaceholder /></Suspense>} />
          </Route>
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound404Page />} />
    </Routes>
  )
}

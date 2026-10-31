import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleGuard } from './RoleGuard'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/AuthContext'

// Auth Pages
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { Forbidden403Page } from './Forbidden403Page'
import { NotFound404Page } from './NotFound404Page'

// Placeholders for subsequent hours
import { FinanceDashboardPlaceholder } from '@/features/dashboard/FinanceDashboardPlaceholder'
import { SubscriptionsPlaceholder } from '@/features/subscriptions/SubscriptionsPlaceholder'
import { QuotationTemplatesPlaceholder } from '@/features/quotation-templates/QuotationTemplatesPlaceholder'
import { InvoicesPlaceholder } from '@/features/invoices/InvoicesPlaceholder'
// Core Catalog Views
import { ProductCatalogView } from '@/features/products/ProductCatalogView'
import { PlanManagerView } from '@/features/plans/PlanManagerView'
import { DiscountsPlaceholder } from '@/features/discounts/DiscountsPlaceholder'
import { TaxesPlaceholder } from '@/features/taxes/TaxesPlaceholder'
import { StaffPlaceholder } from '@/features/staff/StaffPlaceholder'
import { CustomerPortalPlaceholder } from '@/features/customer-portal/CustomerPortalPlaceholder'

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
            <Route path="/admin/dashboard" element={<FinanceDashboardPlaceholder />} />
            <Route path="/admin/products/new" element={<ProductCatalogView />} />
            <Route path="/admin/plans/new" element={<PlanManagerView />} />
            <Route path="/admin/discounts" element={<DiscountsPlaceholder />} />
            <Route path="/admin/taxes" element={<TaxesPlaceholder />} />
            <Route path="/admin/staff" element={<StaffPlaceholder />} />
          </Route>

          {/* Staff & Admin Operational Views */}
          <Route element={<RoleGuard allowedRoles={['STAFF', 'ADMIN']} />}>
            <Route path="/staff/subscriptions" element={<SubscriptionsPlaceholder />} />
            <Route path="/staff/subscriptions/new" element={<SubscriptionsPlaceholder />} />
            <Route path="/staff/quotation-templates" element={<QuotationTemplatesPlaceholder />} />
            <Route path="/staff/invoices" element={<InvoicesPlaceholder />} />
            <Route path="/staff/products" element={<ProductCatalogView />} />
            <Route path="/staff/plans" element={<PlanManagerView />} />
          </Route>

          {/* Customer Portal (Customer Only) */}
          <Route element={<RoleGuard allowedRoles={['CUSTOMER']} />}>
            <Route path="/portal/subscriptions" element={<CustomerPortalPlaceholder />} />
            <Route path="/portal/invoices" element={<InvoicesPlaceholder />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound404Page />} />
    </Routes>
  )
}


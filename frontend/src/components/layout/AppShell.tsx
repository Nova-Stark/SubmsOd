import React, { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { ENV } from '@/config/env'
import { UserRole } from '@/types/auth'
import {
  LayoutDashboard,
  Repeat,
  FileSpreadsheet,
  Receipt,
  Boxes,
  CalendarDays,
  Percent,
  Coins,
  Users,
  LogOut,
  Menu,
  X,
  CreditCard,
  UserCheck,
} from 'lucide-react'

export const AppShell: React.FC = () => {
  const { user, logout, switchRoleMock } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const role = user?.role || 'CUSTOMER'

  // Navigation items based on role
  const getNavSections = () => {
    if (role === 'ADMIN') {
      return [
        {
          title: 'Finance & Analytics',
          items: [
            { label: 'Finance Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
          ],
        },
        {
          title: 'Operations',
          items: [
            { label: 'Subscriptions', to: '/staff/subscriptions', icon: Repeat },
            { label: 'Quotation Templates', to: '/staff/quotation-templates', icon: FileSpreadsheet },
            { label: 'Invoices & Billing', to: '/staff/invoices', icon: Receipt },
          ],
        },
        {
          title: 'Catalog & Plans',
          items: [
            { label: 'Products & Variants', to: '/staff/products', icon: Boxes },
            { label: 'Subscription Plans', to: '/staff/plans', icon: CalendarDays },
          ],
        },
        {
          title: 'Administration',
          items: [
            { label: 'Discounts & Coupons', to: '/admin/discounts', icon: Percent },
            { label: 'Tax Rules', to: '/admin/taxes', icon: Coins },
            { label: 'Staff Accounts', to: '/admin/staff', icon: Users },
          ],
        },
      ]
    }

    if (role === 'STAFF') {
      return [
        {
          title: 'Operations & Sales',
          items: [
            { label: 'Subscriptions', to: '/staff/subscriptions', icon: Repeat },
            { label: 'Quotation Templates', to: '/staff/quotation-templates', icon: FileSpreadsheet },
            { label: 'Invoices & Payments', to: '/staff/invoices', icon: Receipt },
          ],
        },
        {
          title: 'Catalog Reference',
          items: [
            { label: 'Products', to: '/staff/products', icon: Boxes },
            { label: 'Subscription Plans', to: '/staff/plans', icon: CalendarDays },
          ],
        },
      ]
    }

    // Customer Portal
    return [
      {
        title: 'Customer Self-Serve Portal',
        items: [
          { label: 'My Subscriptions', to: '/portal/subscriptions', icon: Repeat },
          { label: 'Invoices & Receipts', to: '/portal/invoices', icon: CreditCard },
        ],
      },
    ]
  }

  const navSections = getNavSections()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-14 bg-[#714b67] text-white flex items-center justify-between px-4 sm:px-6 shadow-md z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden text-white/80 hover:text-white p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <span className="w-7 h-7 bg-white text-[#714b67] font-bold rounded flex items-center justify-center text-sm shadow-xs">
              BL
            </span>
            <span className="font-bold tracking-tight text-base hidden sm:inline">Brightloop</span>
            <span className="text-white/60 text-xs hidden md:inline">| Subscription & Revenue Ops</span>
          </Link>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Role Switcher strictly when VITE_USE_MOCK=true */}
          {ENV.USE_MOCK && (
            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded text-xs border border-white/10">
              <span className="text-white/70 text-[11px] hidden sm:inline">Switch Role:</span>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole
                  switchRoleMock(newRole)
                  if (newRole === 'ADMIN') {
                    navigate('/admin/dashboard')
                  } else if (newRole === 'STAFF') {
                    navigate('/staff/subscriptions')
                  } else {
                    navigate('/portal/subscriptions')
                  }
                }}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                aria-label="Role Switcher for prototype review"
              >
                <option value="ADMIN" className="text-slate-900">Admin (Finance Lead)</option>
                <option value="STAFF" className="text-slate-900">Staff (Sales/Ops)</option>
                <option value="CUSTOMER" className="text-slate-900">Customer (Portal)</option>
              </select>
            </div>
          )}

          {/* Current user badge */}
          <div className="flex items-center gap-2 border-l border-white/20 pl-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold leading-tight">{user?.name || user?.email}</div>
              <div className="text-[10px] text-white/70 uppercase tracking-wider font-mono">
                {user?.role}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 shrink-0 select-none overflow-y-auto">
          {/* Brand header / Role Pill */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {role === 'ADMIN' ? 'Admin Portal' : role === 'STAFF' ? 'Staff Workspace' : 'Customer Portal'}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                role === 'ADMIN'
                  ? 'bg-[#f5eff3] text-[#714b67] border border-[#d4b8cc]'
                  : role === 'STAFF'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-[#e6f3f4] text-[#017e84] border border-[#a4d4d6]'
              }`}
            >
              {role}
            </span>
          </div>

          <nav className="p-3 space-y-5 flex-1">
            {navSections.map((sec, idx) => (
              <div key={idx}>
                <div className="px-2 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {sec.title}
                </div>
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#f5eff3] text-[#714b67] font-semibold shadow-xs'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-[#714b67]" />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Quick info footer */}
          <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Odoo Subscriptions v2.6</span>
            <span className="text-[#017e84] font-medium flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Live
            </span>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative flex flex-col w-64 max-w-xs bg-white h-full shadow-xl z-50 p-4 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="font-bold text-slate-800">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <nav className="space-y-4">
                {navSections.map((sec, idx) => (
                  <div key={idx}>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {sec.title}
                    </div>
                    <div className="space-y-0.5">
                      {sec.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium ${
                                isActive
                                  ? 'bg-[#f5eff3] text-[#714b67] font-semibold'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`
                            }
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}


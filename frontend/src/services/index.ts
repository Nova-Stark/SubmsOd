import { ENV } from '@/config/env'
import {
  mockAuthService,
  mockCustomerService,
  mockCatalogService,
  mockSubscriptionService,
  mockInvoiceService,
  mockDashboardService,
} from './mock/mockServices'
import { apiClient } from './api'
import {
  AuthResponse,
  LoginDto,
  SignupDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  CreateStaffDto,
  User,
} from '@/types/auth'
import { Product, Plan, TaxRule, DiscountRule } from '@/types/catalog'
import { Customer } from '@/types/customer'
import { Subscription, SubscriptionAction, QuotationTemplate } from '@/types/subscription'
import { Invoice, InvoiceStatus, Payment } from '@/types/invoice'
import { FinanceKpis, RevenueDataPoint, BillingRunResult } from '@/types/dashboard'
import { PaginatedResponse } from '@/types/api'

// Unified Services: seamless toggle via ENV.USE_MOCK
export const authService = {
  login: async (dto: LoginDto): Promise<AuthResponse> => {
    if (ENV.USE_MOCK) return mockAuthService.login(dto)
    const res = await apiClient.post<AuthResponse>('/auth/login', dto)
    return res.data
  },
  signup: async (dto: SignupDto): Promise<AuthResponse> => {
    if (ENV.USE_MOCK) return mockAuthService.signup(dto)
    const res = await apiClient.post<AuthResponse>('/auth/signup', dto)
    return res.data
  },
  forgotPassword: async (dto: ForgotPasswordDto): Promise<{ message: string; resetCode?: string }> => {
    if (ENV.USE_MOCK) return mockAuthService.forgotPassword(dto)
    const res = await apiClient.post<{ message: string; reset_code?: string }>('/auth/forgot-password', dto)
    return { message: res.data.message, resetCode: res.data.reset_code }
  },
  resetPassword: async (dto: ResetPasswordDto): Promise<{ message: string }> => {
    if (ENV.USE_MOCK) return mockAuthService.resetPassword(dto)
    const res = await apiClient.post<{ message: string }>('/auth/reset-password', {
      email: dto.email,
      token_code: dto.tokenCode,
      new_password: dto.newPassword,
    })
    return res.data
  },
  getCurrentUser: async (token?: string): Promise<User> => {
    if (ENV.USE_MOCK) return mockAuthService.getCurrentUser(token)
    const res = await apiClient.get<User>('/auth/me')
    return res.data
  },
  listStaff: async (): Promise<User[]> => {
    if (ENV.USE_MOCK) return mockAuthService.listStaff()
    const res = await apiClient.get<User[]>('/staff')
    return res.data
  },
  createStaff: async (dto: CreateStaffDto): Promise<User> => {
    if (ENV.USE_MOCK) return mockAuthService.createStaff(dto)
    const res = await apiClient.post<User>('/admin/staff', dto)
    return res.data
  },
}

export const customerService = {
  listCustomers: async (params?: { search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Customer>> => {
    if (ENV.USE_MOCK) return mockCustomerService.listCustomers(params)
    const res = await apiClient.get<PaginatedResponse<Customer>>('/customers', { params })
    return res.data
  },
  createCustomer: async (customer: Omit<Customer, 'id' | 'activeSubscriptionsCount' | 'createdAt'>): Promise<Customer> => {
    if (ENV.USE_MOCK) return mockCustomerService.createCustomer(customer)
    const res = await apiClient.post<Customer>('/customers', customer)
    return res.data
  },
}

export const catalogService = {
  listProducts: async (): Promise<Product[]> => {
    if (ENV.USE_MOCK) return mockCatalogService.listProducts()
    const res = await apiClient.get<Product[]>('/catalog/products')
    return res.data
  },
  createProduct: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    if (ENV.USE_MOCK) return mockCatalogService.createProduct(product)
    const res = await apiClient.post<Product>('/admin/catalog/products', product)
    return res.data
  },
  listPlans: async (): Promise<Plan[]> => {
    if (ENV.USE_MOCK) return mockCatalogService.listPlans()
    const res = await apiClient.get<Plan[]>('/catalog/plans')
    return res.data
  },
  createPlan: async (plan: Omit<Plan, 'id' | 'createdAt'>): Promise<Plan> => {
    if (ENV.USE_MOCK) return mockCatalogService.createPlan(plan)
    const res = await apiClient.post<Plan>('/admin/catalog/plans', plan)
    return res.data
  },
  listTaxes: async (): Promise<TaxRule[]> => {
    if (ENV.USE_MOCK) return mockCatalogService.listTaxes()
    const res = await apiClient.get<TaxRule[]>('/catalog/taxes')
    return res.data
  },
  createTax: async (tax: Omit<TaxRule, 'id'>): Promise<TaxRule> => {
    if (ENV.USE_MOCK) return mockCatalogService.createTax(tax)
    const res = await apiClient.post<TaxRule>('/admin/catalog/taxes', tax)
    return res.data
  },
  listDiscounts: async (): Promise<DiscountRule[]> => {
    if (ENV.USE_MOCK) return mockCatalogService.listDiscounts()
    const res = await apiClient.get<DiscountRule[]>('/catalog/discounts')
    return res.data
  },
  createDiscount: async (discount: Omit<DiscountRule, 'id' | 'currentUsage'>): Promise<DiscountRule> => {
    if (ENV.USE_MOCK) return mockCatalogService.createDiscount(discount)
    const res = await apiClient.post<DiscountRule>('/admin/catalog/discounts', discount)
    return res.data
  },
  validateDiscount: async (code: string, subtotal: number, qty = 1): Promise<{ valid: boolean; discountAmount: number; message?: string }> => {
    if (ENV.USE_MOCK) return mockCatalogService.validateDiscount(code, subtotal, qty)
    const res = await apiClient.post<{ valid: boolean; discount_amount: number; message?: string }>('/catalog/discounts/validate', {
      code,
      subtotal,
      qty,
    })
    return { valid: res.data.valid, discountAmount: res.data.discount_amount, message: res.data.message }
  },
}

export const subscriptionService = {
  listSubscriptions: async (params?: {
    status?: string
    customerId?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Subscription>> => {
    if (ENV.USE_MOCK) return mockSubscriptionService.listSubscriptions(params)
    const res = await apiClient.get<PaginatedResponse<Subscription>>('/subscriptions', { params })
    return res.data
  },
  getSubscription: async (id: string): Promise<Subscription> => {
    if (ENV.USE_MOCK) return mockSubscriptionService.getSubscription(id)
    const res = await apiClient.get<Subscription>(`/subscriptions/${id}`)
    return res.data
  },
  createSubscription: async (dto: Omit<Subscription, 'id' | 'subscriptionNumber' | 'createdAt' | 'updatedAt' | 'allowedActions'>): Promise<Subscription> => {
    if (ENV.USE_MOCK) return mockSubscriptionService.createSubscription(dto)
    const res = await apiClient.post<Subscription>('/subscriptions', dto)
    return res.data
  },
  transitionSubscription: async (id: string, action: SubscriptionAction): Promise<Subscription> => {
    if (ENV.USE_MOCK) return mockSubscriptionService.transitionSubscription(id, action)
    const actionEndpointMap: Record<SubscriptionAction, string> = {
      send_quotation: 'send-quote',
      confirm: 'confirm',
      activate: 'activate',
      pause: 'pause',
      renew: 'renew',
      close: 'close',
    }
    const endpoint = actionEndpointMap[action] || action
    const res = await apiClient.post<Subscription>(`/subscriptions/${id}/${endpoint}`)
    return res.data
  },
  listQuotationTemplates: async (): Promise<QuotationTemplate[]> => {
    if (ENV.USE_MOCK) return mockSubscriptionService.listQuotationTemplates()
    const res = await apiClient.get<QuotationTemplate[]>('/quotation-templates')
    return res.data
  },
  convertQuotationTemplate: async (templateId: string, customerId: string, startDate?: string): Promise<Subscription> => {
    if (ENV.USE_MOCK) return mockSubscriptionService.convertQuotationTemplate(templateId, customerId, startDate)
    const res = await apiClient.post<Subscription>(`/quotation-templates/${templateId}/convert`, {
      customer_id: customerId,
      start_date: startDate,
    })
    return res.data
  },
}

export const invoiceService = {
  listInvoices: async (params?: {
    status?: string
    customerId?: string
    isOverdue?: boolean
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Invoice>> => {
    if (ENV.USE_MOCK) return mockInvoiceService.listInvoices(params)
    const res = await apiClient.get<PaginatedResponse<Invoice>>('/invoices', { params })
    return res.data
  },
  getInvoice: async (id: string): Promise<Invoice> => {
    if (ENV.USE_MOCK) return mockInvoiceService.getInvoice(id)
    const res = await apiClient.get<Invoice>(`/invoices/${id}`)
    return res.data
  },
  updateInvoiceStatus: async (id: string, status: InvoiceStatus): Promise<Invoice> => {
    if (ENV.USE_MOCK) return mockInvoiceService.updateInvoiceStatus(id, status)
    const endpoint = status === 'CONFIRMED' ? 'confirm' : status === 'CANCELLED' ? 'cancel' : 'status'
    const res = await apiClient.post<Invoice>(`/invoices/${id}/${endpoint}`)
    return res.data
  },
  recordPayment: async (invoiceId: string, payment: Omit<Payment, 'id' | 'invoiceId' | 'createdAt'>): Promise<{ invoice: Invoice; payment: Payment }> => {
    if (ENV.USE_MOCK) return mockInvoiceService.recordPayment(invoiceId, payment)
    const res = await apiClient.post<{ invoice: Invoice; payment: Payment }>(`/invoices/${invoiceId}/payments`, payment)
    return res.data
  },
  listPayments: async (params?: { method?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Payment>> => {
    if (ENV.USE_MOCK) return mockInvoiceService.listPayments(params)
    const res = await apiClient.get<PaginatedResponse<Payment>>('/payments', { params })
    return res.data
  },
  generateInvoiceFromSubscription: async (subscriptionId: string): Promise<Invoice> => {
    if (ENV.USE_MOCK) return mockInvoiceService.generateInvoiceFromSubscription(subscriptionId)
    const res = await apiClient.post<Invoice>(`/subscriptions/${subscriptionId}/generate-invoice`)
    return res.data
  },
  runBatchBilling: async (): Promise<BillingRunResult> => {
    if (ENV.USE_MOCK) return mockInvoiceService.runBatchBilling()
    const res = await apiClient.post<BillingRunResult>('/billing/run')
    return res.data
  },
}

export const dashboardService = {
  getFinanceKpis: async (): Promise<FinanceKpis> => {
    if (ENV.USE_MOCK) return mockDashboardService.getFinanceKpis()
    const res = await apiClient.get<FinanceKpis>('/finance/summary')
    return res.data
  },
  getRevenueChart: async (period?: string): Promise<RevenueDataPoint[]> => {
    if (ENV.USE_MOCK) return mockDashboardService.getRevenueChart(period)
    const res = await apiClient.get<RevenueDataPoint[]>('/finance/reports', { params: { period } })
    return res.data
  },
}


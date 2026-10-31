import { getMockDb, saveMockDb } from './db'
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
import { PaginatedResponse, ApiError } from '@/types/api'
import { evaluatePassword } from '@/lib/password'

const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms))

// Auth Mock Service
export const mockAuthService = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    await delay()
    const db = getMockDb()
    const user = db.users.find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase() && u.isActive
    )

    if (!user) {
      const err: ApiError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email address or password.',
      }
      throw err
    }

    const token = `mock_jwt_token_${user.id}_${Date.now()}`
    return {
      token,
      user,
      message: 'Login successful',
    }
  },

  async signup(dto: SignupDto): Promise<AuthResponse> {
    await delay()
    const db = getMockDb()
    const email = dto.email.trim().toLowerCase()

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      const err: ApiError = {
        code: 'EMAIL_EXISTS',
        message: 'An account with this email address already exists.',
        fieldErrors: { email: 'Email is already registered. Please log in.' },
      }
      throw err
    }

    const pwdCheck = evaluatePassword(dto.password)
    if (!pwdCheck.isStrong) {
      const err: ApiError = {
        code: 'WEAK_PASSWORD',
        message: 'Password does not satisfy the security requirements.',
        fieldErrors: { password: 'Must be >8 characters with uppercase, lowercase, and special characters.' },
      }
      throw err
    }

    // Signup ALWAYS creates CUSTOMER role - never accepts client role
    const newUser: User = {
      id: `usr_cust_${Date.now()}`,
      email,
      name: email.split('@')[0],
      role: 'CUSTOMER',
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    db.users.push(newUser)

    // Automatically create corresponding customer profile
    const newCustomer: Customer = {
      id: `cust_${newUser.id}`,
      name: newUser.name || 'New Customer',
      email: newUser.email,
      activeSubscriptionsCount: 0,
      createdAt: new Date().toISOString(),
    }
    db.customers.push(newCustomer)

    saveMockDb(db)

    return {
      token: `mock_jwt_token_${newUser.id}`,
      user: newUser,
      message: 'Customer account created successfully',
    }
  },

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; resetCode?: string }> {
    await delay()
    const db = getMockDb()
    const email = dto.email.trim().toLowerCase()
    const code = `RESET-${Math.floor(100000 + Math.random() * 900000)}`

    db.resetTokens.push({
      email,
      tokenCode: code,
      expiresAt: Date.now() + 3600 * 1000,
    })
    saveMockDb(db)

    return {
      message: 'If the account exists, a password reset link/code has been dispatched to your email.',
      resetCode: code, // returned for seamless hackathon testing
    }
  },

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    await delay()
    const db = getMockDb()
    const email = dto.email.trim().toLowerCase()

    const validToken = db.resetTokens.find(
      (t) => t.email.toLowerCase() === email && t.tokenCode === dto.tokenCode && t.expiresAt > Date.now()
    )

    if (!validToken) {
      const err: ApiError = {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired reset code. Please request a new one.',
        fieldErrors: { tokenCode: 'Invalid or expired token code.' },
      }
      throw err
    }

    const pwdCheck = evaluatePassword(dto.newPassword)
    if (!pwdCheck.isStrong) {
      const err: ApiError = {
        code: 'WEAK_PASSWORD',
        message: 'Password does not meet the security requirements.',
        fieldErrors: { newPassword: 'Must be >8 characters with uppercase, lowercase, and special character.' },
      }
      throw err
    }

    db.resetTokens = db.resetTokens.filter((t) => t !== validToken)
    saveMockDb(db)

    return { message: 'Password successfully updated. You may now log in.' }
  },

  async getCurrentUser(token?: string): Promise<User> {
    await delay(100)
    const db = getMockDb()
    if (!token) {
      // Return default admin for preview if not signed in
      return db.users[0]
    }
    const match = db.users.find((u) => token.includes(u.id))
    return match || db.users[0]
  },

  async listStaff(): Promise<User[]> {
    await delay()
    const db = getMockDb()
    return db.users.filter((u) => u.role === 'STAFF' || u.role === 'ADMIN')
  },

  async createStaff(dto: CreateStaffDto): Promise<User> {
    await delay()
    const db = getMockDb()
    const email = dto.email.trim().toLowerCase()

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      const err: ApiError = {
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists.',
        fieldErrors: { email: 'Email already exists.' },
      }
      throw err
    }

    const newStaff: User = {
      id: `usr_staff_${Date.now()}`,
      email,
      name: dto.name || email.split('@')[0],
      role: 'STAFF',
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    db.users.push(newStaff)
    saveMockDb(db)
    return newStaff
  },
}

// Customers Mock Service
export const mockCustomerService = {
  async listCustomers(params?: { search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Customer>> {
    await delay()
    const db = getMockDb()
    let filtered = [...db.customers]

    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company && c.company.toLowerCase().includes(q))
      )
    }

    const page = params?.page || 1
    const limit = params?.limit || 20
    const start = (page - 1) * limit
    const paged = filtered.slice(start, start + limit)

    return {
      data: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    }
  },

  async createCustomer(customer: Omit<Customer, 'id' | 'activeSubscriptionsCount' | 'createdAt'>): Promise<Customer> {
    await delay()
    const db = getMockDb()
    const newCust: Customer = {
      ...customer,
      id: `cust_${Date.now()}`,
      activeSubscriptionsCount: 0,
      createdAt: new Date().toISOString(),
    }
    db.customers.unshift(newCust)
    saveMockDb(db)
    return newCust
  },
}

// Catalog Mock Service (Products, Plans, Taxes, Discounts)
export const mockCatalogService = {
  async listProducts(): Promise<Product[]> {
    await delay()
    const db = getMockDb()
    return db.products
  },

  async createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
    await delay()
    const db = getMockDb()
    const newProd: Product = {
      ...product,
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    db.products.unshift(newProd)
    saveMockDb(db)
    return newProd
  },

  async listPlans(): Promise<Plan[]> {
    await delay()
    const db = getMockDb()
    return db.plans
  },

  async createPlan(plan: Omit<Plan, 'id' | 'createdAt'>): Promise<Plan> {
    await delay()
    const db = getMockDb()
    const newPlan: Plan = {
      ...plan,
      id: `plan_${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    db.plans.unshift(newPlan)
    saveMockDb(db)
    return newPlan
  },

  async listTaxes(): Promise<TaxRule[]> {
    await delay()
    return getMockDb().taxes
  },

  async createTax(tax: Omit<TaxRule, 'id'>): Promise<TaxRule> {
    await delay()
    const db = getMockDb()
    const newTax: TaxRule = {
      ...tax,
      id: `tax_${Date.now()}`,
    }
    db.taxes.push(newTax)
    saveMockDb(db)
    return newTax
  },

  async listDiscounts(): Promise<DiscountRule[]> {
    await delay()
    return getMockDb().discounts
  },

  async createDiscount(discount: Omit<DiscountRule, 'id' | 'currentUsage'>): Promise<DiscountRule> {
    await delay()
    const db = getMockDb()
    const newDiscount: DiscountRule = {
      ...discount,
      id: `disc_${Date.now()}`,
      currentUsage: 0,
    }
    db.discounts.push(newDiscount)
    saveMockDb(db)
    return newDiscount
  },

  async validateDiscount(code: string, subtotal: number, qty = 1): Promise<{ valid: boolean; discountAmount: number; message?: string }> {
    await delay()
    const db = getMockDb()
    const discount = db.discounts.find((d) => d.code.toUpperCase() === code.toUpperCase())

    if (!discount) {
      return { valid: false, discountAmount: 0, message: 'Invalid coupon code.' }
    }

    if (discount.currentUsage >= discount.maxUsage) {
      return { valid: false, discountAmount: 0, message: 'Discount usage limit exceeded.' }
    }

    if (subtotal < discount.minSpend) {
      return { valid: false, discountAmount: 0, message: `Minimum spend of ₹${discount.minSpend / 100} required.` }
    }

    if (qty < discount.minQty) {
      return { valid: false, discountAmount: 0, message: `Minimum quantity of ${discount.minQty} items required.` }
    }

    let discountAmount = 0
    if (discount.type === 'PERCENTAGE') {
      discountAmount = Math.round((subtotal * discount.value) / 10000)
    } else {
      discountAmount = Math.min(discount.value, subtotal)
    }

    return { valid: true, discountAmount }
  },
}

// Subscriptions & Quotation Templates Mock Service
export const mockSubscriptionService = {
  async listSubscriptions(params?: {
    status?: string
    customerId?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Subscription>> {
    await delay()
    const db = getMockDb()
    let filtered = [...db.subscriptions]

    if (params?.status) {
      filtered = filtered.filter((s) => s.status === params.status)
    }

    if (params?.customerId) {
      filtered = filtered.filter((s) => s.customerId === params.customerId)
    }

    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.subscriptionNumber.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.planName.toLowerCase().includes(q)
      )
    }

    const page = params?.page || 1
    const limit = params?.limit || 20
    const start = (page - 1) * limit
    const paged = filtered.slice(start, start + limit)

    return {
      data: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    }
  },

  async getSubscription(id: string): Promise<Subscription> {
    await delay()
    const db = getMockDb()
    const sub = db.subscriptions.find((s) => s.id === id)
    if (!sub) {
      throw { code: 'NOT_FOUND', message: 'Subscription not found.' } as ApiError
    }
    return sub
  },

  async createSubscription(dto: Omit<Subscription, 'id' | 'subscriptionNumber' | 'createdAt' | 'updatedAt' | 'allowedActions'>): Promise<Subscription> {
    await delay()
    const db = getMockDb()
    const count = db.subscriptions.length + 1
    const subNumber = `SUB/2026/${String(count).padStart(5, '0')}`

    const newSub: Subscription = {
      ...dto,
      id: `sub_${Date.now()}`,
      subscriptionNumber: subNumber,
      allowedActions: ['send_quotation', 'confirm'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    db.subscriptions.unshift(newSub)

    // Update customer subscription count
    const customer = db.customers.find((c) => c.id === dto.customerId)
    if (customer) {
      customer.activeSubscriptionsCount += 1
    }

    saveMockDb(db)
    return newSub
  },

  async transitionSubscription(id: string, action: SubscriptionAction): Promise<Subscription> {
    await delay()
    const db = getMockDb()
    const sub = db.subscriptions.find((s) => s.id === id)
    if (!sub) {
      throw { code: 'NOT_FOUND', message: 'Subscription not found' } as ApiError
    }

    switch (action) {
      case 'send_quotation':
        sub.status = 'QUOTATION'
        sub.allowedActions = ['confirm', 'close']
        break
      case 'confirm':
        sub.status = 'CONFIRMED'
        sub.allowedActions = ['activate', 'close']
        break
      case 'activate':
        sub.status = 'ACTIVE'
        sub.allowedActions = sub.flags.allowPause ? ['pause', 'renew', 'close'] : ['renew', 'close']
        break
      case 'pause':
        if (!sub.flags.allowPause) throw { code: 'INVALID_STATE', message: 'Plan does not permit pausing' }
        sub.status = 'PAUSED'
        sub.allowedActions = ['activate', 'renew', 'close']
        break
      case 'renew':
        if (!sub.flags.allowRenew) throw { code: 'INVALID_STATE', message: 'Plan does not permit renewal' }
        sub.status = 'ACTIVE'
        // Extend expiry by 1 year
        const currentExp = new Date(sub.expiryDate)
        currentExp.setFullYear(currentExp.getFullYear() + 1)
        sub.expiryDate = currentExp.toISOString().split('T')[0]
        sub.allowedActions = ['pause', 'renew', 'close']
        break
      case 'close':
        sub.status = 'CLOSED'
        sub.allowedActions = []
        break
    }

    sub.updatedAt = new Date().toISOString()
    saveMockDb(db)
    return sub
  },

  async listQuotationTemplates(): Promise<QuotationTemplate[]> {
    await delay()
    return getMockDb().quotationTemplates
  },

  async convertQuotationTemplate(templateId: string, customerId: string, startDate?: string): Promise<Subscription> {
    await delay()
    const db = getMockDb()
    const template = db.quotationTemplates.find((t) => t.id === templateId)
    const customer = db.customers.find((c) => c.id === customerId)
    const plan = db.plans.find((p) => p.id === template?.planId)

    if (!template || !customer || !plan) {
      throw { code: 'NOT_FOUND', message: 'Template, Plan, or Customer not found' } as ApiError
    }

    const start = startDate ? new Date(startDate) : new Date()
    const exp = new Date(start)
    exp.setDate(exp.getDate() + template.validityDays)

    // Build order lines
    let subtotal = 0
    const lines = template.lines.map((l, index) => {
      const prod = db.products.find((p) => p.id === l.productId)
      const variant = prod?.variants.find((v) => v.id === l.variantId)
      const lineTotal = l.unitPrice * l.qty
      subtotal += lineTotal
      const taxAmount = Math.round((lineTotal * 1800) / 10000)

      return {
        id: `line_conv_${index}_${Date.now()}`,
        productId: l.productId,
        productName: prod?.name || 'Product',
        variantId: l.variantId,
        variantName: variant?.variantName,
        qty: l.qty,
        unitPrice: l.unitPrice,
        taxId: 'tax_gst_18',
        taxRate: 1800,
        taxAmount,
        totalAmount: lineTotal + taxAmount,
      }
    })

    const taxTotal = Math.round((subtotal * 1800) / 10000)
    const totalAmount = subtotal + taxTotal

    const count = db.subscriptions.length + 1
    const newSub: Subscription = {
      id: `sub_${Date.now()}`,
      subscriptionNumber: `SUB/2026/${String(count).padStart(5, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      planId: plan.id,
      planName: plan.name,
      status: 'QUOTATION',
      startDate: start.toISOString().split('T')[0],
      expiryDate: exp.toISOString().split('T')[0],
      paymentTerms: 'Net 30',
      currency: 'INR',
      subtotal,
      taxTotal,
      discountTotal: 0,
      totalAmount,
      lines,
      flags: plan.flags,
      allowedActions: ['confirm', 'close'],
      notes: `Generated from template "${template.name}"`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    db.subscriptions.unshift(newSub)
    customer.activeSubscriptionsCount += 1
    saveMockDb(db)
    return newSub
  },
}

// Invoices & Billing Mock Service
export const mockInvoiceService = {
  async listInvoices(params?: {
    status?: string
    customerId?: string
    isOverdue?: boolean
    search?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Invoice>> {
    await delay()
    const db = getMockDb()
    let filtered = [...db.invoices]

    if (params?.status) {
      filtered = filtered.filter((i) => i.status === params.status)
    }

    if (params?.customerId) {
      filtered = filtered.filter((i) => i.customerId === params.customerId)
    }

    if (params?.isOverdue !== undefined) {
      filtered = filtered.filter((i) => i.isOverdue === params.isOverdue)
    }

    if (params?.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q) ||
          (i.subscriptionNumber && i.subscriptionNumber.toLowerCase().includes(q))
      )
    }

    const page = params?.page || 1
    const limit = params?.limit || 20
    const start = (page - 1) * limit
    const paged = filtered.slice(start, start + limit)

    return {
      data: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    }
  },

  async getInvoice(id: string): Promise<Invoice> {
    await delay()
    const db = getMockDb()
    const inv = db.invoices.find((i) => i.id === id)
    if (!inv) {
      throw { code: 'NOT_FOUND', message: 'Invoice not found.' } as ApiError
    }
    return inv
  },

  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    await delay()
    const db = getMockDb()
    const inv = db.invoices.find((i) => i.id === id)
    if (!inv) throw { code: 'NOT_FOUND', message: 'Invoice not found' } as ApiError

    inv.status = status
    inv.updatedAt = new Date().toISOString()
    saveMockDb(db)
    return inv
  },

  async recordPayment(invoiceId: string, payment: Omit<Payment, 'id' | 'invoiceId' | 'createdAt'>): Promise<{ invoice: Invoice; payment: Payment }> {
    await delay()
    const db = getMockDb()
    const inv = db.invoices.find((i) => i.id === invoiceId)
    if (!inv) throw { code: 'NOT_FOUND', message: 'Invoice not found' } as ApiError

    const newPayment: Payment = {
      ...payment,
      id: `pay_${Date.now()}`,
      invoiceId,
      createdAt: new Date().toISOString(),
    }

    inv.payments.push(newPayment)
    db.payments.unshift(newPayment)

    inv.amountPaid += newPayment.amount
    inv.amountDue = Math.max(0, inv.totalAmount - inv.amountPaid)

    if (inv.amountDue === 0) {
      inv.status = 'PAID'
      inv.isOverdue = false
    }

    inv.updatedAt = new Date().toISOString()
    saveMockDb(db)
    return { invoice: inv, payment: newPayment }
  },

  async listPayments(params?: { method?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Payment>> {
    await delay()
    const db = getMockDb()
    let filtered = [...db.payments]

    if (params?.method) {
      filtered = filtered.filter((p) => p.method === params.method)
    }

    const page = params?.page || 1
    const limit = params?.limit || 20
    const start = (page - 1) * limit
    const paged = filtered.slice(start, start + limit)

    return {
      data: paged,
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    }
  },

  async runBatchBilling(): Promise<BillingRunResult> {
    await delay(350)
    const db = getMockDb()
    const activeSubs = db.subscriptions.filter((s) => s.status === 'ACTIVE')

    let created = 0
    let skipped = 0
    const invoiceIds: string[] = []

    for (const sub of activeSubs) {
      // Check idempotency: check if an invoice was already generated for this sub this month
      const currentMonth = new Date().toISOString().substring(0, 7)
      const alreadyBilled = db.invoices.some(
        (i) => i.subscriptionId === sub.id && i.issueDate.startsWith(currentMonth)
      )

      if (alreadyBilled) {
        skipped++
        continue
      }

      const invCount = db.invoices.length + 1
      const invNumber = `INV/2026/${String(invCount).padStart(5, '0')}`

      const customer = db.customers.find((c) => c.id === sub.customerId)
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)

      const newInv: Invoice = {
        id: `inv_batch_${Date.now()}_${created}`,
        invoiceNumber: invNumber,
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerId: sub.customerId,
        customerName: sub.customerName,
        customerEmail: sub.customerEmail || 'billing@acme.com',
        customerAddress: customer?.address,
        gstin: customer?.gstin,
        status: 'CONFIRMED',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        isOverdue: false,
        subtotal: sub.subtotal,
        taxAmount: sub.taxTotal,
        discountAmount: sub.discountTotal,
        totalAmount: sub.totalAmount,
        amountPaid: 0,
        amountDue: sub.totalAmount,
        currency: sub.currency,
        payments: [],
        lines: sub.lines.map((l) => ({
          id: `invline_${l.id}`,
          description: `${l.productName} ${l.variantName ? `(${l.variantName})` : ''}`,
          qty: l.qty,
          unitPrice: l.unitPrice,
          taxRate: l.taxRate || 1800,
          amount: l.totalAmount,
        })),
        notes: 'Automated recurring billing generation.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      db.invoices.unshift(newInv)
      invoiceIds.push(newInv.id)
      created++
    }

    saveMockDb(db)
    return {
      created,
      skipped,
      failed: 0,
      invoiceIds,
      timestamp: new Date().toISOString(),
    }
  },
}

// Finance Analytics Mock Service
export const mockDashboardService = {
  async getFinanceKpis(): Promise<FinanceKpis> {
    await delay()
    const db = getMockDb()

    const activeSubs = db.subscriptions.filter((s) => s.status === 'ACTIVE').length
    const revenueCollected = db.payments.reduce((acc, p) => acc + p.amount, 0)
    const outstandingAmount = db.invoices
      .filter((i) => i.status === 'CONFIRMED')
      .reduce((acc, i) => acc + i.amountDue, 0)
    const overdueInvoicesCount = db.invoices.filter((i) => i.isOverdue && i.status !== 'PAID').length

    // MRR = Active subs normalized monthly revenue
    const mrr = db.subscriptions
      .filter((s) => s.status === 'ACTIVE')
      .reduce((acc, s) => acc + s.totalAmount, 0)

    return {
      activeSubscriptions: activeSubs,
      revenueCollected,
      outstandingAmount,
      overdueInvoicesCount,
      mrr,
      currency: 'INR',
    }
  },

  async getRevenueChart(): Promise<RevenueDataPoint[]> {
    await delay()
    return [
      { period: 'May 2026', revenue: 18500000, projected: 19000000 },
      { period: 'Jun 2026', revenue: 22100000, projected: 21500000 },
      { period: 'Jul 2026', revenue: 25800000, projected: 26000000 },
      { period: 'Aug 2026', revenue: 29400000, projected: 28500000 },
      { period: 'Sep 2026', revenue: 32600000, projected: 33000000 },
      { period: 'Oct 2026', revenue: 35981740, projected: 38000000 },
    ]
  },
}


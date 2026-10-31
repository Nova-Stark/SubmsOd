import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { ENV } from '@/config/env'
import { ApiError } from '@/types/api'

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach bearer token if present
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('brightloop_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Transform snake_case keys to camelCase
function toCamel(s: string): string {
  return s.replace(/([-_][a-z])/gi, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''))
}

export function normalizePayload(data: any): any {
  if (Array.isArray(data)) {
    return data.map(normalizePayload)
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    const res: Record<string, any> = {}
    for (const [key, val] of Object.entries(data)) {
      const normalizedVal = normalizePayload(val)
      res[key] = normalizedVal
      const camelKey = toCamel(key)
      if (camelKey !== key && res[camelKey] === undefined) {
        res[camelKey] = normalizedVal
      }
    }

    // Convenience computed fields for Subscription & Invoices
    if (res.customer && typeof res.customer === 'object') {
      if (!res.customerName) res.customerName = res.customer.name || res.customer.email
      if (!res.customerEmail) res.customerEmail = res.customer.email
    }
    if (res.plan && typeof res.plan === 'object') {
      if (!res.planName) res.planName = res.plan.name
    }
    if (res.lines && Array.isArray(res.lines)) {
      res.lines = res.lines.map((l: any) => ({
        ...l,
        qty: l.qty ?? l.quantity,
        productName: l.productName ?? l.product?.name ?? l.product_name,
        variantName: l.variantName ?? l.variant?.variant_name ?? l.variant?.variantName ?? l.variant_name,
        totalAmount: l.totalAmount ?? l.subtotal ?? (l.unit_price ?? l.unitPrice ?? 0) * (l.qty ?? l.quantity ?? 1),
      }))
    }
    if (res.status && !res.allowedActions) {
      const allowed: string[] = []
      switch (res.status) {
        case 'DRAFT':
          allowed.push('send_quotation')
          break
        case 'QUOTATION':
          allowed.push('confirm', 'close')
          break
        case 'CONFIRMED':
          allowed.push('activate', 'close')
          break
        case 'ACTIVE':
          allowed.push('pause', 'renew', 'close')
          break
        case 'PAUSED':
          allowed.push('activate', 'close')
          break
      }
      res.allowedActions = allowed
    }

    return res
  }
  return data
}

// Response Interceptor: Normalize snake_case & normalize backend error shapes
apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = normalizePayload(response.data)
    }
    return response
  },
  (error: AxiosError<{ error?: string; message?: string; code?: string; fieldErrors?: Record<string, string> }>) => {
    const errorData = error.response?.data

    const normalizedError: ApiError = {
      code: errorData?.code || `HTTP_${error.response?.status || 'UNKNOWN'}`,
      message: errorData?.message || errorData?.error || error.message || 'An unexpected error occurred',
      fieldErrors: errorData?.fieldErrors,
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('brightloop_token')
      localStorage.removeItem('brightloop_user')
    }

    return Promise.reject(normalizedError)
  }
)

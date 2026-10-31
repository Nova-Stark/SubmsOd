export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  gstin?: string
  address?: string
  activeSubscriptionsCount: number
  createdAt: string
}


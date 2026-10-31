export const ENV = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  USE_MOCK: import.meta.env.VITE_USE_MOCK !== 'false',
  AUTH_STORAGE: (import.meta.env.VITE_AUTH_STORAGE || 'cookie') as 'cookie' | 'localStorage',
  DEFAULT_CURRENCY: import.meta.env.VITE_DEFAULT_CURRENCY || 'INR',
} as const

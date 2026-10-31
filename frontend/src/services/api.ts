import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { ENV } from '@/config/env'
import { ApiError } from '@/types/api'

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true, // Supports httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Attach token if configured in localStorage fallback
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (ENV.AUTH_STORAGE === 'localStorage') {
    const token = localStorage.getItem('brightloop_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response Interceptor: Normalize backend error shapes
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string; code?: string; fieldErrors?: Record<string, string> }>) => {
    const errorData = error.response?.data

    const normalizedError: ApiError = {
      code: errorData?.code || `HTTP_${error.response?.status || 'UNKNOWN'}`,
      message: errorData?.message || errorData?.error || error.message || 'An unexpected error occurred',
      fieldErrors: errorData?.fieldErrors || {},
    }

    if (error.response?.status === 401) {
      if (ENV.AUTH_STORAGE === 'localStorage') {
        localStorage.removeItem('brightloop_token')
        localStorage.removeItem('brightloop_user')
      }
    }

    return Promise.reject(normalizedError)
  }
)


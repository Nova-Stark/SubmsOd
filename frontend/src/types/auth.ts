export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
  message?: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface SignupDto {
  email: string
  password: string
}

export interface ForgotPasswordDto {
  email: string
}

export interface ResetPasswordDto {
  email: string
  tokenCode: string
  newPassword: string
}

export interface CreateStaffDto {
  email: string
  password: string
  name?: string
}

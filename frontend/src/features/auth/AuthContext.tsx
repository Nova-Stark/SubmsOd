import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserRole, LoginDto, SignupDto } from '@/types/auth'
import { authService } from '@/services'
import { ENV } from '@/config/env'
import { getMockDb } from '@/services/mock/db'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (dto: LoginDto) => Promise<User>
  signup: (dto: SignupDto) => Promise<User>
  logout: () => void
  switchRoleMock: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Restore session
    try {
      const storedUser = localStorage.getItem('brightloop_user')
      const storedToken = localStorage.getItem('brightloop_token')

      if (storedUser) {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } else if (ENV.USE_MOCK) {
        // Default to Admin for quick prototype review if nothing stored
        const db = getMockDb()
        setUser(db.users[0])
        setToken(`mock_token_${db.users[0].id}`)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (dto: LoginDto): Promise<User> => {
    setIsLoading(true)
    try {
      const res = await authService.login(dto)
      setUser(res.user)
      setToken(res.token)
      localStorage.setItem('brightloop_user', JSON.stringify(res.user))
      localStorage.setItem('brightloop_token', res.token)
      return res.user
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (dto: SignupDto): Promise<User> => {
    setIsLoading(true)
    try {
      const res = await authService.signup(dto)
      setUser(res.user)
      setToken(res.token)
      localStorage.setItem('brightloop_user', JSON.stringify(res.user))
      localStorage.setItem('brightloop_token', res.token)
      return res.user
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('brightloop_user')
    localStorage.removeItem('brightloop_token')
  }

  const switchRoleMock = (role: UserRole) => {
    if (!ENV.USE_MOCK) return
    const db = getMockDb()
    const target = db.users.find((u) => u.role === role) || {
      id: `usr_${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@brightloop.io`,
      name: `${role} Demo Account`,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    setUser(target)
    setToken(`mock_token_${target.id}`)
    localStorage.setItem('brightloop_user', JSON.stringify(target))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        switchRoleMock,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

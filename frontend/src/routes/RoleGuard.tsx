import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { UserRole } from '@/types/auth'

interface RoleGuardProps {
  allowedRoles: UserRole[]
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

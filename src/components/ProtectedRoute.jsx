import { Navigate } from 'react-router-dom'

/**
 * allowedRoles: string[] — список ролей, которым разрешён доступ
 * profile: объект текущего пользователя или null
 */
export default function ProtectedRoute({ profile, allowedRoles, children }) {
  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
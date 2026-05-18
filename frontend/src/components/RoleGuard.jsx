import { useAuth } from '../context/AuthContext';

const RoleGuard = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  // If there's no user or the user's role is not in the allowedRoles array, don't render children
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
};

export default RoleGuard;

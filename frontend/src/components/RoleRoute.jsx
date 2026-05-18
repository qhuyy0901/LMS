import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleRoute = ({ roles, allowedRoles, children }) => {
  const { user } = useAuth();
  const permitted = roles || allowedRoles || [];

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!permitted.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Nếu có children (dùng như wrapper), render children
  // Nếu không, render Outlet (dùng như layout route)
  return children ? children : <Outlet />;
};

export default RoleRoute;

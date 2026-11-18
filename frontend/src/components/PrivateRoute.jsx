import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ allowedRoles }) => {
  const token = localStorage.getItem('token');
  let role = localStorage.getItem('role');

  if (role === 'owner') {
    role = 'admin';
    localStorage.setItem('role', role);
  }

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'customer') return <Navigate to="/customers" replace />;
    if (role === 'viewer') return <Navigate to="/loans" replace />;
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;

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
    return <Navigate to={role === 'customer' ? '/customers' : '/profile'} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;

import { Navigate } from 'react-router-dom';
import { Skeleton } from '../components/UI.jsx';
import { useAdminAuth } from './AuthContext.jsx';

export default function ProtectedAdmin({ children }) {
  const { user, loading } = useAdminAuth();
  if (loading) return <div className="p-8"><Skeleton rows={8} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/login" replace state={{ error: 'Admin role required.' }} />;
  return children;
}

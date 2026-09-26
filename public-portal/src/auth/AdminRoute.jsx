import { Navigate, useLocation } from 'react-router-dom';
import { EmptyState, PageSkeleton } from '../components/States.jsx';
import { useAuth } from './AuthContext.jsx';

/* Signed-in users with the `admin` role only; the API enforces the same rule. */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'admin') {
    return (
      <main className="container listing-page">
        <EmptyState title="Admin access required" description="This area is only available to GovTrack editors." />
      </main>
    );
  }
  return children;
}

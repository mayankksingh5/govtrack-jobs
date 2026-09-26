import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { PageSkeleton } from './components/States.jsx';
import AdminRoute from './auth/AdminRoute.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Jobs = lazy(() => import('./pages/Jobs.jsx'));
const JobDetails = lazy(() => import('./pages/JobDetails.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const Updates = lazy(() => import('./pages/Updates.jsx'));
const Organization = lazy(() => import('./pages/Organization.jsx'));
const Category = lazy(() => import('./pages/Category.jsx'));
const StaticPage = lazy(() => import('./pages/StaticPage.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminReview = lazy(() => import('./pages/admin/AdminReview.jsx'));
const LoginPage = lazy(() => import('./pages/AuthPages.jsx').then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/AuthPages.jsx').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/AuthPages.jsx').then((module) => ({ default: module.ResetPasswordPage })));

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/search" element={<Search />} />
          <Route path="/exams" element={<Calendar />} />
          <Route path="/exam-calendar" element={<Calendar />} />
          <Route path="/results" element={<Updates kind="results" />} />
          <Route path="/admit-cards" element={<Updates kind="admit-cards" />} />
          <Route path="/answer-keys" element={<Updates kind="answer-keys" />} />
          <Route path="/cut-off" element={<Updates kind="cut-off" />} />
          <Route path="/syllabus" element={<Updates kind="syllabus" />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/organization/:name" element={<Organization />} />
          {/* Public site: sign-in exists only for admins. */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/posts/:id" element={<AdminRoute><AdminReview /></AdminRoute>} />
          <Route path="/about" element={<StaticPage type="about" />} />
          <Route path="/contact" element={<StaticPage type="contact" />} />
          <Route path="/privacy" element={<StaticPage type="privacy" />} />
          <Route path="/terms" element={<StaticPage type="terms" />} />
          <Route path="/disclaimer" element={<StaticPage type="disclaimer" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

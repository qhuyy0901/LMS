import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { DashboardViewProvider, useDashboardView } from './context/DashboardViewContext';
import { SavedCoursesProvider } from './context/SavedCoursesContext';
import { buildBackendUrl } from './utils/backendUrl';

const ExternalRedirect = ({ to }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-b-purple-600" />
    </div>
  );
};

const ExternalCourseEditRedirect = () => {
  const { id } = useParams();
  useEffect(() => {
    window.location.replace(buildBackendUrl(`/Instructor/KhoaHoc/Edit/${id}`));
  }, [id]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-b-purple-600" />
    </div>
  );
};

const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const AdminCoupons = lazy(() => import('./pages/AdminCoupons'));
const AdminCourses = lazy(() => import('./pages/AdminCourses'));
const AdminEvents = lazy(() => import('./pages/AdminEvents'));
const AdminHoSoGiangVien = lazy(() => import('./pages/AdminHoSoGiangVien'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminTransactions = lazy(() => import('./pages/AdminTransactions'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const CourseDetails = lazy(() => import('./pages/CourseDetails'));
const Checkout = lazy(() => import('./pages/Checkout'));
const CourseEditor = lazy(() => import('./pages/CourseEditor'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Explore = lazy(() => import('./pages/Explore'));
const InstructorCourses = lazy(() => import('./pages/InstructorCourses'));
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'));
const InstructorEvents = lazy(() => import('./pages/InstructorEvents'));
const InstructorRevenue = lazy(() => import('./pages/InstructorRevenue'));
const InstructorVouchers = lazy(() => import('./pages/InstructorVouchers'));
const InstructorRegister = lazy(() => import('./pages/InstructorRegister'));
const LearningWorkspace = lazy(() => import('./pages/LearningWorkspace'));
const Login = lazy(() => import('./pages/Login'));
const Messages = lazy(() => import('./pages/Messages'));
const MyLearning = lazy(() => import('./pages/MyLearning'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Register = lazy(() => import('./pages/Register'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const InstructorCourseForm = lazy(() => import('./pages/InstructorCourseForm'));

const RoleLanding = () => {
  const { user } = useAuth();
  const { activeView, isImpersonating } = useDashboardView();

  if (user?.role === 'INSTRUCTOR' && activeView === 'INSTRUCTOR' && !isImpersonating) {
    return <Navigate to="/instructor/dashboard" replace />;
  }

  return <Dashboard />;
};

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-b-purple-600" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <SavedCoursesProvider>
          <DashboardViewProvider>
            <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/oauth-callback" element={<OAuthCallback />} />
                <Route path="/become-instructor" element={<InstructorRegister />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/learn/:courseId" element={<LearningWorkspace />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-cancel" element={<PaymentCancel />} />

                  <Route path="/" element={<Layout />}>
                    <Route index element={<RoleLanding />} />
                    <Route path="events" element={<Events />} />
                    <Route path="student/events" element={<Events />} />
                    <Route path="student/events/:eventId" element={<EventDetails />} />
                    <Route path="profile" element={<Settings />} />
                    <Route path="settings" element={<Navigate to="/profile" replace />} />
                    <Route path="instructor/settings" element={<Navigate to="/profile" replace />} />

                    {/* ── Học tập của tôi (gộp my-courses + my-classes) ── */}
                    <Route path="my-learning" element={<MyLearning />} />
                    <Route path="my-courses" element={<Navigate to="/my-learning" replace />} />
                    <Route path="my-classes" element={<Navigate to="/my-learning" replace />} />

                    <Route path="explore" element={<Explore />} />
                    <Route path="course/:id" element={<CourseDetails />} />
                    <Route path="checkout/:courseId" element={<Checkout />} />
                    <Route path="instructors" element={<Navigate to="/" replace />} />
                    <Route path="giang-vien" element={<Navigate to="/" replace />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="certificates" element={<Navigate to="/my-learning" replace />} />
                    <Route path="missions" element={<Navigate to="/" replace />} />
                    <Route path="tasks" element={<Navigate to="/" replace />} />
                    <Route path="points" element={<Navigate to="/" replace />} />
                    <Route path="my-points" element={<Navigate to="/" replace />} />
                    <Route path="redeem-points" element={<Navigate to="/" replace />} />
                    <Route path="rewards" element={<Navigate to="/" replace />} />
                    <Route path="point-exchange" element={<Navigate to="/" replace />} />
                    <Route path="upgrade" element={<Pricing />} />

                    <Route
                      path="instructor"
                      element={
                        <RoleRoute roles={['INSTRUCTOR']}>
                          <Navigate to="/instructor/dashboard" replace />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/dashboard"
                      element={
                        <RoleRoute roles={['INSTRUCTOR']}>
                          <InstructorDashboard />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/courses"
                      element={
                        <RoleRoute roles={['INSTRUCTOR']}>
                          <InstructorCourses />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/events"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <InstructorEvents />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/events/:eventId"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <EventDetails />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/revenue"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <InstructorRevenue />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/wallet"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <InstructorRevenue />
                        </RoleRoute>
                      }
                    />

                    <Route
                      path="instructor/vouchers"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <InstructorVouchers />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/courses/new"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <CourseEditor />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/courses/:id/edit"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <CourseEditor />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="instructor/courses/:id"
                      element={
                        <RoleRoute roles={['INSTRUCTOR', 'ADMIN']}>
                          <CourseEditor />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="admin"
                      element={<RoleRoute roles={['ADMIN']} />}
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="instructor-applications" element={<AdminHoSoGiangVien />} />
                      <Route path="courses" element={<AdminCourses />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="coupons" element={<Navigate to="/admin" replace />} />
                      <Route path="transactions" element={<AdminTransactions />} />
                      <Route path="events" element={<AdminEvents />} />
                      <Route path="support" element={<Navigate to="/admin" replace />} />
                      <Route path="messages" element={<Navigate to="/admin" replace />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="security" element={<Navigate to="/admin/settings" replace />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            </BrowserRouter>
          </DashboardViewProvider>
        </SavedCoursesProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;

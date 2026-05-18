import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pricing from './pages/Pricing';
import Events from './pages/Events';
import MyClasses from './pages/MyClasses';
import MyCourses from './pages/MyCourses';
import Explore from './pages/Explore';
import Reports from './pages/Reports';
import Instructors from './pages/Instructors';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';
import { DashboardViewProvider } from './context/DashboardViewContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import CourseDetails from './pages/CourseDetails';
import LearningWorkspace from './pages/LearningWorkspace';
import InstructorDashboard from './pages/InstructorDashboard';
import InstructorRevenue from './pages/InstructorRevenue';
import CourseEditor from './pages/CourseEditor';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import AdminUsers from './pages/AdminUsers';
import AdminCourses from './pages/AdminCourses';
import AdminTransactions from './pages/AdminTransactions';
import AdminSecurity from './pages/AdminSecurity';

function App() {
  return (
    <AuthProvider>
      <DashboardViewProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth pages — no sidebar/layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Dashboard pages — wrapped in ProtectedRoute -> Layout */}
            <Route element={<ProtectedRoute />}>
              {/* Fullscreen pages — no sidebar */}
              <Route path="/learn/:courseId" element={<LearningWorkspace />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
              
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="events" element={<Events />} />
                <Route path="settings" element={<Settings />} />
                <Route path="my-courses" element={<MyCourses />} />
                <Route path="explore" element={<Explore />} />
                <Route path="course/:id" element={<CourseDetails />} />
                <Route path="instructors" element={<Instructors />} />
                <Route path="my-classes" element={<MyClasses />} />
                <Route path="reports" element={<Reports />} />
                <Route path="upgrade" element={<Pricing />} />
                <Route path="instructor" element={<RoleRoute roles={['INSTRUCTOR', 'ADMIN']}><InstructorDashboard /></RoleRoute>} />
                <Route path="instructor/revenue" element={<RoleRoute roles={['INSTRUCTOR', 'ADMIN']}><InstructorRevenue /></RoleRoute>} />
                <Route path="instructor/courses/new" element={<RoleRoute roles={['INSTRUCTOR', 'ADMIN']}><CourseEditor /></RoleRoute>} />
                <Route path="instructor/courses/:id" element={<RoleRoute roles={['INSTRUCTOR', 'ADMIN']}><CourseEditor /></RoleRoute>} />
                <Route path="admin/users" element={<RoleRoute roles={['ADMIN']}><AdminUsers /></RoleRoute>} />
                <Route path="admin/courses" element={<RoleRoute roles={['ADMIN']}><AdminCourses /></RoleRoute>} />
                <Route path="admin/transactions" element={<RoleRoute roles={['ADMIN']}><AdminTransactions /></RoleRoute>} />
                <Route path="admin/security" element={<RoleRoute roles={['ADMIN']}><AdminSecurity /></RoleRoute>} />
              </Route>
            </Route>
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DashboardViewProvider>
    </AuthProvider>
  );
}

export default App;

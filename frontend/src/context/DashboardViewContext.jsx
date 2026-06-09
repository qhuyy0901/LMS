import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

/**
 * DashboardViewContext — manages the "impersonation mode".
 *
 * When an INSTRUCTOR or ADMIN activates "View as Student",
 * `activeView` becomes 'STUDENT' while `user.role` stays unchanged.
 * All UI components read `activeView` for rendering,
 * but all API calls still use the real JWT role → security is never bypassed.
 */
const DashboardViewContext = createContext(null);

export function DashboardViewProvider({ children }) {
  const { user } = useAuth();
  const realRole = user?.role || 'STUDENT';

  // null means "use real role" — non-null means we are impersonating
  const [impersonatedView, setImpersonatedView] = useState(() =>
    sessionStorage.getItem('skillio_student_preview') === 'true' ? 'STUDENT' : null
  );

  const activeView = impersonatedView || realRole;
  const isImpersonating = impersonatedView !== null && impersonatedView !== realRole;

  const enterStudentView = useCallback(() => {
    if (realRole === 'INSTRUCTOR' || realRole === 'ADMIN') {
      sessionStorage.setItem('skillio_student_preview', 'true');
      setImpersonatedView('STUDENT');
    }
  }, [realRole]);

  const exitImpersonation = useCallback(() => {
    sessionStorage.removeItem('skillio_student_preview');
    setImpersonatedView(null);
  }, []);

  const canImpersonate = realRole === 'INSTRUCTOR' || realRole === 'ADMIN';

  useEffect(() => {
    if (isImpersonating) {
      axios.defaults.headers.common['X-Student-Preview'] = 'true';
    } else {
      delete axios.defaults.headers.common['X-Student-Preview'];
    }

    return () => {
      delete axios.defaults.headers.common['X-Student-Preview'];
    };
  }, [isImpersonating]);

  const value = useMemo(
    () => ({
      /** The currently displayed view role (may differ from JWT role). */
      activeView,
      /** The user's real role from JWT. */
      realRole,
      /** Whether we are in impersonation mode right now. */
      isImpersonating,
      /** Whether the current user is allowed to impersonate. */
      canImpersonate,
      /** Switch to student view. */
      enterStudentView,
      /** Return to the real role view. */
      exitImpersonation,
    }),
    [activeView, realRole, isImpersonating, canImpersonate, enterStudentView, exitImpersonation]
  );

  return (
    <DashboardViewContext.Provider value={value}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export const useDashboardView = () => {
  const context = useContext(DashboardViewContext);
  if (!context) {
    throw new Error('useDashboardView must be used within a DashboardViewProvider');
  }
  return context;
};

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
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
  const [impersonatedView, setImpersonatedView] = useState(null);

  const activeView = impersonatedView || realRole;
  const isImpersonating = impersonatedView !== null && impersonatedView !== realRole;

  const enterStudentView = useCallback(() => {
    if (realRole === 'INSTRUCTOR' || realRole === 'ADMIN') {
      setImpersonatedView('STUDENT');
    }
  }, [realRole]);

  const exitImpersonation = useCallback(() => {
    setImpersonatedView(null);
  }, []);

  const canImpersonate = realRole === 'INSTRUCTOR' || realRole === 'ADMIN';

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

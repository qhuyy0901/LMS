import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SavedCoursesContext = createContext();

export function SavedCoursesProvider({ children }) {
  const { user } = useAuth();
  const [savedCourses, setSavedCourses] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user) {
      setSavedCourses([]);
      setSavedIds(new Set());
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get('/api/user/saved-courses');
      const list = Array.isArray(res.data) ? res.data : [];
      setSavedCourses(list);
      setSavedIds(new Set(list.map((s) => s.courseId)));
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const saveCourse = useCallback(
    async (courseId) => {
      if (!user) return false;
      if (savedIds.has(courseId)) return true;
      try {
        await axios.post('/api/user/saved-courses', { courseId });
        // Optimistically update: fetch full data
        await fetchSaved();
        return true;
      } catch (err) {
        if (err.response?.status === 409) {
          // already saved — sync state
          await fetchSaved();
          return true;
        }
        return false;
      }
    },
    [user, savedIds, fetchSaved]
  );

  const removeCourse = useCallback(
    async (courseId) => {
      if (!user) return false;
      // Optimistic remove
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
      setSavedCourses((prev) => prev.filter((s) => s.courseId !== courseId));
      try {
        await axios.delete(`/api/user/saved-courses/${courseId}`);
        return true;
      } catch {
        // Revert on error
        await fetchSaved();
        return false;
      }
    },
    [user, fetchSaved]
  );

  const isSaved = useCallback((courseId) => savedIds.has(courseId), [savedIds]);

  const value = useMemo(
    () => ({
      savedCourses,
      savedIds,
      loading,
      saveCourse,
      removeCourse,
      isSaved,
      count: savedCourses.length,
      refresh: fetchSaved,
    }),
    [savedCourses, savedIds, loading, saveCourse, removeCourse, isSaved, fetchSaved]
  );

  return <SavedCoursesContext.Provider value={value}>{children}</SavedCoursesContext.Provider>;
}

export const useSavedCourses = () => useContext(SavedCoursesContext);

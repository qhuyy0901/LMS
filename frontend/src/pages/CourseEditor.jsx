import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
  GripVertical,
  Image as ImageIcon,
  ListTree,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react';
import { api } from '../api/client';
import QuizEditorModal from '../components/QuizEditorModal';

const STEPS = [
  { id: 1, title: 'Th\u00f4ng tin chung', hint: 'Ti\u00eau \u0111\u1ec1, m\u00f4 t\u1ea3, \u1ea3nh b\u00eca' },
  { id: 2, title: 'X\u00e2y d\u1ef1ng gi\u00e1o tr\u00ecnh', hint: 'Ch\u01b0\u01a1ng, b\u00e0i h\u1ecdc, xem th\u1eed, k\u00e9o th\u1ea3' },
  { id: 3, title: 'Gi\u00e1 v\u00e0 h\u1ea1ng', hint: 'Gi\u00e1 b\u00e1n v\u00e0 danh hi\u1ec7u t\u1ed1i thi\u1ec3u' },
  { id: 4, title: 'Ki\u1ec3m tra v\u00e0 xu\u1ea5t b\u1ea3n', hint: 'R\u00e0 so\u00e1t v\u00e0 \u0111\u01b0a kh\u00f3a h\u1ecdc l\u00ean Explore' },
];

const TIER_OPTIONS = [
  { value: 'BRONZE', label: '\u0110\u1ed3ng' },
  { value: 'SILVER', label: 'B\u1ea1c' },
  { value: 'GOLD', label: 'V\u00e0ng' },
  { value: 'PLATINUM', label: 'B\u1ea1ch kim' },
  { value: 'DIAMOND', label: 'Kim c\u01b0\u01a1ng' },
];

const emptyCourseForm = {
  title: '',
  description: '',
  thumbnail: '',
  price: 0,
  minimumMemberTier: 'BRONZE',
};

const moveArrayItem = (items, fromIndex, toIndex) => {
  const cloned = [...items];
  const [removed] = cloned.splice(fromIndex, 1);
  cloned.splice(toIndex, 0, removed);
  return cloned;
};

const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainSeconds = total % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainSeconds}s`;
  }
  return `${remainSeconds}s`;
};

const buildReorderPayload = (sections) => ({
  sections: sections.map((section) => ({
    id: section.id,
    lessons: (section.lessons || []).map((lesson) => ({ id: lesson.id })),
  })),
});

const resizeTextarea = (element) => {
  if (!element) {
    return;
  }
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
};

const CourseEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [activeStep, setActiveStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [expandedSectionId, setExpandedSectionId] = useState(null);
  const [course, setCourse] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [dragState, setDragState] = useState(null);
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState(null);

  const fetchCourse = useCallback(async (courseId) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/instructor/courses/${courseId}`);
      setCourse(data);
      setSections(data.sections || []);
      setCourseForm({
        title: data.title || '',
        description: data.description || '',
        thumbnail: data.thumbnail || '',
        price: data.price || 0,
        minimumMemberTier: data.minimumMemberTier || 'BRONZE',
      });
      if (data.sections?.length > 0) {
        setExpandedSectionId((prev) => prev || data.sections[0].id);
      }
    } catch (error) {
      console.error('Load course error', error);
      window.alert('Không tìm thấy khóa học hoặc bạn không có quyền truy cập.');
      navigate('/instructor');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) {
      fetchCourse(id);
    }
  }, [fetchCourse, id]);

  const totalLessons = useMemo(
    () => sections.reduce((sum, section) => sum + (section.lessons?.length || 0), 0),
    [sections]
  );

  const totalDurationSeconds = useMemo(
    () =>
      sections.reduce(
        (courseSum, section) =>
          courseSum +
          (section.lessons || []).reduce((lessonSum, lesson) => lessonSum + (lesson.durationSeconds || 0), 0),
        0
      ),
    [sections]
  );

  const canManageCurriculum = Boolean(course?.id || id);
  const publishErrors = course?.publishValidationErrors || [];

  const handleCourseFieldChange = (event) => {
    const { name, value } = event.target;
    setCourseForm((prev) => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value,
    }));
  };


  const saveCourse = async () => {
    setSaving(true);
    try {
      if (course?.id || id) {
        const updated = await api.put(`/api/instructor/courses/${course?.id || id}`, courseForm);
        setCourse(updated);
      } else {
        const created = await api.post('/api/instructor/courses', courseForm);
        setCourse(created);
        navigate(`/instructor/courses/${created.id}`, { replace: true });
      }
      if (course?.id || id) {
        await fetchCourse(course?.id || id);
      }
      return true;
    } catch (error) {
      console.error(error);
      window.alert(error?.data?.message || 'Lưu khóa học thất bại.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (activeStep === 1) {
      const ok = await saveCourse();
      if (!ok) {
        return;
      }
    }

    if (activeStep < STEPS.length) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 1) {
      navigate('/instructor');
      return;
    }
    setActiveStep((prev) => prev - 1);
  };

  const addSection = async () => {
    const courseId = course?.id || id;
    if (!courseId) {
      window.alert('Hãy lưu thông tin khóa học trước khi thêm giáo trình.');
      return;
    }
    try {
      const section = await api.post(`/api/instructor/courses/${courseId}/sections`, {
        title: `Chương ${sections.length + 1}`,
      });
      setSections((prev) => [...prev, section]);
      setExpandedSectionId(section.id);
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể tạo chương mới.');
    }
  };

  const updateSection = async (sectionId, payload) => {
    const courseId = course?.id || id;
    const updated = await api.put(`/api/instructor/courses/${courseId}/sections/${sectionId}`, payload);
    setSections((prev) => prev.map((section) => (section.id === sectionId ? updated : section)));
  };

  const removeSection = async (sectionId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa chương này?')) {
      return;
    }
    const courseId = course?.id || id;
    await api.delete(`/api/instructor/courses/${courseId}/sections/${sectionId}`);
    const nextSections = sections.filter((section) => section.id !== sectionId);
    setSections(nextSections);
    setExpandedSectionId(nextSections[0]?.id || null);
  };

  const addLesson = async (sectionId) => {
    const courseId = course?.id || id;
    try {
      const lesson = await api.post(`/api/instructor/courses/${courseId}/sections/${sectionId}/lessons`, {
        title: 'Bài giảng mới',
        isPublished: true,
        isPreview: false,
      });
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? { ...section, lessons: [...(section.lessons || []), lesson] }
            : section
        )
      );
      setExpandedSectionId(sectionId);
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể tạo bài giảng mới.');
    }
  };

  const updateLesson = async (lessonId, payload) => {
    const courseId = course?.id || id;
    const updated = await api.put(`/api/instructor/courses/${courseId}/lessons/${lessonId}`, payload);
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        lessons: (section.lessons || []).map((lesson) => (lesson.id === lessonId ? updated : lesson)),
      }))
    );
  };

  const removeLesson = async (lessonId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài giảng này?')) {
      return;
    }
    const courseId = course?.id || id;
    await api.delete(`/api/instructor/courses/${courseId}/lessons/${lessonId}`);
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        lessons: (section.lessons || []).filter((lesson) => lesson.id !== lessonId),
      }))
    );
  };

  const uploadLessonVideo = async (lessonId, file) => {
    if (!file) {
      return;
    }
    const courseId = course?.id || id;
    const formData = new FormData();
    formData.append('video', file);
    try {
      setSaving(true);
      const response = await api.upload(`/api/instructor/courses/${courseId}/lessons/${lessonId}/video`, formData);
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          lessons: (section.lessons || []).map((lesson) =>
            lesson.id === lessonId
              ? {
                  ...lesson,
                  videoUrl: response.videoUrl,
                  durationSeconds: response.durationSeconds,
                }
              : lesson
          ),
        }))
      );
    } catch (error) {
      window.alert(error?.data?.message || 'Tải video thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const syncReorder = async (nextSections) => {
    const courseId = course?.id || id;
    setSections(nextSections);
    try {
      const refreshed = await api.put(`/api/instructor/courses/${courseId}/curriculum/reorder`, buildReorderPayload(nextSections));
      setCourse(refreshed);
      setSections(refreshed.sections || []);
    } catch (error) {
      console.error(error);
      window.alert(error?.data?.message || 'Cập nhật thứ tự thất bại.');
      await fetchCourse(courseId);
    }
  };

  const onDragStart = (payload) => setDragState(payload);
  const onDragEnd = () => setDragState(null);

  const handleSectionDrop = (targetSectionId) => {
    if (!dragState || dragState.type !== 'section') {
      return;
    }
    const fromIndex = sections.findIndex((section) => section.id === dragState.sectionId);
    const toIndex = sections.findIndex((section) => section.id === targetSectionId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }
    syncReorder(moveArrayItem(sections, fromIndex, toIndex));
    setDragState(null);
  };

  const handleLessonDrop = (targetSectionId, targetLessonId = null) => {
    if (!dragState || dragState.type !== 'lesson') {
      return;
    }

    const sourceSectionIndex = sections.findIndex((section) => section.id === dragState.sectionId);
    const targetSectionIndex = sections.findIndex((section) => section.id === targetSectionId);
    if (sourceSectionIndex === -1 || targetSectionIndex === -1) {
      return;
    }

    const sourceSection = sections[sourceSectionIndex];
    const draggedLesson = sourceSection.lessons.find((lesson) => lesson.id === dragState.lessonId);
    if (!draggedLesson) {
      return;
    }

    const nextSections = sections.map((section) => ({
      ...section,
      lessons: [...(section.lessons || [])],
    }));

    nextSections[sourceSectionIndex].lessons = nextSections[sourceSectionIndex].lessons.filter(
      (lesson) => lesson.id !== dragState.lessonId
    );

    const destinationLessons = nextSections[targetSectionIndex].lessons;
    const targetIndex =
      targetLessonId === null
        ? destinationLessons.length
        : destinationLessons.findIndex((lesson) => lesson.id === targetLessonId);

    destinationLessons.splice(targetIndex < 0 ? destinationLessons.length : targetIndex, 0, {
      ...draggedLesson,
      sectionId: targetSectionId,
    });

    syncReorder(nextSections);
    setDragState(null);
  };

  const publishCourse = async () => {
    const courseId = course?.id || id;
    try {
      const updated = await api.post(`/api/instructor/courses/${courseId}/publish`, {});
      setCourse(updated);
      setSections(updated.sections || []);
      window.alert('Khóa học đã được xuất bản.');
    } catch (error) {
      window.alert(error?.data?.errors?.join('\n') || error?.data?.message || 'Xuất bản thất bại.');
    }
  };

  const unpublishCourse = async () => {
    const courseId = course?.id || id;
    try {
      const updated = await api.post(`/api/instructor/courses/${courseId}/unpublish`, {});
      setCourse(updated);
      setSections(updated.sections || []);
      window.alert('Khóa học đã được chuyển về bản nháp.');
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể hủy xuất bản.');
    }
  };

  const renderGeneralStep = () => (
    <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-900">Tiêu đề khóa học</p>
          <input
            name="title"
            value={courseForm.title}
            onChange={handleCourseFieldChange}
            placeholder="Ví dụ: Lập trình C# cơ bản cho người mới"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Mô tả khóa học</p>
          <textarea
            name="description"
            rows={4}
            value={courseForm.description}
            onChange={handleCourseFieldChange}
            onInput={(event) => resizeTextarea(event.currentTarget)}
            placeholder="Tóm tắt giá trị, đối tượng học viên và kết quả đạt được sau khóa học."
            className="mt-2 w-full resize-none overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Ảnh bìa khóa học</p>
          <input
            name="thumbnail"
            value={courseForm.thumbnail}
            onChange={handleCourseFieldChange}
            placeholder="Dán URL ảnh bìa"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        </div>
      </section>

      <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Xem trước thông tin</p>
          <div className="mt-4 flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white">
            {courseForm.thumbnail ? (
              <img src={courseForm.thumbnail} alt="Ảnh bìa khóa học" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center text-slate-400">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-500">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-500">Chưa có ảnh bìa</p>
                <p className="mt-1 text-xs text-slate-400">Dán URL để xem trước ảnh khóa học</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );

  const renderCurriculumStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Xây dựng giáo trình</h2>
          <p className="mt-1 text-sm text-slate-500">Kéo thả để đổi thứ tự chương và bài học. Đánh dấu xem thử cho bài học phù hợp.</p>
        </div>
        <button
          onClick={addSection}
          disabled={!canManageCurriculum}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Thêm chương
        </button>
      </div>

      {!canManageCurriculum && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Hãy lưu thông tin chung trước, sau đó bạn mới có thể xây dựng giáo trình.
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => onDragStart({ type: 'section', sectionId: section.id })}
            onDragEnd={onDragEnd}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleSectionDrop(section.id)}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex flex-1 items-start gap-3">
                <button className="mt-1 cursor-grab text-slate-400">
                  <GripVertical className="h-5 w-5" />
                </button>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Chương {sectionIndex + 1}</p>
                  <input
                    value={section.title}
                    onChange={(event) =>
                      setSections((prev) =>
                        prev.map((item) => (item.id === section.id ? { ...item, title: event.target.value } : item))
                      )
                    }
                    onBlur={(event) => updateSection(section.id, { title: event.target.value, description: section.description })}
                    className="mt-2 w-full bg-transparent text-lg font-semibold tracking-tight text-slate-900 outline-none focus:text-purple-900"
                  />
                  <textarea
                    value={section.description || ''}
                    onChange={(event) =>
                      setSections((prev) =>
                        prev.map((item) => (item.id === section.id ? { ...item, description: event.target.value } : item))
                      )
                    }
                    onBlur={(event) => updateSection(section.id, { title: section.title, description: event.target.value })}
                    rows={2}
                    placeholder="Mô tả ngắn cho chương này"
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedSectionId((prev) => (prev === section.id ? null : section.id))}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
                >
                  {expandedSectionId === section.id ? 'Thu gọn' : 'Mở rộng'}
                </button>
                <button
                  onClick={() => removeSection(section.id)}
                  className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600"
                >
                  Xóa
                </button>
              </div>
            </div>

            {expandedSectionId === section.id && (
              <div className="space-y-3 px-5 py-4">
                {(section.lessons || []).map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={() => onDragStart({ type: 'lesson', lessonId: lesson.id, sectionId: section.id })}
                    onDragEnd={onDragEnd}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleLessonDrop(section.id, lesson.id)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <button className="mt-2 cursor-grab text-slate-400">
                        <GripVertical className="h-5 w-5" />
                      </button>
                      <div className="grid flex-1 gap-3 md:grid-cols-[1.2fr_1fr]">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bài {lessonIndex + 1}</p>
                            <input
                              value={lesson.title}
                              onChange={(event) =>
                                setSections((prev) =>
                                  prev.map((currentSection) => ({
                                    ...currentSection,
                                    lessons: (currentSection.lessons || []).map((currentLesson) =>
                                      currentLesson.id === lesson.id ? { ...currentLesson, title: event.target.value } : currentLesson
                                    ),
                                  }))
                                )
                              }
                              onBlur={(event) => updateLesson(lesson.id, { title: event.target.value })}
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                            />
                          </div>
                          <textarea
                            value={lesson.content || ''}
                            onChange={(event) =>
                              setSections((prev) =>
                                prev.map((currentSection) => ({
                                  ...currentSection,
                                  lessons: (currentSection.lessons || []).map((currentLesson) =>
                                    currentLesson.id === lesson.id ? { ...currentLesson, content: event.target.value } : currentLesson
                                  ),
                                }))
                              )
                            }
                            onBlur={(event) => updateLesson(lesson.id, { content: event.target.value })}
                            rows={3}
                            placeholder="Mô tả bài học, tài liệu đính kèm, kết quả cần đạt..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-900">Video và metadata</p>
                              <span className="text-xs text-slate-500">{lesson.durationSeconds ? formatDuration(lesson.durationSeconds) : 'Chưa có thời lượng'}</span>
                            </div>
                            <input
                              value={lesson.videoUrl || ''}
                              onChange={(event) =>
                                setSections((prev) =>
                                  prev.map((currentSection) => ({
                                    ...currentSection,
                                    lessons: (currentSection.lessons || []).map((currentLesson) =>
                                      currentLesson.id === lesson.id ? { ...currentLesson, videoUrl: event.target.value } : currentLesson
                                    ),
                                  }))
                                )
                              }
                              onBlur={(event) => updateLesson(lesson.id, { videoUrl: event.target.value })}
                              placeholder="Dán video URL nếu cần"
                              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                            />
                            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
                              <Upload className="h-4 w-4" />
                              Tải video
                              <input type="file" accept="video/*" className="hidden" onChange={(event) => uploadLessonVideo(lesson.id, event.target.files?.[0])} />
                            </label>
                          </div>

                          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                            <label className="flex items-center justify-between gap-3">
                              <span className="text-slate-700">Cho phép học thử</span>
                              <input
                                type="checkbox"
                                checked={Boolean(lesson.isPreview)}
                                onChange={(event) => updateLesson(lesson.id, { isPreview: event.target.checked })}
                                className="h-4 w-4"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-3">
                              <span className="text-slate-700">Xuất bản bài học</span>
                              <input
                                type="checkbox"
                                checked={Boolean(lesson.isPublished)}
                                onChange={(event) => updateLesson(lesson.id, { isPublished: event.target.checked })}
                                className="h-4 w-4"
                              />
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedLessonForQuiz({ id: lesson.id, title: lesson.title })}
                            className="w-full mt-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 px-3 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            📝 Thiết lập Quiz
                          </button>

                          <button
                            onClick={() => removeLesson(lesson.id)}
                            className="w-full mt-2 rounded-xl border border-rose-200 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 transition"
                          >
                            Xóa bài học
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleLessonDrop(section.id, null)}
                  className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3"
                >
                  <button
                    onClick={() => addLesson(section.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm bài học
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPricingStep = () => (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-900">Giá bán (VND)</p>
          <input
            type="number"
            name="price"
            value={courseForm.price}
            onChange={handleCourseFieldChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
          <p className="mt-2 text-xs text-slate-500">Đặt 0 nếu đây là khóa học miễn phí.</p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">Danh hiệu tối thiểu</p>
          <select
            name="minimumMemberTier"
            value={courseForm.minimumMemberTier}
            onChange={handleCourseFieldChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          >
            {TIER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>
      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Tóm tắt kinh doanh</p>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <dt>Giá bán</dt>
              <dd className="font-semibold text-slate-900">{Number(courseForm.price || 0).toLocaleString('vi-VN')} đ</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Hạng tối thiểu</dt>
              <dd className="font-semibold text-slate-900">
                {TIER_OPTIONS.find((option) => option.value === courseForm.minimumMemberTier)?.label}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Tổng bài học</dt>
              <dd className="font-semibold text-slate-900">{totalLessons}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Tổng thời lượng</dt>
              <dd className="font-semibold text-slate-900">{formatDuration(totalDurationSeconds)}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );

  const renderReviewStep = () => (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Kiểm tra sẵn sàng</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{courseForm.title || 'Khóa học chưa đặt tên'}</h2>
          <p className="mt-3 text-sm text-slate-600">{courseForm.description || 'Chưa có mô tả khóa học.'}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Cấu trúc giáo trình</p>
            <p className="mt-2 text-sm text-slate-600">{sections.length} chương · {totalLessons} bài học</p>
            <p className="mt-1 text-sm text-slate-600">{formatDuration(totalDurationSeconds)} tổng thời lượng</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Trạng thái hiện tại</p>
            <p className="mt-2 text-sm text-slate-600">{course?.isPublished ? 'Đã xuất bản trên Explore' : 'Đang ở chế độ bản nháp'}</p>
          </div>
        </div>

        <div className={`rounded-2xl border px-4 py-4 ${publishErrors.length === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className={`mt-0.5 h-5 w-5 ${publishErrors.length === 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {publishErrors.length === 0 ? 'Khóa học đã sẵn sàng để xuất bản' : 'Cần bổ sung trước khi xuất bản'}
              </p>
              {publishErrors.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {publishErrors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-700">Tất cả điều kiện cơ bản đã được đáp ứng.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={publishCourse}
          disabled={!course?.id || publishErrors.length > 0}
          className="w-full rounded-full bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Xuất bản khóa học
        </button>
        <button
          onClick={unpublishCourse}
          disabled={!course?.id || !course?.isPublished}
          className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          Chuyển về bản nháp
        </button>
      </aside>
    </div>
  );

  const renderStepContent = () => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-purple-600" />
          <p className="mt-4 text-sm text-slate-500">Đang tải dữ liệu khóa học...</p>
        </div>
      );
    }

    switch (activeStep) {
      case 1:
        return renderGeneralStep();
      case 2:
        return renderCurriculumStep();
      case 3:
        return renderPricingStep();
      case 4:
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instructor')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEditing ? 'Trình tạo khóa học' : 'Tạo khóa học mới'}</h1>
            <p className="mt-1 text-sm text-slate-500">Quy trình từng bước cho giảng viên: thông tin, giáo trình, giá bán và xuất bản.</p>
          </div>
        </div>
        <button
          onClick={saveCourse}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu khóa học
        </button>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        {STEPS.map((step) => {
          const isActive = step.id === activeStep;
          const isComplete = step.id < activeStep;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                isActive
                  ? 'border-purple-500 bg-purple-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isComplete
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                      : isActive
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                </span>
                {isActive && <ChevronRight className="h-4 w-4 text-purple-600" />}
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-xs text-slate-500">{step.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50">
              <ListTree className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Giáo trình</p>
              <p className="text-lg font-semibold text-slate-900">{sections.length} chương</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50">
              <Video className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Bài học</p>
              <p className="text-lg font-semibold text-slate-900">{totalLessons}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tổng thời lượng</p>
              <p className="text-lg font-semibold text-slate-900">{formatDuration(totalDurationSeconds)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
              <Eye className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Trạng thái</p>
              <p className="text-lg font-semibold text-slate-900">{course?.isPublished ? 'Đã xuất bản' : 'Bản nháp'}</p>
            </div>
          </div>
        </div>
      </div>

      {renderStepContent()}

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
        >
          {activeStep === 1 ? 'Quay lại bảng điều khiển' : 'Quay lại'}
        </button>
        <button
          onClick={handleContinue}
          className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white"
        >
          {activeStep === STEPS.length ? 'Hoàn tất' : 'Tiếp tục'}
        </button>
      </div>

      {selectedLessonForQuiz && (
        <QuizEditorModal
          lessonId={selectedLessonForQuiz.id}
          lessonTitle={selectedLessonForQuiz.title}
          onClose={() => setSelectedLessonForQuiz(null)}
        />
      )}
    </div>
  );
};

export default CourseEditor;


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bold,
  CheckCircle2,
  ChevronRight,
  Eye,
  GripVertical,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListTree,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import { COURSE_CATEGORIES } from '../config/courseCategories';
import { api } from '../api/client';
import QuizEditorModal from '../components/QuizEditorModal';
import { getFileUrl } from '../utils/fileUtils';

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

const ACCEPTED_COURSE_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ACCEPTED_COURSE_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_COURSE_IMAGE_SIZE = 5 * 1024 * 1024;

const emptyCourseForm = {
  title: '',
  shortDescription: '',
  description: '',
  detailedDescription: '',
  category: '',
  thumbnail: '',
  price: 0,
  level: 'BEGINNER',
  minimumMemberTier: 'BRONZE',
  startDate: '',
  endDate: '',
  coverImageFile: null,
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

const getLessonImages = (lesson) => {
  const source = lesson.illustrationUrl || lesson.anhMinhHoa || '';
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildLessonFormData = (lesson, payload = {}, files = {}) => {
  const nextLesson = { ...lesson, ...payload };
  const formData = new FormData();
  formData.append('TieuDe', nextLesson.title || 'Bài học');
  formData.append('NoiDung', nextLesson.content || '');
  formData.append('ThoiLuongGiay', String(nextLesson.durationSeconds || 0));
  formData.append('ChoPhepHocThu', String(Boolean(nextLesson.isPreview)));
  formData.append('ThuTu', String(nextLesson.position || nextLesson.thuTu || 1));
  formData.append('TrangThai', nextLesson.isPublished ? 'PUBLIC' : 'DRAFT');
  formData.append('VideoUrl', nextLesson.videoUrl || '');
  formData.append('RemoveVideo', String(Boolean(payload.removeVideo)));
  formData.append('RemoveImage', String(Boolean(payload.removeImage)));
  formData.append('RemoveDocument', String(Boolean(payload.removeDocument)));
  formData.append('FileUrl', nextLesson.fileUrl || '');

  if (Object.prototype.hasOwnProperty.call(payload, 'imageUrls')) {
    formData.append('ImageUrls', payload.imageUrls || '');
  }

  if (files.videoFile) {
    formData.append('VideoFile', files.videoFile);
  }

  if (files.imageFiles?.length) {
    Array.from(files.imageFiles).forEach((file) => formData.append('ImageFiles', file));
  }

  if (files.documentFile) {
    formData.append('DocumentFile', files.documentFile);
  }

  return formData;
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

const getPlainTextFromHtml = (html = '') => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return (container.textContent || container.innerText || '').replace(/\s+/g, ' ').trim();
};

const getCourseImages = (course) => course?.courseImages || course?.images || [];

const CourseEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const isEditRoute = window.location.pathname.endsWith('/edit');

  const [activeStep, setActiveStep] = useState(() => {
    if (id && !isEditRoute) {
      return 2; // Default to Curriculum if managing curriculum directly
    }
    return 1;
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [expandedSectionId, setExpandedSectionId] = useState(null);
  const [course, setCourse] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const isReadOnly = useMemo(() => {
    if (!course?.id) return false;
    const status = course.trangThai || course.status || (course.isPublished ? 'PUBLIC' : 'DRAFT');
    if (status === 'DRAFT') return false;
    if (status === 'HIDDEN' && !course.ngayXuatBan) return false;
    return true;
  }, [course]);
  const [dragState, setDragState] = useState(null);
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState(null);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.get('/api/categories');
        setCategories(data || []);
      } catch (err) {
        console.error('Không thể tải danh mục:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const fetchCourse = useCallback(async (courseId) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/instructor/courses/${courseId}`);
      setCourse(data);
      setSections(data.sections || []);
      setCourseForm({
        title: data.title || '',
        shortDescription: data.moTaNgan || '',
        description: data.description || data.moTa || '',
        detailedDescription: data.moTaChiTiet || '',
        category: data.danhMucId || data.danhMuc || data.category || '',
        thumbnail: data.thumbnail || '',
        price: data.price || 0,
        level: data.trinhDo || 'BEGINNER',
        minimumMemberTier: data.minimumMemberTier || 'BRONZE',
        startDate: data.startDate?.slice(0, 10) || '',
        endDate: data.endDate?.slice(0, 10) || '',
        coverImageFile: null,
      });
      if (data.sections?.length > 0) {
        setExpandedSectionId((prev) => prev || data.sections[0].id);
      }
    } catch (error) {
      console.error('Load course error', error);
      window.alert('Không tìm thấy khóa học hoặc bạn không có quyền truy cập.');
      navigate('/instructor/courses');
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
  const hasValidCourseDates =
    Boolean(courseForm.startDate && courseForm.endDate) &&
    new Date(courseForm.endDate) > new Date(courseForm.startDate);

  const handleCourseFieldChange = (event) => {
    const { name, value } = event.target;
    setCourseForm((prev) => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value,
    }));
  };

  const saveCourse = async () => {
    // Validate inputs
    const titleTrim = (courseForm.title || '').trim();
    const shortDescTrim = (courseForm.shortDescription || '').trim();
    const descHtml = (courseForm.description || '').trim();
    const descTrim = getPlainTextFromHtml(descHtml);

    if (!titleTrim || titleTrim.length < 5) {
      window.alert('Tiêu đề khóa học phải tối thiểu 5 ký tự.');
      return false;
    }
    if (!courseForm.category) {
      window.alert('Vui lòng chọn danh mục khóa học.');
      return false;
    }
    if (!shortDescTrim) {
      window.alert('Vui lòng điền mô tả ngắn.');
      return false;
    }
    if (!descTrim || descTrim.length < 20) {
      window.alert('Mô tả khóa học phải tối thiểu 20 ký tự.');
      return false;
    }
    if (Number(courseForm.price) < 0) {
      window.alert('Giá khóa học không được phép âm.');
      return false;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('TieuDe', titleTrim);
      formData.append('MoTaNgan', shortDescTrim);
      formData.append('MoTa', descHtml);
      formData.append('MoTaChiTiet', (courseForm.detailedDescription || '').trim());
      formData.append('DanhMuc', courseForm.category);
      if (courseForm.thumbnail && !courseForm.coverImageFile) formData.append('Thumbnail', courseForm.thumbnail);
      formData.append('Gia', String(Number(courseForm.price) || 0));
      formData.append('TrinhDo', courseForm.level || 'BEGINNER');
      if (courseForm.minimumMemberTier) formData.append('MinimumMemberTier', courseForm.minimumMemberTier);
      if (courseForm.coverImageFile) formData.append('CoverImageFile', courseForm.coverImageFile);

      if (course?.id || id) {
        const updated = await api.uploadPut(`/api/instructor/courses/${course?.id || id}`, formData);
        setCourse(updated);
        return updated;
      } else {
        const created = await api.upload('/api/instructor/courses', formData);
        setCourse(created);
        navigate(`/instructor/courses/${created.id}`, { replace: true });
        return created;
      }
    } catch (error) {
      console.error(error);
      window.alert(error?.data?.message || 'Lưu khóa học thất bại.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (activeStep === 1 && !isReadOnly) {
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
      navigate('/instructor/courses');
      return;
    }
    setActiveStep((prev) => prev - 1);
  };

  const ensureCourseSaved = async () => {
    const existingId = course?.id || id;
    if (existingId) return existingId;
    const saved = await saveCourse();
    return saved?.id || null;
  };

  const validateCourseImageFiles = (files) => {
    const errors = [];
    const accepted = [];

    Array.from(files || []).forEach((file) => {
      const validType = ACCEPTED_COURSE_IMAGE_TYPES.has(file.type) && ACCEPTED_COURSE_IMAGE_EXTENSIONS.test(file.name);
      if (!validType) {
        errors.push(`${file.name}: chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.`);
        return;
      }
      if (file.size > MAX_COURSE_IMAGE_SIZE) {
        errors.push(`${file.name}: tối đa 5MB.`);
        return;
      }
      accepted.push(file);
    });

    return { accepted, errors };
  };

  const uploadCourseImages = async (files) => {
    const { accepted, errors } = validateCourseImageFiles(files);
    if (errors.length > 0) {
      window.alert(errors.join('\n'));
    }
    if (accepted.length === 0) return;

    const courseId = await ensureCourseSaved();
    if (!courseId) return;

    const formData = new FormData();
    accepted.forEach((file) => formData.append('files', file));

    try {
      setSaving(true);
      const response = await api.upload(`/api/instructor/courses/${courseId}/images`, formData);
      if (response.course) setCourse(response.course);
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể tải ảnh khóa học.');
    } finally {
      setSaving(false);
    }
  };

  const setPrimaryCourseImage = async (imageId) => {
    const courseId = course?.id || id;
    if (!courseId || !imageId || imageId === 'current-cover') return;
    try {
      setSaving(true);
      const updated = await api.patch(`/api/instructor/courses/${courseId}/images/${imageId}/primary`, {});
      setCourse(updated);
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể chọn ảnh chính.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourseImage = async (imageId) => {
    const courseId = course?.id || id;
    if (!courseId || !imageId || imageId === 'current-cover') return;
    if (!window.confirm('Bạn chắc chắn muốn xóa ảnh khóa học này?')) return;
    try {
      setSaving(true);
      const updated = await api.delete(`/api/instructor/courses/${courseId}/images/${imageId}`);
      setCourse(updated);
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể xóa ảnh khóa học.');
    } finally {
      setSaving(false);
    }
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
    try {
      const courseId = course?.id || id;
      await api.delete(`/api/instructor/courses/${courseId}/sections/${sectionId}`);
      const nextSections = sections.filter((section) => section.id !== sectionId);
      setSections(nextSections);
      setExpandedSectionId(nextSections[0]?.id || null);
      await fetchCourse(courseId);
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể xóa chương này.');
    }
  };

  const addLesson = async (sectionId) => {
    try {
      const formData = new FormData();
      formData.append('TieuDe', 'Bài giảng mới');
      formData.append('NoiDung', 'Nội dung bài học đang được cập nhật.');
      formData.append('ThoiLuongGiay', '0');
      formData.append('ChoPhepHocThu', 'false');
      formData.append('ThuTu', '1');
      formData.append('TrangThai', 'PUBLIC');
      const lesson = await api.upload(`/api/instructor/sections/${sectionId}/lessons`, formData);
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

  const applyUpdatedLesson = (updated) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        lessons: (section.lessons || []).map((lesson) => (lesson.id === updated.id ? updated : lesson)),
      }))
    );
  };

  const updateLesson = async (lesson, payload = {}, files = {}) => {
    const updated = await api.uploadPut(
      `/api/instructor/lessons/${lesson.id}`,
      buildLessonFormData(lesson, payload, files)
    );
    applyUpdatedLesson(updated);
  };

  const removeLesson = async (lessonId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa bài giảng này?')) {
      return;
    }
    await api.delete(`/api/instructor/lessons/${lessonId}`);
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        lessons: (section.lessons || []).filter((lesson) => lesson.id !== lessonId),
      }))
    );
  };

  const uploadLessonVideo = async (lesson, file) => {
    if (!file) {
      return;
    }
    try {
      setSaving(true);
      await updateLesson(lesson, {}, { videoFile: file });
    } catch (error) {
      window.alert(error?.data?.message || 'Tải video thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLessonImages = async (lesson, files) => {
    if (!files?.length) {
      return;
    }
    try {
      setSaving(true);
      await updateLesson(lesson, {}, { imageFiles: files });
    } catch (error) {
      window.alert(error?.data?.message || 'Tải ảnh thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLessonDocument = async (lesson, file) => {
    if (!file) {
      return;
    }
    try {
      setSaving(true);
      await updateLesson(lesson, {}, { documentFile: file });
    } catch (error) {
      window.alert(error?.data?.message || 'Tải tài liệu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const removeLessonVideo = async (lesson) => {
    if (!window.confirm('Bạn có chắc muốn xóa video bài học này không?')) {
      return;
    }
    try {
      setSaving(true);
      await updateLesson(lesson, { videoUrl: '', removeVideo: true });
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể xóa video.');
    } finally {
      setSaving(false);
    }
  };

  const removeLessonImage = async (lesson, imageUrl) => {
    if (!window.confirm('Bạn có chắc muốn xóa ảnh này không?')) {
      return;
    }
    const remainingImages = getLessonImages(lesson).filter((item) => item !== imageUrl);
    try {
      setSaving(true);
      await updateLesson(lesson, {
        imageUrls: remainingImages.join(','),
        removeImage: remainingImages.length === 0,
      });
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể xóa ảnh.');
    } finally {
      setSaving(false);
    }
  };

  const removeLessonDocument = async (lesson) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này không?')) {
      return;
    }
    try {
      setSaving(true);
      await updateLesson(lesson, { fileUrl: '', removeDocument: true });
    } catch (error) {
      window.alert(error?.data?.message || 'Không thể xóa tài liệu.');
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
      const updated = await api.patch(`/api/instructor/courses/${courseId}/publish`, {
        isPublished: true,
        startDate: courseForm.startDate || null,
        endDate: courseForm.endDate || null,
      });
      setCourse(updated);
      setSections(updated.sections || []);
      window.alert('Khóa học đã được xuất bản.');
    } catch (error) {
      window.alert(error?.data?.errors?.join('\n') || error?.data?.message || 'Xuất bản thất bại.');
    }
  };

  const unpublishCourse = async () => {
    if (!window.confirm('Bạn có chắc muốn chuyển khóa học này về bản nháp?')) return;
    const courseId = course?.id || id;
    try {
      const updated = await api.patch(`/api/instructor/courses/${courseId}/publish`, { isPublished: false });
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
          <p className="text-sm font-medium text-slate-900 font-semibold">Tiêu đề khóa học *</p>
          <input
            name="title"
            value={courseForm.title}
            onChange={handleCourseFieldChange}
            placeholder="Ví dụ: Lập trình C# cơ bản cho người mới"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            required
            disabled={isReadOnly}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900 font-semibold">Mô tả ngắn *</p>
          <input
            name="shortDescription"
            value={courseForm.shortDescription}
            onChange={handleCourseFieldChange}
            placeholder="Tóm tắt ngắn gọn mục tiêu hoặc đối tượng của khóa học trong 1-2 câu..."
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            required
            disabled={isReadOnly}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-900 font-semibold">Mô tả khóa học * (tối thiểu 20 ký tự)</p>
          <RichTextEditor
            value={courseForm.description}
            onChange={(value) => setCourseForm((prev) => ({ ...prev, description: value }))}
            placeholder="Giới thiệu chi tiết về nội dung khóa học và quyền lợi học viên..."
            disabled={isReadOnly}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-900 font-semibold">Ngành / mảng của khóa học *</p>
            {loadingCategories ? (
              <div className="mt-2 text-sm text-slate-400">Đang tải chuyên mục...</div>
            ) : (
              <select
                name="category"
                value={courseForm.category}
                onChange={handleCourseFieldChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                required
                disabled={isReadOnly}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-slate-900 font-semibold">Trình độ khóa học *</p>
            <select
              name="level"
              value={courseForm.level}
              onChange={handleCourseFieldChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              required
              disabled={isReadOnly}
            >
              <option value="BEGINNER">Cơ bản (Beginner)</option>
              <option value="INTERMEDIATE">Trung cấp (Intermediate)</option>
              <option value="ADVANCED">Nâng cao (Advanced)</option>
            </select>
          </div>
        </div>
        <CourseImageManager
          images={getCourseImages(course)}
          saving={saving}
          onUpload={uploadCourseImages}
          onSetPrimary={setPrimaryCourseImage}
          onDelete={deleteCourseImage}
          disabled={isReadOnly}
        />

      </section>

      <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Xem trước thông tin</p>
          {courseForm.category && (
            <span className="mt-3 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              {categories.find(c => c.id === courseForm.category)?.name || courseForm.category}
            </span>
          )}
          <div className="mt-4 flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white">
            {courseForm.thumbnail || course?.thumbnail || course?.anhBia || course?.primaryImage ? (
              <img src={getFileUrl(courseForm.thumbnail || course?.thumbnail || course?.anhBia || course?.primaryImage)} alt="Ảnh bìa khóa học" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center text-slate-400">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-500">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-slate-500">Chưa có ảnh bìa</p>
                <p className="mt-1 text-xs text-slate-400">Dán URL hoặc tải file để xem trước</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );

  const renderCurriculumStep = () => {
    const isReadOnly = false;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Xây dựng giáo trình</h2>
          <p className="mt-1 text-sm text-slate-500">Kéo thả để đổi thứ tự chương và bài học. Đánh dấu xem thử cho bài học phù hợp.</p>
        </div>
        <button
          onClick={addSection}
          disabled={!canManageCurriculum || isReadOnly}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-30 disabled:pointer-events-none"
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
            draggable={!isReadOnly}
            onDragStart={isReadOnly ? undefined : () => onDragStart({ type: 'section', sectionId: section.id })}
            onDragEnd={isReadOnly ? undefined : onDragEnd}
            onDragOver={isReadOnly ? undefined : (event) => event.preventDefault()}
            onDrop={isReadOnly ? undefined : () => handleSectionDrop(section.id)}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex flex-1 items-start gap-3">
                {!isReadOnly && (
                  <button className="mt-1 cursor-grab text-slate-400">
                    <GripVertical className="h-5 w-5" />
                  </button>
                )}
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
                    className="mt-2 w-full bg-transparent text-lg font-semibold tracking-tight text-slate-900 outline-none focus:text-purple-900 disabled:text-slate-500"
                    disabled={isReadOnly}
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
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={isReadOnly}
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
                {!isReadOnly && (
                  <button
                    onClick={() => removeSection(section.id)}
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-600"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>

            {expandedSectionId === section.id && (
              <div className="space-y-3 px-5 py-4">
                {(section.lessons || []).map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    draggable={!isReadOnly}
                    onDragStart={isReadOnly ? undefined : () => onDragStart({ type: 'lesson', lessonId: lesson.id, sectionId: section.id })}
                    onDragEnd={isReadOnly ? undefined : onDragEnd}
                    onDragOver={isReadOnly ? undefined : (event) => event.preventDefault()}
                    onDrop={isReadOnly ? undefined : () => handleLessonDrop(section.id, lesson.id)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      {!isReadOnly && (
                        <button className="mt-2 cursor-grab text-slate-400">
                          <GripVertical className="h-5 w-5" />
                        </button>
                      )}
                      <div className="grid flex-1 gap-3 md:grid-cols-[1.2fr_1fr]">
                        <div className="flex min-h-[260px] flex-col space-y-3 md:min-h-[520px]">
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
                              onBlur={(event) => updateLesson(lesson, { title: event.target.value })}
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:text-slate-500"
                              disabled={isReadOnly}
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
                            onBlur={(event) => updateLesson(lesson, { content: event.target.value })}
                            rows={3}
                            placeholder="Mô tả bài học, tài liệu đính kèm, kết quả cần đạt..."
                            className="min-h-[180px] w-full flex-1 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 md:min-h-[420px] disabled:bg-slate-100 disabled:text-slate-500"
                            disabled={isReadOnly}
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
                              onBlur={(event) => updateLesson(lesson, { videoUrl: event.target.value })}
                              placeholder="Dán video URL nếu cần"
                              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:text-slate-500"
                              disabled={isReadOnly}
                            />
                            {!isReadOnly && (
                              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                <Upload className="h-4 w-4" />
                                Tải video
                                <input type="file" accept="video/*" className="hidden" onChange={(event) => uploadLessonVideo(lesson, event.target.files?.[0])} />
                              </label>
                            )}
                            {lesson.videoUrl && !isReadOnly && (
                              <button
                                type="button"
                                onClick={() => removeLessonVideo(lesson)}
                                className="ml-2 mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                              >
                                Xóa video
                              </button>
                            )}
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-slate-900">Ảnh minh họa bài học</p>
                              <span className="text-xs text-slate-500">{getLessonImages(lesson).length} ảnh</span>
                            </div>
                            {getLessonImages(lesson).length > 0 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {getLessonImages(lesson).map((imageUrl) => (
                                  <div
                                    key={imageUrl}
                                    className="group relative aspect-video overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
                                  >
                                    <a href={getFileUrl(imageUrl)} target="_blank" rel="noreferrer" className="block h-full w-full">
                                      <img src={getFileUrl(imageUrl)} alt="Ảnh minh họa bài học" className="h-full w-full object-cover" />
                                    </a>
                                    {imageUrl && !isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => removeLessonImage(lesson, imageUrl)}
                                        className="absolute right-1 top-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-rose-600 shadow-sm opacity-0 transition group-hover:opacity-100"
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {!isReadOnly && (
                              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                <ImageIcon className="h-4 w-4" />
                                Tải nhiều ảnh
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(event) => uploadLessonImages(lesson, event.target.files)}
                                />
                              </label>
                            )}
                            {!isReadOnly && <p className="mt-2 text-xs text-slate-500">Có thể chọn nhiều ảnh từ máy tính cùng lúc.</p>}
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-slate-900">Tài liệu đính kèm</p>
                              {lesson.fileUrl && (
                                <a
                                  href={getFileUrl(lesson.fileUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-purple-600 hover:underline"
                                >
                                  Xem tài liệu
                                </a>
                              )}
                            </div>
                            {lesson.fileUrl && (
                              <p className="mt-2 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                {lesson.fileUrl}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {!isReadOnly && (
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                  <Upload className="h-4 w-4" />
                                  Tải tài liệu
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                                    className="hidden"
                                    onChange={(event) => uploadLessonDocument(lesson, event.target.files?.[0])}
                                  />
                                </label>
                              )}
                              {lesson.fileUrl && !isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => removeLessonDocument(lesson)}
                                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                                >
                                  Xóa tài liệu
                                </button>
                              )}
                            </div>
                            {!isReadOnly && <p className="mt-2 text-xs text-slate-500">Hỗ trợ PDF, Word và PowerPoint.</p>}
                          </div>

                          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                            <label className="flex items-center justify-between gap-3">
                              <span className="text-slate-700">Cho phép học thử</span>
                              <input
                                type="checkbox"
                                checked={Boolean(lesson.isPreview)}
                                onChange={(event) => updateLesson(lesson, { isPreview: event.target.checked })}
                                className="h-4 w-4"
                                disabled={isReadOnly}
                              />
                            </label>
                            <label className="flex items-center justify-between gap-3">
                              <span className="text-slate-700">Xuất bản bài học</span>
                              <input
                                type="checkbox"
                                checked={Boolean(lesson.isPublished)}
                                onChange={(event) => updateLesson(lesson, { isPublished: event.target.checked })}
                                className="h-4 w-4"
                                disabled={isReadOnly}
                              />
                            </label>
                          </div>

                          {!isReadOnly && (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!isReadOnly && (
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
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    );
  };

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
            disabled={isReadOnly}
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
            disabled={isReadOnly}
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Thời gian diễn ra khóa học</p>
          <p className="mt-1 text-xs text-slate-500">Giáo viên quyết định thời gian bắt đầu và kết thúc trước khi xuất bản.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Ngày bắt đầu
              <input
                type="date"
                name="startDate"
                value={courseForm.startDate}
                onChange={handleCourseFieldChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                disabled={isReadOnly}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Ngày kết thúc
              <input
                type="date"
                name="endDate"
                min={courseForm.startDate || undefined}
                value={courseForm.endDate}
                onChange={handleCourseFieldChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                disabled={isReadOnly}
              />
            </label>
          </div>
          {!hasValidCourseDates && (
            <p className="mt-3 text-sm font-medium text-amber-700">
              Vui lòng chọn ngày kết thúc sau ngày bắt đầu.
            </p>
          )}
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
          disabled={!course?.id || publishErrors.length > 0 || !hasValidCourseDates || course?.trangThai === 'PUBLIC'}
          className="w-full rounded-full bg-purple-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {course?.trangThai === 'PUBLIC' ? 'Đã xuất bản' : 'Xuất bản khóa học'}
        </button>
        <button
          onClick={unpublishCourse}
          disabled={true}
          title="Khóa đã xuất bản không thể chuyển về bản nháp"
          className="w-full rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
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
            onClick={() => navigate('/instructor/courses')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEditing ? 'Trình tạo khóa học' : 'Tạo khóa học mới'}</h1>
          </div>
        </div>
        <button
          onClick={saveCourse}
          disabled={saving || isReadOnly}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-30 disabled:pointer-events-none"
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
          {activeStep === 1 ? 'Quay lại danh sách' : 'Quay lại'}
        </button>
        {activeStep < STEPS.length && (
          <button
            onClick={handleContinue}
            className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            Tiếp tục
          </button>
        )}
      </div>

      {selectedLessonForQuiz && (
        <QuizEditorModal
          lessonId={selectedLessonForQuiz.id}
          lessonTitle={selectedLessonForQuiz.title}
          onClose={() => {
            setSelectedLessonForQuiz(null);
            if (course?.id || id) {
              fetchCourse(course?.id || id);
            }
          }}
        />
      )}
    </div>
  );
};
const RichTextEditor = ({ value, onChange, placeholder, disabled = false }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const sync = () => onChange(editorRef.current?.innerHTML || '');

  const runCommand = (command, commandValue = null) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    sync();
  };

  const addLink = () => {
    if (disabled) return;
    const href = window.prompt('Nhập liên kết');
    if (!href) return;
    runCommand('createLink', href);
  };

  const buttons = [
    { icon: Bold, label: 'In đậm', action: () => runCommand('bold') },
    { icon: Italic, label: 'In nghiêng', action: () => runCommand('italic') },
    { icon: List, label: 'Gạch đầu dòng', action: () => runCommand('insertUnorderedList') },
    { icon: Heading3, label: 'Tiêu đề nhỏ', action: () => runCommand('formatBlock', 'h3') },
    { icon: LinkIcon, label: 'Chèn link', action: addLink },
  ];

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-white p-2">
        {buttons.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            disabled={disabled}
            title={label}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
        className={`rich-text-editor min-h-36 w-full px-4 py-3 text-sm leading-7 text-slate-800 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] ${disabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : ''}`}
        suppressContentEditableWarning
      />
    </div>
  );
};
const CourseImageManager = ({ images, saving, onUpload, onSetPrimary, onDelete, disabled = false }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">Ảnh khóa học</p>
      </div>
      <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${disabled ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}>
        <Upload className="h-4 w-4" />
        Tải ảnh từ máy
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            onUpload(event.target.files);
            event.target.value = '';
          }}
          disabled={saving || disabled}
        />
      </label>
    </div>

    {images.length > 0 ? (
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => {
          const imageUrl = image.imageUrl || image.url;
          return (
            <div key={image.id || imageUrl} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="relative aspect-video bg-slate-100">
                <img src={getFileUrl(imageUrl)} alt="Ảnh khóa học" className="h-full w-full object-cover" />
                {image.isPrimary && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm">
                    <Star className="h-3 w-3 fill-emerald-500" />
                    Ảnh chính
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 p-2">
                <button
                  type="button"
                  disabled={saving || disabled || image.isPrimary || image.canDelete === false}
                  onClick={() => onSetPrimary(image.id)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Star className="h-3.5 w-3.5" />
                  Chọn làm ảnh chính
                </button>
                <button
                  type="button"
                  disabled={saving || disabled || image.canDelete === false}
                  onClick={() => onDelete(image.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-100 px-2 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Chưa có ảnh khóa học. Hệ thống sẽ dùng ảnh mặc định khi hiển thị.
      </div>
    )}
  </div>
);
export default CourseEditor;


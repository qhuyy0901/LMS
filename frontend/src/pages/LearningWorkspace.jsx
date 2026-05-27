import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ChevronLeft, PlayCircle, CheckCircle, Circle, 
  MessageSquare, FileText, Download, Share2,
  ChevronDown, ChevronUp, BookOpen, Send, X, CornerDownRight,
  Clock, HelpCircle, Award, AlertCircle, ArrowRight, RotateCcw, Check, Loader2
} from 'lucide-react';

export default function LearningWorkspace() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [completedLessons, setCompletedLessons] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Quiz States
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizStatus, setQuizStatus] = useState('intro'); // 'intro' | 'testing' | 'result'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await axios.get(`/api/courses/${courseId}`);
        const data = response.data;
        
        if (!data.isEnrolled) {
          navigate(`/course/${courseId}`);
          return;
        }

        setCourse(data);
        setCompletedLessons(data.completedLessons || []);
        
        // Mở rộng tất cả các sections theo mặc định
        const initialExpanded = {};
        (data.sections || []).forEach(s => {
          initialExpanded[s.id] = true;
        });
        setExpandedSections(initialExpanded);
        
        // Tìm bài học chưa hoàn thành đầu tiên hoặc mặc định là 0
        const uncompletedIndex = (data.lessons || []).findIndex(
          l => !(data.completedLessons || []).includes(l.id)
        );
        
        setActiveLessonIndex(uncompletedIndex !== -1 ? uncompletedIndex : 0);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, navigate]);

  const lessons = course?.lessons || [];
  const activeLesson = lessons[activeLessonIndex];

  // Tải Quiz khi đổi bài học
  useEffect(() => {
    const fetchQuiz = async () => {
      if (!activeLesson || !activeLesson.quiz) {
        setQuiz(null);
        return;
      }
      setQuizLoading(true);
      setQuizError(null);
      try {
        const response = await axios.get(`/api/quizzes/lesson/${activeLesson.id}`);
        setQuiz(response.data);
      } catch (err) {
        console.error('Lỗi khi tải bài trắc nghiệm:', err);
        setQuizError(err.response?.data?.message || 'Không thể tải bài trắc nghiệm.');
      } finally {
        setQuizLoading(false);
      }
    };

    fetchQuiz();
    setQuizAnswers({});
    setQuizStatus('intro');
    setCurrentQuestionIndex(0);
    setQuizResult(null);
  }, [activeLesson]);

  // Tải bình luận khi đổi bài học hoặc đổi tab sang Hỏi đáp
  useEffect(() => {
    const fetchComments = async () => {
      if (!activeLesson) return;
      setLoadingComments(true);
      try {
        const response = await axios.get(`/api/courses/${courseId}/lessons/${activeLesson.id}/comments`);
        setComments(response.data);
      } catch (err) {
        console.error('Lỗi khi tải bình luận:', err);
      } finally {
        setLoadingComments(false);
      }
    };
    if (activeTab === 'qna') {
      fetchComments();
    }
  }, [activeLesson, activeTab, courseId]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-8">
        <h2 className="text-2xl font-bold mb-4">Oops!</h2>
        <p className="text-slate-400 mb-6">{error || 'Không tìm thấy khóa học'}</p>
        <button 
          onClick={() => navigate('/my-courses')}
          className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Về khóa học của tôi
        </button>
      </div>
    );
  }

  const isCompleted = (index) => {
    const lesson = lessons[index];
    return lesson && completedLessons.includes(lesson.id);
  };
  
  const markAsComplete = async () => {
    if (!activeLesson || isCompleted(activeLessonIndex)) return;
    try {
      const res = await axios.post(`/api/courses/${courseId}/lessons/${activeLesson.id}/complete`);
      setCompletedLessons([...completedLessons, activeLesson.id]);
      setCourse({ ...course, progress: res.data.progress });
      handleNextLesson();
    } catch (err) {
      console.error('Lỗi khi lưu tiến độ:', err);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !activeLesson) return;
    
    try {
      const response = await axios.post(`/api/courses/${courseId}/lessons/${activeLesson.id}/comments`, {
        content: newComment
      });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Lỗi khi gửi bình luận:', err);
      alert('Không thể gửi bình luận lúc này');
    }
  };

  const handlePostReply = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim() || !activeLesson) return;
    
    try {
      const response = await axios.post(`/api/courses/${courseId}/lessons/${activeLesson.id}/comments`, {
        content: replyText,
        parentId
      });
      setComments(prevComments => prevComments.map(c => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), response.data]
          };
        }
        return c;
      }));
      setReplyText('');
      setReplyingToId(null);
    } catch (err) {
      console.error('Lỗi khi gửi phản hồi:', err);
      alert('Không thể gửi phản hồi lúc này');
    }
  };

  const handleNextLesson = () => {
    if (activeLessonIndex < lessons.length - 1) {
      setActiveLessonIndex(activeLessonIndex + 1);
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonIndex(activeLessonIndex - 1);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleQuizSubmit = async () => {
    const answeredCount = Object.keys(quizAnswers).length;
    const totalQuestions = quiz?.questions?.length || 0;
    if (answeredCount < totalQuestions) {
      if (!window.confirm(`Bạn mới trả lời ${answeredCount}/${totalQuestions} câu hỏi. Bạn có chắc chắn muốn nộp bài?`)) {
        return;
      }
    }

    setQuizSubmitting(true);
    try {
      const response = await axios.post(`/api/quizzes/lesson/${activeLesson.id}/submit`, {
        answers: quizAnswers
      });
      setQuizResult(response.data);
      setQuizStatus('result');

      // Nếu đỗ, cập nhật tiến độ
      if (response.data.passed) {
        if (!completedLessons.includes(activeLesson.id)) {
          setCompletedLessons([...completedLessons, activeLesson.id]);
        }
        if (response.data.progress !== null && response.data.progress !== undefined) {
          setCourse(prev => ({ ...prev, progress: response.data.progress }));
        }
      }

      // Tải lại Quiz để cập nhật lịch sử làm bài trắc nghiệm
      const updatedQuizResponse = await axios.get(`/api/quizzes/lesson/${activeLesson.id}`);
      setQuiz(updatedQuizResponse.data);
    } catch (err) {
      console.error('Lỗi khi nộp bài trắc nghiệm:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi nộp bài.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  // Helper chuyển đổi Youtube URL sang embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    if (isYoutube) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
      }
    }
    return url;
  };

  const isYoutubeVideo = activeLesson?.videoUrl && (activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be'));
  const embedUrl = getEmbedUrl(activeLesson?.videoUrl);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins} phút`;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="h-16 bg-slate-900 text-slate-300 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/course/${courseId}`)}
            className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center transition-colors"
            title="Quay lại chi tiết khóa học"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="hidden sm:block border-l border-slate-700 h-6 mx-2"></div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Đang học</span>
            <h1 className="text-sm font-semibold text-white truncate max-w-[200px] md:max-w-md">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-8">
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400">Tiến độ khóa học</span>
              <span className="text-xs font-semibold text-white">{course.progress}%</span>
            </div>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${course.progress}%` }}
              ></div>
            </div>
          </div>
          
          <button className="flex items-center gap-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Chia sẻ</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column: Media Player & Content Details */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto custom-scrollbar relative">
          
          {/* Video Player Area (Chỉ render nếu bài học có Video URL) */}
          {activeLesson?.videoUrl ? (
            <div className="w-full bg-black aspect-video relative group flex shrink-0 items-center justify-center shadow-inner">
              {isYoutubeVideo ? (
                <iframe 
                  src={embedUrl}
                  title={activeLesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <video 
                  src={activeLesson.videoUrl} 
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                />
              )}
            </div>
          ) : null}

          {/* Lesson Content & Workspace Tabs */}
          <div className="flex-1 bg-white flex flex-col min-h-0">
            {/* Tabs Header */}
            <div className="flex items-center gap-8 px-8 border-b border-slate-100 shrink-0 bg-slate-50/50">
              {[
                'overview',
                ...(activeLesson?.quiz ? ['quiz'] : []),
                'qna',
                'notes',
                'resources'
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 text-sm font-semibold border-b-2 transition-colors relative ${
                    activeTab === tab 
                      ? 'border-purple-600 text-purple-700' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'overview' && 'Tổng quan'}
                  {tab === 'quiz' && 'Trắc nghiệm'}
                  {tab === 'qna' && 'Hỏi đáp'}
                  {tab === 'notes' && 'Ghi chú'}
                  {tab === 'resources' && 'Tài liệu'}
                  
                  {tab === 'qna' && comments.length > 0 && (
                    <span className="absolute top-3 -right-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Tab: TỔNG QUAN */}
              {activeTab === 'overview' && (
                <div className="max-w-3xl animate-fade-in-up">
                  {/* Banner nếu là bài giảng lý thuyết hoặc trắc nghiệm không có video */}
                  {!activeLesson?.videoUrl && (
                    <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100/80 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-100">
                          {activeLesson?.quiz ? <HelpCircle className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase">
                            {activeLesson?.quiz ? 'Bài kiểm tra trắc nghiệm' : 'Bài giảng lý thuyết'}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5">
                            {activeLesson?.quiz ? activeLesson.quiz.title : 'Tài liệu hướng dẫn & Nội dung đọc'}
                          </h3>
                        </div>
                      </div>
                      {activeLesson?.quiz && (
                        <button
                          onClick={() => setActiveTab('quiz')}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-100"
                        >
                          Làm trắc nghiệm
                        </button>
                      )}
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {activeLessonIndex + 1}. {activeLesson?.title}
                  </h2>
                  
                  <div className="prose prose-slate max-w-none">
                    {activeLesson?.content ? (
                      <div className="text-slate-700 leading-relaxed text-base whitespace-pre-line bg-slate-50/50 border border-slate-100 p-6 rounded-2xl">
                        {activeLesson.content}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">
                        Chưa có nội dung mô tả chi tiết cho bài học này. Hãy xem kỹ bài giảng để nắm vững kiến thức.
                      </div>
                    )}
                    
                    {/* Mục tiêu học tập placeholder */}
                    <div className="mt-8 space-y-4 border border-slate-100 rounded-2xl p-6">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-purple-600" />
                        Mục tiêu đạt được sau bài học:
                      </h3>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                        <li>Hiểu rõ các kiến thức cốt lõi được trình bày.</li>
                        <li>Nắm vững phương pháp áp dụng lý thuyết vào thực tế dự án.</li>
                        <li>Hoàn thành bài tập tự luyện và ghi chép cá nhân.</li>
                      </ul>
                    </div>

                    <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center">
                      <div className="flex gap-2">
                        <button
                          onClick={handlePrevLesson}
                          disabled={activeLessonIndex === 0}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Bài trước
                        </button>
                        <button
                          onClick={handleNextLesson}
                          disabled={activeLessonIndex === lessons.length - 1}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Bài tiếp theo
                        </button>
                      </div>

                      {activeLesson?.quiz ? (
                        <button 
                          onClick={() => setActiveTab('quiz')}
                          className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                            isCompleted(activeLessonIndex)
                              ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-100 hover:shadow-xl'
                          }`}
                        >
                          {isCompleted(activeLessonIndex) ? <CheckCircle className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                          {isCompleted(activeLessonIndex) ? 'Đã vượt qua Quiz' : 'Làm bài Quiz'}
                        </button>
                      ) : (
                        <button 
                          onClick={markAsComplete}
                          disabled={isCompleted(activeLessonIndex)}
                          className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                            isCompleted(activeLessonIndex)
                              ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-100 hover:shadow-xl'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {isCompleted(activeLessonIndex) ? 'Đã hoàn thành' : 'Hoàn thành bài học'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: TRẮC NGHIỆM */}
              {activeTab === 'quiz' && (
                <div className="max-w-3xl animate-fade-in-up">
                  {quizLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                      <p className="text-sm text-slate-500 mt-2">Đang tải câu hỏi trắc nghiệm...</p>
                    </div>
                  ) : quizError ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-sm">{quizError}</p>
                    </div>
                  ) : !quiz ? (
                    <div className="text-center py-12 text-slate-400">
                      Bài học này chưa có bài trắc nghiệm.
                    </div>
                  ) : (
                    <>
                      {/* TRẠNG THÁI GIỚI THIỆU QUIZ */}
                      {quizStatus === 'intro' && (
                        <div className="space-y-6">
                          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border border-purple-100/60 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="h-12 w-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-100">
                                <Award className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900">{quiz.title}</h3>
                                <p className="text-sm text-slate-650 mt-1">{quiz.description || "Hãy hoàn thành bài kiểm tra trắc nghiệm dưới đây để ôn tập kiến thức."}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                              <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số câu hỏi</span>
                                <span className="text-base font-bold text-slate-800 mt-1">{quiz.questions?.length || 0} câu</span>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm đạt yêu cầu</span>
                                <span className="text-base font-bold text-slate-800 mt-1">{quiz.passingScore}%</span>
                              </div>
                              <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</span>
                                {isCompleted(activeLessonIndex) ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 mt-1.5 animate-pulse">
                                    <Check className="w-3 h-3" /> Đã vượt qua
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 mt-1.5">
                                    Chưa hoàn thành
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-8 flex justify-center">
                              <button
                                onClick={() => {
                                  setQuizStatus('testing');
                                  setQuizAnswers({});
                                  setCurrentQuestionIndex(0);
                                  setQuizResult(null);
                                }}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-100 hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs"
                              >
                                {quiz.submissions?.length > 0 ? 'Làm lại trắc nghiệm' : 'Bắt đầu làm bài'}
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Lịch sử làm bài */}
                          {quiz.submissions && quiz.submissions.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="font-bold text-slate-900 text-xs">Lịch sử làm bài trắc nghiệm</h4>
                              <div className="overflow-hidden border border-slate-100 rounded-xl bg-white shadow-sm">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                                      <th className="px-6 py-3.5">Lần</th>
                                      <th className="px-6 py-3.5">Thời gian</th>
                                      <th className="px-6 py-3.5 text-center">Điểm số</th>
                                      <th className="px-6 py-3.5 text-center">Kết quả</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-150 text-slate-650">
                                    {quiz.submissions.map((sub, sIdx) => (
                                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3.5 font-semibold text-slate-800">#{quiz.submissions.length - sIdx}</td>
                                        <td className="px-6 py-3.5 text-slate-400">
                                          {new Date(sub.createdAt).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-3.5 text-center font-bold text-slate-700">{sub.score}%</td>
                                        <td className="px-6 py-3.5 text-center">
                                          {sub.passed ? (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                              Đạt
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                              Chưa đạt
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TRẠNG THÁI ĐANG LÀM BÀI */}
                      {quizStatus === 'testing' && quiz.questions && quiz.questions.length > 0 && (
                        <div className="space-y-6">
                          {/* Progress Header */}
                          <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-inner">
                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                              <span>Tiến trình làm bài</span>
                              <span className="text-purple-700 font-bold">Câu {currentQuestionIndex + 1} / {quiz.questions.length}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-650 rounded-full transition-all duration-300"
                                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Question Card */}
                          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative">
                            <span className="text-[9px] font-bold tracking-wider text-purple-650 bg-purple-100/60 px-2 py-0.5 rounded-full uppercase">
                              Câu hỏi {currentQuestionIndex + 1}
                            </span>
                            <h3 className="text-sm font-bold text-slate-800 mt-4 leading-relaxed">
                              {quiz.questions[currentQuestionIndex].questionText}
                            </h3>

                            {/* Options List */}
                            <div className="grid gap-3 mt-6">
                              {quiz.questions[currentQuestionIndex].options.map((option, oIdx) => {
                                const isSelected = quizAnswers[quiz.questions[currentQuestionIndex].id] === oIdx;
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => setQuizAnswers(prev => ({
                                      ...prev,
                                      [quiz.questions[currentQuestionIndex].id]: oIdx
                                    }))}
                                    className={`w-full text-left p-3.5 rounded-xl text-xs transition-all border flex items-center gap-3.5 group shadow-sm hover:shadow ${
                                      isSelected
                                        ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-100 font-bold text-purple-900'
                                        : 'border-slate-200 hover:border-slate-350 text-slate-650 hover:bg-slate-50/50'
                                    }`}
                                  >
                                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                    }`}>
                                      {String.fromCharCode(65 + oIdx)}
                                    </span>
                                    <span className="flex-1">{option}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Quick Jump Dot Grid */}
                          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-wrap gap-2 justify-center items-center">
                            {quiz.questions.map((q, qIdx) => {
                              const isAnswered = quizAnswers[q.id] !== undefined;
                              const isActive = qIdx === currentQuestionIndex;
                              return (
                                <button
                                  key={q.id}
                                  onClick={() => setCurrentQuestionIndex(qIdx)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all border ${
                                    isActive
                                      ? 'border-purple-600 bg-purple-650 text-white shadow shadow-purple-100 scale-105'
                                      : isAnswered
                                        ? 'border-purple-200 bg-purple-50 text-purple-600'
                                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                  }`}
                                >
                                  {qIdx + 1}
                                </button>
                              );
                            })}
                          </div>

                          {/* Navigation Buttons */}
                          <div className="flex justify-between items-center pt-4 border-t border-slate-150">
                            <button
                              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                              disabled={currentQuestionIndex === 0}
                              className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Câu trước
                            </button>

                            {currentQuestionIndex < quiz.questions.length - 1 ? (
                              <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
                              >
                                Câu tiếp theo
                              </button>
                            ) : (
                              <button
                                onClick={handleQuizSubmit}
                                disabled={quizSubmitting}
                                className="inline-flex items-center gap-1.5 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow shadow-purple-150 transition disabled:opacity-50"
                              >
                                {quizSubmitting ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chấm điểm...
                                  </>
                                ) : (
                                  <>Nộp bài Quiz</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* TRẠNG THÁI HIỂN THỊ KẾT QUẢ */}
                      {quizStatus === 'result' && quizResult && (
                        <div className="space-y-8 animate-fade-in">
                          {/* Header result card */}
                          <div className={`p-6 rounded-2xl border text-center relative overflow-hidden shadow-sm ${
                            quizResult.passed
                              ? 'bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-200'
                              : 'bg-gradient-to-br from-red-50/50 to-rose-50/50 border-red-200'
                          }`}>
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full font-black text-2xl shadow border mb-4 bg-white">
                              <span className={quizResult.passed ? 'text-green-600' : 'text-red-500'}>
                                {quizResult.score}%
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-slate-800 mt-2">
                              {quizResult.passed ? 'Chúc mừng! Bạn đã đạt yêu cầu!' : 'Rất tiếc! Bạn chưa đạt điểm đỗ.'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                              {quizResult.passed
                                ? 'Bạn đã trả lời đúng bài kiểm tra để đánh giá kiến thức. Bài học này đã được tính là hoàn thành.'
                                : `Điểm số của bạn là ${quizResult.score}%. Bạn cần đạt tối thiểu ${quizResult.passingScore}% để vượt qua bài kiểm tra này.`}
                            </p>

                            <div className="flex justify-center gap-4 mt-5">
                              <div className="text-[10px] font-bold text-slate-500 bg-white/95 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1.5">
                                <span>Số câu đúng:</span>
                                <span className={`font-bold ${quizResult.passed ? 'text-green-600' : 'text-red-500'}`}>
                                  {quizResult.correctCount} / {quizResult.totalQuestions}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Chi tiết đáp án */}
                          <div className="space-y-4">
                            <h4 className="font-bold text-slate-900 text-xs">Chi tiết đáp án & Sửa sai</h4>
                            
                            <div className="space-y-4">
                              {quizResult.detailedResults?.map((res, rIdx) => (
                                <div key={res.questionId} className={`p-5 border rounded-2xl bg-white shadow-sm transition ${
                                  res.isCorrect ? 'border-green-200 bg-green-50/5' : 'border-red-200 bg-red-50/5'
                                }`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                        res.isCorrect 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        Câu {rIdx + 1}: {res.isCorrect ? 'Đúng' : 'Sai'}
                                      </span>
                                      <h5 className="text-xs font-bold text-slate-800 leading-relaxed pt-1.5">
                                        {res.questionText}
                                      </h5>
                                    </div>
                                  </div>

                                  {/* Options list */}
                                  <div className="grid gap-2 mt-4">
                                    {res.options.map((opt, oIdx) => {
                                      const isUserSelected = res.selectedIndex === oIdx;
                                      const isCorrectOpt = res.correctOptionIndex === oIdx;

                                      let optStyle = 'border-slate-100 text-slate-600 bg-slate-50/20';
                                      if (isCorrectOpt) {
                                        optStyle = 'border-green-500 bg-green-50/30 text-green-900 font-bold';
                                      } else if (isUserSelected && !isCorrectOpt) {
                                        optStyle = 'border-red-400 bg-red-50/30 text-red-900 font-bold';
                                      }

                                      return (
                                        <div 
                                          key={oIdx}
                                          className={`p-3 rounded-xl border text-[11px] flex items-center justify-between gap-3 ${optStyle}`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <span className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                              isCorrectOpt
                                                ? 'bg-green-500 text-white'
                                                : isUserSelected && !isCorrectOpt
                                                  ? 'bg-red-500 text-white'
                                                  : 'bg-slate-100 text-slate-400'
                                            }`}>
                                              {String.fromCharCode(65 + oIdx)}
                                            </span>
                                            <span>{opt}</span>
                                          </div>

                                          {isCorrectOpt && (
                                            <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Đáp án đúng</span>
                                          )}
                                          {isUserSelected && !isCorrectOpt && (
                                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Lựa chọn của bạn</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Giải thích câu trả lời */}
                                  {res.explanation && (
                                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-[11px] text-slate-600 leading-relaxed shadow-inner">
                                      <span className="font-bold text-purple-700 flex items-center gap-1 mb-1">
                                        💡 Lời giải chi tiết:
                                      </span>
                                      {res.explanation}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex justify-center gap-3 pt-6 border-t border-slate-150">
                            <button
                              onClick={() => setQuizStatus('intro')}
                              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
                            >
                              Quay lại
                            </button>
                            <button
                              onClick={() => {
                                setQuizStatus('testing');
                                setQuizAnswers({});
                                setCurrentQuestionIndex(0);
                                setQuizResult(null);
                              }}
                              className="px-5 py-2 border border-purple-200 text-purple-700 text-xs font-semibold rounded-xl hover:bg-purple-50 transition flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Làm lại trắc nghiệm
                            </button>
                            {quizResult.passed && activeLessonIndex < lessons.length - 1 && (
                              <button
                                onClick={() => {
                                  handleNextLesson();
                                  setActiveTab('overview');
                                }}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow hover:shadow-md"
                              >
                                Bài tiếp theo <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tab: HỎI ĐÁP (Q&A) */}
              {activeTab === 'qna' && (
                <div className="max-w-3xl animate-fade-in-up">
                  <form onSubmit={handlePostComment} className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200/60 focus-within:border-purple-300 focus-within:ring-4 focus-within:ring-purple-50 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Đặt câu hỏi hoặc chia sẻ ý kiến về bài học này..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm outline-none"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={!newComment.trim()}
                      className="bg-purple-600 text-white p-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="space-y-6">
                    {loadingComments ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                      </div>
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex flex-col gap-4 border-b border-slate-50 pb-5">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-sm text-sm">
                              {comment.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-slate-900">{comment.user.name}</span>
                                {comment.user.role === 'INSTRUCTOR' && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">Giảng viên</span>
                                )}
                                {comment.user.role === 'ADMIN' && (
                                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md font-bold">Quản trị</span>
                                )}
                                <span className="text-xs text-slate-400">
                                  {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{comment.content}</p>
                              
                              <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                                <button className="hover:text-purple-600 transition">Thích</button>
                                <button 
                                  onClick={() => {
                                    setReplyingToId(comment.id);
                                    setReplyText('');
                                  }}
                                  className="hover:text-purple-600 transition"
                                >
                                  Phản hồi {comment.replies?.length > 0 && `(${comment.replies.length})`}
                                </button>
                              </div>

                              {/* Form Reply */}
                              {replyingToId === comment.id && (
                                <form onSubmit={(e) => handlePostReply(e, comment.id)} className="mt-4 flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                  <input 
                                    type="text" 
                                    placeholder="Viết phản hồi công khai..."
                                    className="flex-1 bg-transparent border-none text-xs outline-none px-2 py-1"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    autoFocus
                                  />
                                  <button 
                                    type="submit" 
                                    disabled={!replyText.trim()}
                                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    Gửi
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setReplyingToId(null);
                                      setReplyText('');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </form>
                              )}

                              {/* Hiển thị danh sách replies */}
                              {comment.replies?.length > 0 && (
                                <div className="mt-4 space-y-4 pl-4 border-l-2 border-slate-100">
                                  {comment.replies.map(reply => (
                                    <div key={reply.id} className="flex gap-3">
                                      <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                                      <div className="w-8 h-8 rounded-full bg-slate-150 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">
                                        {reply.user?.name ? reply.user.name.charAt(0).toUpperCase() : '?'}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-xs text-slate-900">{reply.user?.name || 'Thành viên'}</span>
                                          {reply.user?.role === 'INSTRUCTOR' && (
                                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-bold">Giảng viên</span>
                                          )}
                                          {reply.user?.role === 'ADMIN' && (
                                            <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-bold">Quản trị</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-600">{reply.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        Chưa có câu hỏi hay thảo luận nào ở đây. Hãy bắt đầu câu hỏi đầu tiên!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: TÀI LIỆU */}
              {activeTab === 'resources' && (
                <div className="max-w-3xl animate-fade-in-up">
                  <h3 className="font-bold text-slate-900 mb-4">Tài nguyên đính kèm</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Slide_BaiGiang_TongHop.pdf</p>
                          <p className="text-xs text-slate-500">PDF Document • 4.8 MB</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-purple-600 transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: GHI CHÚ */}
              {activeTab === 'notes' && (
                <div className="max-w-3xl animate-fade-in-up flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4 border border-amber-100">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Sổ tay ghi chú cá nhân</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm">
                    Lưu nhanh kiến thức, dòng code quan trọng khi học. Ghi chú cá nhân tự động lưu lại và chỉ mình bạn xem được.
                  </p>
                  <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
                    Tạo ghi chú mới
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Section-based Accordion Playlist Sidebar */}
        <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <h2 className="font-bold text-slate-900 text-sm">Nội dung khóa học</h2>
            <div className="text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">
              {lessons.length} bài học
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-3 space-y-3">
              {course.sections && course.sections.length > 0 ? (
                course.sections.map((section, sIndex) => {
                  const isExpanded = expandedSections[section.id];
                  const sectionLessons = section.lessons || [];

                  return (
                    <div key={section.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      {/* Section Header Accordion Button */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 transition text-left"
                      >
                        <div className="pr-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chương {sIndex + 1}</span>
                          <h3 className="text-xs font-bold text-slate-700 line-clamp-1 mt-0.5">{section.title}</h3>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </button>

                      {/* Section Lessons List */}
                      {isExpanded && (
                        <div className="p-1.5 bg-white divide-y divide-slate-50">
                          {sectionLessons.map((lesson) => {
                            // Định vị index phẳng
                            const flatIndex = lessons.findIndex(l => l.id === lesson.id);
                            if (flatIndex === -1) return null;

                            const isActive = flatIndex === activeLessonIndex;
                            const completed = isCompleted(flatIndex);

                            return (
                              <div 
                                key={lesson.id}
                                onClick={() => setActiveLessonIndex(flatIndex)}
                                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                  isActive 
                                    ? 'bg-purple-50/80 border border-purple-100/50' 
                                    : 'hover:bg-slate-50/50 border border-transparent'
                                }`}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : isActive ? (
                                    <PlayCircle className="w-4 h-4 text-purple-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-300" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-xs font-medium leading-snug mb-1 ${
                                    isActive ? 'text-purple-900 font-bold' : 'text-slate-700'
                                  }`}>
                                    {lesson.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[10px]">
                                    {isActive && (
                                      <span className="bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-bold">
                                        Đang học
                                      </span>
                                    )}
                                    {lesson.quiz && (
                                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                        <HelpCircle className="w-2.5 h-2.5" />
                                        Quiz
                                      </span>
                                    )}
                                    {lesson.durationSeconds && (
                                      <span className="text-slate-400 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatDuration(lesson.durationSeconds)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {sectionLessons.length === 0 && (
                            <div className="p-4 text-center text-slate-400 text-xs italic">
                              Chương này chưa có bài học.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Khóa học này chưa có nội dung giảng dạy.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

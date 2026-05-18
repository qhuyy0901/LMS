import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ChevronLeft, PlayCircle, CheckCircle, Circle, 
  MessageSquare, FileText, Download, Share2, MoreVertical,
  SkipForward, SkipBack, Settings, Maximize
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
        
        // Find the first uncompleted lesson or default to 0
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

  // Ensure we don't declare hooks conditionally. Move all useHooks to the top.
  const lessons = course?.lessons || [];
  const activeLesson = lessons[activeLessonIndex];

  // Fetch comments when active lesson changes
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
        <h2 className="text-2xl font-bold mb-4">Opps!</h2>
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
      // Add the new comment to the top of the list
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Lỗi khi gửi bình luận:', err);
      alert('Không thể gửi bình luận lúc này');
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

  // Hàm helper để parse URL Youtube thành embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
    if (isYoutube) {
      // Bóc tách ID video (v=... hoặc youtu.be/...)
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
      }
    }
    return url; // Không phải youtube thì trả về nguyên bản
  };

  const isYoutubeVideo = activeLesson?.videoUrl && (activeLesson.videoUrl.includes('youtube.com') || activeLesson.videoUrl.includes('youtu.be'));
  const embedUrl = getEmbedUrl(activeLesson?.videoUrl);

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
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:block border-l border-slate-700 h-6 mx-2"></div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">Khóa học</span>
            <h1 className="text-sm font-medium text-white truncate max-w-[200px] md:max-w-md">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-8">
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400">Tiến độ</span>
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
        
        {/* Left Column: Video & Content */}
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto custom-scrollbar relative">
          
          {/* Video Player Area */}
          <div className="w-full bg-black aspect-video relative group flex shrink-0 items-center justify-center">
            {activeLesson?.videoUrl ? (
              isYoutubeVideo ? (
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
              )
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center text-white p-8 text-center">
                <PlayCircle className="w-20 h-20 text-purple-500/50 mb-4 animate-pulse" />
                <h3 className="text-xl font-medium mb-2">{activeLesson?.title || 'Bài học'}</h3>
                <p className="text-slate-400 text-sm">Video chưa được cập nhật cho bài học này</p>
              </div>
            )}

            {/* Không hiển thị thanh control giả lập nữa để tránh đè lên thanh của Youtube/Video gốc */}
          </div>

          {/* Lesson Details Area */}
          <div className="flex-1 bg-white flex flex-col">
            {/* Tabs Header */}
            <div className="flex items-center gap-8 px-8 border-b border-slate-200">
              {['overview', 'qna', 'notes', 'resources'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors relative ${
                    activeTab === tab 
                      ? 'border-purple-600 text-purple-700' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'overview' && 'Tổng quan'}
                  {tab === 'qna' && 'Hỏi đáp'}
                  {tab === 'notes' && 'Ghi chú'}
                  {tab === 'resources' && 'Tài liệu'}
                  
                  {tab === 'qna' && (
                    <span className="absolute top-3 -right-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              {activeTab === 'overview' && (
                <div className="max-w-3xl animate-fade-in-up">
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    {activeLessonIndex + 1}. {activeLesson?.title}
                  </h2>
                  
                  <div className="prose prose-slate prose-purple max-w-none">
                    <p className="text-slate-600 leading-relaxed text-lg">
                      {activeLesson?.content || 'Chưa có nội dung mô tả chi tiết cho bài học này. Hãy xem video để nắm bắt kiến thức.'}
                    </p>
                    
                    {/* Placeholder rich content */}
                    {!activeLesson?.content && (
                      <div className="mt-8 space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">Mục tiêu bài học:</h3>
                        <ul className="list-disc pl-5 space-y-2 text-slate-600">
                          <li>Hiểu được các khái niệm cơ bản.</li>
                          <li>Nắm vững cách áp dụng vào thực tế.</li>
                          <li>Hoàn thành bài tập thực hành đính kèm.</li>
                        </ul>
                      </div>
                    )}

                    <div className="mt-12 pt-6 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={markAsComplete}
                        disabled={isCompleted(activeLessonIndex)}
                        className={`px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-colors ${
                          isCompleted(activeLessonIndex)
                            ? 'bg-green-50 text-green-600 cursor-default'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        <CheckCircle className="w-5 h-5" />
                        {isCompleted(activeLessonIndex) ? 'Đã hoàn thành bài học' : 'Đánh dấu hoàn thành'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'qna' && (
                <div className="max-w-3xl animate-fade-in-up">
                  <form onSubmit={handlePostComment} className="flex items-center gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 focus-within:border-purple-200 focus-within:ring-4 focus-within:ring-purple-50 transition-all">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Đặt câu hỏi hoặc thảo luận về bài học này..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={!newComment.trim()}
                      className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Gửi
                    </button>
                  </form>

                  <div className="space-y-6">
                    {loadingComments ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                      </div>
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold shrink-0">
                            {comment.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-slate-900">{comment.user.name}</span>
                              {comment.user.role === 'INSTRUCTOR' && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Giảng viên</span>
                              )}
                              <span className="text-xs text-slate-400">
                                {new Date(comment.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{comment.content}</p>
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                              <button className="hover:text-purple-600">Thích</button>
                              <button className="hover:text-purple-600">Phản hồi {comment.replies?.length > 0 && `(${comment.replies.length})`}</button>
                            </div>
                            
                            {/* Replies */}
                            {comment.replies?.length > 0 && (
                              <div className="mt-4 space-y-4">
                                {comment.replies.map(reply => (
                                  <div key={reply.id} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0 text-xs">
                                      {reply.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-xs text-slate-900">{reply.user.name}</span>
                                        {reply.user.role === 'INSTRUCTOR' && (
                                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">Giảng viên</span>
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
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        Chưa có thảo luận nào. Hãy là người đầu tiên đặt câu hỏi!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="max-w-3xl animate-fade-in-up">
                  <h3 className="font-semibold text-slate-900 mb-4">Tài liệu đính kèm</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">Slide_BaiHoc_01.pdf</p>
                          <p className="text-xs text-slate-500">PDF Document • 2.4 MB</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-purple-600 transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="max-w-3xl animate-fade-in-up flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Ghi chú cá nhân</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm">
                    Lưu lại các điểm quan trọng trong quá trình học. Ghi chú của bạn được đồng bộ và bảo mật.
                  </p>
                  <button className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors">
                    Tạo ghi chú mới
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Playlist Sidebar */}
        <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Danh sách bài học</h2>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-2 space-y-1">
              {lessons.map((lesson, index) => {
                const isActive = index === activeLessonIndex;
                const completed = isCompleted(index);
                
                return (
                  <div 
                    key={lesson.id}
                    onClick={() => setActiveLessonIndex(index)}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-purple-50 border border-purple-100' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : isActive ? (
                        <PlayCircle className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium leading-snug mb-1 ${
                        isActive ? 'text-purple-900' : 'text-slate-700'
                      }`}>
                        {index + 1}. {lesson.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        {isActive && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium"><PlayCircle className="w-3 h-3" /> Đang phát</span>}
                        <span className="text-slate-400">12:30</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {lessons.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Khóa học này chưa có bài học nào.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

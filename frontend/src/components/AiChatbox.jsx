import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  BookOpen,
  Star,
  Loader2
} from 'lucide-react';
import { resolveMediaUrl } from '../utils/mediaUrl';

const formatCurrency = (value) => {
  const price = Number(value || 0);
  if (price <= 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

export default function AiChatbox() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Xin chào! Mình là Trợ lý AI tư vấn khóa học của Skillio. Bạn cần mình gợi ý khóa học thuộc lĩnh vực nào hoặc có yêu cầu gì đặc biệt không?',
      isInitial: true
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedQuestions = [
    'Tư vấn khóa học Lập trình',
    'Khóa học Thiết kế UI/UX hot nhất',
    'Đề xuất khóa học về Dữ liệu',
    'Có khóa học nào miễn phí không?'
  ];

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    // Add user message
    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: text }
    ]);
    setInputText('');
    setLoading(true);

    try {
      const response = await axios.post('/api/AiChat/consult', { message: text });
      const botMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: response.data.reply,
          courses: response.data.courses || []
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'bot',
          text: 'Rất tiếc, hệ thống đang gặp gián đoạn kết nối. Bạn vui lòng thử lại sau nhé!'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer relative group"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
          </span>
          <div className="absolute right-16 bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-md">
            Trợ lý AI tư vấn 💡
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[380px] max-w-[calc(100vw-32px)] h-[520px] rounded-3xl bg-white border border-slate-100 shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.3s_ease-out]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-purple-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight">AI Tư Vấn Khóa Học</h3>
                <span className="text-[10px] text-purple-200 font-medium">Trực tuyến · Skillio Bot</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Course Recommendation Cards */}
                {msg.courses && msg.courses.length > 0 && (
                  <div className="mt-2.5 w-full max-w-[90%] space-y-2">
                    {msg.courses.map((course) => {
                      const courseImageUrl = course.thumbnail ? resolveMediaUrl(course.thumbnail) : '';
                      return (
                        <div
                          key={course.id}
                          onClick={() => {
                            setIsOpen(false);
                            navigate(`/course/${course.id}`);
                          }}
                          className="flex items-center gap-3 bg-white border border-slate-100 hover:border-purple-200 rounded-2xl p-2.5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
                        >
                          {/* Thumbnail */}
                          <div className="h-12 w-20 shrink-0 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                            {courseImageUrl ? (
                              <img src={courseImageUrl} alt={course.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-purple-50">
                                <BookOpen className="h-4 w-4 text-purple-600" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-[11px] font-bold text-slate-800 truncate" title={course.title}>
                              {course.title}
                            </h4>
                            <p className="text-[9px] text-slate-400 truncate mt-0.5">{course.instructorName}</p>
                            
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] font-extrabold text-purple-600">
                                {formatCurrency(course.price)}
                              </span>
                              <div className="flex items-center gap-0.5 text-[9px] text-amber-500 font-bold">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                <span>{course.rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Suggested Questions */}
            {messages.length === 1 && (
              <div className="pt-2 space-y-1.5 max-w-[85%]">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider pl-1 mb-1">💡 Gợi ý nhanh</p>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="w-full text-left text-[11px] text-purple-700 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 hover:border-purple-200 rounded-xl px-3 py-2 transition-all cursor-pointer font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm w-fit">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="text-[11px] text-slate-400 font-medium">AI đang tìm kiếm khóa học...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="border-t border-slate-100 bg-white p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Hỏi AI về khóa học bạn muốn tìm..."
              className="flex-1 min-w-0 bg-slate-50 rounded-full px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 border border-transparent transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}

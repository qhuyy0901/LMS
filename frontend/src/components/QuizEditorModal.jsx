import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Save, HelpCircle, Loader2, AlertCircle } from 'lucide-react';

export default function QuizEditorModal({ lessonId, lessonTitle, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(50);
  const [questions, setQuestions] = useState([]);

  // Fetch Quiz nếu đã tồn tại
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/quizzes/lesson/${lessonId}`);
        if (response.data) {
          const quiz = response.data;
          setTitle(quiz.title || '');
          setDescription(quiz.description || '');
          setPassingScore(quiz.passingScore || 50);
          setQuestions(quiz.questions || []);
        } else {
          // Khởi tạo Quiz trống mặc định
          setTitle(`Bài kiểm tra: ${lessonTitle}`);
          setDescription('Hãy hoàn thành bài kiểm tra trắc nghiệm dưới đây để ôn tập kiến thức.');
          setPassingScore(50);
          setQuestions([
            {
              questionText: '',
              options: ['', '', '', ''],
              correctOptionIndex: 0,
              explanation: ''
            }
          ]);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [lessonId, lessonTitle]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: ''
      }
    ]);
  };

  const handleRemoveQuestion = (qIndex) => {
    setQuestions(questions.filter((_, idx) => idx !== qIndex));
  };

  const handleQuestionTextChange = (qIndex, text) => {
    setQuestions(
      questions.map((q, idx) => (idx === qIndex ? { ...q, questionText: text } : q))
    );
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    setQuestions(
      questions.map((q, idx) => {
        if (idx === qIndex) {
          const newOptions = [...q.options];
          newOptions[oIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const handleCorrectOptionChange = (qIndex, oIndex) => {
    setQuestions(
      questions.map((q, idx) => (idx === qIndex ? { ...q, correctOptionIndex: oIndex } : q))
    );
  };

  const handleExplanationChange = (qIndex, text) => {
    setQuestions(
      questions.map((q, idx) => (idx === qIndex ? { ...q, explanation: text } : q))
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề Quiz');
      return;
    }

    if (questions.length === 0) {
      alert('Quiz phải có ít nhất 1 câu hỏi');
      return;
    }

    // Validate câu hỏi
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        alert(`Câu hỏi thứ ${i + 1} chưa nhập nội dung câu hỏi`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          alert(`Câu hỏi thứ ${i + 1} có đáp án số ${j + 1} bị trống`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await axios.post(`/api/quizzes/lesson/${lessonId}`, {
        title,
        description,
        passingScore: Number(passingScore) || 50,
        questions
      });
      alert('Đã lưu bài trắc nghiệm thành công!');
      onClose();
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response.data : '') ||
        err.message;
      alert(serverMessage || 'Có lỗi xảy ra khi lưu Quiz');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Thiết lập Quiz bài học</h3>
            <p className="text-xs text-slate-500 mt-0.5">Bài học: <span className="font-semibold">{lessonTitle}</span></p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Đang tải cấu hình Quiz...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Quiz settings */}
              <div className="grid gap-4 md:grid-cols-3 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Tiêu đề bài Quiz</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Bài trắc nghiệm ôn tập OOP"
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Điểm đỗ (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Mô tả bài Quiz</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Nhập mô tả hoặc hướng dẫn làm bài..."
                    rows={2}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition resize-none"
                  />
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    Danh sách câu hỏi ({questions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm câu hỏi
                  </button>
                </div>

                {questions.map((question, qIndex) => (
                  <div key={qIndex} className="p-5 border border-slate-200 rounded-2xl bg-slate-50 relative group">
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="space-y-4">
                      {/* Câu hỏi text */}
                      <div>
                        <span className="text-xs font-bold text-purple-600 bg-purple-100/60 px-2 py-0.5 rounded">Câu hỏi {qIndex + 1}</span>
                        <textarea
                          value={question.questionText}
                          onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                          placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                          rows={2}
                          className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition resize-none"
                          required
                        />
                      </div>

                      {/* Đáp án options */}
                      <div className="grid gap-3 md:grid-cols-2">
                        {question.options.map((option, oIndex) => {
                          const optionLabel = String.fromCharCode(65 + oIndex); // A, B, C, D
                          const isCorrect = question.correctOptionIndex === oIndex;

                          return (
                            <div key={oIndex} className="flex items-center gap-2">
                              <label className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold shrink-0">
                                {optionLabel}
                              </label>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                placeholder={`Nhập phương án ${optionLabel}`}
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                                required
                              />
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={isCorrect}
                                onChange={() => handleCorrectOptionChange(qIndex, oIndex)}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                title="Đánh dấu đây là phương án đúng"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Giải thích đáp án */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lời giải thích đáp án đúng (Không bắt buộc)</label>
                        <textarea
                          value={question.explanation || ''}
                          onChange={(e) => handleExplanationChange(qIndex, e.target.value)}
                          placeholder="Giải thích lý do tại sao đáp án này đúng để hỗ trợ học viên tự học..."
                          rows={1.5}
                          className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {questions.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                    Hiện chưa có câu hỏi nào. Nhấn "Thêm câu hỏi" để bắt đầu thiết lập.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 shrink-0 bg-white">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-150 transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Lưu bài Quiz
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}

import axios from 'axios';
import {
  Filter,
  ImagePlus,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { resolveMediaUrl } from '../utils/mediaUrl';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

const Messages = () => {
  const { user } = useAuth();
  const { messages, setMessages, sendMessage, conversations, setConversations } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const targetCourseId = searchParams.get('courseId');
  const targetClassId = searchParams.get('classId');
  const targetSubjectId = searchParams.get('subjectId');

  const [activeConversation, setActiveConversation] = useState(null);
  const [inputText, setInputText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [scopeFilter, setScopeFilter] = useState('all');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageError, setImageError] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [lightboxImage, setLightboxImage] = useState(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const selectedImagesRef = useRef([]);
  const pendingTargetRef = useRef(null);

  const filteredConversations = useMemo(() => {
    if (scopeFilter === 'all') return conversations;
    return conversations.filter((conversation) => conversation.courseId === scopeFilter || conversation.classId === scopeFilter);
  }, [conversations, scopeFilter]);

  const activeScope = useMemo(
    () => scopes.find((scope) => scope.courseId === scopeFilter || scope.classId === scopeFilter),
    [scopeFilter, scopes]
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setErrorMessage('');
        const [conversationResponse, scopeResponse] = await Promise.all([
          axios.get('/api/chat/conversations'),
          axios.get('/api/chat/users/scopes'),
        ]);
        setConversations(conversationResponse.data);
        setScopes(scopeResponse.data);
      } catch (err) {
        setErrorMessage(err.response?.data?.message || 'Không thể tải dữ liệu tin nhắn.');
      }
    };

    fetchInitialData();
  }, [setConversations]);

  useEffect(() => {
    if (scopeFilter === 'all' || !activeConversation) return;
    if (activeConversation.courseId !== scopeFilter && activeConversation.classId !== scopeFilter) {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [activeConversation, scopeFilter, setMessages]);

  useEffect(() => {
    if (!targetUserId) return;
    const targetKey = `${targetUserId}|${targetCourseId || ''}|${targetClassId || ''}|${targetSubjectId || ''}`;
    if (pendingTargetRef.current === targetKey) return;

    const existing = conversations.find((conversation) => {
      if (conversation.isGroup || conversation.otherUserId !== targetUserId) return false;
      if (targetCourseId && conversation.courseId !== targetCourseId) return false;
      return true;
    });

    if (existing) {
      setActiveConversation(existing);
      setSearchParams({}, { replace: true });
      return;
    }

    const startNew = async () => {
      try {
        pendingTargetRef.current = targetKey;
        setErrorMessage('');
        const response = await axios.post(`/api/chat/conversations/direct/${targetUserId}`, {
          courseId: targetCourseId,
          classId: targetClassId,
          subjectId: targetSubjectId,
        });
        const conversationId = response.data.conversationId || response.data.ConversationId;
        const conversationResponse = await axios.get('/api/chat/conversations');
        setConversations(conversationResponse.data);

        const selectedConversation = conversationResponse.data.find((conversation) => conversation.id === conversationId);
        if (selectedConversation) setActiveConversation(selectedConversation);
        setSearchParams({}, { replace: true });
      } catch (err) {
        setErrorMessage(err.response?.data?.message || 'Bạn không thể mở cuộc trò chuyện này.');
        setSearchParams({}, { replace: true });
      } finally {
        pendingTargetRef.current = null;
      }
    };

    startNew();
  }, [targetUserId, targetCourseId, targetClassId, targetSubjectId, conversations, setConversations, setSearchParams]);

  useEffect(() => {
    if (!showSearchModal) return;

    const searchUsers = async () => {
      try {
        setLoadingContacts(true);
        setErrorMessage('');
        const params = { query: searchQuery };
        if (scopeFilter !== 'all') params.courseId = scopeFilter;
        const response = await axios.get('/api/chat/users/search', { params });
        setSearchResults(response.data);
      } catch (err) {
        setSearchResults([]);
        setErrorMessage(err.response?.data?.message || 'Không thể tải danh sách người có thể nhắn.');
      } finally {
        setLoadingContacts(false);
      }
    };

    const delay = setTimeout(searchUsers, 250);
    return () => clearTimeout(delay);
  }, [searchQuery, showSearchModal, scopeFilter]);

  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      try {
        setErrorMessage('');
        const response = await axios.get(`/api/chat/conversations/${activeConversation.id}/messages`);
        setMessages(response.data);
      } catch (err) {
        setMessages([]);
        setErrorMessage(err.response?.data?.message || 'Không thể tải tin nhắn.');
      }
    };

    fetchMessages();
  }, [activeConversation, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeConversation || sending) return;
    if (!inputText.trim() && selectedImages.length === 0) return;

    try {
      setSending(true);
      setErrorMessage('');
      await sendMessage(
        activeConversation.id,
        inputText,
        selectedImages.map((image) => image.file)
      );
      setInputText('');
      clearSelectedImages();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  const handleStartConversation = async (contact) => {
    try {
      setErrorMessage('');
      const response = await axios.post(`/api/chat/conversations/direct/${contact.id}`, {
        courseId: contact.courseId,
        classId: contact.classId,
        subjectId: contact.subjectId,
      });
      const conversationId = response.data.conversationId || response.data.ConversationId;

      const conversationResponse = await axios.get('/api/chat/conversations');
      setConversations(conversationResponse.data);

      const selectedConversation = conversationResponse.data.find((conversation) => conversation.id === conversationId);
      if (selectedConversation) {
        setScopeFilter(contact.courseId || 'all');
        setActiveConversation(selectedConversation);
      }

      setShowSearchModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Không thể bắt đầu cuộc trò chuyện.');
    }
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (event.target) event.target.value = '';
    if (files.length === 0) return;

    const next = [];
    const errors = [];

    if (selectedImages.length + files.length > MAX_IMAGES) {
      errors.push(`Mỗi lần gửi tối đa ${MAX_IMAGES} ảnh.`);
    }

    for (const file of files) {
      const validType = ALLOWED_IMAGE_TYPES.has(file.type) && ALLOWED_IMAGE_EXTENSIONS.test(file.name);
      if (!validType) {
        errors.push(`${file.name}: chỉ hỗ trợ JPG, JPEG, PNG hoặc WEBP.`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: dung lượng tối đa 5MB.`);
        continue;
      }
      next.push({
        id: `${file.name}-${file.lastModified}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    const remainingSlots = Math.max(0, MAX_IMAGES - selectedImages.length);
    const accepted = next.slice(0, remainingSlots);
    next.slice(remainingSlots).forEach((image) => URL.revokeObjectURL(image.previewUrl));

    setSelectedImages((current) => [...current, ...accepted]);
    setImageError([...new Set(errors)].join(' '));
  };

  const removeSelectedImage = (imageId) => {
    setSelectedImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== imageId);
    });
  };

  const clearSelectedImages = () => {
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setImageError('');
  };

  return (
    <div className="relative mx-auto my-6 flex h-[calc(100vh-64px)] max-h-[820px] w-full max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex w-1/3 min-w-[280px] flex-col border-r border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Tin nhắn</h2>
            <button
              onClick={() => setShowSearchModal(true)}
              className="rounded-full p-1.5 text-slate-600 transition-colors hover:bg-slate-100"
              title="Nhắn tin mới"
            >
              <Plus size={20} />
            </button>
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Filter className="h-4 w-4 shrink-0" />
            <select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
            >
              <option value="all">Tất cả lớp/khóa học</option>
              {scopes.map((scope) => (
                <option key={`${scope.courseId}-${scope.classId}`} value={scope.courseId}>
                  {scope.courseTitle}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Chưa có cuộc trò chuyện trong lựa chọn này
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                onClick={() => setActiveConversation(conversation)}
                className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition-colors ${
                  activeConversation?.id === conversation.id ? 'bg-purple-50' : 'hover:bg-slate-100'
                }`}
              >
                <Avatar src={conversation.otherUserAvatar} name={conversation.otherUserName} size="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-slate-900">
                    {conversation.isGroup ? conversation.title : conversation.otherUserName}
                  </h3>
                  <p className="truncate text-xs text-slate-400">
                    {conversation.courseTitle || 'Lớp học'}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {conversation.lastMessageHasImages && !conversation.lastMessage ? 'Đã gửi ảnh' : conversation.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        {activeConversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 p-4">
              <Avatar src={activeConversation.otherUserAvatar} name={activeConversation.otherUserName} size="h-10 w-10" />
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-800">
                  {activeConversation.isGroup ? activeConversation.title : activeConversation.otherUserName}
                </h2>
                <p className="truncate text-xs text-slate-400">
                  {activeConversation.courseTitle || activeScope?.courseTitle || 'Lớp học'}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                {errorMessage}
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message) => {
                const isMe = message.senderId === user?.id;
                const attachments = message.attachments || [];

                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[72%] rounded-2xl px-4 py-2 ${
                        isMe ? 'rounded-br-none bg-purple-600 text-white' : 'rounded-bl-none bg-slate-100 text-slate-800'
                      }`}
                    >
                      {!isMe && activeConversation.isGroup && (
                        <div className="mb-1 text-xs font-semibold text-purple-600">{message.senderName}</div>
                      )}
                      {message.content && <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>}
                      {attachments.length > 0 && (
                        <div className={`mt-2 grid gap-2 ${attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {attachments.map((attachment) => (
                            <button
                              type="button"
                              key={attachment.id}
                              onClick={() => setLightboxImage(attachment)}
                              className="group relative overflow-hidden rounded-lg border border-white/20 bg-black/5"
                            >
                              <ChatImage
                                attachment={attachment}
                                className="h-28 w-full object-cover transition group-hover:scale-105"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className={`mt-1 text-[10px] ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                        {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-4">
              {selectedImages.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <img src={image.previewUrl} alt={image.file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(image.id)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {imageError && <div className="mb-2 text-xs text-rose-600">{imageError}</div>}

              <div className="flex items-center gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={sending || selectedImages.length >= MAX_IMAGES}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Tải ảnh lên"
                >
                  <ImagePlus size={18} />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && selectedImages.length === 0)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title={sending ? 'Đang gửi ảnh' : 'Gửi'}
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Send size={24} className="text-slate-400" />
            </div>
            {errorMessage && <p className="mb-3 max-w-md text-center text-sm text-rose-600">{errorMessage}</p>}
            <p>Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        )}
      </div>

      {showSearchModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="flex max-h-[80%] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800">Bắt đầu trò chuyện mới</h3>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                <Filter className="h-4 w-4 shrink-0" />
                <select
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
                >
                  <option value="all">Tất cả lớp/khóa học</option>
                  {scopes.map((scope) => (
                    <option key={`modal-${scope.courseId}-${scope.classId}`} value={scope.courseId}>
                      {scope.courseTitle}
                    </option>
                  ))}
                </select>
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email hoặc lớp..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {loadingContacts ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Không có người phù hợp trong lớp/khóa học của bạn</p>
              ) : (
                searchResults.map((contact) => (
                  <button
                    type="button"
                    key={`${contact.id}-${contact.courseId}-${contact.classId}-${contact.subjectId || ''}`}
                    onClick={() => handleStartConversation(contact)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <Avatar src={contact.avatar} name={contact.name} size="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium text-slate-900">{contact.name}</h4>
                      <p className="truncate text-xs text-slate-500">{contact.email}</p>
                      <p className="truncate text-xs text-purple-600">{contact.courseTitle}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                      {contact.role?.toLowerCase()}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxImage && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-6" onClick={() => setLightboxImage(null)}>
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setLightboxImage(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <ChatImage
            attachment={lightboxImage}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

const Avatar = ({ src, name, size }) => (
  <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500`}>
    {src ? (
      <img src={resolveMediaUrl(src)} alt={name || ''} className="h-full w-full object-cover" />
    ) : (
      <UserIcon size={size.includes('12') ? 24 : 20} />
    )}
  </div>
);

const ChatImage = ({ attachment, className, onClick }) => {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = '';
    let active = true;

    setSrc('');
    setFailed(false);

    axios
      .get(resolveMediaUrl(attachment.url), { responseType: 'blob' })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url]);

  if (failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-200 text-xs text-slate-500`} onClick={onClick}>
        Không tải được ảnh
      </div>
    );
  }

  if (!src) {
    return <div className={`${className} animate-pulse bg-slate-200`} onClick={onClick} />;
  }

  return <img src={src} alt={attachment.fileName || 'Ảnh chat'} className={className} onClick={onClick} />;
};

export default Messages;

import axios from 'axios';
import { Send, User as UserIcon, Plus, Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const Messages = () => {
  const { user } = useAuth();
  const { messages, setMessages, sendMessage, conversations, setConversations } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');
  
  const [activeConversation, setActiveConversation] = useState(null);
  const [inputText, setInputText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!targetUserId || conversations.length === 0) return;

    const existing = conversations.find(c => !c.isGroup && c.otherUserId === targetUserId);
    if (existing) {
      setActiveConversation(existing);
      setSearchParams({}, { replace: true });
    } else {
      const startNew = async () => {
        try {
          const res = await axios.post(`/api/chat/conversations/direct/${targetUserId}`);
          const conversationId = res.data.conversationId;
          
          const convRes = await axios.get('/api/chat/conversations');
          setConversations(convRes.data);
          
          const selectedConv = convRes.data.find(c => c.id === conversationId);
          if (selectedConv) {
            setActiveConversation(selectedConv);
          }
          setSearchParams({}, { replace: true });
        } catch (err) {
          console.error("Failed to auto start conversation", err);
        }
      };
      startNew();
    }
  }, [targetUserId, conversations, setConversations, setSearchParams]);

  useEffect(() => {
    // Fetch conversations list
    const fetchConversations = async () => {
      try {
        const res = await axios.get('/api/chat/conversations');
        setConversations(res.data);
      } catch (err) {
        console.error("Failed to load conversations", err);
      }
    };
    
    fetchConversations();
  }, [setConversations]);

  useEffect(() => {
    if (!showSearchModal) return;
    
    const searchUsers = async () => {
      try {
        const res = await axios.get(`/api/chat/users/search?query=${searchQuery}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error("Failed to search users", err);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, showSearchModal]);

  useEffect(() => {
    if (activeConversation) {
      // Fetch messages for active conversation
      const fetchMessages = async () => {
        try {
          const res = await axios.get(`/api/chat/conversations/${activeConversation.id}/messages`);
          setMessages(res.data);
        } catch (err) {
          console.error("Failed to load messages", err);
        }
      };
      
      fetchMessages();
    }
  }, [activeConversation, setMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    sendMessage(activeConversation.id, inputText);
    setInputText('');
  };

  const handleStartConversation = async (otherUser) => {
    try {
      const res = await axios.post(`/api/chat/conversations/direct/${otherUser.id}`);
      const conversationId = res.data.conversationId;
      
      // Reload conversations list
      const convRes = await axios.get('/api/chat/conversations');
      setConversations(convRes.data);
      
      // Find and select the active conversation
      const selectedConv = convRes.data.find(c => c.id === conversationId);
      if (selectedConv) {
        setActiveConversation(selectedConv);
      }
      
      setShowSearchModal(false);
      setSearchQuery('');
    } catch (err) {
      console.error("Failed to start conversation", err);
    }
  };
  return (
    <div className="flex h-[calc(100vh-64px)] max-h-[800px] w-full max-w-6xl mx-auto my-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Sidebar - Conversations List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">Tin nhắn</h2>
          <button 
            onClick={() => setShowSearchModal(true)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            title="Nhắn tin mới"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Không có cuộc trò chuyện nào
            </div>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id} 
                onClick={() => setActiveConversation(conv)}
                className={`flex items-center gap-3 p-4 border-b border-slate-100 cursor-pointer transition-colors ${activeConversation?.id === conv.id ? 'bg-purple-50' : 'hover:bg-slate-100'}`}
              >
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 flex-shrink-0">
                  {conv.otherUserAvatar ? (
                    <img src={conv.otherUserAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <UserIcon size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 truncate">
                    {conv.isGroup ? conv.title : conv.otherUserName}
                  </h3>
                  <p className="text-sm text-slate-500 truncate">
                    {conv.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                {activeConversation.otherUserAvatar ? (
                  <img src={activeConversation.otherUserAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <UserIcon size={20} />
                )}
              </div>
              <h2 className="font-semibold text-slate-800">
                {activeConversation.isGroup ? activeConversation.title : activeConversation.otherUserName}
              </h2>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                      {!isMe && activeConversation.isGroup && (
                        <div className="text-xs font-semibold text-purple-600 mb-1">{msg.senderName}</div>
                      )}
                      <p>{msg.content}</p>
                      <div className={`text-[10px] mt-1 ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 border border-slate-300 rounded-full px-4 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} className="-ml-0.5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Send size={24} className="text-slate-400" />
            </div>
            <p>Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        )}
      </div>

      {/* New Conversation / User Search Modal */}
      {showSearchModal && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 w-full max-w-md flex flex-col max-h-[80%] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Bắt đầu trò chuyện mới</h3>
              <button 
                onClick={() => { setShowSearchModal(false); setSearchQuery(''); }}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {searchResults.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">Không tìm thấy người dùng nào</p>
              ) : (
                searchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => handleStartConversation(u)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 flex-shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <UserIcon size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 text-sm truncate">{u.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">
                      {u.role.toLowerCase()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;

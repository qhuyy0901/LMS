import * as signalR from '@microsoft/signalr';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

const uniqueUsersById = (users = []) => {
  const seen = new Set();
  return users.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = envApiUrl.endsWith('/api') ? envApiUrl.slice(0, -4) : envApiUrl;

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const activeConversationIdRef = useRef(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token') || document.cookie.replace(/(?:(?:^|.*;\s*)LmsAuthToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      const hubUrl = `${API_URL}/chatHub`;
      
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect()
        .build();

      setConnection(newConnection);
    } else {
      if (connection) {
        connection.stop();
        setConnection(null);
      }
      setOnlineUsers([]);
    }
  }, [user]);

  useEffect(() => {
    if (!connection) return;

    const startConnection = async () => {
      try {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
          console.log('Connected to SignalR ChatHub');
        }
      } catch (err) {
        console.error('SignalR Connection Error: ', err);
      }
    };

    const fetchOnlineUsers = async () => {
      try {
        const response = await axios.get('/api/chat/users/online');
        setOnlineUsers(uniqueUsersById(response.data));
      } catch (err) {
        console.error('Failed to fetch online users', err);
      }
    };

    const handleReceiveMessage = (message) => {
      const isCurrentlyActive = message.conversationId === activeConversationIdRef.current;
      
      if (isCurrentlyActive) {
        setMessages(prev => {
          // Prevent duplicate messages in state
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      
      // Update conversations list latest message and unread badge count
      setConversations(prev => {
        return prev.map(c => {
          if (c.id === message.conversationId) {
            const currentUnread = c.unreadCount || c.UnreadCount || 0;
            return {
              ...c,
              lastMessage: message.content || (message.attachments?.length ? 'Đã gửi ảnh' : ''),
              lastMessageHasImages: Boolean(message.attachments?.length),
              lastMessageAt: message.sentAt,
              unreadCount: isCurrentlyActive ? 0 : currentUnread + 1,
              UnreadCount: isCurrentlyActive ? 0 : currentUnread + 1
            };
          }
          return c;
        });
      });
    };

    const handleUserOnline = (onlineUser) => {
      if (onlineUser.id === user?.id) return;
      setOnlineUsers(prev => {
        if (prev.some(u => u.id === onlineUser.id)) return prev;
        return uniqueUsersById([...prev, onlineUser]);
      });
    };

    const handleUserOffline = (offlineUserId) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== offlineUserId));
    };

    connection.on('ReceiveMessage', handleReceiveMessage);
    connection.on('MessageRejected', (payload) => {
      console.error('Chat message rejected', payload?.message);
    });
    connection.on('UserOnline', handleUserOnline);
    connection.on('UserOffline', handleUserOffline);
    
    startConnection().then(() => {
      fetchOnlineUsers();
    });

    return () => {
      connection.off('ReceiveMessage', handleReceiveMessage);
      connection.off('MessageRejected');
      connection.off('UserOnline', handleUserOnline);
      connection.off('UserOffline', handleUserOffline);
    };
  }, [connection]);

  const sendMessage = async (conversationId, content, images = []) => {
    const formData = new FormData();
    formData.append('Content', content || '');
    images.forEach((image) => formData.append('Images', image));

    const response = await axios.post(`/api/chat/conversations/${conversationId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    const message = response.data;
    setMessages(prev => {
      if (prev.some(m => m.id === message.id)) return prev;
      return [...prev, message];
    });

    setConversations(prev => prev.map(c => {
      if (c.id !== message.conversationId) return c;
      return {
        ...c,
        lastMessage: message.content || (message.attachments?.length ? 'Đã gửi ảnh' : ''),
        lastMessageHasImages: Boolean(message.attachments?.length),
        lastMessageAt: message.sentAt
      };
    }));

    return message;
  };

  return (
    <ChatContext.Provider value={{ connection, messages, setMessages, sendMessage, conversations, setConversations, onlineUsers, activeConversationId, setActiveConversationId }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

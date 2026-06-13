import * as signalR from '@microsoft/signalr';
import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token') || document.cookie.replace(/(?:(?:^|.*;\s*)LmsAuthToken\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl('http://localhost:5000/chatHub', {
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
        setOnlineUsers(response.data);
      } catch (err) {
        console.error('Failed to fetch online users', err);
      }
    };

    const handleReceiveMessage = (message) => {
      setMessages(prev => {
        // Prevent duplicate messages in state
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      
      // Update conversations list latest message
      setConversations(prev => {
        return prev.map(c => {
          if (c.id === message.conversationId) {
            return { ...c, lastMessage: message.content, lastMessageAt: message.sentAt };
          }
          return c;
        });
      });
    };

    const handleUserOnline = (onlineUser) => {
      if (onlineUser.id === user?.id) return;
      setOnlineUsers(prev => {
        if (prev.some(u => u.id === onlineUser.id)) return prev;
        return [...prev, onlineUser];
      });
    };

    const handleUserOffline = (offlineUserId) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== offlineUserId));
    };

    connection.on('ReceiveMessage', handleReceiveMessage);
    connection.on('UserOnline', handleUserOnline);
    connection.on('UserOffline', handleUserOffline);
    
    startConnection().then(() => {
      fetchOnlineUsers();
    });

    return () => {
      connection.off('ReceiveMessage', handleReceiveMessage);
      connection.off('UserOnline', handleUserOnline);
      connection.off('UserOffline', handleUserOffline);
    };
  }, [connection]);

  const sendMessage = async (conversationId, content) => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      try {
        await connection.send('SendMessage', { conversationId, content });
      } catch (e) {
        console.error('Send message failed', e);
      }
    } else {
      alert('Chưa kết nối tới máy chủ chat');
    }
  };

  return (
    <ChatContext.Provider value={{ connection, messages, setMessages, sendMessage, conversations, setConversations, onlineUsers }}>
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

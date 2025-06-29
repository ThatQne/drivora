import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Search, 
  Send, 
  User, 
  ArrowLeft, 
  MoreVertical,
  Check,
  CheckCheck,
  Phone,
  Video,
  Info,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Message, User as UserType, Conversation } from '../../types/index.ts';
import ApiService from '../../services/apiService.ts';
import webSocketService from '../../services/webSocketService.ts';

interface TypingIndicator {
  userId: string;
  conversationId: string;
  timestamp: number;
}

interface PendingMessage {
  id: string;
  content: string;
  timestamp: string;
  senderId: string;
  receiverId: string;
  status: 'sending' | 'sent' | 'failed';
}

export function MessagesView() {
  const { state, sendMessage, markMessagesAsRead, checkForNewMessages, dispatch } = useApp();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Message pagination state
  const [paginatedMessages, setPaginatedMessages] = useState<{ [conversationId: string]: Message[] }>({});
  const [messagePagination, setMessagePagination] = useState<{ [conversationId: string]: {
    current: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
    loading: boolean;
    initialLoaded: boolean;
  } }>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastScrollHeight = useRef<number>(0);
  const messageCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Use conversations from state (loaded from API) with fallback to creating from messages
  const conversations = useMemo(() => {
    // If we have conversations from the API, use those
    if (state.conversations && state.conversations.length > 0) {
      console.log('📞 Using conversations from API:', state.conversations.length);
      return state.conversations.sort((a, b) => 
        new Date(b.updatedAt || b.lastMessage?.timestamp || 0).getTime() - 
        new Date(a.updatedAt || a.lastMessage?.timestamp || 0).getTime()
      );
    }

    // Fallback: Create conversations from messages if API conversations aren't available
    console.log('📞 Fallback: Creating conversations from messages');
    const convMap = new Map<string, Conversation>();
    
    if (!state.messages) return [];
    
    state.messages.forEach(message => {
      // Extract user IDs properly (handle both string IDs and populated objects)
      const messageSenderId = typeof message.senderId === 'object' 
        ? (message.senderId as any)._id || (message.senderId as any).id 
        : message.senderId;
      const messageReceiverId = typeof message.receiverId === 'object' 
        ? (message.receiverId as any)._id || (message.receiverId as any).id 
        : message.receiverId;
        
      const otherUserId = messageSenderId === state.currentUser?.id 
        ? messageReceiverId 
        : messageSenderId;
      
      const conversationId = [state.currentUser?.id, otherUserId].sort().join('-');
      
      if (!convMap.has(conversationId)) {
        convMap.set(conversationId, {
          id: conversationId,
          participants: [state.currentUser?.id!, otherUserId],
          lastMessage: message,
          unreadCount: 0,
          updatedAt: message.timestamp
        });
      } else {
        const existing = convMap.get(conversationId)!;
        if (new Date(message.timestamp) > new Date(existing.lastMessage.timestamp)) {
          existing.lastMessage = message;
          existing.updatedAt = message.timestamp;
        }
      }
    });

    // Calculate unread counts
    convMap.forEach(conversation => {
      const unreadMessages = state.messages.filter(msg => {
        // Extract user IDs properly (handle both string IDs and populated objects)
        const msgSenderId = typeof msg.senderId === 'object' 
          ? (msg.senderId as any)._id || (msg.senderId as any).id 
          : msg.senderId;
        const msgReceiverId = typeof msg.receiverId === 'object' 
          ? (msg.receiverId as any)._id || (msg.receiverId as any).id 
          : msg.receiverId;
          
        return msgReceiverId === state.currentUser?.id &&
               !msg.read &&
               (msgSenderId === conversation.participants[0] || msgSenderId === conversation.participants[1]);
      });
      conversation.unreadCount = unreadMessages.length;
    });

    return Array.from(convMap.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [state.conversations, state.messages, state.currentUser?.id]);

  // Check if we need to load users for conversations
  const missingUserIds = useMemo(() => {
    if (!conversations.length) return [];
    
    const userIds = new Set<string>();
    conversations.forEach(conversation => {
      // For fallback conversations, we need to load the other user
      if (!(conversation as any).otherUser) {
        const otherUserId = conversation.participants.find(p => p !== state.currentUser?.id);
        if (otherUserId && !state.users.find(u => u.id === otherUserId)) {
          userIds.add(otherUserId);
        }
      }
    });
    
    return Array.from(userIds);
  }, [conversations, state.users, state.currentUser?.id]);

  // Load missing users when conversations are created
  useEffect(() => {
    if (missingUserIds.length > 0) {
      console.log('👥 Loading missing users for conversations:', missingUserIds);
      const loadMissingUsers = async () => {
        try {
          const users = await ApiService.getUsersBatch(missingUserIds);
          const usersWithId = users.map((u: any) => ({ ...u, id: u._id || u.id }));
          
          // Add new users to existing users
          const allUsers = [...state.users];
          usersWithId.forEach(user => {
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push(user);
            }
          });
          
          dispatch({ type: 'SET_USERS', payload: allUsers });
          console.log('✅ Loaded missing users for conversations');
        } catch (error) {
          console.error('❌ Error loading missing users for conversations:', error);
        }
      };
      
      loadMissingUsers();
    }
  }, [missingUserIds, state.users, dispatch]);

  // Track when messages/conversations are loaded for the first time
  useEffect(() => {
    if ((state.messages && state.messages.length > 0) || (state.conversations && state.conversations.length > 0)) {
      setInitialLoad(false);
    }
  }, [state.messages, state.conversations]);

  // Debug conversation changes
  useEffect(() => {
    console.log('📞 Conversations changed:', {
      count: conversations.length,
      conversations: conversations.map(c => ({ id: c.id, participants: c.participants })),
      selectedConversation,
      stateConversationsCount: state.conversations?.length || 0,
      stateMessagesCount: state.messages?.length || 0
    });
  }, [conversations, selectedConversation, state.conversations, state.messages]);

  // Sync new messages from global state into paginated messages
  useEffect(() => {
    if (!selectedConversation || !state.messages) return;

    // Get the conversation to find the other user
    const conversation = conversations.find(c => c.id === selectedConversation);
    if (!conversation) return;

    let otherUserId: string;
    if ((conversation as any).otherUser) {
      otherUserId = (conversation as any).otherUser.id;
    } else {
      otherUserId = conversation.participants.find(p => p !== state.currentUser?.id) || '';
    }

    // Filter messages for this conversation from global state
    const conversationMessages = state.messages.filter(msg => {
      const msgSenderId = typeof msg.senderId === 'object' ? (msg.senderId as any).id : msg.senderId;
      const msgReceiverId = typeof msg.receiverId === 'object' ? (msg.receiverId as any).id : msg.receiverId;
      
      return (msgSenderId === state.currentUser?.id && msgReceiverId === otherUserId) ||
             (msgSenderId === otherUserId && msgReceiverId === state.currentUser?.id);
    });

    // Get current paginated messages for this conversation
    const currentPaginatedMessages = paginatedMessages[selectedConversation] || [];

    // Find new messages that aren't in paginated messages yet
    const newMessages = conversationMessages.filter(globalMsg => {
      return !currentPaginatedMessages.some(paginatedMsg => 
        paginatedMsg.id === globalMsg.id
      );
    });

    // If there are new messages, add them to paginated messages
    if (newMessages.length > 0) {
      console.log(`📨 Adding ${newMessages.length} new messages to paginated messages for conversation ${selectedConversation}`);
      
      setPaginatedMessages(prev => ({
        ...prev,
        [selectedConversation]: [
          ...currentPaginatedMessages,
          ...newMessages
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      }));

      // Scroll to bottom to show new message
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
  }, [state.messages, selectedConversation, conversations, state.currentUser?.id, paginatedMessages]);

  // Clean up typing indicators that are too old
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(typing => now - typing.timestamp < 3000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Set up WebSocket typing indicator listeners
  useEffect(() => {
    const handleTypingStart = (userId: string, conversationId: string) => {
      if (userId !== state.currentUser?.id) {
        setTypingUsers(prev => {
          // Remove any existing typing indicator for this user
          const filtered = prev.filter(t => t.userId !== userId || t.conversationId !== conversationId);
          // Add new typing indicator
          return [...filtered, { userId, conversationId, timestamp: Date.now() }];
        });
      }
    };

    const handleTypingStop = (userId: string, conversationId: string) => {
      if (userId !== state.currentUser?.id) {
        setTypingUsers(prev => 
          prev.filter(t => !(t.userId === userId && t.conversationId === conversationId))
        );
      }
    };

    // Set up WebSocket callbacks for typing indicators
    webSocketService.setCallbacks({
      onTypingStart: handleTypingStart,
      onTypingStop: handleTypingStop
    });

    return () => {
      // Clean up callbacks when component unmounts
      webSocketService.setCallbacks({
        onTypingStart: undefined,
        onTypingStop: undefined
      });
    };
  }, [state.currentUser?.id]);

  // Handle real-time conversation updates
  useEffect(() => {
    console.log('📞 Conversations updated in MessagesView:', {
      count: conversations.length,
      selectedConversation,
      topConversations: conversations.slice(0, 3).map(c => ({
        id: c.id,
        lastMessageContent: c.lastMessage?.content?.substring(0, 30),
        updatedAt: c.updatedAt,
        participants: c.participants
      }))
    });
    
    // If we have a selected conversation and it was updated, scroll to bottom
    if (selectedConversation && conversations.length > 0) {
      const currentConversation = conversations.find(c => c.id === selectedConversation);
      if (currentConversation?.lastMessage) {
        // Small delay to ensure the new message is rendered
        setTimeout(() => {
          scrollToBottom(false);
        }, 100);
      }
    }
  }, [conversations, selectedConversation]);

  // Debug logging for conversations
  useEffect(() => {
    console.log('📞 MessagesView Debug:', {
      stateConversationsCount: state.conversations?.length || 0,
      computedConversationsCount: conversations.length,
      messagesCount: state.messages?.length || 0,
      usersCount: state.users?.length || 0,
      usingFallback: !state.conversations || state.conversations.length === 0,
      computedConversations: conversations.slice(0, 3).map(c => ({
        id: c.id,
        participants: c.participants,
        lastMessage: c.lastMessage?.content?.substring(0, 30)
      }))
    });
  }, [state.conversations, conversations, state.messages, state.users]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;
    
    return conversations.filter(conversation => {
      // For API conversations, use embedded otherUser data; for fallback conversations, find in state.users
      const otherUser = (conversation as any).otherUser || (() => {
        const otherUserId = conversation.participants.find(p => p !== state.currentUser?.id);
        return state.users.find(u => u.id === otherUserId);
      })();
      
      return otherUser?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [conversations, searchTerm, state.users, state.currentUser?.id]);

  // Get current conversation messages with pending messages
  const currentConversationMessages = useMemo(() => {
    if (!selectedConversation) return [];
    
    // Get paginated messages for this conversation
    const messages = paginatedMessages[selectedConversation] || [];
    
    // Get other user ID for pending messages
    const conversation = conversations.find(c => c.id === selectedConversation);
    if (!conversation) return messages;
    
    let otherUserId: string;
    if ((conversation as any).otherUser) {
      otherUserId = (conversation as any).otherUser.id;
    } else {
      otherUserId = conversation.participants.find(p => p !== state.currentUser?.id) || '';
    }
    
    // Add pending messages for this conversation
    const conversationPendingMessages = pendingMessages
      .filter(msg => msg.receiverId === otherUserId)
      .filter(msg => {
        // Don't show pending messages if a real message with similar content and timestamp exists
        const hasRealCounterpart = messages.some(realMsg => {
          const realMsgSenderId = typeof realMsg.senderId === 'object' ? (realMsg.senderId as any).id : realMsg.senderId;
          return realMsgSenderId === state.currentUser?.id && 
                 realMsg.content === msg.content &&
                 Math.abs(new Date(realMsg.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 5000;
        });
        return !hasRealCounterpart;
      })
      .map(msg => ({
        ...msg,
        read: false,
        isPending: true
      }));
    
    // Combine and sort all messages
    const allMessages = [...messages, ...conversationPendingMessages]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return allMessages;
  }, [selectedConversation, paginatedMessages, pendingMessages, conversations, state.currentUser?.id]);

  // Get other user in selected conversation
  const selectedConversationUser = useMemo(() => {
    if (!selectedConversation) return null;
    
    const conversation = conversations.find(c => c.id === selectedConversation);
    if (!conversation) return null;
    
    // For API conversations, use embedded otherUser data; for fallback conversations, find in state.users
    const otherUser = (conversation as any).otherUser || (() => {
      const otherUserId = conversation.participants.find(p => p !== state.currentUser?.id);
      return state.users.find(u => u.id === otherUserId);
    })();
    
    return otherUser || null;
  }, [selectedConversation, conversations, state.users, state.currentUser?.id]);

  // Auto-scroll to bottom when new messages arrive (but preserve scroll position when loading more)
  useEffect(() => {
    if (selectedConversation && currentConversationMessages.length > 0) {
      const pagination = messagePagination[selectedConversation];
      // Only auto-scroll if this is the initial load or we're near the bottom
      if (!pagination || pagination.current === 1) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    }
  }, [currentConversationMessages, selectedConversation]);

  // Preserve scroll position when loading more messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      lastScrollHeight.current = messagesContainerRef.current.scrollHeight;
    }
  }, [currentConversationMessages]);

  // Update scroll position after loading more messages
  useEffect(() => {
    if (selectedConversation && messagePagination[selectedConversation]?.loading === false) {
      preserveScrollPosition();
    }
  }, [messagePagination, selectedConversation]);

  // Set up automatic message checking when component mounts
  useEffect(() => {
    console.log('📱 MessagesView mounted');
    
    // DISABLED: Automatic checking causes infinite loops
    // WebSocket handles real-time message updates instead
    // checkForNewMessages();
    
    // DISABLED: Interval checking not needed with WebSocket
    // messageCheckIntervalRef.current = setInterval(() => {
    //   checkForNewMessages();
    // }, 10000);
    
    // Cleanup on unmount
    return () => {
      if (messageCheckIntervalRef.current) {
        clearInterval(messageCheckIntervalRef.current);
      }
    };
  }, []);

  // DISABLED: Automatic checking when conversation changes
  // WebSocket handles real-time updates instead
  // useEffect(() => {
  //   if (selectedConversation) {
  //     console.log('💬 Active conversation selected, increasing message check frequency');
  //     
  //     // Clear existing interval
  //     if (messageCheckIntervalRef.current) {
  //       clearInterval(messageCheckIntervalRef.current);
  //     }
  //     
  //     // Check more frequently (every 3 seconds) when in active conversation
  //     messageCheckIntervalRef.current = setInterval(() => {
  //       checkForNewMessages();
  //     }, 3000);
  //   } else {
  //     // Reset to normal frequency when no conversation selected
  //     if (messageCheckIntervalRef.current) {
  //       clearInterval(messageCheckIntervalRef.current);
  //     }
  //     
  //     messageCheckIntervalRef.current = setInterval(() => {
  //       checkForNewMessages();
  //     }, 10000);
  //   }
  // }, [selectedConversation, checkForNewMessages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationUser) return;

    const messageContent = messageText.trim();
    const tempMessage: PendingMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      timestamp: new Date().toISOString(),
      senderId: state.currentUser!.id,
      receiverId: selectedConversationUser.id,
      status: 'sending'
    };

    console.log('📤 Sending message:', {
      content: tempMessage.content.substring(0, 50),
      senderId: tempMessage.senderId,
      receiverId: tempMessage.receiverId,
      selectedConversation,
      conversationsCount: conversations.length,
      conversationsBeforeSend: conversations.map(c => ({ id: c.id, participants: c.participants }))
    });

    // Add to pending messages immediately
    setPendingMessages(prev => [...prev, tempMessage]);
    
    // Clear input and reset immediately to allow new messages
    setMessageText('');
    setIsTyping(false);

    // Auto-resize textarea back to single line and keep focus
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.focus();
    }

    try {
      await sendMessage({
        senderId: state.currentUser!.id,
        receiverId: selectedConversationUser.id,
        content: messageContent
      });
      
      console.log('✅ Message sent successfully, removing from pending');
      
      // Remove pending message immediately once sent successfully
      setPendingMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));

      // Log conversation state after sending
      setTimeout(() => {
        console.log('📞 Conversations after message sent:', {
          count: conversations.length,
          selectedConversation,
          selectedConversationData: conversations.find(c => c.id === selectedConversation),
          allConversations: conversations.map(c => ({ id: c.id, participants: c.participants }))
        });
      }, 100);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Mark as failed
      setPendingMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      // Ensure focus is maintained after Enter key
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleTyping = (value: string) => {
    setMessageText(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
    
    if (value.trim() && !isTyping && selectedConversation) {
      setIsTyping(true);
      
      // Emit typing indicator via WebSocket
      if (webSocketService.isConnectedToServer()) {
        webSocketService.sendTypingStart(selectedConversation);
      }
    }

    // Clear typing indicator after 2 seconds of no typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      
      // Stop typing indicator via WebSocket
      if (webSocketService.isConnectedToServer() && selectedConversation) {
        webSocketService.sendTypingStop(selectedConversation);
      }
    }, 2000);
  };

  const handleConversationSelect = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    console.log('🔍 Selected conversation:', {
      id: conversationId,
      conversation: conversation ? {
        id: conversation.id,
        participants: conversation.participants,
        otherUser: (conversation as any).otherUser ? {
          id: (conversation as any).otherUser.id,
          username: (conversation as any).otherUser.username
        } : null
      } : 'NOT FOUND'
    });
    
    setSelectedConversation(conversationId);
    
    // Load messages for this conversation if not already loaded
    const pagination = messagePagination[conversationId];
    if (!pagination || !pagination.initialLoaded) {
      await loadConversationMessages(conversationId, 1, false);
    }
    
    // Scroll to bottom after a short delay to ensure messages are rendered
    setTimeout(() => {
      scrollToBottom(true);
    }, 100);
    
    // Focus the input field after selecting conversation
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 200);
    
    // Mark messages as read
    if (conversation && conversation.unreadCount > 0) {
      try {
        await markMessagesAsRead(conversationId);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'long', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateSeparator = (currentMessage: any, previousMessage: any) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp);
    const previousDate = new Date(previousMessage.timestamp);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const shouldShowTimeGroup = (currentMessage: any, previousMessage: any) => {
    if (!previousMessage) return true;
    
    const currentSenderId = typeof currentMessage.senderId === 'object' 
      ? currentMessage.senderId.id 
      : currentMessage.senderId;
    const previousSenderId = typeof previousMessage.senderId === 'object' 
      ? previousMessage.senderId.id 
      : previousMessage.senderId;
    
    // Different senders
    if (currentSenderId !== previousSenderId) return true;
    
    // Check if messages are more than 1 minute apart
    const currentTime = new Date(currentMessage.timestamp);
    const previousTime = new Date(previousMessage.timestamp);
    const timeDiff = (currentTime.getTime() - previousTime.getTime()) / (1000 * 60); // minutes
    
    return timeDiff > 1;
  };

  const shouldShowAvatar = (currentMessage: any, nextMessage: any, isOwn: boolean) => {
    if (isOwn) return false; // Don't show avatars for own messages
    if (!nextMessage) return true; // Always show for last message in conversation
    
    const currentSenderId = typeof currentMessage.senderId === 'object' 
      ? currentMessage.senderId.id 
      : currentMessage.senderId;
    const nextSenderId = typeof nextMessage.senderId === 'object' 
      ? nextMessage.senderId.id 
      : nextMessage.senderId;
    
    // Show avatar if next message is from different sender or if time group changes
    return currentSenderId !== nextSenderId || shouldShowTimeGroup(nextMessage, currentMessage);
  };

  const renderConversationsList = () => (
    <div className="w-full lg:w-96 border-r border-primary-700/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-primary-700/30">
        <h2 className="text-xl font-bold text-primary-100 mb-4">Messages</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {initialLoad || missingUserIds.length > 0 ? (
          <div className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-4 relative">
              <div className="w-12 h-12 border-2 border-primary-600 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-primary-300">Loading conversations...</p>
            <p className="text-sm text-primary-400 mt-1">
              {missingUserIds.length > 0 ? 'Loading user data...' : 'Please wait while we load your messages'}
            </p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-primary-400" />
            <p className="text-primary-300">No conversations yet</p>
            <p className="text-sm text-primary-400 mt-1">
              Start trading to begin messaging with other users
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-primary-400" />
            <p className="text-primary-300">No conversations match your search</p>
            <p className="text-sm text-primary-400 mt-1">
              Try adjusting your search terms
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation) => {
              // Enhanced user lookup with better error handling
              const otherUser = (() => {
                // For API conversations, use embedded otherUser data
                if ((conversation as any).otherUser) {
                  return (conversation as any).otherUser;
                }
                
                // For fallback conversations, find in state.users
                const otherUserId = conversation.participants.find(p => p !== state.currentUser?.id);
                if (!otherUserId) {
                  console.warn('⚠️ No other user ID found for conversation:', conversation.id);
                  return null;
                }
                
                const user = state.users.find(u => u.id === otherUserId);
                if (!user) {
                  console.warn('⚠️ User not found for conversation:', { conversationId: conversation.id, otherUserId });
                  return null;
                }
                
                return user;
              })();
              
              const isSelected = selectedConversation === conversation.id;
              
              // Don't render conversation if user data is not ready
              if (!otherUser) {
                return null;
              }
              
              return (
                <motion.div
                  key={conversation.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConversationSelect(conversation.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-600/30 border border-primary-500/50'
                      : 'hover:bg-primary-800/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 bg-primary-800/50 rounded-full flex items-center justify-center">
                        {otherUser?.avatar ? (
                          <img
                            src={otherUser.avatar}
                            alt={otherUser.username}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <User className="w-6 h-6 text-primary-300" />
                        )}
                      </div>
                      {/* Online indicator could go here */}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-primary-100 truncate">
                          @{otherUser?.username || 'Unknown'}
                        </h4>
                        <span className="text-xs text-primary-400">
                          {formatTime(conversation.lastMessage.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-primary-300 truncate">
                          {conversation.lastMessage.senderId === state.currentUser?.id && 'You: '}
                          {conversation.lastMessage.content}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderChatInterface = () => {
    if (!selectedConversation || !selectedConversationUser) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-primary-400" />
            <h3 className="text-xl font-semibold text-primary-100 mb-2">Select a conversation</h3>
            <p className="text-primary-300">Choose a conversation to start messaging</p>
          </div>
        </div>
      );
    }

    const typingUsersInConversation = typingUsers.filter(t => t.conversationId === selectedConversation);

    return (
      <div className="flex-1 relative h-full">
        {/* Chat Header - Fixed at top */}
        <div className="absolute top-0 left-0 right-0 p-4 border-b border-primary-700/30 bg-primary-900/95 backdrop-blur-sm z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="lg:hidden p-2 hover:bg-primary-800/50 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-primary-300" />
              </button>
              
              <div className="w-10 h-10 bg-primary-800/50 rounded-full flex items-center justify-center">
                {selectedConversationUser.avatar ? (
                  <img
                    src={selectedConversationUser.avatar}
                    alt={selectedConversationUser.username}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <User className="w-5 h-5 text-primary-300" />
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-primary-100">
                  @{selectedConversationUser.username}
                </h3>
                {typingUsersInConversation.length > 0 && (
                  <p className="text-sm text-blue-400">typing...</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-primary-800/50 rounded-full transition-colors">
                <Phone className="w-5 h-5 text-primary-300" />
              </button>
              <button className="p-2 hover:bg-primary-800/50 rounded-full transition-colors">
                <Video className="w-5 h-5 text-primary-300" />
              </button>
              <button className="p-2 hover:bg-primary-800/50 rounded-full transition-colors">
                <Info className="w-5 h-5 text-primary-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Message Input - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-700/30 bg-primary-900/95 backdrop-blur-sm z-30">
          <div className="flex items-center space-x-3 max-w-4xl mx-auto">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full px-4 py-3 bg-primary-800/50 border border-primary-600/30 rounded-2xl text-primary-100 placeholder-primary-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all scrollbar-none"
                style={{ 
                  minHeight: '48px',
                  maxHeight: '120px',
                  lineHeight: '1.5'
                }}
                rows={1}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim()}
              className={`w-12 h-[50px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                messageText.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-primary-700/50 text-primary-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Container - Between header and input */}
        <div className="absolute top-20 bottom-20 left-0 right-0 overflow-hidden">
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto px-4 py-4 messages-scrollbar flex flex-col"
          >
            {/* Loading indicator for pagination */}
            {selectedConversation && messagePagination[selectedConversation]?.loading && messagePagination[selectedConversation]?.hasPrev && (
              <div className="flex justify-center py-2">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Top ref for infinite scroll */}
            <div ref={messagesTopRef} />
            
            {currentConversationMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-primary-300">No messages yet</p>
                  <p className="text-sm text-primary-400 mt-1">Send a message to start the conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* Spacer to push messages to bottom when there are few messages */}
                <div className="flex-1 min-h-0"></div>
                
                {/* Messages */}
                <div className="space-y-1">
                  {currentConversationMessages.map((message, index) => {
                    // Ensure we're comparing the correct sender ID (handle both string and object)
                    const messageSenderId = typeof message.senderId === 'object' ? (message.senderId as any).id : message.senderId;
                    const isOwn = messageSenderId === state.currentUser?.id;
                    const isPending = (message as any).isPending;
                    const pendingStatus = isPending ? (message as any).status : null;
                    
                    const previousMessage = index > 0 ? currentConversationMessages[index - 1] : null;
                    const nextMessage = index < currentConversationMessages.length - 1 ? currentConversationMessages[index + 1] : null;
                    
                    const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
                    const showTimeGroup = shouldShowTimeGroup(message, previousMessage);
                    const showAvatar = shouldShowAvatar(message, nextMessage, isOwn);
                    
                    return (
                      <React.Fragment key={message.id}>
                        {/* Date Separator */}
                        {showDateSeparator && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-center my-6"
                          >
                            <div className="bg-primary-800/50 px-3 py-1 rounded-full">
                              <span className="text-xs font-medium text-primary-300">
                                {formatDateSeparator(message.timestamp)}
                              </span>
                            </div>
                          </motion.div>
                        )}
                        
                        {/* Time Group Separator */}
                        {showTimeGroup && !showDateSeparator && (
                          <div className="h-4"></div>
                        )}
                        
                        {/* Message */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${
                            showTimeGroup ? 'mt-2' : 'mt-0.5'
                          }`}
                        >
                          <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className="w-8 h-8 flex-shrink-0">
                              {showAvatar && !isOwn && (
                                <div className="w-8 h-8 bg-primary-800/50 rounded-full flex items-center justify-center">
                                  {selectedConversationUser.avatar ? (
                                    <img
                                      src={selectedConversationUser.avatar}
                                      alt={selectedConversationUser.username}
                                      className="w-full h-full object-cover rounded-full"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-primary-300" />
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Message Bubble */}
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isOwn
                                  ? `bg-blue-600 text-white ${isPending && pendingStatus === 'sending' ? 'opacity-70' : ''} ${isPending && pendingStatus === 'failed' ? 'bg-red-600' : ''}`
                                  : 'bg-primary-700/50 text-primary-100'
                              } ${
                                // Adjust border radius for grouped messages
                                !showTimeGroup && !isOwn && !showAvatar ? 'rounded-tl-md' : ''
                              } ${
                                !showTimeGroup && isOwn ? 'rounded-tr-md' : ''
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              
                              {/* Message metadata - only show on last message in time group */}
                              {(showAvatar || index === currentConversationMessages.length - 1 || 
                                (nextMessage && shouldShowTimeGroup(nextMessage, message))) && (
                                <div className={`flex items-center justify-end mt-1 space-x-1 ${
                                  isOwn ? 'text-blue-200' : 'text-primary-400'
                                }`}>
                                  <span className="text-xs">
                                    {formatMessageTime(message.timestamp)}
                                  </span>
                                  {isOwn && (
                                    <div className="flex items-center">
                                      {isPending ? (
                                        pendingStatus === 'sending' ? (
                                          <Clock className="w-3 h-3 animate-spin" />
                                        ) : pendingStatus === 'failed' ? (
                                          <span className="text-xs text-red-200">Failed</span>
                                        ) : (
                                          <Check className="w-3 h-3" />
                                        )
                                      ) : message.read ? (
                                        <CheckCheck className="w-3 h-3" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Typing Indicator */}
                  {typingUsersInConversation.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-end space-x-2"
                    >
                      <div className="w-8 h-8 bg-primary-800/50 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-primary-300" />
                      </div>
                      <div className="bg-primary-700/50 px-4 py-2 rounded-2xl">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Function to load messages for a specific conversation with pagination
  const loadConversationMessages = async (conversationId: string, page: number = 1, isLoadingMore: boolean = false) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    // Get other user ID
    let otherUserId: string;
    if ((conversation as any).otherUser) {
      otherUserId = (conversation as any).otherUser.id;
    } else {
      otherUserId = conversation.participants.find(p => p !== state.currentUser?.id) || '';
    }

    if (!otherUserId) return;

    // Set loading state
    setMessagePagination(prev => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        loading: true
      }
    }));

    try {
      console.log(`📨 Loading messages for conversation ${conversationId}, page ${page}`);
      const response = await ApiService.getConversationMessages(otherUserId, page, 20);
      
      const newMessages = response.messages.map(msg => ({
        ...msg,
        id: msg.id || (msg as any)._id
      }));

      if (isLoadingMore) {
        // Prepend older messages (they come in reverse chronological order from API)
        setPaginatedMessages(prev => ({
          ...prev,
          [conversationId]: [...newMessages, ...(prev[conversationId] || [])]
        }));
      } else {
        // Initial load - replace messages
        setPaginatedMessages(prev => ({
          ...prev,
          [conversationId]: newMessages
        }));
      }

      // Update pagination info
      setMessagePagination(prev => ({
        ...prev,
        [conversationId]: {
          current: response.pagination.current,
          pages: response.pagination.pages,
          total: response.pagination.total,
          hasNext: response.pagination.hasNext,
          hasPrev: response.pagination.hasPrev,
          loading: false,
          initialLoaded: true
        }
      }));

      console.log(`✅ Loaded ${newMessages.length} messages for conversation ${conversationId}`);
      
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      
      // Fallback to using state.messages if API fails
      const fallbackMessages = state.messages
        .filter(msg => {
          const messageSenderId = typeof msg.senderId === 'object' ? (msg.senderId as any).id : msg.senderId;
          const messageReceiverId = typeof msg.receiverId === 'object' ? (msg.receiverId as any).id : msg.receiverId;
          
          return (
            (messageSenderId === state.currentUser?.id && messageReceiverId === otherUserId) ||
            (messageSenderId === otherUserId && messageReceiverId === state.currentUser?.id)
          );
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setPaginatedMessages(prev => ({
        ...prev,
        [conversationId]: fallbackMessages
      }));

      setMessagePagination(prev => ({
        ...prev,
        [conversationId]: {
          current: 1,
          pages: 1,
          total: fallbackMessages.length,
          hasNext: false,
          hasPrev: false,
          loading: false,
          initialLoaded: true
        }
      }));
    }
  };

  // Function to load more messages when scrolling up
  const loadMoreMessages = async (conversationId: string) => {
    const pagination = messagePagination[conversationId];
    if (!pagination || pagination.loading || !pagination.hasPrev) return;

    const nextPage = pagination.current + 1;
    await loadConversationMessages(conversationId, nextPage, true);
  };

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // Load more messages when scrolled near the top
    if (scrollTop < 100 && selectedConversation) {
      loadMoreMessages(selectedConversation);
    }
  };

  // Auto-scroll to bottom when new messages arrive (but preserve scroll position when loading more)
  const scrollToBottom = (force: boolean = false) => {
    if (messagesEndRef.current) {
      const container = messagesContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      // Only auto-scroll if user is near bottom or it's forced
      if (force || isNearBottom) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    }
  };

  // Preserve scroll position when loading more messages
  const preserveScrollPosition = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - lastScrollHeight.current;
      
      if (heightDifference > 0) {
        container.scrollTop += heightDifference;
      }
      
      lastScrollHeight.current = newScrollHeight;
    }
  };

  // Check if conversations are ready to display (have user data)
  const conversationsReady = useMemo(() => {
    if (!conversations.length) return true; // No conversations to show
    
    // Check if all conversations have user data
    return conversations.every(conversation => {
      // API conversations have embedded otherUser data
      if ((conversation as any).otherUser) return true;
      
      // Fallback conversations need user data in state
      const otherUserId = conversation.participants.find(p => p !== state.currentUser?.id);
      return otherUserId && state.users.find(u => u.id === otherUserId);
    });
  }, [conversations, state.users, state.currentUser?.id]);

  // Enhanced user lookup with better error handling
  const getUserForConversation = useCallback((conversation: any) => {
    // For API conversations, use embedded otherUser data
    if ((conversation as any).otherUser) {
      return (conversation as any).otherUser;
    }
    
    // For fallback conversations, find in state.users
    const otherUserId = conversation.participants.find(p => p !== state.currentUser?.id);
    if (!otherUserId) return null;
    
    const user = state.users.find(u => u.id === otherUserId);
    if (!user) {
      console.warn('⚠️ User not found for conversation:', { conversationId: conversation.id, otherUserId });
      return null;
    }
    
    return user;
  }, [state.users, state.currentUser?.id]);

  return (
    <div className="h-full flex">
      {/* Mobile: Show either conversations list or chat */}
      <div className="lg:hidden w-full h-full">
        {selectedConversation ? renderChatInterface() : renderConversationsList()}
      </div>
      
      {/* Desktop: Show both side by side */}
      <div className="hidden lg:flex w-full h-full">
        {renderConversationsList()}
        {renderChatInterface()}
      </div>
    </div>
  );
}
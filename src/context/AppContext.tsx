import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback, useRef, useState, ReactNode } from 'react';
import { AppState, User, Vehicle, Listing, Auction, Trade, Message, Conversation, Review, NavigationTab, Notification } from '../types/index.ts';
import { AuthService } from '../services/authService.ts';
import { DataService } from '../services/dataService.ts';
import ApiService from '../services/apiService.ts';
import webSocketService from '../services/webSocketService.ts';
import { compressImage } from '../utils/imageUtils';

// Helper to ensure listing data structure is consistent
const normalizeListing = (listing: any): Listing => {
  const normalized = {
    ...listing,
    id: listing._id || listing.id,
    vehicle: typeof listing.vehicleId === 'object' && listing.vehicleId !== null 
      ? { ...(listing.vehicleId as any), id: (listing.vehicleId as any)._id || (listing.vehicleId as any).id } 
      : listing.vehicle,
    seller: typeof listing.sellerId === 'object' && listing.sellerId !== null 
      ? { ...(listing.sellerId as any), id: (listing.sellerId as any)._id || (listing.sellerId as any).id } 
      : listing.seller,
    vehicleId: typeof listing.vehicleId === 'object' && listing.vehicleId !== null 
      ? (listing.vehicleId as any)._id || (listing.vehicleId as any).id 
      : listing.vehicleId,
    sellerId: typeof listing.sellerId === 'object' && listing.sellerId !== null 
      ? (listing.sellerId as any)._id || (listing.sellerId as any).id 
      : listing.sellerId,
  };
  return normalized as Listing;
};

// Helper to normalize trade data
const normalizeTrade = (trade: any): Trade => {
  return {
    ...trade,
    id: trade._id || trade.id,
    offererUserId: typeof trade.offererUserId === 'object' ? trade.offererUserId._id : trade.offererUserId,
    receiverUserId: typeof trade.receiverUserId === 'object' ? trade.receiverUserId._id : trade.receiverUserId,
    listingId: typeof trade.listingId === 'object' ? trade.listingId._id : trade.listingId,
  };
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
  addVehicle: (vehicle: {
    make: string;
    model: string;
    year: number;
    vin: string;
    mileage: number;
    transmission: 'manual' | 'automatic';
    estimatedValue: number;
    customPrice?: number;
    images?: string[];
  }) => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  getUserVehicles: (userId: string) => Promise<Vehicle[]>;
  getVehiclesCount: () => Promise<number>;
  addListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'lastRenewed' | 'canRenewAfter'>) => Promise<void>;
  updateListing: (listing: Listing) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  renewListing: (listingId: string) => Promise<void>;
  incrementListingViews: (listingId: string) => Promise<void>;
  loadAllListings: (forceRefresh?: boolean) => Promise<void>;
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => Promise<void>;
  submitReview: (review: Omit<Review, 'id' | 'createdAt'>) => Promise<void>;
  getUserProfile: (userId: string) => User | null;
  sendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  markMessagesAsRead: (conversationId: string) => Promise<void>;
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTrade: (tradeOrId: Trade | string, tradeData?: Partial<Trade>) => Promise<void>;
  deleteTrade: (tradeId: string) => Promise<void>;
  reloadTrades: () => Promise<void>;
  cleanupCorruptedTrades: () => Promise<{ message: string; deletedCount: number; deletedTradeIds: string[] }>;
  cleanupVehicleFlags: () => Promise<{ message: string; cleanedCount: number }>;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  activeConversation: string | null;
  setActiveConversation: (conversationId: string | null) => void;
  loadUserMessages: () => Promise<void>;
  loadMessagesOnTabSwitch: () => Promise<void>;
  loadGarageData: () => Promise<void>;
  loadTradesData: () => Promise<void>;
  loadListingsData: () => Promise<void>;
  checkForNewMessages: () => Promise<void>;
  // Trade helper functions
  isVehicleInPendingTrade: (vehicleId: string) => boolean;
  getVehicleTradeStatus: (vehicleId: string) => { inTrade: boolean; tradeId?: string; tradeStatus?: string };
  // Notification functions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
  showMessageNotification: (message: Message, sender: User) => void;
  showTradeNotification: (trade: Trade, otherUser: User) => void;
  searchUsers: (query: string) => Promise<void>;
  loadUserReviews: (userId: string) => Promise<void>;
  getExistingReview: (targetUserId: string) => Promise<Review | null>;
}

type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_VEHICLES'; payload: Vehicle[] }
  | { type: 'ADD_VEHICLE'; payload: Vehicle }
  | { type: 'UPDATE_VEHICLE'; payload: Vehicle }
  | { type: 'DELETE_VEHICLE'; payload: string }
  | { type: 'SET_LISTINGS'; payload: Listing[] }
  | { type: 'SET_ALL_LISTINGS'; payload: Listing[] }
  | { type: 'ADD_LISTING'; payload: Listing }
  | { type: 'UPDATE_LISTING'; payload: Listing }
  | { type: 'DELETE_LISTING'; payload: string }
  | { type: 'SET_TRADES'; payload: Trade[] }
  | { type: 'ADD_TRADE'; payload: Trade }
  | { type: 'UPDATE_TRADE'; payload: Trade }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_CONVERSATION'; payload: { conversationId: string; lastMessage: Message; updatedAt: string } }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'SET_REVIEWS'; payload: Review[] }
  | { type: 'ADD_REVIEWS'; payload: Review[] }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_ACTIVE_TAB'; payload: NavigationTab }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' }
  | { type: 'UPDATE_USER_STATE'; payload: User }
  | { type: 'ADD_REVIEWS'; payload: Review[] };

const initialState: AppState = {
  currentUser: null,
  vehicles: [],
  listings: [],
  allListings: [],
  auctions: [],
  trades: [],
  messages: [],
  conversations: [],
  reviews: [],
  sales: [],
  users: [],
  isAuthenticated: false,
  loading: false,
  error: null,
  notifications: [],
  activeTab: 'garage', // Default tab
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: action.payload !== null,
      };
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: true,
      };
    case 'LOGOUT':
      return {
        ...initialState, // Reset to initial state
        isAuthenticated: false,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_VEHICLES':
      return { ...state, vehicles: action.payload };
    case 'ADD_VEHICLE':
      return { ...state, vehicles: [...state.vehicles, action.payload] };
    case 'UPDATE_VEHICLE':
      return {
        ...state,
        vehicles: state.vehicles.map(v => v.id === action.payload.id ? action.payload : v),
      };
    case 'DELETE_VEHICLE':
      return {
        ...state,
        vehicles: state.vehicles.filter(v => v.id !== action.payload),
      };
    case 'SET_LISTINGS':
      return { ...state, listings: action.payload };
    case 'ADD_LISTING':
      return { 
        ...state, 
        listings: [...state.listings, action.payload],
        allListings: [...state.allListings, action.payload] // Also update allListings
      };
    case 'UPDATE_LISTING':
      return {
        ...state,
        listings: state.listings.map(l => l.id === action.payload.id ? action.payload : l),
      };
    case 'DELETE_LISTING':
      return {
        ...state,
        listings: state.listings.filter(l => l.id !== action.payload),
      };
    case 'SET_TRADES':
      return { ...state, trades: action.payload };
    case 'ADD_TRADE':
      return { ...state, trades: [...state.trades, action.payload] };
    case 'UPDATE_TRADE':
      return {
        ...state,
        trades: state.trades.map(t => t.id === action.payload.id ? action.payload : t),
      };
    case 'SET_MESSAGES':
      // 🚫 PREVENT DUPLICATES: Handle both full replacement and smart merging
      const incomingMessages = action.payload;
      
      // If we have no existing messages, just set them
      if (state.messages.length === 0) {
        console.log('📨 SET_MESSAGES: Setting initial messages:', incomingMessages.length);
        return { ...state, messages: incomingMessages };
      }
      
      // If incoming messages are already processed (from markMessagesAsRead), replace them
      if (incomingMessages.length === state.messages.length) {
        console.log('📨 SET_MESSAGES: Replacing messages (likely from markMessagesAsRead)');
        return { ...state, messages: incomingMessages };
      }
      
      // Otherwise, merge to prevent duplicates
      const existingMessageIds = new Set(state.messages.map(msg => msg.id));
      const newUniqueMessages = incomingMessages.filter(msg => !existingMessageIds.has(msg.id));
      const allUniqueMessages = [...state.messages, ...newUniqueMessages];
      
      console.log('📨 SET_MESSAGES: Merging messages without duplicates:', {
        existing: state.messages.length,
        incoming: incomingMessages.length,
        newUnique: newUniqueMessages.length,
        total: allUniqueMessages.length
      });
      
      return { ...state, messages: allUniqueMessages };
    case 'ADD_MESSAGE':
      const newMessage = action.payload;
      
      // 🚫 PREVENT DUPLICATES: Check if message already exists
      const messageExists = state.messages.some(msg => msg.id === newMessage.id);
      if (messageExists) {
        console.log('⚠️ Preventing duplicate message:', newMessage.id);
        return state;
      }
      
      const updatedMessages = [...state.messages, newMessage];
      
      // Update or create conversation for this message
      const senderId = typeof newMessage.senderId === 'object' ? (newMessage.senderId as any).id : newMessage.senderId;
      const receiverId = typeof newMessage.receiverId === 'object' ? (newMessage.receiverId as any).id : newMessage.receiverId;
      const conversationId = [senderId, receiverId].sort().join('-');
      
      // Find existing conversation
      const existingConversationIndex = state.conversations.findIndex(c => c.id === conversationId);
      let updatedConversations;
      
      if (existingConversationIndex !== -1) {
        // Update existing conversation
        updatedConversations = state.conversations.map(c =>
          c.id === conversationId ? {
            ...c,
            lastMessage: newMessage,
            updatedAt: new Date().toISOString(),
            // 📨 SMART UNREAD: Only increment if current user is receiver AND message is actually new
            unreadCount: (receiverId === state.currentUser?.id && !newMessage.read) ? c.unreadCount + 1 : c.unreadCount
          } : c
        );
      } else {
        // Create new conversation
        const newConversation: Conversation = {
          id: conversationId,
          participants: [senderId, receiverId],
          lastMessage: newMessage,
          unreadCount: (receiverId === state.currentUser?.id && !newMessage.read) ? 1 : 0,
          updatedAt: new Date().toISOString(),
        };
        updatedConversations = [...state.conversations, newConversation];
        
        // Set flag to indicate this is a new conversation for notification purposes
        (newMessage as any).isNewConversation = true;
      }
      
      // 🚨 CRITICAL FIX: Preserve conversations that might have been created from fallback logic
      // If we have messages but only one conversation, we need to recreate other conversations from messages
      if (state.messages.length > 0 && updatedConversations.length === 1 && state.currentUser) {
        console.log('🔄 Recreating conversations from messages to preserve other chats');
        const convMap = new Map<string, Conversation>();
        
        // Add the existing conversation to the map
        updatedConversations.forEach(conv => {
          convMap.set(conv.id, conv);
        });
        
        // Create conversations from all messages
        state.messages.forEach(message => {
          const messageSenderId = typeof message.senderId === 'object' 
            ? (message.senderId as any).id 
            : message.senderId;
          const messageReceiverId = typeof message.receiverId === 'object' 
            ? (message.receiverId as any).id 
            : message.receiverId;
            
          const otherUserId = messageSenderId === state.currentUser?.id 
            ? messageReceiverId 
            : messageSenderId;
          
          const msgConversationId = [state.currentUser?.id, otherUserId].sort().join('-');
          
          if (!convMap.has(msgConversationId)) {
            convMap.set(msgConversationId, {
              id: msgConversationId,
              participants: [state.currentUser?.id!, otherUserId],
              lastMessage: message,
              unreadCount: 0,
              updatedAt: message.timestamp
            });
          } else {
            const existing = convMap.get(msgConversationId)!;
            if (new Date(message.timestamp) > new Date(existing.lastMessage.timestamp)) {
              existing.lastMessage = message;
              existing.updatedAt = message.timestamp;
            }
          }
        });
        
        // Calculate unread counts
        convMap.forEach(conversation => {
          const unreadMessages = state.messages.filter(msg => {
            const msgSenderId = typeof msg.senderId === 'object' 
              ? (msg.senderId as any).id 
              : msg.senderId;
            const msgReceiverId = typeof msg.receiverId === 'object' 
              ? (msg.receiverId as any).id 
              : msg.receiverId;
              
            return msgReceiverId === state.currentUser?.id &&
                   !msg.read &&
                   (msgSenderId === conversation.participants[0] || msgSenderId === conversation.participants[1]);
          });
          conversation.unreadCount = unreadMessages.length;
        });
        
        updatedConversations = Array.from(convMap.values());
      }
      
      // Sort conversations by most recent activity
      updatedConversations.sort((a, b) => 
        new Date(b.updatedAt || b.lastMessage?.timestamp || 0).getTime() - 
        new Date(a.updatedAt || a.lastMessage?.timestamp || 0).getTime()
      );
      
      console.log('📨 ADD_MESSAGE: Added new message without duplicates:', {
        messageId: newMessage.id,
        conversationId,
        conversationsCount: updatedConversations.length,
        isReceiver: receiverId === state.currentUser?.id,
        messageRead: newMessage.read,
        preservedOtherConversations: updatedConversations.length > 1
      });
      
      return { 
        ...state, 
        messages: updatedMessages,
        conversations: updatedConversations
      };
    case 'UPDATE_CONVERSATION':
      const { conversationId: updateConversationId, lastMessage, updatedAt } = action.payload;
      const existingUpdateConversationIndex = state.conversations.findIndex(c => c.id === updateConversationId);
      
      let updatedUpdateConversations;
      if (existingUpdateConversationIndex !== -1) {
        // Update existing conversation
        updatedUpdateConversations = state.conversations.map(c =>
          c.id === updateConversationId ? {
            ...c,
            lastMessage,
            updatedAt,
          } : c
        );
      } else {
        // Create new conversation if it doesn't exist
        const senderId = typeof lastMessage.senderId === 'object' ? (lastMessage.senderId as any).id : lastMessage.senderId;
        const receiverId = typeof lastMessage.receiverId === 'object' ? (lastMessage.receiverId as any).id : lastMessage.receiverId;
        
        const newConversation: Conversation = {
          id: updateConversationId,
          participants: [senderId, receiverId],
          lastMessage,
          unreadCount: 0,
          updatedAt,
        };
        
        updatedUpdateConversations = [...state.conversations, newConversation];
      }
      
      // Sort conversations by most recent activity
      updatedUpdateConversations.sort((a, b) => 
        new Date(b.updatedAt || b.lastMessage?.timestamp || 0).getTime() - 
        new Date(a.updatedAt || a.lastMessage?.timestamp || 0).getTime()
      );
      
      return {
        ...state,
        conversations: updatedUpdateConversations,
      };
    case 'SET_CONVERSATIONS':
      console.log('📞 Setting conversations in state:', action.payload.length, 'conversations');
      console.log('📞 Sample conversations:', action.payload.slice(0, 2).map(c => ({
        id: c.id,
        participants: c.participants,
        otherUser: (c as any).otherUser ? {
          id: (c as any).otherUser.id,
          username: (c as any).otherUser.username
        } : null
      })));
      return { ...state, conversations: action.payload };
    case 'SET_REVIEWS':
      return { ...state, reviews: action.payload };
    case 'ADD_REVIEWS':
      // Add new reviews to state, replacing any existing ones for the same review ID to avoid duplicates.
      const existingReviewIds = new Set(state.reviews.map(r => r.id));
      const newReviews = action.payload.filter(r => !existingReviewIds.has(r.id));
      return {
        ...state,
        reviews: [...state.reviews, ...newReviews]
      };
    case 'SET_USERS':
      console.log('Dispatching SET_USERS, received:', action.payload.length, 'users. Current state has:', state.users.length);
      return { ...state, users: action.payload };
    case 'SET_ALL_LISTINGS':
      console.log('🔄 SET_ALL_LISTINGS reducer - current count:', state.allListings.length, 'new count:', action.payload.length);
      return {
        ...state,
        allListings: action.payload
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      };
      
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
      
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => 
          n.id === action.payload ? { ...n, read: true } : n
        )
      };
      
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: []
      };
    case 'UPDATE_USER_STATE':
      return updateUserInStateAndStorage(state, action.payload);
    case 'ADD_REVIEWS':
      return { ...state, reviews: [...state.reviews, ...action.payload] };
    default:
      return state;
  }
}

// Helper function to update user in both state and local storage
const updateUserInStateAndStorage = (state: AppState, user: User): AppState => {
  const updatedUsers = state.users.map(u => u.id === user.id ? user : u);
  
  // Update currentUser if it's the one being changed
  const updatedCurrentUser = state.currentUser?.id === user.id ? user : state.currentUser;

  // IMPORTANT: No longer saving to localStorage to prevent quota errors.
  // The state is the source of truth, refreshed from API on load.
  
  return {
    ...state,
    users: updatedUsers,
    currentUser: updatedCurrentUser
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [activeTab, setActiveTab] = React.useState<NavigationTab>('garage');
  const [activeConversation, setActiveConversation] = React.useState<string | null>(null);
  
  // Add ref to track current active conversation
  const activeConversationRef = useRef<string | null>(null);
  
  // Update ref when activeConversation changes
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const [listingsCache, setListingsCache] = useState<{
    data: any[];
    timestamp: number;
    ttl: number;
  }>({ data: [], timestamp: 0, ttl: 30000 }); // 30 second cache
  
  // Add loading states to prevent duplicate calls
  const [loadingStates, setLoadingStates] = useState({
    userData: false,
    allListings: false,
    allUsers: false,
    messages: false
  });

  // Use a ref to store current state for WebSocket callbacks to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track recent notifications to prevent duplicates
  const recentNotifications = useRef<Set<string>>(new Set());
  
  const addNotificationWithDeduplication = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    // Create a unique key for this notification
    const notificationKey = `${notification.type}-${notification.title}-${notification.message}`;
    
    // Check if we've shown this notification recently (within last 5 seconds)
    if (recentNotifications.current.has(notificationKey)) {
      console.log('🔄 Skipping duplicate notification:', notificationKey);
      return;
    }
    
    // Add to recent notifications
    recentNotifications.current.add(notificationKey);
    
    // Remove from recent notifications after 5 seconds
    setTimeout(() => {
      recentNotifications.current.delete(notificationKey);
    }, 5000);
    
    // Add the actual notification
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? 5000 // default 5 seconds
    };
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
    
    // Auto-remove notification after duration (if not persistent)
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, fullNotification.duration);
    }
  }, []);

  // 🔗 WEBSOCKET INTEGRATION: Setup real-time updates
  useEffect(() => {
    if (state.currentUser && state.isAuthenticated) {
      const token = localStorage.getItem('carTrade_token');
      if (token) {
        console.log('🔗 Connecting to WebSocket for real-time updates...');
        webSocketService.connect(state.currentUser.id, token);

        // Setup WebSocket callbacks for real-time updates
        webSocketService.setCallbacks({
          // 📋 LISTING UPDATES
          onListingAdded: (listing) => {
            console.log('📋 Real-time: New listing added:', listing.title);
            console.log('📋 Listing seller ID:', listing.sellerId, 'Current user ID:', stateRef.current.currentUser?.id);
            console.log('📋 Current allListings count before update:', stateRef.current.allListings.length);
            
            const listingWithId = { ...listing, id: listing._id || listing.id };
            
            // Check if listing already exists to prevent duplicates
            const listingExists = stateRef.current.allListings.some(l => l.id === listingWithId.id);
            if (listingExists) {
              console.log('📋 Listing already exists, skipping duplicate:', listingWithId.id);
              return;
            }
            
            // Always add to all listings, even if empty - use stateRef to get current state
            const updatedAllListings = [...stateRef.current.allListings, listingWithId];
            dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
            console.log('📋 Updated allListings count after update:', updatedAllListings.length);

            // Add to user's own listings if it's theirs - handle both string ID and populated object
            const sellerId = typeof listing.sellerId === 'object' ? listing.sellerId._id || listing.sellerId.id : listing.sellerId;
            console.log('📋 Extracted seller ID:', sellerId, 'vs current user:', stateRef.current.currentUser?.id);
            
            if (sellerId === stateRef.current.currentUser?.id) {
              console.log('📋 Adding to user\'s own listings');
              dispatch({ type: 'ADD_LISTING', payload: listingWithId });
              
              // Update vehicle status to mark as listed
              const vehicleId = typeof listing.vehicleId === 'object' ? listing.vehicleId._id || listing.vehicleId.id : listing.vehicleId;
              const vehicle = stateRef.current.vehicles.find(v => v.id === vehicleId);
              if (vehicle) {
                const updatedVehicle: Vehicle = {
                  ...vehicle,
                  isListed: true,
                  listingId: listingWithId.id,
                  updatedAt: new Date().toISOString(),
                };
                dispatch({ type: 'UPDATE_VEHICLE', payload: updatedVehicle });
                console.log('🚗 Vehicle marked as listed in garage via WebSocket');
              }
            } else {
              console.log('📋 Not adding to user\'s own listings - different seller');
            }
          },

          onListingUpdated: (listingData) => {
            console.log('📋 Real-time: Listing updated:', listingData.title);
            const listing = normalizeListing(listingData);
            
            // Update in all listings - use stateRef to get current state
            const updatedAllListings = stateRef.current.allListings.map(l => 
              l.id === listing.id ? listing : l
            );
            dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });

            // Update in user's own listings if it's theirs - handle both string ID and populated object
            if (listing.sellerId === stateRef.current.currentUser?.id) {
              dispatch({ type: 'UPDATE_LISTING', payload: listing });
              
              // 🚗 ENSURE VEHICLE LISTING STATUS: Make sure vehicle remains marked as listed
              const vehicle = stateRef.current.vehicles.find(v => v.id === listing.vehicleId);
              if (vehicle) {
                const updatedVehicle: Vehicle = {
                  ...vehicle,
                  isListed: true, // Keep it listed since we're just updating
                  listingId: listing.id,
                  updatedAt: new Date().toISOString(),
                };
                dispatch({ type: 'UPDATE_VEHICLE', payload: updatedVehicle });
                console.log('🚗 Vehicle listing status maintained via WebSocket');
              }
            }
          },

          onListingDeleted: (listingId) => {
            console.log('📋 Real-time: Listing deleted:', listingId);
            
            // Remove from all listings - use stateRef to get current state
            const updatedAllListings = stateRef.current.allListings.filter(l => l.id !== listingId);
            dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });

            // Remove from user's own listings
            dispatch({ type: 'DELETE_LISTING', payload: listingId });
          },

          // 🔄 TRADE UPDATES
          onTradeCreated: (tradeData) => {
            const trade = normalizeTrade(tradeData);
            console.log('🔄 Real-time: New trade created:', trade.id);
            
            if (trade.offererUserId === stateRef.current.currentUser?.id || trade.receiverUserId === stateRef.current.currentUser?.id) {
              dispatch({ type: 'ADD_TRADE', payload: trade });

              if (trade.receiverUserId === stateRef.current.currentUser?.id) {
                const offerer = stateRef.current.users.find(u => u.id === trade.offererUserId);
                if (offerer) {
                  showTradeNotification(trade, offerer);
                }
              }
            }
          },

          onTradeUpdated: (tradeData) => {
            const trade = normalizeTrade(tradeData);
            console.log('🔄 Real-time: Trade updated:', trade.id);
            
            if (trade.offererUserId === stateRef.current.currentUser?.id || trade.receiverUserId === stateRef.current.currentUser?.id) {
              dispatch({ type: 'UPDATE_TRADE', payload: trade });
              
              const otherUserId = trade.offererUserId === stateRef.current.currentUser?.id ? trade.receiverUserId : trade.offererUserId;
              const otherUser = stateRef.current.users.find(u => u.id === otherUserId);

              const previousTrade = stateRef.current.trades.find(t => t.id === trade.id);

              if (previousTrade && previousTrade.status !== trade.status && otherUser) {
                switch (trade.status) {
                  case 'accepted':
                    showSuccess('Trade Accepted!', `Your trade with @${otherUser.username} was accepted.`);
                    break;
                  case 'countered':
                    if (trade.lastCounteredBy !== stateRef.current.currentUser?.id) {
                       showInfo('Trade Countered', `@${otherUser.username} sent a counter offer.`);
                    }
                    break;
                  case 'cancelled':
                  case 'rejected':
                    showError('Trade Declined', `Your trade with @${otherUser.username} was declined.`);
                    break;
                }
              }
            }
          },

          onTradeCompleted: (trade) => {
            console.log('🔄 Real-time: Trade completed:', trade.id);
            const tradeWithId = { ...trade, id: trade._id || trade.id };
            
            // Update trade
            dispatch({ type: 'UPDATE_TRADE', payload: tradeWithId });
            
            // If current user was involved, immediately reload garage to show vehicle ownership changes
            const currentUserId = stateRef.current.currentUser?.id;
            const offererUserId = typeof trade.offererUserId === 'string' ? trade.offererUserId : trade.offererUserId?.id || trade.offererUserId?._id;
            const receiverUserId = typeof trade.receiverUserId === 'string' ? trade.receiverUserId : trade.receiverUserId?.id || trade.receiverUserId?._id;
            
            if (currentUserId && (offererUserId === currentUserId || receiverUserId === currentUserId)) {
              console.log('🚗 Reloading garage after trade completion...');
              
              // Reload user's vehicles immediately to reflect ownership changes
              const reloadVehicles = async () => {
                try {
                  const vehicles = await ApiService.getUserVehicles();
                  const vehiclesWithId = vehicles.map((v: any) => ({ ...v, id: v._id || v.id }));
                  dispatch({ type: 'SET_VEHICLES', payload: vehiclesWithId });
                  console.log('✅ Garage updated with new vehicle ownership from completed trade');
                  
                  // Also reload all listings to remove traded vehicles from marketplace
                  const listingsResponse = await ApiService.getAllListings();
                  const listingsWithId = listingsResponse.listings.map((listing: any) => ({ ...listing, id: listing._id || listing.id }));
                  dispatch({ type: 'SET_ALL_LISTINGS', payload: listingsWithId });
                  console.log('✅ Marketplace updated after trade completion');
                  
                  // Show success notification
                  showSuccess('Trade Completed!', 'Vehicle ownership has been transferred successfully.');
                } catch (error) {
                  console.error('❌ Error reloading data after trade completion:', error);
                  showError('Update Failed', 'Could not refresh your garage after trade completion. Please refresh the page.');
                }
              };
              
              // Small delay to ensure backend processing is complete
              setTimeout(reloadVehicles, 500);
            }
          },

          // 📨 MESSAGE UPDATES
          onMessageReceived: (message) => {
            console.log('📨 Real-time: New message received:', message.content.substring(0, 30));
            const messageWithId = { ...message, id: message._id || message.id };
            
            // Only add if message involves current user
            const senderId = typeof message.senderId === 'object' ? message.senderId.id : message.senderId;
            const receiverId = typeof message.receiverId === 'object' ? message.receiverId.id : message.receiverId;
            
            if (senderId === stateRef.current.currentUser?.id || receiverId === stateRef.current.currentUser?.id) {
              dispatch({ type: 'ADD_MESSAGE', payload: messageWithId });
              
              // Show notification for incoming messages (not sent by current user)
              if (receiverId === stateRef.current.currentUser?.id && senderId !== stateRef.current.currentUser?.id) {
                // Find the sender user
                const senderUser = stateRef.current.users.find(u => u.id === senderId) || 
                  (typeof message.senderId === 'object' ? { 
                    ...message.senderId, 
                    id: message.senderId.id || message.senderId._id 
                  } : null);
                
                if (senderUser) {
                  // Check if user is currently on messages tab
                  const isOnMessagesTab = activeTab === 'messages';
                  
                  // Generate conversation ID to check if user is in this specific conversation
                  const conversationId = [senderId, receiverId].sort().join('-');
                  const isInActiveConversation = activeConversationRef.current === conversationId;
                  
                  // Debug logging to troubleshoot the issue
                  console.log('🔍 NOTIFICATION DEBUG:', {
                    messageFrom: senderUser.username,
                    senderId,
                    receiverId,
                    currentUserId: stateRef.current.currentUser?.id,
                    generatedConversationId: conversationId,
                    activeConversation: activeConversationRef.current,
                    isInActiveConversation,
                    isOnMessagesTab,
                    willShowNotification: !isOnMessagesTab || !isInActiveConversation
                  });
                  
                  // Show notification if:
                  // 1. Not on messages tab, OR
                  // 2. On messages tab but not in this specific conversation
                  if (!isOnMessagesTab || !isInActiveConversation) {
                    console.log('📨 Showing message notification from @' + senderUser.username, {
                      isOnMessagesTab,
                      isInActiveConversation,
                      activeConversation: activeConversationRef.current,
                      conversationId,
                      senderId,
                      receiverId,
                      currentUserId: stateRef.current.currentUser?.id
                    });
                    
                    addNotificationWithDeduplication({
                      type: 'message',
                      title: `New message from @${senderUser.username}`,
                      message: messageWithId.content.length > 50 ? messageWithId.content.substring(0, 50) + '...' : messageWithId.content,
                      duration: 8000,
                      actionLabel: 'View',
                      onAction: () => {
                        setActiveTab('messages');
                      },
                      data: { message: messageWithId, sender: senderUser }
                    });
                  } else {
                    console.log('📨 Not showing notification - user is in active conversation:', {
                      isOnMessagesTab,
                      isInActiveConversation,
                      activeConversation: activeConversationRef.current,
                      conversationId,
                      senderId,
                      receiverId,
                      currentUserId: stateRef.current.currentUser?.id
                    });
                  }
                } else {
                  console.warn('📨 Could not find sender user for notification:', senderId);
                }
              }
            }
          },

          // 🚗 VEHICLE UPDATES
          onVehicleAdded: (vehicle, userId) => {
            console.log('🚗 Real-time: New vehicle added by user:', userId);
            
            // Only update if it's current user's vehicle
            if (userId === stateRef.current.currentUser?.id) {
              const vehicleWithId = { ...vehicle, id: vehicle._id || vehicle.id };
              dispatch({ type: 'ADD_VEHICLE', payload: vehicleWithId });
            }
          },

          onVehicleUpdated: (vehicle, userId) => {
            console.log('🚗 Real-time: Vehicle updated by user:', userId);
            
            // Only update if it's current user's vehicle
            if (userId === stateRef.current.currentUser?.id) {
              const vehicleWithId = { ...vehicle, id: vehicle._id || vehicle.id };
              dispatch({ type: 'UPDATE_VEHICLE', payload: vehicleWithId });
            }
          },

          // 🔗 CONNECTION STATUS
          onConnectionChange: (connected) => {
            console.log(connected ? '✅ WebSocket connected' : '❌ WebSocket disconnected');
            // You could show a connection status indicator in the UI
          },

          // ⌨️ TYPING INDICATORS
          onTypingStart: (userId, conversationId) => {
            console.log('⌨️ User started typing:', userId, 'in conversation:', conversationId);
            // This could be handled by the MessagesView component directly
            // by listening to WebSocket events, but we could also dispatch
            // a state update here if needed
          },

          onTypingStop: (userId, conversationId) => {
            console.log('⌨️ User stopped typing:', userId, 'in conversation:', conversationId);
            // This could be handled by the MessagesView component directly
          }
        });
      }
    }

    // Cleanup WebSocket on logout or unmount
    return () => {
      if (!state.isAuthenticated) {
        webSocketService.disconnect();
      }
    };
  }, [state.currentUser, state.isAuthenticated, activeTab, addNotificationWithDeduplication, setActiveTab]);

  // Disconnect WebSocket on logout
  useEffect(() => {
    if (!state.isAuthenticated) {
      webSocketService.disconnect();
    }
  }, [state.isAuthenticated]);

  useEffect(() => {
    // Initialize app state by checking API authentication
    const initializeAuth = async () => {
      try {
        // Only check if there's a token present
        const token = localStorage.getItem('carTrade_token');
        if (!token) {
          return;
        }

        const authCheck = await ApiService.verifyToken();
        if (authCheck.valid && authCheck.user) {
          const user = { ...authCheck.user, id: (authCheck.user as any)._id || authCheck.user.id };
          dispatch({ type: 'SET_CURRENT_USER', payload: user });
          
          // 🚗 Load garage data immediately since it's the default tab users see
          try {
            console.log('🚗 Loading garage data on startup...');
            const vehicles = await ApiService.getUserVehicles();
            const vehiclesWithId = vehicles.map((v: any) => ({ ...v, id: v._id || v.id }));
            dispatch({ type: 'SET_VEHICLES', payload: vehiclesWithId });
            console.log('✅ Garage data loaded on startup');
          } catch (error) {
            console.error('❌ Error loading garage data on startup:', error);
          }
          
          console.log('✅ Auth verified');
        } else {
          ApiService.logout();
          AuthService.logout();
        }
      } catch (error) {
        // Clear any stale tokens on error
        ApiService.logout();
        AuthService.logout();
        dispatch({ type: 'LOGOUT' });
      }
    };

    initializeAuth();
    // DON'T load all users on startup - load them when needed
  }, []);

  const loadUserData = async (userId: string) => {
    // Prevent duplicate calls
    if (loadingStates.userData) {
      console.log('⏳ User data already loading, skipping duplicate call');
      return;
    }

    setLoadingStates(prev => ({ ...prev, userData: true }));
    
    try {
      const [vehicles, listings, trades] = await Promise.all([
        ApiService.getUserVehicles(),
        ApiService.getUserListings(),
        ApiService.getUserTrades()
      ]);

      console.log('📊 Loaded trades from API:', trades.length);

      // Convert MongoDB _id to id for frontend compatibility
      const vehiclesWithId = vehicles.map((v: any) => ({ ...v, id: v._id || v.id }));
      const listingsWithId = listings.map((l: any) => ({ ...l, id: l._id || l.id }));
      // Extract users from populated trade objects
      const usersFromTrades: any[] = [];
      const userIds = new Set<string>();
      
      const tradesWithId = trades.map((t: any) => {
        const trade = { ...t, id: t._id || t.id };
        
        // Handle populated vehicle arrays - preserve vehicle data for display
        // but also create ID arrays for consistency
        if (trade.offererVehicleIds && Array.isArray(trade.offererVehicleIds)) {
          // Store the populated vehicle objects for later reference
          trade.offererVehicleObjects = trade.offererVehicleIds.filter((v: any) => 
            typeof v === 'object' && v.make
          ).map((v: any) => ({ ...v, id: v._id || v.id }));
          
          // Convert to IDs for consistency
          trade.offererVehicleIds = trade.offererVehicleIds.map((v: any) => 
            typeof v === 'object' ? (v._id || v.id) : v
          );
        }
        
        if (trade.receiverVehicleIds && Array.isArray(trade.receiverVehicleIds)) {
          // Store the populated vehicle objects for later reference
          trade.receiverVehicleObjects = trade.receiverVehicleIds.filter((v: any) => 
            typeof v === 'object' && v.make
          ).map((v: any) => ({ ...v, id: v._id || v.id }));
          
          // Convert to IDs for consistency
          trade.receiverVehicleIds = trade.receiverVehicleIds.map((v: any) => 
            typeof v === 'object' ? (v._id || v.id) : v
          );
        }
        
        // Handle populated user objects - extract user data before converting to IDs
        if (trade.offererUserId && typeof trade.offererUserId === 'object') {
          const offererUser = { ...trade.offererUserId, id: trade.offererUserId._id || trade.offererUserId.id };
          usersFromTrades.push(offererUser);
          userIds.add(offererUser.id);
          trade.offererUserId = offererUser.id;
        } else if (typeof trade.offererUserId === 'string') {
          userIds.add(trade.offererUserId);
        }
        
        if (trade.receiverUserId && typeof trade.receiverUserId === 'object') {
          const receiverUser = { ...trade.receiverUserId, id: trade.receiverUserId._id || trade.receiverUserId.id };
          usersFromTrades.push(receiverUser);
          userIds.add(receiverUser.id);
          trade.receiverUserId = receiverUser.id;
        } else if (typeof trade.receiverUserId === 'string') {
          userIds.add(trade.receiverUserId);
        }
        
        // Handle populated listing object
        if (trade.listingId && typeof trade.listingId === 'object') {
          trade.listingId = trade.listingId._id || trade.listingId.id;
        }
        
        return trade;
      });

      dispatch({ type: 'SET_VEHICLES', payload: vehiclesWithId });
      dispatch({ type: 'SET_LISTINGS', payload: listingsWithId });
      dispatch({ type: 'SET_TRADES', payload: tradesWithId });
      
      console.log('👥 Extracted users from initial trades:', usersFromTrades.map(u => ({ id: u.id, username: u.username })));
      
      // Add extracted users to state
      let allUsers = [...state.users];
      usersFromTrades.forEach(user => {
        if (!allUsers.find(u => u.id === user.id)) {
          allUsers.push(user);
        }
      });
      
      // Find users that still need to be fetched
      const missingUserIds = Array.from(userIds).filter(id => 
        !allUsers.find(u => u.id === id)
      );
      
      if (missingUserIds.length > 0) {
        try {
          console.log('🔍 Loading missing initial trade users via batch API...');
          const users = await ApiService.getUsersBatch(missingUserIds);
          console.log('✅ Loaded missing initial trade users:', users.map(u => ({ id: u.id, username: u.username })));
          
          // Add fetched users to existing users
          users.forEach(user => {
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push(user);
            }
          });
        } catch (error) {
          console.error('❌ Error loading missing initial trade users:', error);
        }
      }
      
      dispatch({ type: 'SET_USERS', payload: allUsers });
      
      // Load messages and associated users separately
      await loadUserMessages();
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, userData: false }));
    }
  };

  // Add a function to force reload trades specifically
  const reloadTrades = async () => {
    try {
      console.log('🔄 Force reloading trades...');
      const trades = await ApiService.getUserTrades();
      console.log('📊 Reloaded trades from API:', trades.length);
      
      // Extract users from populated trade objects
      const usersFromTrades: any[] = [];
      const userIds = new Set<string>();
      
      const tradesWithId = trades.map((t: any) => {
        const trade = { ...t, id: t._id || t.id };
        
        // Handle populated vehicle arrays - preserve vehicle data for display
        // but also create ID arrays for consistency
        if (trade.offererVehicleIds && Array.isArray(trade.offererVehicleIds)) {
          // Store the populated vehicle objects for later reference
          trade.offererVehicleObjects = trade.offererVehicleIds.filter((v: any) => 
            typeof v === 'object' && v.make
          ).map((v: any) => ({ ...v, id: v._id || v.id }));
          
          // Convert to IDs for consistency
          trade.offererVehicleIds = trade.offererVehicleIds.map((v: any) => 
            typeof v === 'object' ? (v._id || v.id) : v
          );
        }
        
        if (trade.receiverVehicleIds && Array.isArray(trade.receiverVehicleIds)) {
          // Store the populated vehicle objects for later reference
          trade.receiverVehicleObjects = trade.receiverVehicleIds.filter((v: any) => 
            typeof v === 'object' && v.make
          ).map((v: any) => ({ ...v, id: v._id || v.id }));
          
          // Convert to IDs for consistency
          trade.receiverVehicleIds = trade.receiverVehicleIds.map((v: any) => 
            typeof v === 'object' ? (v._id || v.id) : v
          );
        }
        
        // Handle populated user objects - extract user data before converting to IDs
        if (trade.offererUserId && typeof trade.offererUserId === 'object') {
          const offererUser = { ...trade.offererUserId, id: trade.offererUserId._id || trade.offererUserId.id };
          usersFromTrades.push(offererUser);
          userIds.add(offererUser.id);
          trade.offererUserId = offererUser.id;
        } else if (typeof trade.offererUserId === 'string') {
          userIds.add(trade.offererUserId);
        }
        
        if (trade.receiverUserId && typeof trade.receiverUserId === 'object') {
          const receiverUser = { ...trade.receiverUserId, id: trade.receiverUserId._id || trade.receiverUserId.id };
          usersFromTrades.push(receiverUser);
          userIds.add(receiverUser.id);
          trade.receiverUserId = receiverUser.id;
        } else if (typeof trade.receiverUserId === 'string') {
          userIds.add(trade.receiverUserId);
        }
        
        // Handle populated listing object
        if (trade.listingId && typeof trade.listingId === 'object') {
          trade.listingId = trade.listingId._id || trade.listingId.id;
        }
        
        return trade;
      });
      
      console.log('👥 Extracted users from trades:', usersFromTrades.map(u => ({ id: u.id, username: u.username })));
      console.log('👥 All user IDs needed for trades:', Array.from(userIds));
      
      // Update trades first
      dispatch({ type: 'SET_TRADES', payload: tradesWithId });
      
      // Add extracted users to state
      let allUsers = [...state.users];
      usersFromTrades.forEach(user => {
        if (!allUsers.find(u => u.id === user.id)) {
          allUsers.push(user);
        }
      });
      
      // Find users that still need to be fetched
      const missingUserIds = Array.from(userIds).filter(id => 
        !allUsers.find(u => u.id === id)
      );
      
      console.log('❓ Missing user IDs after adding populated users:', missingUserIds);
      
      if (missingUserIds.length > 0) {
        try {
          console.log('🔍 Loading missing trade users via batch API...');
          const users = await ApiService.getUsersBatch(missingUserIds);
          console.log('✅ Loaded missing trade users:', users.map(u => ({ id: u.id, username: u.username })));
          
          // Add fetched users to existing users
          users.forEach(user => {
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push(user);
            }
          });
        } catch (error) {
          console.error('❌ Error loading missing trade users:', error);
        }
      }
      
      console.log('👥 Final users state after trade reload:', allUsers.map(u => ({ id: u.id, username: u.username })));
      dispatch({ type: 'SET_USERS', payload: allUsers });
      
    } catch (error) {
      console.error('Error reloading trades:', error);
    }
  };

  const loadAllUsers = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const users = await ApiService.getAllUsers();
      const normalizedUsers = users.map((user: any) => ({
        ...user,
        id: user._id,
      }));
      dispatch({ type: 'SET_USERS', payload: normalizedUsers });
    } catch (error) {
      console.error("Failed to load users:", error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load users.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  // Lazy load specific users when needed
  const loadUsersIfNeeded = useCallback(async (userIds: string[]) => {
    const missingUserIds = userIds.filter(id => !state.users.find(u => u.id === id));
    
    if (missingUserIds.length === 0) {
      return; // All users already loaded
    }

    // Prevent duplicate calls
    if (loadingStates.allUsers) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, allUsers: true }));

    try {
      // Use efficient batch endpoint for specific users
      const users = await ApiService.getUsersBatch(missingUserIds);
      const usersWithId = users.map((u: any) => ({ 
        ...u, 
        id: u._id || u.id 
      }));
      
      // Merge with existing users
      const updatedUsers = [...state.users, ...usersWithId];
      dispatch({ type: 'SET_USERS', payload: updatedUsers });
    } catch (error) {
      console.error('Error loading users batch:', error);
      // Fallback to loading all users if batch fails
      if (state.users.length === 0) {
        await loadAllUsers();
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, allUsers: false }));
    }
  }, [state.users, loadingStates.allUsers]);

  // Memoize callback functions to prevent unnecessary re-renders
  const loadAllListings = useCallback(async (forceRefresh: boolean = false) => {
    // Prevent duplicate calls
    if (loadingStates.allListings && !forceRefresh) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, allListings: true }));

    try {
      // Check cache first (unless force refresh)
      const now = Date.now();
      if (!forceRefresh && listingsCache.data.length > 0 && (now - listingsCache.timestamp) < listingsCache.ttl) {
        dispatch({ type: 'SET_ALL_LISTINGS', payload: listingsCache.data });
        return;
      }

      // Load all public listings from the API
      const response = await ApiService.getAllListings();
      
      // Optimize data processing - avoid complex operations in map
      const listingsWithId = response.listings.map((l: any) => {
        // Simple ID conversion only
        const listing = {
          ...l, 
          id: l._id || l.id,
          vehicleId: l.vehicleId,
          sellerId: l.sellerId,
        };
        
        // Add populated data if it exists from backend aggregation
        if (l.vehicle && typeof l.vehicle === 'object' && l.vehicle._id) {
          listing.vehicle = { 
            ...l.vehicle, 
            id: l.vehicle._id || l.vehicle.id 
          };
        }
        
        if (l.seller && typeof l.seller === 'object' && l.seller._id) {
          listing.seller = { 
            ...l.seller, 
            id: l.seller._id || l.seller.id 
          };
        }
        
        return listing;
      });
      
      // Extract unique seller IDs that need to be loaded
      const sellerIds = [...new Set(listingsWithId.map(l => l.sellerId))];
      
      // Only load users if we don't have them yet
      await loadUsersIfNeeded(sellerIds);
      
      // Update cache
      setListingsCache({
        data: listingsWithId,
        timestamp: now,
        ttl: 30000
      });
      
      // Update state with new listings
      dispatch({ type: 'SET_ALL_LISTINGS', payload: listingsWithId });

      // Update vehicle listing status for current user's vehicles
      const userListings = listingsWithId.filter(l => l.sellerId === state.currentUser?.id);
      userListings.forEach(listing => {
        const vehicle = state.vehicles.find(v => v.id === listing.vehicleId);
        if (vehicle && (!vehicle.isListed || vehicle.listingId !== listing.id)) {
          const updatedVehicle: Vehicle = {
            ...vehicle,
            isListed: true,
            listingId: listing.id,
            updatedAt: new Date().toISOString(),
          };
          dispatch({ type: 'UPDATE_VEHICLE', payload: updatedVehicle });
          console.log('🚗 Vehicle listing status synced:', vehicle.id);
        }
      });
      
    } catch (error) {
      console.error('Error loading all listings:', error);
      // Fallback to empty array if API fails
      dispatch({ type: 'SET_ALL_LISTINGS', payload: [] });
    } finally {
      setLoadingStates(prev => ({ ...prev, allListings: false }));
    }
  }, [listingsCache.data, listingsCache.timestamp, listingsCache.ttl, loadUsersIfNeeded, loadingStates.allListings, state.currentUser?.id, state.vehicles]);

  // Memoize other frequently used functions
  const login = useCallback(async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      const response = await ApiService.login(username, password);
      // The ApiService.login should automatically store the token
      const user = { ...response.user, id: (response.user as any)._id || response.user.id };
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      
      // 🚗 Load garage data immediately since it's the default tab users see
      try {
        console.log('🚗 Loading garage data on login...');
        const vehicles = await ApiService.getUserVehicles();
        const vehiclesWithId = vehicles.map((v: any) => ({ ...v, id: v._id || v.id }));
        dispatch({ type: 'SET_VEHICLES', payload: vehiclesWithId });
        console.log('✅ Garage data loaded on login');
      } catch (error) {
        console.error('❌ Error loading garage data on login:', error);
      }
      
      console.log('✅ Login successful');
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    // Clear both API token and AuthService localStorage data
    ApiService.logout();
    AuthService.logout();
    
    // Clear any additional auth-related localStorage items
    localStorage.removeItem('carTrade_remember');
    
    dispatch({ type: 'LOGOUT' });
    setActiveTab('garage');
    // Clear cache on logout
    setListingsCache({ data: [], timestamp: 0, ttl: 30000 });
  }, []);

  const register = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>) => {
    try {
      const response = await ApiService.register(userData);
      const user = { ...response.user, id: (response.user as any)._id || response.user.id };
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      
      // 🚗 Load garage data immediately since it's the default tab users see
      try {
        console.log('🚗 Loading garage data on registration...');
        const vehicles = await ApiService.getUserVehicles();
        const vehiclesWithId = vehicles.map((v: any) => ({ ...v, id: v._id || v.id }));
        dispatch({ type: 'SET_VEHICLES', payload: vehiclesWithId });
        console.log('✅ Garage data loaded on registration');
      } catch (error) {
        console.error('❌ Error loading garage data on registration:', error);
      }
      
      console.log('✅ Registration successful');
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }, []);

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER_STATE', payload: user });
  };

  const addVehicle = async (vehicleData: {
    make: string;
    model: string;
    year: number;
    vin: string;
    mileage: number;
    transmission: 'manual' | 'automatic';
    estimatedValue: number;
    customPrice?: number;
    images?: string[];
  }) => {
    if (!state.currentUser) return;

    try {
      const newVehicle = await ApiService.createVehicle(vehicleData);
      
      // 🔗 DON'T ADD LOCALLY - WebSocket will handle this automatically
      // The backend will broadcast VEHICLE_ADDED which will update the UI
      console.log('✅ Vehicle created, WebSocket will update UI automatically');
      
    } catch (error) {
      console.error('Error adding vehicle:', error);
    }
  };

  const updateVehicle = async (updatedVehicle: Vehicle) => {
    try {
      const vehicle = await ApiService.updateVehicle(updatedVehicle.id, updatedVehicle);
      
      // 🚀 SMART UPDATE: Update vehicle in state immediately
      dispatch({ type: 'UPDATE_VEHICLE', payload: vehicle });
      
      // 🚗 SMART UPDATE: If the vehicle has an active listing, update it in all listings too
      if (vehicle.isListed && vehicle.listingId && state.allListings.length > 0) {
        const listing = state.allListings.find(l => l.id === vehicle.listingId);
        if (listing) {
          const updatedListing = {
            ...listing,
            vehicle: vehicle, // Update the vehicle data in the listing
            updatedAt: new Date().toISOString()
          };
          
          const updatedAllListings = state.allListings.map(l => 
            l.id === vehicle.listingId ? updatedListing : l
          );
          dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
          console.log('📋 Vehicle updated in marketplace listing');
        }
      }
      
      console.log('✅ Vehicle updated with smart updates - no API refresh needed');
      
    } catch (error) {
      console.error('Error updating vehicle:', error);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    try {
      await ApiService.deleteVehicle(vehicleId);
      dispatch({ type: 'DELETE_VEHICLE', payload: vehicleId });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const addListing = async (listingData: Omit<Listing, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'lastRenewed' | 'canRenewAfter'>) => {
    try {
      const newListing = await ApiService.createListing(listingData);
      
      // Convert MongoDB _id to id for frontend compatibility
      const mongoListing = newListing as any;
      const listingWithId = { ...newListing, id: mongoListing._id || newListing.id };
      
      // 🚗 SMART UPDATE: Update vehicle to mark as listed immediately (this affects garage view)
      const vehicle = state.vehicles.find(v => v.id === listingData.vehicleId);
      if (vehicle) {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          isListed: true,
          listingId: listingWithId.id,
          updatedAt: new Date().toISOString(),
        };
        dispatch({ type: 'UPDATE_VEHICLE', payload: updatedVehicle });
        console.log('🚗 Vehicle marked as listed in garage');
      }

      // 📋 SMART UPDATE: Add to user's own listings immediately (this affects listings tab)
      dispatch({ type: 'ADD_LISTING', payload: listingWithId });
      console.log('📋 Listing added to user listings');

      // 🔄 FORCE REFRESH: Clear cache and reload all listings
      setListingsCache({ data: [], timestamp: 0, ttl: 30000 });
      await loadAllListings(true);
      console.log('🔄 Marketplace listings refreshed');
      
      showSuccess('Listing Created', 'Your vehicle is now on the marketplace.');
      console.log('✅ Listing created with local updates and marketplace refresh');
      
    } catch (error) {
      console.error('Error adding listing:', error);
      showError('Listing Failed', 'There was a problem creating your listing.');
      throw error; // Re-throw so UI can show the error
    }
  };

  const updateListing = async (updatedListingData: Listing) => {
    try {
      const apiResponse = await ApiService.updateListing(updatedListingData.id, updatedListingData);
      const listing = normalizeListing(apiResponse);
      
      // 🚀 SMART UPDATE: Update listing in user listings
      dispatch({ type: 'UPDATE_LISTING', payload: listing });
      
      // 📋 SMART UPDATE: Update in all listings if we have them loaded
      if (state.allListings.length > 0) {
        const updatedAllListings = state.allListings.map(l => 
          l.id === listing.id ? listing : l
        );
        dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
        console.log('📋 Listing updated in marketplace');
      }
      
      // 🚗 SMART UPDATE: Update vehicle listing status
      const vehicle = state.vehicles.find(v => v.id === listing.vehicleId);
      if (vehicle) {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          isListed: true, // Keep it listed since we're just updating
          listingId: listing.id,
          updatedAt: new Date().toISOString(),
        };
        dispatch({ type: 'UPDATE_VEHICLE', payload: updatedVehicle });
        console.log('🚗 Vehicle listing status maintained in garage');
      }
      
      showSuccess('Listing Updated', 'Your listing details have been saved.');
      console.log('✅ Listing updated with smart updates - no API refresh needed');
      
    } catch (error) {
      console.error('Error updating listing:', error);
      showError('Update Failed', 'There was a problem saving your changes.');
    }
  };

  const deleteListing = async (listingId: string) => {
    try {
      // Find the listing before it's removed from state to get vehicleId
      const listingToDelete = state.listings.find(l => l.id === listingId) || state.allListings.find(l => l.id === listingId);

      await ApiService.deleteListing(listingId);
      
      // 🚀 SMART UPDATE: Remove listing from user listings
      dispatch({ type: 'DELETE_LISTING', payload: listingId });

      // 🚗 SMART UPDATE: Update vehicle to mark as not listed
      if (listingToDelete) {
        const vehicle = state.vehicles.find(v => v.id === listingToDelete.vehicleId);
        if (vehicle) {
          const updatedVehicle: Vehicle = {
            ...vehicle,
            isListed: false,
            listingId: undefined,
            updatedAt: new Date().toISOString(),
          };
          dispatch({ type: 'UPDATE_VEHICLE', payload: updatedVehicle });
          console.log('🚗 Vehicle marked as not listed in garage');
        }
      }

      // 📋 SMART UPDATE: Remove from all listings if we have them loaded
      if (state.allListings.length > 0) {
        const updatedAllListings = state.allListings.filter(l => l.id !== listingId);
        dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
        console.log('📋 Listing removed from marketplace');
      }
      
      showSuccess('Listing Removed', 'Your listing has been taken off the marketplace.');
      console.log('✅ Listing deleted with smart updates - no API refresh needed');

    } catch (error) {
      console.error('Error deleting listing:', error);
      showError('Deletion Failed', 'There was a problem removing your listing.');
    }
  };

  const renewListing = async (listingId: string) => {
    try {
      const response = await ApiService.renewListing(listingId);
      const renewedListing = { ...response.listing, id: response.listing.id };
      
      // 🚀 SMART UPDATE: Update listing in user listings
      dispatch({ type: 'UPDATE_LISTING', payload: renewedListing });
      
      // 📋 SMART UPDATE: Update in all listings if we have them loaded
      if (state.allListings.length > 0) {
        // Move the renewed listing to the top and update its data
        const otherListings = state.allListings.filter(l => l.id !== renewedListing.id);
        const updatedAllListings = [renewedListing, ...otherListings];
        dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
        console.log('📋 Listing renewed and moved to top in marketplace');
      }
      
      console.log('✅ Listing renewed with smart updates - no API refresh needed');
      
    } catch (error) {
      console.error('Error renewing listing:', error);
    }
  };

  const incrementListingViews = async (listingId: string) => {
    try {
      // The backend automatically increments views when getting a listing
      await ApiService.getListing(listingId);
      
      // Update local state by incrementing views
      const listing = state.listings.find(l => l.id === listingId);
      if (listing) {
        const updatedListing: Listing = {
          ...listing,
          views: listing.views + 1,
          updatedAt: new Date().toISOString(),
        };
        dispatch({ type: 'UPDATE_LISTING', payload: updatedListing });
      }
    } catch (error) {
      console.error('Error incrementing listing views:', error);
    }
  };

  const addReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      const response = await ApiService.createReview(reviewData);
      // Reload all data to update ratings
      await loadAllListings();
    } catch (error) {
      console.error('Error adding review:', error);
    }
  };

  const submitReview = async (reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await ApiService.createReview(reviewData);
      
      // Update the reviews in state if we have them loaded
      if (state.reviews.length > 0) {
        const existingReviewIndex = state.reviews.findIndex(r => 
          r.reviewerId === reviewData.reviewerId && r.revieweeId === reviewData.revieweeId
        );
        
        if (existingReviewIndex >= 0) {
          // Update existing review
          const updatedReviews = [...state.reviews];
          updatedReviews[existingReviewIndex] = response;
          dispatch({ type: 'SET_REVIEWS', payload: updatedReviews });
        } else {
          // Add new review
          dispatch({ type: 'ADD_REVIEWS', payload: [response] });
        }
      }
      
      // Reload all data to update ratings
      await loadAllListings();
      
      const isUpdate = response.isUpdate;
      showSuccess(
        isUpdate ? 'Review Updated' : 'Review Submitted', 
        isUpdate ? 'Your review has been updated successfully!' : 'Thank you for your feedback!'
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      showError('Review Failed', 'Unable to submit your review. Please try again.');
      throw error;
    }
  };

  const getUserProfile = (userId: string): User | null => {
    // Try direct match first
    let user = state.users.find(u => u.id === userId);
    
    // If not found, try matching with MongoDB ObjectId format
    if (!user) {
      user = state.users.find(u => {
        const uId = (u as any)._id || u.id;
        return uId === userId;
      });
    }
    
    return user || null;
  };

  const sendMessage = async (messageData: Omit<Message, 'id' | 'timestamp' | 'read'>) => {
    try {
      console.log('📤 Sending message:', {
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        content: messageData.content.substring(0, 50)
      });
      
      const newMessage = await ApiService.sendMessage(messageData);
      
      // 🔗 WebSocket will handle UI updates automatically
      // The backend now broadcasts MESSAGE_RECEIVED to both sender and receiver
      console.log('✅ Message sent, WebSocket will update UI automatically for both users');
      
      // 🚀 FALLBACK: Add message locally immediately in case WebSocket is delayed
      // This ensures the sender sees their message right away
      const messageWithId = { ...newMessage, id: (newMessage as any)._id || newMessage.id };
      dispatch({ type: 'ADD_MESSAGE', payload: messageWithId });
      console.log('📨 Added sent message to local state as fallback');
      
      // Ensure both sender and receiver users are loaded
      const userIdsToLoad = [messageData.senderId, messageData.receiverId].filter(id => 
        id && !state.users.find(u => u.id === id)
      );
      
      if (userIdsToLoad.length > 0) {
        try {
          const users = await ApiService.getUsersBatch(userIdsToLoad);
          const usersWithId = users.map((u: any) => ({ 
            ...u, 
            id: u._id || u.id 
          }));
          
          // Add new users to existing users
          const allUsers = [...state.users];
          usersWithId.forEach(user => {
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push(user);
            }
          });
          
          dispatch({ type: 'SET_USERS', payload: allUsers });
        } catch (error) {
          console.error('Error loading users for message:', error);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!state.currentUser) return;
    
    try {
      await ApiService.markMessagesAsRead(conversationId);
      
      // 🚀 SMART UPDATE: Mark messages as read in local state instead of reloading
      const updatedMessages = state.messages.map(msg => {
        const senderId = typeof msg.senderId === 'object' ? (msg.senderId as any).id : msg.senderId;
        const receiverId = typeof msg.receiverId === 'object' ? (msg.receiverId as any).id : msg.receiverId;
        const msgConversationId = [senderId, receiverId].sort().join('-');
        
        // Mark as read if it's in this conversation and current user is receiver
        if (msgConversationId === conversationId && receiverId === state.currentUser?.id) {
          return { ...msg, read: true };
        }
        return msg;
      });
      
      // Update conversations to reset unread count
      const updatedConversations = state.conversations.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      );
      
      dispatch({ type: 'SET_MESSAGES', payload: updatedMessages });
      dispatch({ type: 'SET_CONVERSATIONS', payload: updatedConversations });
      
      console.log('✅ Messages marked as read with smart updates - no reload needed');
      
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const loadUserMessages = async () => {
    try {
      const messages = await ApiService.getUserMessages();
      dispatch({ type: 'SET_MESSAGES', payload: messages });
      
      // Extract users from populated message objects and collect missing user IDs
      const userIds = new Set<string>();
      const usersFromMessages: any[] = [];
      
      messages.forEach(message => {
        // Handle populated sender
        if (typeof message.senderId === 'object' && message.senderId && (message.senderId as any).id) {
          const senderUser = { ...(message.senderId as any), id: (message.senderId as any).id };
          usersFromMessages.push(senderUser);
          userIds.add(senderUser.id);
        } else if (typeof message.senderId === 'string') {
          userIds.add(message.senderId);
        }
        
        // Handle populated receiver
        if (typeof message.receiverId === 'object' && message.receiverId && (message.receiverId as any).id) {
          const receiverUser = { ...(message.receiverId as any), id: (message.receiverId as any).id };
          usersFromMessages.push(receiverUser);
          userIds.add(receiverUser.id);
        } else if (typeof message.receiverId === 'string') {
          userIds.add(message.receiverId);
        }
      });
      
      console.log('👥 Extracted user IDs from messages:', Array.from(userIds));
      console.log('👥 Current users in state:', state.users.map(u => ({ id: u.id, username: u.username })));
      
      // Load users that aren't already in state (excluding current user to prevent infinite loops)
      const missingUserIds = Array.from(userIds).filter(id => 
        id !== state.currentUser?.id && !state.users.find(u => u.id === id)
      );
      
      console.log('❓ Missing user IDs (excluding current user):', missingUserIds);
      
      // Ensure current user is in users array
      let allUsers = [...state.users];
      if (state.currentUser && !allUsers.find(u => u.id === state.currentUser!.id)) {
        allUsers.push(state.currentUser);
        console.log('👤 Added current user to users array');
      }
      
      if (missingUserIds.length > 0) {
        try {
          console.log('🔍 Loading missing users via batch API...');
          const users = await ApiService.getUsersBatch(missingUserIds);
          console.log('✅ Loaded users from batch API:', users.map(u => ({ id: u.id, username: u.username })));
          
          // Add new users to existing users
          const allUsers = [...state.users];
          users.forEach(user => {
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push(user);
            }
          });
          
          console.log('👥 Updated users state:', allUsers.map(u => ({ id: u.id, username: u.username })));
          dispatch({ type: 'SET_USERS', payload: allUsers });
        } catch (error) {
          console.error('❌ Error loading missing users:', error);
          // Fallback: load all users
          console.log('🔄 Falling back to loading all users...');
          await loadAllUsers();
        }
      } else {
        console.log('✅ All required users already in state');
      }
      
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  // Load messages only when messages tab is accessed
  const loadMessagesOnTabSwitch = async () => {
    // 🚫 PREVENT DUPLICATE LOADS: Check if messages are already loading
    if (loadingStates.messages) {
      console.log('⚠️ Messages already loading, skipping duplicate load');
      return;
    }
    
    try {
      setLoadingStates(prev => ({ ...prev, messages: true }));
      console.log('🔄 Loading messages for messages tab...');
      
      // Load both messages and conversations
      const [messages, conversations] = await Promise.all([
        ApiService.getUserMessages(),
        ApiService.getConversations()
      ]);
      
      console.log('📨 Loaded messages from API:', {
        count: messages.length,
        samples: messages.slice(0, 3).map(m => ({
          id: m.id,
          senderId: m.senderId,
          receiverId: m.receiverId,
          content: m.content.substring(0, 30)
        }))
      });
      
      console.log('💬 Loaded conversations from API:', {
        count: conversations.length,
        samples: conversations.slice(0, 3).map(c => ({
          id: c.id,
          participants: c.participants,
          lastMessage: c.lastMessage?.content?.substring(0, 30)
        }))
      });
      
      dispatch({ type: 'SET_MESSAGES', payload: messages });
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      
      // Extract users from populated message objects and conversations
      const userIds = new Set<string>();
      const usersFromMessages: any[] = [];
      
      messages.forEach(message => {
        // Handle populated sender
        if (typeof message.senderId === 'object' && message.senderId && (message.senderId as any).id) {
          const senderUser = { ...(message.senderId as any), id: (message.senderId as any).id };
          usersFromMessages.push(senderUser);
          userIds.add(senderUser.id);
        } else if (typeof message.senderId === 'string') {
          userIds.add(message.senderId);
        }
        
        // Handle populated receiver
        if (typeof message.receiverId === 'object' && message.receiverId && (message.receiverId as any).id) {
          const receiverUser = { ...(message.receiverId as any), id: (message.receiverId as any).id };
          usersFromMessages.push(receiverUser);
          userIds.add(receiverUser.id);
        } else if (typeof message.receiverId === 'string') {
          userIds.add(message.receiverId);
        }
      });
      
      // Extract users from conversations
      conversations.forEach(conversation => {
        // Add otherUser from conversation
        if ((conversation as any).otherUser) {
          const otherUser = { ...(conversation as any).otherUser };
          usersFromMessages.push(otherUser);
          userIds.add(otherUser.id);
        }
        
        // Also add participant IDs in case they're not populated
        if (conversation.participants) {
          conversation.participants.forEach(participantId => {
            if (typeof participantId === 'string') {
              userIds.add(participantId);
            }
          });
        }
      });
      
      console.log('👥 Extracted user IDs from messages and conversations:', Array.from(userIds));
      console.log('👥 Users from populated messages and conversations:', usersFromMessages.map(u => ({ id: u.id, username: u.username })));
      console.log('👥 Current users in state:', state.users.map(u => ({ id: u.id, username: u.username })));
      
      // Add populated users to state first
      let allUsers = [...state.users];
      usersFromMessages.forEach(user => {
        if (!allUsers.find(u => u.id === user.id)) {
          allUsers.push(user);
        }
      });
      
      // Find users that still need to be fetched (not populated and not in state, excluding current user)
      const missingUserIds = Array.from(userIds).filter(id => 
        id !== state.currentUser?.id && !allUsers.find(u => u.id === id)
      );
      
      console.log('❓ Missing user IDs after adding populated users (excluding current user):', missingUserIds);
      
      // Ensure current user is in users array
      if (state.currentUser && !allUsers.find(u => u.id === state.currentUser!.id)) {
        allUsers.push(state.currentUser);
        console.log('👤 Added current user to users array');
      }
      
      if (missingUserIds.length > 0) {
        try {
          console.log('🔍 Loading missing users via batch API...');
          const users = await ApiService.getUsersBatch(missingUserIds);
          console.log('✅ Loaded users from batch API:', users.map(u => ({ id: u.id, username: u.username })));
          
          // Add fetched users to existing users
          users.forEach(user => {
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push(user);
            }
          });
        } catch (error) {
          console.error('❌ Error loading missing users:', error);
          // Fallback: load all users
          console.log('🔄 Falling back to loading all users...');
          await loadAllUsers();
          return; // Exit early since loadAllUsers will update state
        }
      }
      
      console.log('👥 Final updated users state:', allUsers.map(u => ({ id: u.id, username: u.username })));
      dispatch({ type: 'SET_USERS', payload: allUsers });
      
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, messages: false }));
    }
  };

  const addTrade = async (tradeData: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTrade = await ApiService.createTrade(tradeData);
      
      // Convert MongoDB _id to id for frontend compatibility
      const mongoTrade = newTrade as any;
      const tradeWithId = { ...newTrade, id: mongoTrade._id || newTrade.id };
      
      // 🚗 SMART UPDATE: Mark vehicles as in-trade
      const allVehicleIds = [
        ...tradeData.offererVehicleIds,
        ...(tradeData.receiverVehicleIds || [])
      ];
      
      if (allVehicleIds.length > 0) {
        updateVehicleTradeStatus(allVehicleIds, true, tradeWithId.id);
        console.log('🔒 Marked vehicles as in-trade:', allVehicleIds);
      }
      
      // 📋 SMART UPDATE: Hide vehicles from listings if they're listed
      const affectedListings = state.allListings.filter(listing => 
        allVehicleIds.includes(listing.vehicleId)
      );
      
      if (affectedListings.length > 0) {
        const updatedAllListings = state.allListings.map(listing => {
          if (allVehicleIds.includes(listing.vehicleId)) {
            return { ...listing, isActive: false, inTrade: true };
          }
          return listing;
        });
        dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
        console.log('🙈 Hidden vehicles from marketplace during trade');
      }
      
      dispatch({ type: 'ADD_TRADE', payload: tradeWithId });
      console.log('✅ Trade created with smart vehicle status updates');
      
    } catch (error) {
      console.error('❌ Error adding trade:', error);
      throw error; // Re-throw so the calling component can handle it
    }
  };

  const updateTrade = async (tradeOrId: Trade | string, tradeData?: Partial<Trade>) => {
    try {
      let tradeId: string;
      let updatedTradeData: Partial<Trade>;
      
      // Handle both old format (full trade object) and new format (id + data)
      if (typeof tradeOrId === 'string') {
        tradeId = tradeOrId;
        updatedTradeData = tradeData!;
      } else {
        tradeId = tradeOrId.id;
        updatedTradeData = tradeOrId;
      }
      
      // Get the current trade from state
      const currentTrade = state.trades.find(t => t.id === tradeId);
      if (!currentTrade) {
        throw new Error('Trade not found in state');
      }
      
      // Handle different trade status updates
      if (updatedTradeData.status === 'cancelled' || updatedTradeData.status === 'rejected' || updatedTradeData.status === 'declined') {
        // 🔓 RELEASE VEHICLES: Mark vehicles as no longer in trade
        const allVehicleIds = [
          ...currentTrade.offererVehicleIds,
          ...(currentTrade.receiverVehicleIds || [])
        ];
        
        updateVehicleTradeStatus(allVehicleIds, false);
        
        // 📋 RESTORE LISTINGS: Re-show vehicles in marketplace
        if (state.allListings.length > 0) {
          const updatedAllListings = state.allListings.map(listing => {
            if (allVehicleIds.includes(listing.vehicleId)) {
              return { ...listing, isActive: true, inTrade: false };
            }
            return listing;
          });
          dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
          console.log('👁️ Restored vehicles to marketplace after trade cancellation');
        }
        
        const result = await ApiService.updateTrade(tradeId, updatedTradeData);
        // Remove the cancelled/rejected trade from state since backend deletes it
        dispatch({ type: 'SET_TRADES', payload: state.trades.filter(t => t.id !== tradeId) });
        console.log('✅ Trade cancelled/rejected and vehicles released');
        
      } else if (updatedTradeData.status === 'completed') {
        // 🔄 COMPLETE TRADE: Handle car swapping
        console.log('🔄 Completing trade with car swapping...');
        
        const result = await ApiService.updateTrade(tradeId, updatedTradeData);
        const completedTrade = result as Trade;
        
        // 🚗 CAR SWAPPING: Transfer vehicle ownership
        const offererVehicleIds = currentTrade.offererVehicleIds;
        const receiverVehicleIds = currentTrade.receiverVehicleIds || [];
        
        // Update vehicle ownership in local state
        const updatedVehicles = state.vehicles.map(vehicle => {
          if (offererVehicleIds.includes(vehicle.id)) {
            // Transfer offerer's vehicles to receiver
            return {
              ...vehicle,
              ownerId: currentTrade.receiverUserId,
              inTrade: false,
              tradeId: undefined,
              isListed: false, // Remove from listings
              listingId: undefined,
              updatedAt: new Date().toISOString()
            };
          } else if (receiverVehicleIds.includes(vehicle.id)) {
            // Transfer receiver's vehicles to offerer
            return {
              ...vehicle,
              ownerId: currentTrade.offererUserId,
              inTrade: false,
              tradeId: undefined,
              isListed: false, // Remove from listings
              listingId: undefined,
              updatedAt: new Date().toISOString()
            };
          }
          return vehicle;
        });
        
        dispatch({ type: 'SET_VEHICLES', payload: updatedVehicles });
        
        // 📋 REMOVE FROM LISTINGS: Remove traded vehicles from all listings
        if (state.allListings.length > 0) {
          const allTradedVehicleIds = [...offererVehicleIds, ...receiverVehicleIds];
          const updatedAllListings = state.allListings.filter(listing => 
            !allTradedVehicleIds.includes(listing.vehicleId)
          );
          dispatch({ type: 'SET_ALL_LISTINGS', payload: updatedAllListings });
          console.log('📋 Removed traded vehicles from marketplace');
        }
        
        // Remove user's own listings for traded vehicles
        if (state.listings.length > 0) {
          const allTradedVehicleIds = [...offererVehicleIds, ...receiverVehicleIds];
          const updatedUserListings = state.listings.filter(listing => 
            !allTradedVehicleIds.includes(listing.vehicleId)
          );
          dispatch({ type: 'SET_LISTINGS', payload: updatedUserListings });
          console.log('📋 Removed traded vehicles from user listings');
        }
        
        // Update trade status
        dispatch({ type: 'UPDATE_TRADE', payload: completedTrade });
        
        // 🔄 REFRESH USER DATA: Reload both users' data to ensure consistency
        try {
          if (state.currentUser?.id === currentTrade.offererUserId || state.currentUser?.id === currentTrade.receiverUserId) {
            console.log('🔄 Refreshing current user data after trade completion...');
            // Reload garage data for current user
            const vehicles = await ApiService.getUserVehicles();
            const vehiclesWithId = vehicles.map((v: any) => ({ ...v, id: v._id || v.id }));
            dispatch({ type: 'SET_VEHICLES', payload: vehiclesWithId });
          }
        } catch (error) {
          console.error('❌ Error refreshing user data after trade:', error);
        }
        
        console.log('✅ Trade completed successfully with car swapping');
        
      } else {
        // Regular trade update (countering, accepting, etc.)
        const trade = await ApiService.updateTrade(tradeId, updatedTradeData);
        dispatch({ type: 'UPDATE_TRADE', payload: trade });
        console.log('✅ Trade updated successfully');
      }
      
    } catch (error) {
      console.error('❌ Error updating trade:', error);
      throw error; // Re-throw so the calling component can handle it
    }
  };

  const deleteTrade = async (tradeId: string) => {
    try {
      await ApiService.deleteTrade(tradeId);
      // Remove the deleted trade from state
      dispatch({ type: 'SET_TRADES', payload: state.trades.filter(t => t.id !== tradeId) });
      console.log('✅ Deleted trade removed from state');
    } catch (error) {
      console.error('Error deleting trade:', error);
      throw error; // Re-throw so the calling component can handle it
    }
  };

  const cleanupCorruptedTrades = async () => {
    console.log('🧹 Attempting to clean up corrupted trades...');
      const result = await ApiService.cleanupCorruptedTrades();
    console.log(`✅ Corrupted trades cleanup result:`, result);
    // Optionally, reload trades after cleanup
    await reloadTrades();
      return result;
  };

  const cleanupVehicleFlags = async () => {
    try {
      const result = await ApiService.cleanupVehicleFlags();
      console.log('Vehicle cleanup result:', result);
      
      // Reload user data to reflect the cleanup
      if (state.currentUser) {
        await loadUserData(state.currentUser.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error cleaning up vehicle flags:', error);
      throw error;
    }
  };

  // Helper functions for trade state management
  const isVehicleInPendingTrade = (vehicleId: string): boolean => {
    return state.trades.some(trade => 
      (trade.status === 'pending' || trade.status === 'countered' || trade.status === 'pending_acceptance') &&
      (trade.offererVehicleIds.includes(vehicleId) || trade.receiverVehicleIds?.includes(vehicleId))
    );
  };

  const getVehicleTradeStatus = (vehicleId: string): { inTrade: boolean; tradeId?: string; tradeStatus?: string } => {
    const trade = state.trades.find(trade => 
      (trade.status === 'pending' || trade.status === 'countered' || trade.status === 'pending_acceptance') &&
      (trade.offererVehicleIds.includes(vehicleId) || trade.receiverVehicleIds?.includes(vehicleId))
    );
    
    return {
      inTrade: !!trade,
      tradeId: trade?.id,
      tradeStatus: trade?.status
    };
  };

  const updateVehicleTradeStatus = (vehicleIds: string[], inTrade: boolean, tradeId?: string) => {
    const updatedVehicles = state.vehicles.map(vehicle => {
      if (vehicleIds.includes(vehicle.id)) {
        return {
          ...vehicle,
          inTrade,
          tradeId: inTrade ? tradeId : undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return vehicle;
    });
    dispatch({ type: 'SET_VEHICLES', payload: updatedVehicles });
  };

  const checkForNewMessages = async () => {
    // Prevent infinite loops by checking if messages are already loading
    if (loadingStates.messages) {
      console.log('⚠️ Messages already loading, skipping checkForNewMessages');
      return;
    }
    
    try {
      console.log('🔄 Checking for new messages...');
      // Simply reload messages - this is what the function should do based on usage
      await loadUserMessages();
    } catch (error) {
      console.error('❌ Error checking for new messages:', error);
    }
  };

  // Notification functions
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    // Use the deduplicated version
    addNotificationWithDeduplication(notification);
  }, [addNotificationWithDeduplication]);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, []);

  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  }, []);

  // Convenience functions for common notification types
  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'error', title, message, duration: duration ?? 7000 });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  const showMessageNotification = useCallback((message: Message, sender: User) => {
    addNotification({
      type: 'message',
      title: `New message from @${sender.username}`,
      message: message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content,
      duration: 8000,
      actionLabel: 'View',
      onAction: () => {
        // Navigate to messages - this would be handled by the component using this
      },
      data: { message, sender }
    });
  }, [addNotification]);

  const showTradeNotification = useCallback((trade: Trade, otherUser: User) => {
    addNotification({
      type: 'trade',
      title: `New trade offer from @${otherUser.username}`,
      message: `Trade offer for your listing`,
      duration: 10000,
      actionLabel: 'View Trade',
      onAction: () => {
        // Navigate to trades - this would be handled by the component using this
      },
      data: { trade, otherUser }
    });
  }, [addNotification]);

  const searchUsers = useCallback(async (query: string) => {
    // No need to search if query is too short
    if (query.length < 2) {
      dispatch({ type: 'SET_USERS', payload: [] });
      return;
    }
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const users = await ApiService.getAllUsers(query);
      const normalizedUsers = users.map((user: any) => ({
        ...user,
        id: user._id,
      }));
      dispatch({ type: 'SET_USERS', payload: normalizedUsers });
    } catch (error) {
      console.error("Failed to search users:", error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to search users.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  const loadUserReviews = useCallback(async (userId: string) => {
    try {
      const reviews = await ApiService.getUserReviews(userId);
      const normalizedReviews = reviews.map((review: any) => ({
        ...review,
        id: review._id,
      }));
      // We need a new dispatch action to add these reviews to the existing state
      // without overwriting reviews for other users.
      dispatch({ type: 'ADD_REVIEWS', payload: normalizedReviews });
    } catch (error) {
      console.error(`Failed to load reviews for user ${userId}:`, error);
    }
  }, [dispatch]);

  const getExistingReview = useCallback(async (targetUserId: string): Promise<Review | null> => {
    try {
      return await ApiService.getExistingReview(targetUserId);
    } catch (error) {
      console.error(`Failed to get existing review for user ${targetUserId}:`, error);
      return null;
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    login,
    register,
    logout,
    updateUser,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    getUserVehicles: async (userId: string) => {
      try {
        const vehicles = await ApiService.getVehiclesByUserId(userId);
        return vehicles;
      } catch (error) {
        console.error('Error getting user vehicles:', error);
        return [];
      }
    },
    getVehiclesCount: async () => {
      try {
        const result = await ApiService.getUserVehiclesCount();
        return result.count;
      } catch (error) {
        console.error('Error getting vehicles count:', error);
        return 0;
      }
    },
    addListing,
    updateListing,
    deleteListing,
    renewListing,
    incrementListingViews,
    loadAllListings,
    addReview,
    submitReview,
    getUserProfile,
    sendMessage,
    markMessagesAsRead,
    addTrade,
    updateTrade,
    deleteTrade,
    cleanupCorruptedTrades,
    cleanupVehicleFlags,
    activeTab,
    setActiveTab,
    activeConversation,
    setActiveConversation,
    reloadTrades,
    loadUserMessages,
    loadMessagesOnTabSwitch,
    loadGarageData: async () => {
      if (!state.currentUser || loadingStates.userData) {
        return;
      }
      
      setLoadingStates(prev => ({ ...prev, userData: true }));
      
      try {
        console.log('🚗 Loading garage data...');
        const vehicles = await ApiService.getUserVehicles();
        const vehiclesWithId = vehicles.map((v: any) => ({ ...v, id: v._id || v.id }));
        dispatch({ type: 'SET_VEHICLES', payload: vehiclesWithId });
        console.log('✅ Garage data loaded');
      } catch (error) {
        console.error('❌ Error loading garage data:', error);
      } finally {
        setLoadingStates(prev => ({ ...prev, userData: false }));
      }
    },
    loadTradesData: async () => {
      if (!state.currentUser || loadingStates.userData) {
        return;
      }
      
      setLoadingStates(prev => ({ ...prev, userData: true }));
      
      try {
        console.log('🔄 Loading trades data...');
        const trades = await ApiService.getUserTrades();
        
        // Extract users from populated trade objects
        const usersFromTrades: any[] = [];
        const userIds = new Set<string>();
        
        const tradesWithId = trades.map((t: any) => {
          const trade = { ...t, id: t._id || t.id };
          
          // Handle populated vehicle arrays
          if (trade.offererVehicleIds && Array.isArray(trade.offererVehicleIds)) {
            trade.offererVehicleObjects = trade.offererVehicleIds.filter((v: any) => 
              typeof v === 'object' && v.make
            ).map((v: any) => ({ ...v, id: v._id || v.id }));
            
            trade.offererVehicleIds = trade.offererVehicleIds.map((v: any) => 
              typeof v === 'object' ? (v._id || v.id) : v
            );
          }
          
          if (trade.receiverVehicleIds && Array.isArray(trade.receiverVehicleIds)) {
            trade.receiverVehicleObjects = trade.receiverVehicleIds.filter((v: any) => 
              typeof v === 'object' && v.make
            ).map((v: any) => ({ ...v, id: v._id || v.id }));
            
            trade.receiverVehicleIds = trade.receiverVehicleIds.map((v: any) => 
              typeof v === 'object' ? (v._id || v.id) : v
            );
          }
          
          // Handle populated user objects
          if (trade.offererUserId && typeof trade.offererUserId === 'object') {
            const offererUser = { ...trade.offererUserId, id: trade.offererUserId._id || trade.offererUserId.id };
            usersFromTrades.push(offererUser);
            userIds.add(offererUser.id);
            trade.offererUserId = offererUser.id;
          } else if (typeof trade.offererUserId === 'string') {
            userIds.add(trade.offererUserId);
          }
          
          if (trade.receiverUserId && typeof trade.receiverUserId === 'object') {
            const receiverUser = { ...trade.receiverUserId, id: trade.receiverUserId._id || trade.receiverUserId.id };
            usersFromTrades.push(receiverUser);
            userIds.add(receiverUser.id);
            trade.receiverUserId = receiverUser.id;
          } else if (typeof trade.receiverUserId === 'string') {
            userIds.add(trade.receiverUserId);
          }
          
          if (trade.listingId && typeof trade.listingId === 'object') {
            trade.listingId = trade.listingId._id || trade.listingId.id;
          }
          
          return trade;
        });

        dispatch({ type: 'SET_TRADES', payload: tradesWithId });
        
        // Add extracted users to state
        let allUsers = [...state.users];
        usersFromTrades.forEach(user => {
          if (!allUsers.find(u => u.id === user.id)) {
            allUsers.push(user);
          }
        });
        
        // Load missing users
        const missingUserIds = Array.from(userIds).filter(id => 
          !allUsers.find(u => u.id === id)
        );
        
        if (missingUserIds.length > 0) {
          const users = await ApiService.getUsersBatch(missingUserIds);
          users.forEach(user => {
            if (!allUsers.find(u => u.id === user.id)) {
              allUsers.push(user);
            }
          });
        }
        
        dispatch({ type: 'SET_USERS', payload: allUsers });
        console.log('✅ Trades data loaded');
      } catch (error) {
        console.error('❌ Error loading trades data:', error);
      } finally {
        setLoadingStates(prev => ({ ...prev, userData: false }));
      }
    },
    loadListingsData: async () => {
      if (!state.currentUser || loadingStates.userData) {
        return;
      }
      
      setLoadingStates(prev => ({ ...prev, userData: true }));
      
      try {
        console.log('📋 Loading listings data...');
        const listings = await ApiService.getUserListings();
        const listingsWithId = listings.map((l: any) => ({ ...l, id: l._id || l.id }));
        dispatch({ type: 'SET_LISTINGS', payload: listingsWithId });
        console.log('✅ Listings data loaded');
      } catch (error) {
        console.error('❌ Error loading listings data:', error);
      } finally {
        setLoadingStates(prev => ({ ...prev, userData: false }));
      }
    },
    checkForNewMessages,
    isVehicleInPendingTrade,
    getVehicleTradeStatus,
    // Notification functions
    addNotification,
    removeNotification,
    markNotificationRead,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showMessageNotification,
    showTradeNotification,
    loadAllUsers,
    searchUsers,
    loadUserReviews,
    getExistingReview,
  }), [state, dispatch, login, logout, updateUser, addVehicle, updateVehicle, deleteVehicle, addListing, updateListing, deleteListing, renewListing, incrementListingViews, loadAllListings, addReview, getUserProfile, sendMessage, markMessagesAsRead, addTrade, updateTrade, deleteTrade, cleanupCorruptedTrades, cleanupVehicleFlags, activeTab, setActiveTab, activeConversation, setActiveConversation, reloadTrades, loadUserMessages, loadMessagesOnTabSwitch, checkForNewMessages, addNotification, removeNotification, markNotificationRead, clearAllNotifications, showSuccess, showError, showWarning, showInfo, showMessageNotification, showTradeNotification, loadAllUsers, searchUsers, loadUserReviews]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
} 
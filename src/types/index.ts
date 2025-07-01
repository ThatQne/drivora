export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  location?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  transmission: 'manual' | 'automatic';
  estimatedValue: number;
  customPrice?: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
  isListed?: boolean;
  isAuctioned?: boolean;
  listingId?: string;
  auctionId?: string;
  // Trade status tracking
  inTrade?: boolean;
  tradeId?: string;
}

export interface Listing {
  id: string;
  vehicleId: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  history: Array<{
    type: 'price_change' | 'title_update' | 'description_update' | 'problems_update' | 'features_update' | 'tags_update';
    oldValue: any;
    newValue: any;
    changedAt: string;
  }>;
  lastEditedAt?: string;
  problems: string[];
  additionalFeatures: string[];
  tags: string[];
  isActive: boolean;
  views: number;
  lastRenewed: string;
  canRenewAfter: string;
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
  soldTo?: string;
  soldPrice?: number;
  // Virtual fields from backend
  priceChanged?: boolean;
  previousPrice?: number;
  // Trade status tracking
  inTrade?: boolean;
}

export interface Auction {
  id: string;
  vehicleId: string;
  sellerId: string;
  title: string;
  description: string;
  startingBid: number;
  buyNowPrice?: number;
  currentBid: number;
  highestBidderId?: string;
  bids: Bid[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  winnerId?: string;
  finalPrice?: number;
  status?: 'active' | 'completed' | 'failed' | 'cancelled';
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  timestamp: string;
}

export interface Trade {
  id: string;
  listingId: string;
  offererUserId: string; // Person making the trade offer
  receiverUserId: string; // Person receiving the trade offer (listing owner)
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'countered' | 'pending_acceptance' | 'declined';
  
  // Offerer's offer
  offererCashAmount: number; // Cash offered by offerer (can be negative if they want cash back)
  offererVehicleIds: string[]; // Vehicles offered by offerer
  
  // Receiver's counter-offer (if any)
  receiverCashAmount?: number; // Cash requested by receiver (can be negative if they offer cash back)
  receiverVehicleIds?: string[]; // Vehicles requested by receiver
  
  // Acceptance tracking
  offererAccepted?: boolean; // Has the offerer accepted the current terms
  receiverAccepted?: boolean; // Has the receiver accepted the current terms
  
  message: string;
  counterMessage?: string;
  
  // Trade history for tracking negotiations
  tradeHistory: TradeHistoryItem[];
  
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TradeHistoryItem {
  id: string;
  action: 'created' | 'countered' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'declined';
  userId: string;
  timestamp: string;
  offererCashAmount: number;
  offererVehicleIds: string[];
  receiverCashAmount?: number;
  receiverVehicleIds?: string[];
  message?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  tradeId?: string;
  listingId?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface CarValuation {
  make: string;
  model: string;
  year: number;
  mileage: number;
  estimatedValue: number;
  priceRange: {
    low: number;
    high: number;
  };
}

export interface AppState {
  currentUser: User | null;
  vehicles: Vehicle[];
  listings: Listing[]; // User's own listings for garage management
  allListings: Listing[]; // All public listings for browsing
  auctions: Auction[];
  trades: Trade[];
  messages: Message[];
  conversations: Conversation[];
  reviews: Review[];
  sales: Sale[];
  users: User[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  notifications: Notification[];
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  tradeId?: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  sellerId: string;
  buyerId: string;
  vehicleId: string;
  listingId?: string;
  auctionId?: string;
  type: 'listing' | 'auction';
  finalPrice: number;
  completedAt: string;
  vehicle?: Vehicle;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'message' | 'trade';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 for persistent
  timestamp: number;
  read?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  data?: any; // for storing additional data like message/trade info
}

export type NavigationTab = 'garage' | 'listings' | 'auctions' | 'trades' | 'messages' | 'profile' | 'users'; 
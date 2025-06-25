import { Vehicle, Listing, Trade, Message, Conversation, Review, User } from '../types/index.ts';
import { AuthService } from './authService.ts';

const VEHICLES_KEY = 'carTrade_vehicles';
const LISTINGS_KEY = 'carTrade_listings';
const TRADES_KEY = 'carTrade_trades';
const MESSAGES_KEY = 'carTrade_messages';
const CONVERSATIONS_KEY = 'carTrade_conversations';
const REVIEWS_KEY = 'carTrade_reviews';

export class DataService {
  // Vehicle operations
  static getVehicles(): Vehicle[] {
    try {
      const stored = localStorage.getItem(VEHICLES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveVehicles(vehicles: Vehicle[]): void {
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
  }

  static addVehicle(vehicle: Vehicle): void {
    const vehicles = this.getVehicles();
    vehicles.push(vehicle);
    this.saveVehicles(vehicles);
  }

  static updateVehicle(updatedVehicle: Vehicle): void {
    const vehicles = this.getVehicles();
    const index = vehicles.findIndex(v => v.id === updatedVehicle.id);
    if (index !== -1) {
      vehicles[index] = updatedVehicle;
      this.saveVehicles(vehicles);
    }
  }

  static deleteVehicle(vehicleId: string): void {
    const vehicles = this.getVehicles().filter(v => v.id !== vehicleId);
    this.saveVehicles(vehicles);
  }

  static getUserVehicles(userId: string): Vehicle[] {
    return this.getVehicles().filter(v => v.ownerId === userId);
  }

  // Listing operations
  static getListings(): Listing[] {
    try {
      const stored = localStorage.getItem(LISTINGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveListings(listings: Listing[]): void {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
  }

  static addListing(listing: Listing): void {
    const listings = this.getListings();
    listings.push(listing);
    this.saveListings(listings);
  }

  static updateListing(updatedListing: Listing): void {
    const listings = this.getListings();
    const index = listings.findIndex(l => l.id === updatedListing.id);
    if (index !== -1) {
      listings[index] = updatedListing;
      this.saveListings(listings);
    }
  }

  static deleteListing(listingId: string): void {
    const listings = this.getListings().filter(l => l.id !== listingId);
    this.saveListings(listings);
  }

  static getActiveListings(): Listing[] {
    return this.getListings().filter(l => l.isActive);
  }

  static getUserListings(userId: string): Listing[] {
    return this.getListings().filter(l => l.sellerId === userId);
  }

  // Trade operations
  static getTrades(): Trade[] {
    try {
      const stored = localStorage.getItem(TRADES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveTrades(trades: Trade[]): void {
    localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
  }

  static addTrade(trade: Trade): void {
    const trades = this.getTrades();
    trades.push(trade);
    this.saveTrades(trades);
  }

  static updateTrade(updatedTrade: Trade): void {
    const trades = this.getTrades();
    const index = trades.findIndex(t => t.id === updatedTrade.id);
    if (index !== -1) {
      trades[index] = updatedTrade;
      this.saveTrades(trades);
    }
  }

  static getUserTrades(userId: string): Trade[] {
    return this.getTrades().filter(t => t.buyerId === userId || t.sellerId === userId);
  }

  // Message operations
  static getMessages(): Message[] {
    try {
      const stored = localStorage.getItem(MESSAGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveMessages(messages: Message[]): void {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }

  static addMessage(message: Message): void {
    const messages = this.getMessages();
    messages.push(message);
    this.saveMessages(messages);
    this.updateConversations(message);
  }

  static getUserMessages(userId: string): Message[] {
    return this.getMessages().filter(m => m.senderId === userId || m.receiverId === userId);
  }

  static markMessagesAsRead(conversationId: string, userId: string): void {
    const messages = this.getMessages();
    const updatedMessages = messages.map(m => {
      if (m.receiverId === userId && 
          ((m.senderId + m.receiverId === conversationId) || 
           (m.receiverId + m.senderId === conversationId))) {
        return { ...m, read: true };
      }
      return m;
    });
    this.saveMessages(updatedMessages);
  }

  // Conversation operations
  static getConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(CONVERSATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveConversations(conversations: Conversation[]): void {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  }

  static getUserConversations(userId: string): Conversation[] {
    return this.getConversations().filter(c => c.participants.includes(userId));
  }

  private static updateConversations(message: Message): void {
    const conversations = this.getConversations();
    const participantIds = [message.senderId, message.receiverId].sort();
    const conversationId = participantIds.join('-');
    
    const existingIndex = conversations.findIndex(c => c.id === conversationId);
    
    if (existingIndex !== -1) {
      // Update existing conversation
      conversations[existingIndex] = {
        ...conversations[existingIndex],
        lastMessage: message,
        unreadCount: message.receiverId !== message.senderId ? 
          conversations[existingIndex].unreadCount + 1 : 0,
        updatedAt: message.timestamp,
      };
    } else {
      // Create new conversation
      const newConversation: Conversation = {
        id: conversationId,
        participants: participantIds,
        lastMessage: message,
        unreadCount: 1,
        updatedAt: message.timestamp,
      };
      conversations.push(newConversation);
    }
    
    this.saveConversations(conversations);
  }

  // Utility methods
  // Review operations
  static getReviews(): Review[] {
    try {
      const stored = localStorage.getItem(REVIEWS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveReviews(reviews: Review[]): void {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  }

  static addReview(review: Review): void {
    const reviews = this.getReviews();
    reviews.push(review);
    this.saveReviews(reviews);
  }

  static getUserReviews(userId: string): Review[] {
    return this.getReviews().filter(r => r.revieweeId === userId);
  }

  // Enhanced listing operations with seller and vehicle data
  static getEnrichedListings(): any[] {
    const listings = this.getActiveListings();
    const vehicles = this.getVehicles();
    const users = this.getAllUsers();
    
    return listings.map(listing => {
      const vehicle = vehicles.find(v => v.id === listing.vehicleId);
      const seller = users.find(u => u.id === listing.sellerId);
      
      return {
        ...listing,
        vehicle,
        seller
      };
    });
  }

  static getAllUsers(): User[] {
    // Get users from AuthService
    return AuthService.getUsers();
  }

  static generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  static clearAllData(): void {
    localStorage.removeItem(VEHICLES_KEY);
    localStorage.removeItem(LISTINGS_KEY);
    localStorage.removeItem(TRADES_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(CONVERSATIONS_KEY);
    localStorage.removeItem(REVIEWS_KEY);
  }
} 

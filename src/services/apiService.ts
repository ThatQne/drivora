import { User, Vehicle, Listing, Review, Trade, Message, Conversation } from '../types/index.ts';

const API_BASE_URL = 'https://drivora.onrender.com/api';

class ApiService {
  private static getAuthToken(): string | null {
    return localStorage.getItem('carTrade_token');
  }

  private static getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication
  static async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    // Store token
    localStorage.setItem('carTrade_token', response.token);
    return response;
  }

  static async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    location?: string;
    phone?: string;
  }): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    // Store token
    localStorage.setItem('carTrade_token', response.token);
    return response;
  }

  static async checkUsername(username: string): Promise<{ exists: boolean }> {
    return this.request<{ exists: boolean }>('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
  }

  static async verifyToken(): Promise<{ valid: boolean; user?: User }> {
    try {
      return await this.request<{ valid: boolean; user: User }>('/auth/verify-token', {
        method: 'POST'
      });
    } catch (error) {
      return { valid: false };
    }
  }

  static logout(): void {
    localStorage.removeItem('carTrade_token');
  }

  // Image Upload
  static async uploadImage(imageBase64: string, folder: string = 'cartrade'): Promise<{ url: string }> {
    return this.request<{ url: string }>('/upload/image', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64, folder })
    });
  }

  // Users
  static async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  static async getUserProfile(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  static async updateUserProfile(userData: Partial<User>): Promise<User> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  static async getAllUsers(search?: string): Promise<User[]> {
    const endpoint = search ? `/users?search=${encodeURIComponent(search)}` : '/users';
    return this.request<User[]>(endpoint);
  }

  static async getUsersBatch(userIds: string[]): Promise<User[]> {
    return this.request<User[]>('/users/batch', {
      method: 'POST',
      body: JSON.stringify({ userIds })
    });
  }

  // Vehicles
  static async getUserVehicles(): Promise<Vehicle[]> {
    return this.request<Vehicle[]>('/vehicles');
  }

  static async getUserVehiclesCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/vehicles/count');
  }

  static async getVehiclesByUserId(userId: string): Promise<Vehicle[]> {
    return this.request<Vehicle[]>(`/vehicles/user/${userId}`);
  }

  static async getVehicle(vehicleId: string): Promise<Vehicle> {
    return this.request<Vehicle>(`/vehicles/${vehicleId}`);
  }

  static async createVehicle(vehicleData: {
    make: string;
    model: string;
    year: number;
    vin: string;
    mileage: number;
    transmission: 'manual' | 'automatic';
    estimatedValue: number;
    customPrice?: number;
    images?: string[];
  }): Promise<Vehicle> {
    return this.request<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    });
  }

  static async updateVehicle(vehicleId: string, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    return this.request<Vehicle>(`/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(vehicleData)
    });
  }

  static async deleteVehicle(vehicleId: string): Promise<void> {
    return this.request<void>(`/vehicles/${vehicleId}`, {
      method: 'DELETE'
    });
  }

  static async updateVehicleStatus(vehicleId: string, statusData: {
    isListed?: boolean;
    isAuctioned?: boolean;
    listingId?: string | null;
    auctionId?: string | null;
  }): Promise<Vehicle> {
    return this.request<Vehicle>(`/vehicles/${vehicleId}/update-status`, {
      method: 'POST',
      body: JSON.stringify(statusData)
    });
  }

  // Listings
  static async getAllListings(params?: {
    search?: string;
    make?: string;
    model?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
    tags?: string[];
    sortBy?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    listings: Listing[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });
    }
    
    const queryString = searchParams.toString();
    return this.request<{
      listings: Listing[];
      pagination: {
        current: number;
        pages: number;
        total: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`/listings${queryString ? `?${queryString}` : ''}`);
  }

  static async getAllListingsCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/listings/count');
  }

  static async getListing(listingId: string): Promise<Listing> {
    return this.request<Listing>(`/listings/${listingId}`);
  }

  static async getUserListings(): Promise<Listing[]> {
    return this.request<Listing[]>('/listings/my');
  }

  static async createListing(listingData: {
    vehicleId: string;
    title: string;
    description?: string;
    price: number;
    problems?: string[];
    additionalFeatures?: string[];
    tags?: string[];
  }): Promise<Listing> {
    return this.request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(listingData)
    });
  }

  static async updateListing(listingId: string, listingData: Partial<{
    title: string;
    description?: string;
    price: number;
    problems: string[];
    additionalFeatures: string[];
    tags: string[];
  }>): Promise<Listing> {
    return this.request<Listing>(`/listings/${listingId}`, {
      method: 'PUT',
      body: JSON.stringify(listingData)
    });
  }

  static async deleteListing(listingId: string): Promise<void> {
    return this.request<void>(`/listings/${listingId}`, {
      method: 'DELETE'
    });
  }

  static async renewListing(listingId: string): Promise<{ message: string; listing: any }> {
    return this.request<{ message: string; listing: any }>(`/listings/${listingId}/renew`, {
      method: 'POST'
    });
  }

  static async deactivateListing(listingId: string, soldTo?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/listings/${listingId}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ soldTo })
    });
  }

  // Health Check
  static async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return this.request<{ status: string; timestamp: string; uptime: number }>('/health');
  }

  // Reviews
  static async getUserReviews(userId: string): Promise<Review[]> {
    return this.request<Review[]>(`/reviews/user/${userId}`);
  }

  static async createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    return this.request<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  static async getExistingReview(targetUserId: string): Promise<Review | null> {
    try {
      return await this.request<Review>(`/reviews/between/${targetUserId}`);
    } catch (error) {
      // Return null if no review exists (404)
      if ((error as any)?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  // Trades
  static async getUserTrades(): Promise<Trade[]> {
    return this.request<Trade[]>('/trades');
  }

  static async createTrade(tradeData: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade> {
    return this.request<Trade>('/trades', {
      method: 'POST',
      body: JSON.stringify(tradeData)
    });
  }

  static async updateTrade(tradeId: string, tradeData: Partial<Trade>): Promise<Trade> {
    return this.request<Trade>(`/trades/${tradeId}`, {
      method: 'PUT',
      body: JSON.stringify(tradeData)
    });
  }

  static async deleteTrade(tradeId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/trades/${tradeId}`, {
      method: 'DELETE'
    });
  }

  static async cleanupCorruptedTrades(): Promise<{ message: string; deletedCount: number; deletedTradeIds: string[] }> {
    return this.request<{ message: string; deletedCount: number; deletedTradeIds: string[] }>('/trades/cleanup', {
      method: 'DELETE'
    });
  }

  static async cleanupVehicleFlags(): Promise<{ message: string; cleanedCount: number }> {
    return this.request<{ message: string; cleanedCount: number }>('/trades/cleanup-vehicles', {
      method: 'POST'
    });
  }

  // Messages
  static async getUserMessages(): Promise<Message[]> {
    return this.request<Message[]>('/messages/my');
  }

  static async getConversationMessages(userId: string, page: number = 1, limit: number = 20): Promise<{
    messages: Message[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    return this.request<{
      messages: Message[];
      pagination: {
        current: number;
        pages: number;
        total: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`/messages/conversation/${userId}?page=${page}&limit=${limit}`);
  }

  static async getConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/messages/conversations');
  }

  static async getUnreadMessageCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/messages/unread/count');
  }

  static async sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'read'>): Promise<Message> {
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  }

  static async markMessagesAsRead(conversationId: string): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>(`/messages/${conversationId}/read`, {
      method: 'POST'
    });
  }

  static async markConversationAsRead(userId: string): Promise<{ message: string; count: number }> {
    return this.request<{ message: string; count: number }>(`/messages/conversation/${userId}/read`, {
      method: 'POST'
    });
  }
}

export default ApiService; 
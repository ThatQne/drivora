interface WebSocketMessage {
  type: 'LISTING_ADDED' | 'LISTING_UPDATED' | 'LISTING_DELETED' | 
        'TRADE_CREATED' | 'TRADE_UPDATED' | 'TRADE_COMPLETED' | 
        'MESSAGE_RECEIVED' | 'VEHICLE_ADDED' | 'VEHICLE_UPDATED' | 
        'USER_ONLINE' | 'USER_OFFLINE' | 'TYPING_START' | 'TYPING_STOP';
  data: any;
  userId?: string;
  targetUserId?: string;
  timestamp: string;
}

interface WebSocketCallbacks {
  onListingAdded?: (listing: any) => void;
  onListingUpdated?: (listing: any) => void;
  onListingDeleted?: (listingId: string) => void;
  onTradeCreated?: (trade: any) => void;
  onTradeUpdated?: (trade: any) => void;
  onTradeCompleted?: (trade: any) => void;
  onMessageReceived?: (message: any) => void;
  onVehicleAdded?: (vehicle: any, userId: string) => void;
  onVehicleUpdated?: (vehicle: any, userId: string) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
  onTypingStart?: (userId: string, conversationId: string) => void;
  onTypingStop?: (userId: string, conversationId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private messageQueue: WebSocketMessage[] = [];

  // WebSocket server URL - adjust based on your backend
  private readonly WS_URL = process.env.REACT_APP_WS_URL || 
                           (process.env.NODE_ENV === 'production' 
                             ? 'wss://your-backend-domain.com' 
                             : 'ws://localhost:5000');

  connect(userId: string, token: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔗 WebSocket already connected');
      return;
    }

    this.currentUserId = userId;
    console.log('🔗 Connecting to WebSocket server...');

    try {
      // Include authentication in WebSocket connection
      this.ws = new WebSocket(`${this.WS_URL}?token=${token}&userId=${userId}`);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(event: Event) {
    console.log('✅ WebSocket connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send queued messages
    this.sendQueuedMessages();
    
    // Notify connection change
    this.callbacks.onConnectionChange?.(true);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('📨 WebSocket message received:', message.type, message.data);

      // Handle different message types
      switch (message.type) {
        case 'LISTING_ADDED':
          this.callbacks.onListingAdded?.(message.data);
          break;
        case 'LISTING_UPDATED':
          this.callbacks.onListingUpdated?.(message.data);
          break;
        case 'LISTING_DELETED':
          this.callbacks.onListingDeleted?.(message.data.listingId);
          break;
        case 'TRADE_CREATED':
          this.callbacks.onTradeCreated?.(message.data);
          break;
        case 'TRADE_UPDATED':
          this.callbacks.onTradeUpdated?.(message.data);
          break;
        case 'TRADE_COMPLETED':
          this.callbacks.onTradeCompleted?.(message.data);
          break;
        case 'MESSAGE_RECEIVED':
          this.callbacks.onMessageReceived?.(message.data);
          break;
        case 'VEHICLE_ADDED':
          this.callbacks.onVehicleAdded?.(message.data, message.userId!);
          break;
        case 'VEHICLE_UPDATED':
          this.callbacks.onVehicleUpdated?.(message.data, message.userId!);
          break;
        case 'USER_ONLINE':
          this.callbacks.onUserOnline?.(message.data.userId);
          break;
        case 'USER_OFFLINE':
          this.callbacks.onUserOffline?.(message.data.userId);
          break;
        case 'TYPING_START':
          this.callbacks.onTypingStart?.(message.data.userId, message.data.conversationId);
          break;
        case 'TYPING_STOP':
          this.callbacks.onTypingStop?.(message.data.userId, message.data.conversationId);
          break;
        default:
          console.warn('⚠️ Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('🔌 WebSocket connection closed:', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();
    this.callbacks.onConnectionChange?.(false);

    // Attempt to reconnect unless it was a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    console.error('❌ WebSocket error:', event);
    this.isConnected = false;
    this.callbacks.onConnectionChange?.(false);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (this.currentUserId) {
        const token = localStorage.getItem('carTrade_token');
        if (token) {
          this.connect(this.currentUserId, token);
        }
      }
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendQueuedMessages() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private sendMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      console.log('📝 Message queued for later delivery:', message.type);
    }
  }

  // Public methods for sending different types of messages
  sendTypingStart(conversationId: string) {
    this.sendMessage({
      type: 'TYPING_START',
      data: { conversationId, userId: this.currentUserId },
      timestamp: new Date().toISOString()
    });
  }

  sendTypingStop(conversationId: string) {
    this.sendMessage({
      type: 'TYPING_STOP',
      data: { conversationId, userId: this.currentUserId },
      timestamp: new Date().toISOString()
    });
  }

  // Register callbacks for different events
  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Get connection status
  isConnectedToServer(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Disconnect
  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.currentUserId = null;
    this.messageQueue = [];
    this.callbacks.onConnectionChange?.(false);
  }

  // Force reconnect
  reconnect() {
    this.disconnect();
    if (this.currentUserId) {
      const token = localStorage.getItem('carTrade_token');
      if (token) {
        setTimeout(() => {
          this.connect(this.currentUserId!, token);
        }, 1000);
      }
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService; 
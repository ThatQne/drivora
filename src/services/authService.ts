import { User } from '../types/index.ts';

const STORAGE_KEY = 'carTrade_auth';
const USERS_KEY = 'carTrade_users';

export class AuthService {
  static getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static getUsers(): User[] {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  static async login(username: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const users = this.getUsers();
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        if (rememberMe) {
          localStorage.setItem('carTrade_remember', 'true');
        }
        return { success: true, user };
      } else {
        return { success: false, error: 'Invalid username or password' };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  }

  static checkUsernameExists(username: string): boolean {
    const users = this.getUsers();
    return users.some(u => u.username === username);
  }

  static async checkUsernameAvailability(username: string): Promise<boolean> {
    return !this.checkUsernameExists(username);
  }

  static getPasswordStrength(password: string): { score: number; text: string; color: string } {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score === 0) return { score, text: 'Very Weak', color: 'text-red-500' };
    if (score === 1) return { score, text: 'Weak', color: 'text-red-400' };
    if (score === 2) return { score, text: 'Fair', color: 'text-yellow-500' };
    if (score === 3) return { score, text: 'Good', color: 'text-blue-400' };
    if (score === 4) return { score, text: 'Strong', color: 'text-green-400' };
    return { score, text: 'Very Strong', color: 'text-green-500' };
  }

  static async register(userData: Omit<User, 'id' | 'createdAt'>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const users = this.getUsers();
      
      // Check if username already exists
      if (users.some(u => u.username === userData.username)) {
        return { success: false, error: 'Username already exists' };
      }

      // Check if email already exists
      if (users.some(u => u.email === userData.email)) {
        return { success: false, error: 'Email already exists' };
      }

      const newUser: User = {
        ...userData,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      this.saveUsers(users);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  static updateUser(updatedUser: User): void {
    try {
      console.log('AuthService updateUser called with:', updatedUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      
      const users = this.getUsers();
      console.log('Current users:', users);
      const userIndex = users.findIndex(u => u.id === updatedUser.id);
      console.log('User index found:', userIndex);
      
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        this.saveUsers(users);
        console.log('User updated successfully in AuthService');
      } else {
        console.warn('User not found in users array, adding as new user');
        users.push(updatedUser);
        this.saveUsers(users);
      }
    } catch (error) {
      console.error('Error in AuthService updateUser:', error);
      throw error;
    }
  }
} 
 
 
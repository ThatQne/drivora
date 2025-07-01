import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Edit, Save, X, Upload, Mail, Lock, Eye, EyeOff, Camera } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { AuthService } from '../../services/authService.ts';
import ApiService from '../../services/apiService.ts';

export function ProfileView() {
  const { state, updateUser, showSuccess, showError, showWarning, showInfo } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    username: state.currentUser?.username || '',
    email: state.currentUser?.email || '',
    firstName: state.currentUser?.firstName || '',
    lastName: state.currentUser?.lastName || '',
    location: state.currentUser?.location || '',
    phone: state.currentUser?.phone || '',
    avatar: state.currentUser?.avatar || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const compressImage = (file: File, maxSizeMB: number = 5): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not supported'));
          return;
        }
        
        const img = new Image();
        
        img.onload = () => {
          try {
            // Calculate new dimensions to maintain aspect ratio
            const maxWidth = 800;
            const maxHeight = 800;
            let { width, height } = img;
            
            if (width > height) {
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Start with high quality and reduce if needed
            let quality = 0.8;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Reduce quality until file size is acceptable (with safety limit)
            let attempts = 0;
            const maxAttempts = 10;
            while (compressedDataUrl.length > maxSizeMB * 1024 * 1024 * 1.37 && quality > 0.1 && attempts < maxAttempts) {
              quality -= 0.1;
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
              attempts++;
            }
            
            if (compressedDataUrl.length > maxSizeMB * 1024 * 1024 * 1.37) {
              reject(new Error('Unable to compress image to acceptable size'));
              return;
            }
            
            // Clean up
            URL.revokeObjectURL(img.src);
            resolve(compressedDataUrl);
          } catch (error) {
            console.error('Error during image compression:', error);
            reject(new Error('Failed to compress image: ' + (error instanceof Error ? error.message : 'Unknown error')));
          }
        };
        
        img.onerror = (error) => {
          console.error('Image load error:', error);
          reject(new Error('Failed to load image for compression'));
        };
        
        // Create object URL and set source
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        
        // Set timeout to prevent hanging
        setTimeout(() => {
          if (!img.complete) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Image loading timeout'));
          }
        }, 10000); // 10 second timeout
        
      } catch (error) {
        console.error('Error setting up image compression:', error);
        reject(new Error('Failed to setup image compression: ' + (error instanceof Error ? error.message : 'Unknown error')));
      }
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Selected file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Check file type
    if (!file.type.startsWith('image/')) {
      showError('Invalid File Type', 'Please select a valid image file (jpg, png, gif, etc.)');
      return;
    }

    // Check if file is corrupted or empty
    if (file.size === 0) {
      showError('Invalid File', 'Selected file appears to be empty or corrupted');
      return;
    }

    // Check maximum file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      showError('File Too Large', 'Image file is too large. Please select an image smaller than 50MB.');
      return;
    }

    setLoading(true);
    showInfo('Uploading Image', 'Processing your avatar image...');
    
    try {
      let imageUrl: string;
      
      // If file is larger than 5MB, compress it
      if (file.size > 5 * 1024 * 1024) {
        console.log('File size exceeds 5MB, compressing...', file.size);
        try {
          imageUrl = await compressImage(file, 5);
          console.log('Image compressed successfully');
          showInfo('Image Compressed', 'Image was compressed to reduce file size.');
        } catch (compressionError) {
          console.error('Compression failed:', compressionError);
          showError('Compression Failed', 'Failed to compress image: ' + (compressionError instanceof Error ? compressionError.message : 'Unknown compression error'));
          return;
        }
      } else {
        // Use original file if under 5MB
        console.log('File size acceptable, using original');
        try {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
              try {
                const result = event.target?.result;
                if (typeof result === 'string') {
                  resolve(result);
                } else {
                  reject(new Error('FileReader result is not a string'));
                }
              } catch (error) {
                reject(error);
              }
            };
            
            reader.onerror = (error) => {
              console.error('FileReader error:', error);
              reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
          });
        } catch (fileError) {
          console.error('File reading failed:', fileError);
          showError('File Read Error', 'Failed to read image file: ' + (fileError instanceof Error ? fileError.message : 'Unknown file error'));
          return;
        }
      }
      
      // Update profile data with new avatar
      setProfileData(prev => ({
        ...prev,
        avatar: imageUrl
      }));

      showSuccess('Avatar Updated!', 'Your profile picture has been updated. Don\'t forget to save your changes.');
      
    } catch (error) {
      console.error('Avatar upload failed:', error);
      showError('Upload Failed', 'Failed to upload avatar: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
      // Clear the input to allow re-selecting the same file
      e.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!state.currentUser) {
      showError('Authentication Error', 'User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Validate username format (no spaces, special characters allowed, max 24 chars)
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(profileData.username) || profileData.username.length > 24) {
        showError('Invalid Username', 'Username can only contain letters, numbers, underscores, and hyphens. Maximum 24 characters.');
        setLoading(false);
        return;
      }

      // Check if username is available (if changed)
      if (profileData.username !== state.currentUser.username) {
        const result = await ApiService.checkUsername(profileData.username);
        if (result.exists) {
          showError('Username Taken', 'Username is already taken. Please choose another.');
          setLoading(false);
          return;
        }
      }

      // Update user data via API
      const updatedUser = await ApiService.updateUserProfile({
        username: profileData.username,
        email: profileData.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        location: profileData.location,
        phone: profileData.phone,
        avatar: profileData.avatar,
      });

      console.log('Profile updated successfully:', updatedUser);
      
      // Update local state
      if (typeof updateUser === 'function') {
        updateUser({ ...updatedUser, id: updatedUser._id || updatedUser.id });
        showSuccess('Profile Updated!', 'Your profile information has been saved successfully.');
        setIsEditing(false);
      } else {
        throw new Error('updateUser function not available');
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      showError('Update Failed', 'Failed to update profile: ' + (error.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!state.currentUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Password Mismatch', 'New passwords do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showError('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Change password via API
      await ApiService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      showSuccess('Password Changed!', 'Your password has been updated successfully.');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      showError('Password Change Failed', 'Failed to change password: ' + (error.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '' };
    if (password.length < 6) return { strength: 1, label: 'Weak' };
    if (password.length < 8) return { strength: 2, label: 'Fair' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 4, label: 'Strong' };
    }
    return { strength: 3, label: 'Good' };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  // Test notification functions
  const testNotifications = () => {
    showSuccess('Success!', 'This is a success notification');
    setTimeout(() => showError('Authentication Failed', 'Invalid credentials provided. Please check your username and password and try again. Error code: AUTH_001'), 1000);
    setTimeout(() => showWarning('Warning!', 'This is a warning notification'), 2000);
    setTimeout(() => showInfo('Info!', 'This is an info notification'), 3000);
  };

  if (!state.currentUser) {
    return (
      <div className="text-center py-16">
        <h1 className="text-3xl font-bold text-primary-100 mb-4">Profile</h1>
        <p className="text-primary-300">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-100">Profile Settings</h1>
          <p className="text-primary-300 mt-1">Manage your account information and preferences</p>
        </div>
        
        {/* Test Notifications Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={testNotifications}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Test Notifications
        </motion.button>
      </div>

      {/* Profile Information Card */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary-100">Profile Information</h2>
          {!isEditing ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Profile</span>
            </motion.button>
          ) : (
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveProfile}
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsEditing(false);
                  setProfileData({
                    username: state.currentUser?.username || '',
                    email: state.currentUser?.email || '',
                    firstName: state.currentUser?.firstName || '',
                    lastName: state.currentUser?.lastName || '',
                    location: state.currentUser?.location || '',
                    phone: state.currentUser?.phone || '',
                    avatar: state.currentUser?.avatar || '',
                  });
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </motion.button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 bg-primary-800/50 rounded-full flex items-center justify-center overflow-hidden">
                {profileData.avatar ? (
                  <img
                    src={profileData.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-primary-300" />
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full cursor-pointer transition-colors">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-100">@{profileData.username}</p>
              <p className="text-sm text-primary-400">
                Member since {new Date(state.currentUser.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Profile Fields */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="input-field"
                  maxLength="24"
                  pattern="[a-zA-Z0-9_-]+"
                  required
                />
                {isEditing && (
                  <p className="text-xs text-primary-400 mt-1">
                    Letters, numbers, underscores, and hyphens only. Max 24 characters.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Email (Recovery)
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="input-field"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={profileData.firstName}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="input-field"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={profileData.lastName}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="input-field"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={profileData.location}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="input-field"
                  placeholder="City, State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="input-field"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-primary-100">Change Password</h2>
          {!isChangingPassword ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsChangingPassword(true)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Change Password</span>
            </motion.button>
          ) : (
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleChangePassword}
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Update Password</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
                className="btn-secondary flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </motion.button>
            </div>
          )}
        </div>

        {isChangingPassword && (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-300"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="input-field pr-10"
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-300"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-primary-800/30 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                          passwordStrength.strength === 2 ? 'bg-yellow-500 w-2/4' :
                          passwordStrength.strength === 3 ? 'bg-blue-500 w-3/4' :
                          passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.strength === 1 ? 'text-red-400' :
                      passwordStrength.strength === 2 ? 'text-yellow-400' :
                      passwordStrength.strength === 3 ? 'text-blue-400' :
                      passwordStrength.strength === 4 ? 'text-green-400' : 'text-primary-400'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
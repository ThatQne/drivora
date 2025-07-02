import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Save, X, Camera, User } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import ApiService from '../../services/apiService.ts';
import { compressImage } from '../../utils/imageUtils.ts';

export function ProfileViewUpdated() {
  const { state, updateUser } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileData, setProfileData] = useState({
    username: state.currentUser?.username || '',
    email: state.currentUser?.email || '',
    firstName: state.currentUser?.firstName || '',
    lastName: state.currentUser?.lastName || '',
    location: state.currentUser?.location || '',
    phone: state.currentUser?.phone || '',
    avatar: state.currentUser?.avatar || '',
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please select a valid image file.');
      return;
    }

    setUploadingImage(true);
    
    try {
      // Compress the image before uploading
      const compressedFile = await compressImage(file, {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 400, // For profile pictures
      });

      // Convert to base64 for upload
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const result = event.target?.result;
            if (typeof result === 'string') {
              resolve(result);
            } else {
              reject(new Error('FileReader result is not a string'));
            }
          } catch (err) {
            reject(new Error('Error processing file reader result: ' + (err instanceof Error ? err.message : 'Unknown error')));
          }
        };
        
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(new Error('Failed to read file: ' + (reader.error?.message || 'Unknown file reading error')));
        };
        
        reader.onabort = () => {
          reject(new Error('File reading was aborted'));
        };
        
        // Add timeout for file reading
        setTimeout(() => {
          if (reader.readyState === FileReader.LOADING) {
            reader.abort();
            reject(new Error('File reading timeout'));
          }
        }, 30000); // 30 second timeout
        
        reader.readAsDataURL(compressedFile);
      });

      const uploadResponse = await ApiService.uploadImage(imageBase64, 'profile-pictures');
      
      setProfileData(prev => ({ ...prev, avatar: uploadResponse.url }));

      if (state.currentUser) {
          const savedUser = await ApiService.updateUserProfile({ avatar: uploadResponse.url });
        updateUser(savedUser); // This now only updates context state
        showSuccess('Avatar Updated!', 'Your new profile picture has been saved.');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      showError('Upload Failed', error instanceof Error ? error.message : 'Could not upload image.');
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Clear input
    }
  };

  const handleSaveProfile = async () => {
    if (!state.currentUser) {
      alert('User not found. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      // Validate username format (no spaces, special characters allowed, max 24 chars)
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(profileData.username) || profileData.username.length > 24) {
        alert('Username can only contain letters, numbers, underscores, and hyphens. Maximum 24 characters.');
        setLoading(false);
        return;
      }

      console.log('Updating user with data:', profileData);
      
      // Update user data via API
      const updatedUser = await ApiService.updateUserProfile(profileData);
      updateUser(updatedUser); // This now only updates context state
      showSuccess('Profile Updated', 'Your information has been saved successfully.');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      showError('Update Failed', error instanceof Error ? error.message : 'Could not save profile.');
    } finally {
      setLoading(false);
    }
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
                <label className={`absolute bottom-0 right-0 ${uploadingImage ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'} text-white p-2 rounded-full cursor-pointer transition-colors`}>
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary-100">@{profileData.username}</p>
              <p className="text-sm text-primary-400">
                Member since {new Date(state.currentUser.createdAt).toLocaleDateString()}
              </p>
              {uploadingImage && (
                <p className="text-xs text-blue-400 mt-2">Uploading image...</p>
              )}
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
                  maxLength={24}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  className="input-field"
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
    </div>
  );
} 
 
 
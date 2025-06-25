import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, UserPlus, Car, HelpCircle, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { AuthService } from '../../services/authService.ts';
import ApiService from '../../services/apiService.ts';

const validateInput = (value: string): string => {
  // Remove spaces and limit to 24 characters
  let cleaned = value.replace(/\s/g, '').slice(0, 24);
  // Remove numbers, keep only letters and special characters
  return cleaned;
};

export function SmartAuthForm() {
  const { login, register, state } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [usernameExists, setUsernameExists] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const passwordStrength = useMemo(() => 
    password ? AuthService.getPasswordStrength(password) : null,
    [password]
  );

  // Check username existence with API
  useEffect(() => {
    const checkUsername = async () => {
      if (!username.trim() || username.length < 2) {
        setUsernameExists(null);
        return;
      }

      setCheckingUsername(true);
      try {
        const result = await ApiService.checkUsername(username.trim());
        setUsernameExists(result.exists);
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameExists(null);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500); // Debounce API calls
    return () => clearTimeout(timer);
  }, [username]);

  const getAuthStatus = () => {
    if (!username.trim()) return null;
    
    if (checkingUsername) {
      return {
        text: 'Checking username...',
        icon: <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />,
        color: 'var(--color-text-secondary)',
        bgColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border-primary)'
      };
    }

    if (usernameExists === true) {
      return {
        text: 'Ready to sign in',
        icon: <LogIn className="w-4 h-4" />,
        color: 'var(--color-info)',
        bgColor: 'var(--color-info-bg)',
        borderColor: 'var(--color-info-border)'
      };
    } else if (usernameExists === false) {
      return {
        text: 'Will create new account',
        icon: <UserPlus className="w-4 h-4" />,
        color: 'var(--color-success)',
        bgColor: 'var(--color-success-bg)',
        borderColor: 'var(--color-success-border)'
      };
    }

    return null;
  };

  const authStatus = getAuthStatus();

  useEffect(() => {
    setError('');
  }, [username, password]);

  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => setIsTyping(false), 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validated = validateInput(e.target.value);
    setUsername(validated);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validated = validateInput(e.target.value);
    setPassword(validated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    try {
      if (usernameExists === true) {
        // Login existing user
        const result = await login(username.trim(), password, rememberMe);
        if (!result.success) {
          setError(result.error || 'Login failed');
        }
      } else if (usernameExists === false) {
        // Register new user
        if (password.length < 6) {
          setError('Password must be at least 6 characters for new accounts');
          return;
        }

        const userData = {
          username: username.trim(),
          email: `${username.trim()}@example.com`, // Placeholder email
          password: password,
        };

        const result = await register(userData);
        if (!result.success) {
          setError(result.error || 'Registration failed');
        }
      } else {
        // Username existence not determined yet
        setError('Please wait while we check the username');
        return;
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    alert('Password reset functionality would be implemented here');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      background: `linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 50%, var(--color-bg-primary) 100%)`
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '28rem' }}
      >
        <div className="glass-effect" style={{ borderRadius: '1rem', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              style={{
                width: '5rem',
                height: '5rem',
                background: `linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto'
              }}
            >
              <Car style={{ width: '2.5rem', height: '2.5rem', color: 'var(--color-bg-primary)' }} />
            </motion.div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                                Drivora
            </h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <label htmlFor="username" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="input-field"
                placeholder="Enter your username"
                disabled={state.loading}
                autoComplete="username"
                maxLength={24}
              />
              
              {/* Auth Status */}
              {authStatus && !isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${authStatus.borderColor}`,
                    background: authStatus.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {authStatus.icon}
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: authStatus.color }}>
                    {authStatus.text}
                  </span>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  className="input-field"
                  style={{ paddingRight: password ? '3rem' : '1rem' }}
                  placeholder="Enter your password"
                  disabled={state.loading}
                  autoComplete="new-password"
                  maxLength={24}
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-tertiary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                      padding: '0.25rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                    disabled={state.loading}
                  >
                    {showPassword ? <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} /> : <Eye style={{ width: '1.25rem', height: '1.25rem' }} />}
                  </button>
                )}
              </div>

              {/* Password Strength Indicator */}
              {password && passwordStrength && usernameExists === false && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: '0.5rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Password strength</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: passwordStrength.color }}>
                      {passwordStrength.text}
                    </span>
                  </div>
                  <div style={{ width: '100%', background: 'var(--color-bg-tertiary)', borderRadius: '9999px', height: '0.375rem' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      transition={{ duration: 0.3 }}
                      style={{
                        height: '0.375rem',
                        borderRadius: '9999px',
                        transition: 'all 0.3s ease',
                        background: passwordStrength.score <= 1 ? 'var(--color-error)' :
                                   passwordStrength.score <= 2 ? 'var(--color-warning)' :
                                   passwordStrength.score <= 3 ? 'var(--color-info)' :
                                   passwordStrength.score <= 4 ? 'var(--color-success)' :
                                   'var(--color-success)'
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Options Row */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: '1rem',
                    height: '1rem',
                    accentColor: 'var(--color-accent-primary)',
                    backgroundColor: 'var(--color-input-bg)',
                    border: `1px solid var(--color-border-primary)`,
                    borderRadius: '0.25rem'
                  }}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                <HelpCircle style={{ width: '1rem', height: '1rem' }} />
                <span>Forgot password?</span>
              </button>
            </motion.div>

            {(error || state.error) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'var(--color-error-bg)',
                  border: `1px solid var(--color-error-border)`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  color: 'var(--color-error)',
                  fontSize: '0.875rem'
                }}
              >
                {error || state.error}
              </motion.div>
            )}

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              type="submit"
              disabled={state.loading || !username.trim() || !password.trim() || checkingUsername || usernameExists === null}
              className="btn-primary"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem'
              }}
            >
              {state.loading ? (
                <div style={{
                  width: '1.25rem',
                  height: '1.25rem',
                  border: `2px solid var(--color-bg-primary)`,
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : checkingUsername ? (
                <>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    border: `2px solid currentColor`,
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  {usernameExists === true ? (
                    <LogIn style={{ width: '1.25rem', height: '1.25rem' }} />
                  ) : (
                    <UserPlus style={{ width: '1.25rem', height: '1.25rem' }} />
                  )}
                  <span>
                    {usernameExists === true ? 'Sign In' : 'Create Account'}
                  </span>
                </>
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: `1px solid var(--color-border-primary)`
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Your modern vehicle trading platform
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check style={{ width: '0.75rem', height: '0.75rem' }} />
                  <span>Secure</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check style={{ width: '0.75rem', height: '0.75rem' }} />
                  <span>Fast</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Check style={{ width: '0.75rem', height: '0.75rem' }} />
                  <span>Simple</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
} 
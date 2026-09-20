import React, { useState } from 'react';
import {
  X,
  User,
  Check,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  Loader2,
  Sparkles,
  LogOut,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  signInWithGoogle,
  signInWithEmail,
  registerWithEmail,
  resetPassword,
  signInAsGuest,
  logOut,
  mapFirebaseUserToProfile,
  auth
} from '../utils/firebase';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: UserProfile) => void;
  initialProfile: UserProfile | null;
}

type AuthMode = 'sign_in' | 'register' | 'forgot_password';

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  initialProfile
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFirebaseUser = auth.currentUser;

  // Format human-friendly error messages from Firebase error codes
  const parseFirebaseError = (err: unknown): string => {
    const error = err as { code?: string; message?: string };
    if (!error.code) return error.message || 'An unexpected authentication error occurred. Please try again.';

    switch (error.code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password. Please verify your credentials or reset your password.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters long.';
      case 'auth/popup-closed-by-user':
        return 'The Google sign-in window was closed before completion.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please allow popups for this page or use email sign-in.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection and retry.';
      case 'auth/too-many-requests':
        return 'Access temporarily restricted due to multiple failed attempts. Please try again later.';
      default:
        return error.message || 'Authentication failed. Please try again.';
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const user = await signInWithGoogle();
      const profile = mapFirebaseUserToProfile(user);
      onSaveProfile(profile);
      setSuccessMessage('Signed in with Google successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Sign In / Registration
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'sign_in') {
        const user = await signInWithEmail(email, password);
        const profile = mapFirebaseUserToProfile(user);
        onSaveProfile(profile);
        setSuccessMessage('Welcome back! Signed in successfully.');
        setTimeout(() => onClose(), 1000);
      } else if (authMode === 'register') {
        if (!displayName.trim()) {
          setErrorMessage('Please enter your name.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters.');
          setIsLoading(false);
          return;
        }
        const user = await registerWithEmail(email, password, displayName);
        const profile = mapFirebaseUserToProfile(user);
        onSaveProfile(profile);
        setSuccessMessage('Account created successfully!');
        setTimeout(() => onClose(), 1000);
      } else if (authMode === 'forgot_password') {
        if (!email.trim()) {
          setErrorMessage('Please provide your account email address.');
          setIsLoading(false);
          return;
        }
        await resetPassword(email);
        setSuccessMessage('Password reset link sent! Please check your email inbox.');
        setTimeout(() => {
          setAuthMode('sign_in');
          setSuccessMessage(null);
        }, 4000);
      }
    } catch (err) {
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Guest / Anonymous Sign In
  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const user = await signInAsGuest();
      const profile = mapFirebaseUserToProfile(user);
      onSaveProfile(profile);
      setSuccessMessage('Connected as Guest. Your reflections are saved locally and in your private session.');
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logOut();
      onClose();
    } catch (err) {
      setErrorMessage(parseFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl border border-[#E8E2D9] relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B7268] hover:bg-[#F4F7F4] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* If user is already signed in and not anonymous */}
        {currentFirebaseUser && !currentFirebaseUser.isAnonymous ? (
          <div className="space-y-5">
            <div className="flex items-center space-x-3.5">
              {currentFirebaseUser.photoURL ? (
                <img
                  src={currentFirebaseUser.photoURL}
                  alt=""
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[#3D5A45]/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#3D5A45] text-white flex items-center justify-center text-lg font-bold">
                  {(currentFirebaseUser.displayName || currentFirebaseUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-editorial text-xl font-bold text-[#233227]">
                  {currentFirebaseUser.displayName || 'Wealth Habits User'}
                </h3>
                <p className="text-xs text-[#636C62]">{currentFirebaseUser.email}</p>
              </div>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EFE9DE] space-y-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#20603D]">
                <ShieldCheck className="w-4 h-4" />
                <span>Connected with Firebase Cloud Sync</span>
              </div>
              <p className="text-[11px] text-[#636C62] leading-relaxed">
                Your transactions, reflections, and personalized rules are safely associated with your personal account and synced across your devices.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#D5CBBF] text-xs font-semibold text-[#636C62] hover:bg-[#FAF7F2] transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FEF3EB] hover:bg-[#FCD8BD] text-[#B25E1A] text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#E4ECE4] text-[#3D5A45] flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#233227]">
                {authMode === 'sign_in' && 'Sign In to Wealth Habits'}
                {authMode === 'register' && 'Create Your Account'}
                {authMode === 'forgot_password' && 'Reset Password'}
              </h3>
              <p className="text-xs text-[#636C62] mt-1">
                {authMode === 'forgot_password'
                  ? 'Enter your account email and we will send a password reset link.'
                  : 'Sync your Nigerian financial transactions and reflections securely across devices.'}
              </p>
            </div>

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-[#FEF3EB] border border-[#FCD8BD] text-[#B25E1A] text-xs flex items-start space-x-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-[#EAF5EC] border border-[#BFE3C7] text-[#20603D] text-xs flex items-start space-x-2 animate-fadeIn">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {authMode !== 'forgot_password' && (
              <>
                {/* 1. Primary Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-2xl border border-[#D5CBBF] bg-[#FAF7F2] hover:bg-[#F4F7F4] text-xs sm:text-sm font-semibold text-[#233227] transition-all shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#3D5A45]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#E8E2D9]"></div>
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#8A9588] tracking-wider">
                    Or Use Email
                  </span>
                  <div className="flex-grow border-t border-[#E8E2D9]"></div>
                </div>
              </>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#233227] mb-1">
                    Your Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Blessing"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs sm:text-sm text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                    />
                    <User className="w-4 h-4 text-[#8A9588] absolute left-3 top-3" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#233227] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs sm:text-sm text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                  />
                  <Mail className="w-4 h-4 text-[#8A9588] absolute left-3 top-3" />
                </div>
              </div>

              {authMode !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#233227]">
                      Password
                    </label>
                    {authMode === 'sign_in' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot_password');
                          setErrorMessage(null);
                        }}
                        className="text-[11px] text-[#3D5A45] hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D5CBBF] bg-[#FAF7F2] text-xs sm:text-sm text-[#233227] focus:outline-none focus:ring-2 focus:ring-[#3D5A45]"
                    />
                    <Lock className="w-4 h-4 text-[#8A9588] absolute left-3 top-3" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#3D5A45] hover:bg-[#344D3A] text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-sm transition disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === 'sign_in' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In with Email</span>
                  </>
                ) : authMode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send Reset Email</span>
                  </>
                )}
              </button>
            </form>

            {/* Mode Switcher */}
            <div className="pt-2 text-center text-xs text-[#636C62] space-y-2">
              {authMode === 'sign_in' && (
                <p>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setErrorMessage(null);
                    }}
                    className="text-[#3D5A45] font-semibold hover:underline"
                  >
                    Create one
                  </button>
                </p>
              )}

              {authMode === 'register' && (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('sign_in');
                      setErrorMessage(null);
                    }}
                    className="text-[#3D5A45] font-semibold hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              )}

              {authMode === 'forgot_password' && (
                <p>
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('sign_in');
                      setErrorMessage(null);
                    }}
                    className="text-[#3D5A45] font-semibold hover:underline"
                  >
                    Return to Sign In
                  </button>
                </p>
              )}

              {/* Guest Access Option */}
              <div className="pt-2 border-t border-[#E8E2D9]">
                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  disabled={isLoading}
                  className="text-[11px] font-medium text-[#759A7E] hover:text-[#233227] transition flex items-center justify-center space-x-1 mx-auto"
                >
                  <span>Or continue as Guest (Local exploration)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

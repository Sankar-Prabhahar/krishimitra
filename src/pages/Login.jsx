import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Check if profile is complete
      if (result.user.isProfileComplete) {
        navigate('/');
      } else {
        navigate('/farm-setup');
      }
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const handleGuestLogin = () => {
    const result = loginAsGuest();
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-gradient-1"></div>
        <div className="auth-gradient-2"></div>
        <div className="auth-pattern"></div>
      </div>

      <div className="auth-container">
        <div className="auth-card">
          {/* Logo Section */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Leaf size={32} />
            </div>
            <h1>{t('app_name')}</h1>
            <p>{t('app_tagline')}</p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>{t('login_title')}</h2>
            <p className="auth-subtitle">{t('login_subtitle')}</p>

            {error && (
              <div className="auth-error">
                <span>{error}</span>
              </div>
            )}

            <div className="auth-input-group">
              <Mail size={20} className="auth-input-icon" />
              <input
                type="email"
                placeholder={t('email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-group">
              <Lock size={20} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="spin" />
                  <span>{t('logging_in')}</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>{t('login_btn')}</span>
                </>
              )}
            </button>

            <div className="auth-divider">
              <span>{t('or')}</span>
            </div>

            <button
              type="button"
              className="auth-guest-btn"
              onClick={handleGuestLogin}
            >
              <span>Continue as Guest</span>
            </button>

            <p className="auth-switch">
              {t('no_account') || "Don't have an account?"}{' '}
              <Link to="/signup">{t('signup_link') || 'Sign Up'}</Link>
            </p>
          </form>
        </div>

        {/* Decorative Elements */}
        <div className="auth-decoration">
          <div className="auth-deco-circle"></div>
          <div className="auth-deco-leaves">🌾</div>
        </div>
      </div>
    </div>
  );
};

export default Login;

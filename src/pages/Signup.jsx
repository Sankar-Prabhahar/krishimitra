import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserPlus, Loader2, Leaf, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // Password strength checker
  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: strength, text: t('weak') || 'Weak', color: '#ef4444' };
    if (strength <= 3) return { level: strength, text: t('medium') || 'Medium', color: '#f59e0b' };
    return { level: strength, text: t('strong') || 'Strong', color: '#22c55e' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('password_mismatch') || 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError(t('password_too_short') || 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const result = await signup(formData.name, formData.email, formData.password);
    
    if (result.success) {
      navigate('/farm-setup');
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-gradient-1"></div>
        <div className="auth-gradient-2"></div>
        <div className="auth-pattern"></div>
      </div>

      <div className="auth-container">
        <div className="auth-card signup-card">
          {/* Logo Section */}
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Leaf size={32} />
            </div>
            <h1>कृषि मित्र</h1>
            <p>{t('app_tagline') || 'Your Smart Farming Companion'}</p>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="auth-form">
            <h2>{t('signup_title') || 'Create Account'}</h2>
            <p className="auth-subtitle">{t('signup_subtitle') || 'Join thousands of smart farmers'}</p>

            {error && (
              <div className="auth-error">
                <span>{error}</span>
              </div>
            )}

            <div className="auth-input-group">
              <User size={20} className="auth-input-icon" />
              <input
                type="text"
                name="name"
                placeholder={t('name_placeholder') || 'Full Name'}
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-input-group">
              <Mail size={20} className="auth-input-icon" />
              <input
                type="email"
                name="email"
                placeholder={t('email_placeholder') || 'Email Address'}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-input-group">
              <Lock size={20} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder={t('password_placeholder') || 'Password'}
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
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

            {formData.password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`strength-bar ${i <= passwordStrength.level ? 'active' : ''}`}
                      style={{ backgroundColor: i <= passwordStrength.level ? passwordStrength.color : '' }}
                    />
                  ))}
                </div>
                <span style={{ color: passwordStrength.color }}>{passwordStrength.text}</span>
              </div>
            )}

            <div className="auth-input-group">
              <CheckCircle size={20} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder={t('confirm_password') || 'Confirm Password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="spin" />
                  <span>{t('creating_account') || 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  <span>{t('signup_btn') || 'Create Account'}</span>
                </>
              )}
            </button>

            <div className="auth-divider">
              <span>{t('or') || 'or'}</span>
            </div>

            <p className="auth-switch">
              {t('have_account') || 'Already have an account?'}{' '}
              <Link to="/login">{t('login_link') || 'Sign In'}</Link>
            </p>
          </form>
        </div>

        {/* Decorative Elements */}
        <div className="auth-decoration">
          <div className="auth-deco-circle"></div>
          <div className="auth-deco-leaves">🌱</div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

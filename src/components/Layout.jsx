import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sprout, Home, Target, Leaf, Bug, Droplets, TrendingUp, CloudSun, Globe, LogOut, User } from 'lucide-react';
import ChatBot from './ChatBot';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage, languages } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };
  
  const navItems = [
    { path: '/', icon: Home, label: t('nav_home') },
    { path: '/crop-recommendation', icon: Target, label: t('nav_recommend') },
    { path: '/crop-tracking', icon: Leaf, label: t('nav_track') },
    { path: '/disease-detection', icon: Bug, label: t('nav_disease'), isExternal: true, href: '/scan.html' },
    { path: '/soil-water', icon: Droplets, label: t('nav_soil'), isExternal: true, href: '/car.html' },
    { path: '/market', icon: TrendingUp, label: t('nav_market') },
    { path: '/weather', icon: CloudSun, label: t('nav_weather') }
  ];
  
  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-container">
      <header className="header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <Sprout size={32} color="var(--color-primary)" />
            <span className="logo-text">{t('app_name')}</span>
          </Link>

          <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <nav className="desktop-nav">
              {navItems.map(item => (
                item.isExternal ? (
                  <a 
                    key={item.path} 
                    href={item.href}
                    className="nav-link"
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )
              ))}
            </nav>

            <div className="lang-selector-wrapper" style={{ position: 'relative' }}>
              <Globe size={20} color="var(--color-primary)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ 
                  padding: '0.5rem 0.5rem 0.5rem 2.2rem', 
                  borderRadius: '20px', 
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  outline: 'none',
                  color: 'var(--color-text-main)'
                }}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.native}</option>
                ))}
              </select>
            </div>

            {/* User Menu / Logout Button */}
            {isAuthenticated && (
              <button 
                onClick={handleLogout}
                className="logout-btn"
                title="Logout"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-main)',
                  transition: 'all 0.2s'
                }}
              >
                <User size={16} />
                <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
                <LogOut size={16} color="var(--color-error)" />
              </button>
            )}
          </div>

          <button className="mobile-menu-btn" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <nav className="mobile-nav">
          <div className="mobile-lang-selector" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} />
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.native}</option>
              ))}
            </select>
          </div>
          {navItems.map(item => (
            item.isExternal ? (
              <a 
                key={item.path}
                href={item.href}
                className="mobile-nav-link"
                onClick={toggleMenu}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </a>
            ) : (
              <Link 
                key={item.path}
                to={item.path} 
                className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={toggleMenu}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          ))}
          
          {/* Mobile Logout Button */}
          {isAuthenticated && (
            <button 
              onClick={handleLogout}
              className="mobile-nav-link logout-mobile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '1rem',
                border: 'none',
                background: 'rgba(211, 47, 47, 0.1)',
                color: 'var(--color-error)',
                cursor: 'pointer',
                fontSize: '1rem',
                textAlign: 'left'
              }}
            >
              <LogOut size={20} />
              <span>Logout ({user?.name?.split(' ')[0]})</span>
            </button>
          )}
        </nav>
      )}

      <main className="main-content container">
        <Outlet />
      </main>

      <footer className="footer">
        <p>{t('footer_text')}</p>
      </footer>

      <ChatBot />
    </div>
  );
};

export default Layout;

import { useState } from 'react';
import { 
  Activity, 
  Moon, 
  Sun, 
  LogOut, 
  Settings, 
  User,
  Bell,
  Menu
} from 'lucide-react';
import { IconButton } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';

/**
 * AppHeader Component
 * Main app header with branding and actions
 */
const AppHeader = ({ 
  title = 'MedWard Pro',
  showMenu = false,
  onMenuClick,
  user,
  onLogout,
  onSettingsClick,
  notifications = 0,
  className = '',
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className={`app-header ${className}`}>
      <div className="header-left">
        {showMenu && (
          <IconButton 
            onClick={onMenuClick} 
            label="Open menu"
            className="header-menu-btn"
          >
            <Menu />
          </IconButton>
        )}
        <div className="dash-brand">
          <div className="dash-brand-logo">
            <Activity />
          </div>
          <span className="brand-title">{title}</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Notifications */}
        <div className="notification-wrapper">
          <IconButton 
            label="Notifications"
            className="header-action-btn"
          >
            <Bell />
          </IconButton>
          {notifications > 0 && (
            <span className="notification-badge">
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </div>

        {/* Theme Toggle */}
        <IconButton 
          onClick={toggleTheme}
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="header-action-btn"
        >
          {theme === 'dark' ? <Sun /> : <Moon />}
        </IconButton>

        {/* Settings */}
        {onSettingsClick && (
          <IconButton 
            onClick={onSettingsClick}
            label="Settings"
            className="header-action-btn"
          >
            <Settings />
          </IconButton>
        )}

        {/* User Menu */}
        {user && (
          <div className="user-menu-wrapper">
            <button 
              className="dash-avatar"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              {userInitials}
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="user-menu-backdrop"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="user-menu">
                  <div className="user-menu-header">
                    <div className="user-menu-avatar">{userInitials}</div>
                    <div className="user-menu-info">
                      <span className="user-menu-name">{user.displayName || 'User'}</span>
                      <span className="user-menu-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="user-menu-divider" />
                  <button className="user-menu-item" onClick={onSettingsClick}>
                    <User size={18} />
                    <span>Profile</span>
                  </button>
                  <button className="user-menu-item" onClick={onSettingsClick}>
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                  <div className="user-menu-divider" />
                  <button 
                    className="user-menu-item user-menu-logout" 
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout?.();
                    }}
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

/**
 * DashHeader - Dashboard-specific header variant
 */
export const DashHeader = ({
  user,
  onAvatarClick,
  className = '',
}) => {
  const { theme, toggleTheme } = useTheme();
  
  const userInitials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className={`dash-header ${className}`}>
      <div className="dash-brand">
        <div className="dash-brand-logo">
          <Activity />
        </div>
        <div className="dash-brand-text">
          <span className="brand-title">MedWard Pro</span>
        </div>
      </div>

      <div className="dash-header-actions">
        <IconButton 
          onClick={toggleTheme}
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </IconButton>
        
        <button 
          className="dash-avatar"
          onClick={onAvatarClick}
          aria-label="User menu"
        >
          {userInitials}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;

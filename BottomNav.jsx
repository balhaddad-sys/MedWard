import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Bot, 
  BookOpen, 
  Settings 
} from 'lucide-react';
import { NAV_ITEMS } from '../../config/constants';

/**
 * Navigation item icons mapping
 */
const NavIcons = {
  dashboard: LayoutDashboard,
  patients: Users,
  ai: Bot,
  references: BookOpen,
  settings: Settings,
};

/**
 * BottomNav Component
 * Mobile-optimized bottom navigation bar
 */
const BottomNav = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`bottom-nav ${className}`} role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = NavIcons[item.id] || LayoutDashboard;
        const active = isActive(item.path);

        return (
          <button
            key={item.id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
          >
            <span className="nav-icon">
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

/**
 * TabNav - Alternative tab-style navigation
 */
export const TabNav = ({ 
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`tabs-container ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span className="tab-icon">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

/**
 * SegmentedControl - iOS-style segmented control
 */
export const SegmentedControl = ({
  segments,
  value,
  onChange,
  fullWidth = true,
  className = '',
}) => {
  return (
    <div 
      className={`segmented-control ${fullWidth ? 'full-width' : ''} ${className}`}
      role="radiogroup"
    >
      {segments.map((segment) => (
        <button
          key={segment.value}
          role="radio"
          aria-checked={value === segment.value}
          className={`segment ${value === segment.value ? 'active' : ''}`}
          onClick={() => onChange(segment.value)}
        >
          {segment.icon && <span className="segment-icon">{segment.icon}</span>}
          <span className="segment-label">{segment.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomNav;

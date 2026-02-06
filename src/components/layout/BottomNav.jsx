import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Brain, BookOpen, Settings, Zap, ClipboardList, FileText } from 'lucide-react';

const items = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ward-tasks', icon: ClipboardList, label: 'Ward' },
  { to: '/acute', icon: Zap, label: 'Acute' },
  { to: '/clinic', icon: FileText, label: 'Clinic' },
  { to: '/ai', icon: Brain, label: 'AI' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-30 lg:hidden">
      <div className="flex justify-around py-2">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium
              ${isActive ? 'text-trust-blue' : 'text-neutral-400'}`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

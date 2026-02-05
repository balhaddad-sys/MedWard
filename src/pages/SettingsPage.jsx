import useAuthStore from '../stores/authStore';
import useUIStore from '../stores/uiStore';
import useWardStore from '../stores/wardStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useState } from 'react';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { currentMode, setMode } = useUIStore();
  const { wards, addWard, removeWard } = useWardStore();
  const [newWard, setNewWard] = useState('');

  const handleAddWard = () => {
    if (newWard.trim() && !wards.includes(newWard.trim())) {
      addWard(newWard.trim());
      setNewWard('');
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-lg font-bold text-neutral-900">Settings</h1>
      </div>

      {/* Profile */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Profile</h3>
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />
          )}
          <div>
            <p className="font-medium text-neutral-900">{user?.displayName || 'User'}</p>
            <p className="text-sm text-neutral-500">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Mode Override */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">Context Mode</h3>
        <p className="text-xs text-neutral-500 mb-3">
          Auto-detected based on time. Override below if needed.
        </p>
        <div className="flex gap-2">
          {['default', 'rounds', 'oncall'].map((mode) => (
            <button
              key={mode}
              onClick={() => setMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${currentMode === mode
                  ? 'bg-trust-blue text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
            >
              {mode === 'default' ? 'Default' : mode === 'rounds' ? 'Rounds' : 'On-Call'}
            </button>
          ))}
        </div>
      </Card>

      {/* Wards */}
      <Card>
        <h3 className="font-bold text-sm text-neutral-900 mb-3">My Wards</h3>
        <div className="space-y-2 mb-3">
          {wards.map((ward) => (
            <div key={ward} className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-lg">
              <span className="text-sm text-neutral-700">{ward}</span>
              <button
                onClick={() => removeWard(ward)}
                className="text-xs text-critical-red hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newWard}
            onChange={(e) => setNewWard(e.target.value)}
            placeholder="New ward name"
            className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAddWard()}
          />
          <Button variant="secondary" onClick={handleAddWard} className="text-xs">
            Add
          </Button>
        </div>
      </Card>

      {/* Sign Out */}
      <Card>
        <Button variant="danger" onClick={logout} className="w-full">
          Sign Out
        </Button>
      </Card>

      <div className="text-center space-y-1">
        <p className="text-xs text-neutral-400">MedWard Pro v10.0</p>
        <p className="text-xs text-neutral-400">Educational Tool — Not for Clinical Decisions</p>
      </div>
    </div>
  );
}

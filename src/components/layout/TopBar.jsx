import { Menu, Search, Bell } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';
import { useState } from 'react';
import usePatientStore from '../../stores/patientStore';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ onMenuClick }) {
  const user = useAuthStore((s) => s.user);
  const currentMode = useUIStore((s) => s.currentMode);
  const patients = usePatientStore((s) => s.patients);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const modeLabel = {
    rounds: 'Morning Rounds',
    oncall: 'On-Call',
    default: '',
  };

  const filteredPatients = searchQuery.trim()
    ? patients.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.fileNumber?.toLowerCase().includes(q) ||
          p.diagnosis?.toLowerCase().includes(q) ||
          p.ward?.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2">
            <Menu className="w-5 h-5 text-neutral-600" />
          </button>
          <h1 className="text-lg font-bold text-trust-blue hidden sm:block">MedWard Pro</h1>
          {currentMode !== 'default' && (
            <span className="text-xs font-medium bg-trust-blue-50 text-trust-blue px-2 py-1 rounded-full">
              {modeLabel[currentMode]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-lg hover:bg-neutral-100"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="w-5 h-5 text-neutral-500" />
          </button>
          <button className="p-2 rounded-lg hover:bg-neutral-100 relative">
            <Bell className="w-5 h-5 text-neutral-500" />
          </button>
          {user?.photoURL && (
            <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
          )}
        </div>
      </div>

      {/* Global search overlay */}
      {searchOpen && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b border-neutral-200 shadow-lg p-4 z-40">
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients by name, file #, diagnosis, ward..."
            className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue"
          />
          {filteredPatients.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    navigate(`/patient/${p.id}`);
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-50 text-sm"
                >
                  <span className="font-medium text-neutral-900">{p.name}</span>
                  <span className="text-neutral-500 ml-2">
                    {p.ageSex} · {p.diagnosis} · {p.ward}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchQuery && filteredPatients.length === 0 && (
            <p className="text-sm text-neutral-400 mt-2">No patients found.</p>
          )}
        </div>
      )}
    </header>
  );
}

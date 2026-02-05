import { useState } from 'react';
import Tabs from '../components/ui/Tabs';
import ProtocolPage from '../components/reference/ProtocolPage';
import CalculatorPage from '../components/reference/CalculatorPage';
import RangesPage from '../components/reference/RangesPage';

const tabs = [
  { id: 'protocols', label: 'Protocols' },
  { id: 'calculators', label: 'Calculators' },
  { id: 'ranges', label: 'Lab Ranges' },
];

export default function ReferencePage() {
  const [activeTab, setActiveTab] = useState('protocols');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-neutral-900">Reference</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Clinical protocols, calculators, and lab reference ranges.
        </p>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="pt-2">
        {activeTab === 'protocols' && <ProtocolPage />}
        {activeTab === 'calculators' && <CalculatorPage />}
        {activeTab === 'ranges' && <RangesPage />}
      </div>

      <p className="text-center text-xs text-neutral-400 pt-4">
        Educational Tool — Not for Clinical Decisions
      </p>
    </div>
  );
}

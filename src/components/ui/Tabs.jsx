import { clsx } from 'clsx';

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-neutral-200 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
            active === tab.id
              ? 'border-trust-blue text-trust-blue'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

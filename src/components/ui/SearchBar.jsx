import { Search, X } from 'lucide-react';
import { useState } from 'react';

export default function SearchBar({ placeholder = 'Search...', onSearch, className = '' }) {
  const [value, setValue] = useState('');

  const handleChange = (e) => {
    setValue(e.target.value);
    onSearch?.(e.target.value);
  };

  const clear = () => {
    setValue('');
    onSearch?.('');
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-trust-blue/20 focus:border-trust-blue"
      />
      {value && (
        <button onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2">
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      )}
    </div>
  );
}

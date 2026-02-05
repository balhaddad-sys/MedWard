import { useState } from 'react';
import { LAB_RANGES } from '../../utils/labRanges';
import SearchBar from '../ui/SearchBar';

export default function RangesPage() {
  const [search, setSearch] = useState('');

  const entries = Object.entries(LAB_RANGES).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">Lab Reference Ranges</h3>
      <SearchBar placeholder="Search lab tests..." onSearch={setSearch} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="text-left py-2 px-3 font-semibold text-neutral-700">Test</th>
              <th className="text-left py-2 px-3 font-semibold text-neutral-700">Normal Range</th>
              <th className="text-left py-2 px-3 font-semibold text-neutral-700">Critical Range</th>
              <th className="text-left py-2 px-3 font-semibold text-neutral-700">Unit</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, range]) => (
              <tr key={name} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-2 px-3 font-medium text-neutral-900">{name}</td>
                <td className="py-2 px-3 text-neutral-600">{range.min} – {range.max}</td>
                <td className="py-2 px-3 text-critical-red font-medium">
                  &lt; {range.criticalMin} or &gt; {range.criticalMax}
                </td>
                <td className="py-2 px-3 text-neutral-500">{range.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

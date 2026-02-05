import { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Callout from '../ui/Callout';
import protocols from '../../data/protocols.json';

export default function ProtocolPage() {
  const [selectedId, setSelectedId] = useState(null);
  const selected = protocols.find((p) => p.id === selectedId);

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedId(null)}
          className="text-sm text-trust-blue hover:text-trust-blue-light font-medium"
        >
          ← Back to Protocols
        </button>

        <h2 className="text-lg font-bold text-neutral-900">{selected.title}</h2>
        <p className="text-sm text-neutral-600">{selected.overview}</p>

        <Card>
          <h3 className="font-bold text-sm text-neutral-900 mb-2">Steps</h3>
          <ol className="list-decimal list-inside space-y-1">
            {selected.steps.map((step, i) => (
              <li key={i} className="text-sm text-neutral-700">{step}</li>
            ))}
          </ol>
        </Card>

        <Card>
          <h3 className="font-bold text-sm text-neutral-900 mb-2">Dosing</h3>
          <ul className="space-y-1">
            {selected.doses.map((dose, i) => (
              <li key={i} className="text-sm text-neutral-700">• {dose}</li>
            ))}
          </ul>
        </Card>

        <Callout type="critical" title="Red Flags">
          <ul className="space-y-1">
            {selected.redFlags.map((flag, i) => (
              <li key={i} className="text-sm">{flag}</li>
            ))}
          </ul>
        </Callout>

        <Card>
          <h3 className="font-bold text-sm text-neutral-900 mb-2">References</h3>
          <ul className="space-y-1">
            {selected.references.map((ref, i) => (
              <li key={i} className="text-sm text-neutral-500">{ref}</li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide">Clinical Protocols</h3>
      {protocols.map((protocol) => (
        <Card key={protocol.id} hover onClick={() => setSelectedId(protocol.id)}>
          <h3 className="font-semibold text-neutral-900 text-sm">{protocol.title}</h3>
          <p className="text-xs text-neutral-500 mt-1">{protocol.overview}</p>
        </Card>
      ))}
    </div>
  );
}

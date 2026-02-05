import { Brain, AlertTriangle, Pill, BookOpen, Camera, FileText } from 'lucide-react';
import AIToolCard from './AIToolCard';

const tools = [
  { id: 'clinical', icon: Brain, title: 'Ask Clinical', description: 'Evidence-based clinical queries' },
  { id: 'oncall', icon: AlertTriangle, title: 'On-Call Protocol', description: 'Emergency protocols for acute scenarios' },
  { id: 'antibiotics', icon: Pill, title: 'Antibiotic Guide', description: 'Empirical regimens with renal dosing' },
  { id: 'drug-info', icon: BookOpen, title: 'Drug Info', description: 'Drug reference cards' },
  { id: 'lab-image', icon: Camera, title: 'Lab Analyzer', description: 'OCR + interpret lab images' },
  { id: 'sbar', icon: FileText, title: 'SBAR Generator', description: 'Generate shift handover' },
];

export default function AIToolsGrid({ onSelectTool }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {tools.map((tool) => (
        <AIToolCard
          key={tool.id}
          icon={tool.icon}
          title={tool.title}
          description={tool.description}
          onClick={() => onSelectTool(tool.id)}
        />
      ))}
    </div>
  );
}

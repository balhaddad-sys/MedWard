import Card from '../ui/Card';

export default function AIToolCard({ icon: Icon, title, description, onClick, color = 'text-trust-blue' }) {
  return (
    <Card hover onClick={onClick} className="text-center">
      <div className={`w-10 h-10 mx-auto mb-3 rounded-lg bg-trust-blue-50 flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-semibold text-neutral-900 text-sm">{title}</h3>
      <p className="text-xs text-neutral-500 mt-1">{description}</p>
    </Card>
  );
}

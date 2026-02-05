import Badge from './Badge';

const statusMap = {
  Critical: 'critical',
  Watch: 'watch',
  Stable: 'stable',
};

export default function StatusBadge({ status }) {
  return <Badge variant={statusMap[status] || 'neutral'}>{status}</Badge>;
}

export function getCurrentMode() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return 'rounds';
  if (hour >= 17 || hour < 7) return 'oncall';
  return 'default';
}

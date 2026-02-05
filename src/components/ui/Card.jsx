import { clsx } from 'clsx';

export default function Card({ children, className, onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-neutral-200 p-4',
        hover && 'cursor-pointer hover:border-trust-blue-light hover:shadow-sm transition-all',
        className
      )}
    >
      {children}
    </div>
  );
}

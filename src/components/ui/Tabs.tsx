import { useRef, useEffect, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

function Tabs({ items, activeId, onChange, className }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeButton = container.querySelector<HTMLButtonElement>(
      `[data-tab-id="${activeId}"]`,
    );
    if (!activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    setIndicatorStyle({
      left: buttonRect.left - containerRect.left + container.scrollLeft,
      width: buttonRect.width,
    });
  }, [activeId, items]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={clsx(
        'relative flex items-center gap-1 border-b border-gray-200 overflow-x-auto',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tab-id={item.id}
            onClick={() => onChange(item.id)}
            className={clsx(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
              'transition-colors duration-150 ease-in-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:rounded',
              isActive
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}

      {/* Animated active indicator */}
      <span
        className="absolute bottom-0 h-0.5 bg-blue-600 rounded-full transition-all duration-200 ease-in-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
    </div>
  );
}

export { Tabs };

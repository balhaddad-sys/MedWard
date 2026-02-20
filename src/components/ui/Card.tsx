import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

export type CardPadding = 'sm' | 'md' | 'lg' | 'none';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
  children?: ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', hover = false, onClick, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
        className={clsx(
          'bg-ward-card rounded-xl border border-ward-border shadow-sm',
          'transition-all duration-150 ease-in-out',
          paddingStyles[padding],
          hover && 'hover:shadow-md',
          onClick && 'cursor-pointer hover:shadow-md active:scale-[0.99]',
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function CardHeader({ className, children, ...rest }: CardHeaderProps) {
  return (
    <div
      className={clsx('pb-4 border-b border-ward-border', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function CardBody({ className, children, ...rest }: CardBodyProps) {
  return (
    <div className={clsx('py-4', className)} {...rest}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function CardFooter({ className, children, ...rest }: CardFooterProps) {
  return (
    <div
      className={clsx('pt-4 border-t border-ward-border', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardBody, CardFooter };

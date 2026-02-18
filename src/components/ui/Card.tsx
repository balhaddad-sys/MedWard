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
          'bg-white rounded-xl border border-gray-200 shadow-sm',
          'transition-all duration-150 ease-in-out',
          paddingStyles[padding],
          hover && 'hover:shadow-md hover:border-gray-300',
          onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.99]',
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
      className={clsx('pb-4 border-b border-gray-100', className)}
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
      className={clsx('pt-4 border-t border-gray-100', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export { Card, CardHeader, CardBody, CardFooter };

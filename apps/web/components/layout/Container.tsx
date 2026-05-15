import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Container marketing & app — largeur max + padding latéral fluide.
 * `wide` étend à 1360px pour les sections galerie / preuves logos.
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  wide?: boolean;
  as?: React.ElementType;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ wide = false, as: Tag = 'div', className, ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn(
        'w-full mx-auto',
        'px-[clamp(20px,4vw,32px)]',
        wide ? 'max-w-[1360px]' : 'max-w-[1200px]',
        className,
      )}
      {...props}
    />
  ),
);
Container.displayName = 'Container';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  className?: string;
  starSize?: number;
}

const StarRating = ({
  rating,
  className,
  starSize = 20,
}: StarRatingProps) => {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <Star
            key={index}
            size={starSize}
            className={cn(
              'transition-colors',
              starValue <= Math.ceil(rating)
                ? 'text-[hsl(var(--color-gold))]'
                : 'text-gray-300'
            )}
            fill={
              starValue <= Math.ceil(rating)
                ? 'hsl(var(--color-gold))'
                : 'transparent'
            }
          />
        );
      })}
    </div>
  );
};

export default StarRating;

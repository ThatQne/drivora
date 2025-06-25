 

interface SkeletonCardProps {
  variant?: 'vehicle' | 'listing';
}

export function SkeletonCard({ variant = 'vehicle' }: SkeletonCardProps) {
  return (
    <div className="glass-effect rounded-xl p-6 animate-pulse">
      <div className="flex items-center space-x-4">
        {/* Image placeholder */}
        <div className="w-16 h-16 bg-primary-700/30 rounded-lg flex-shrink-0"></div>
        
        <div className="flex-1 space-y-3">
          {/* Title */}
          <div className="h-5 bg-primary-700/30 rounded w-3/4"></div>
          
          {/* Subtitle */}
          <div className="h-4 bg-primary-700/20 rounded w-1/2"></div>
          
          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="h-4 bg-primary-700/30 rounded w-1/4"></div>
            {variant === 'listing' && (
              <div className="h-4 bg-primary-700/20 rounded w-1/3"></div>
            )}
          </div>
        </div>
        
        {variant === 'vehicle' && (
          <div className="flex flex-col space-y-2">
            <div className="w-6 h-6 bg-primary-700/30 rounded"></div>
            <div className="w-6 h-6 bg-primary-700/20 rounded"></div>
          </div>
        )}
      </div>
      
      {variant === 'listing' && (
        <div className="mt-4 pt-4 border-t border-primary-700/20">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-primary-700/30 rounded w-1/3"></div>
            <div className="h-4 bg-primary-700/20 rounded w-1/4"></div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SkeletonGridProps {
  count: number;
  variant?: 'vehicle' | 'listing';
}

export function SkeletonGrid({ count, variant = 'vehicle' }: SkeletonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} variant={variant} />
      ))}
    </div>
  );
} 
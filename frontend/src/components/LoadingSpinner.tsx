import { cn } from '../utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'gopher';
  className?: string;
  fullScreen?: boolean;
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  variant = 'spinner',
  className,
  fullScreen = false,
  text = '加载中...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center min-h-[200px]';

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-2">
            <div className={cn('bg-go-600 rounded-full animate-bounce', sizeClasses[size])} style={{animationDelay: '0s'}}></div>
            <div className={cn('bg-go-500 rounded-full animate-bounce', sizeClasses[size])} style={{animationDelay: '0.2s'}}></div>
            <div className={cn('bg-go-400 rounded-full animate-bounce', sizeClasses[size])} style={{animationDelay: '0.4s'}}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={cn('bg-go-600 rounded-full animate-pulse-slow', sizeClasses[size])}></div>
        );
      
      case 'gopher':
        return (
          <div className={cn('relative', sizeClasses[size])}>
            <svg viewBox="0 0 100 100" className="w-full h-full animate-bounce-subtle">
              {/* Simplified Go Gopher */}
              <circle cx="50" cy="40" r="20" fill="#00ADD8" className="animate-pulse" />
              <circle cx="45" cy="36" r="2" fill="white" />
              <circle cx="55" cy="36" r="2" fill="white" />
              <circle cx="50" cy="42" r="1" fill="black" />
              <ellipse cx="50" cy="65" rx="25" ry="20" fill="#00ADD8" className="animate-pulse" />
              <ellipse cx="35" cy="30" rx="3" ry="6" fill="#00ADD8" />
              <ellipse cx="65" cy="30" rx="3" ry="6" fill="#00ADD8" />
            </svg>
            <div className="absolute inset-0 rounded-full border-2 border-go-300 border-t-go-600 animate-spin opacity-50"></div>
          </div>
        );
      
      default:
        return (
          <div className={cn(
            'animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700',
            'border-t-go-600 border-r-go-500 border-b-go-400',
            sizeClasses[size]
          )} />
        );
    }
  };

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center space-y-4">
        {renderSpinner()}
        {text && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium animate-pulse">
              {text}
            </p>
            {variant === 'gopher' && (
              <p className="text-xs text-go-600 dark:text-go-400 mt-1 font-mono">
                go run main.go
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
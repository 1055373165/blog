import React from 'react';

interface GoDepthLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animated?: boolean;
  variant?: 'default' | 'minimal' | 'full';
  className?: string;
}

const GoDepthLogo: React.FC<GoDepthLogoProps> = ({
  size = 'md',
  showText = true,
  animated = true,
  variant = 'default',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const isMinimal = variant === 'minimal';
  const isFull = variant === 'full';

  return (
    <div className={`flex items-center ${className}`}>
      {/* Gopher Logo Container */}
      <div className={`${sizeClasses[size]} relative ${animated ? 'group' : ''}`}>
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full ${animated ? 'transform transition-transform duration-300 group-hover:scale-110' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Circle */}
          {!isMinimal && (
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="url(#backgroundGradient)"
              className={animated ? 'transition-all duration-300 group-hover:r-50' : ''}
            />
          )}
          
          {/* Gopher Body */}
          <ellipse
            cx="50"
            cy="65"
            rx="25"
            ry="20"
            fill="#00ADD8"
            className={animated ? 'transition-all duration-300 group-hover:fill-[#2dd4bf]' : ''}
          />
          
          {/* Gopher Head */}
          <ellipse
            cx="50"
            cy="40"
            rx="20"
            ry="18"
            fill="#00ADD8"
            className={animated ? 'transition-all duration-300 group-hover:fill-[#2dd4bf]' : ''}
          />
          
          {/* Gopher Ears */}
          <ellipse cx="38" cy="28" rx="4" ry="8" fill="#00ADD8" 
            className={animated ? 'transition-all duration-300 group-hover:fill-[#2dd4bf]' : ''} />
          <ellipse cx="62" cy="28" rx="4" ry="8" fill="#00ADD8"
            className={animated ? 'transition-all duration-300 group-hover:fill-[#2dd4bf]' : ''} />
          
          {/* Inner ear details */}
          <ellipse cx="38" cy="28" rx="2" ry="4" fill="#0099CC" />
          <ellipse cx="62" cy="28" rx="2" ry="4" fill="#0099CC" />
          
          {/* Eyes */}
          <circle cx="43" cy="38" r="3" fill="white" />
          <circle cx="57" cy="38" r="3" fill="white" />
          <circle cx="43" cy="38" r="1.5" fill="black" 
            className={animated ? 'transition-all duration-300 group-hover:r-2' : ''} />
          <circle cx="57" cy="38" r="1.5" fill="black"
            className={animated ? 'transition-all duration-300 group-hover:r-2' : ''} />
          
          {/* Eye shine */}
          <circle cx="43.5" cy="37.5" r="0.5" fill="white" opacity="0.8" />
          <circle cx="57.5" cy="37.5" r="0.5" fill="white" opacity="0.8" />
          
          {/* Nose */}
          <ellipse cx="50" cy="44" rx="1.5" ry="1" fill="black" />
          
          {/* Mouth */}
          <path
            d="M 47 47 Q 50 50 53 47"
            stroke="black"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Arms */}
          <ellipse cx="28" cy="55" rx="6" ry="12" fill="#00ADD8" 
            className={animated ? 'transition-all duration-300 group-hover:fill-[#2dd4bf]' : ''} />
          <ellipse cx="72" cy="55" rx="6" ry="12" fill="#00ADD8"
            className={animated ? 'transition-all duration-300 group-hover:fill-[#2dd4bf]' : ''} />
          
          {/* Feet */}
          <ellipse cx="42" cy="80" rx="5" ry="3" fill="#0099CC" />
          <ellipse cx="58" cy="80" rx="5" ry="3" fill="#0099CC" />
          
          {/* Code symbol on body */}
          {!isMinimal && (
            <text
              x="50"
              y="70"
              textAnchor="middle"
              fontSize="8"
              fill="white"
              fontFamily="monospace"
              className={animated ? 'transition-all duration-300 group-hover:fontSize-10' : ''}
            >
              {'</>'}
            </text>
          )}

          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            
            {animated && (
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>
        </svg>

        {/* Animated floating code symbols */}
        {animated && isFull && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute top-2 right-2 text-go-400 text-xs font-mono animate-bounce" style={{animationDelay: '0.2s'}}>
              go
            </div>
            <div className="absolute bottom-2 left-2 text-go-400 text-xs font-mono animate-bounce" style={{animationDelay: '0.4s'}}>
              func
            </div>
            <div className="absolute top-1/2 -right-2 text-go-400 text-xs font-mono animate-bounce" style={{animationDelay: '0.6s'}}>
              {'{}'}
            </div>
          </div>
        )}
      </div>

      {/* Text Logo */}
      {showText && (
        <div className="ml-3">
          <h1 className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-go-blue-600 to-go-600 bg-clip-text text-transparent ${animated ? 'transition-all duration-300 group-hover:from-go-blue-400 group-hover:to-go-400' : ''}`}>
            Go Depth
          </h1>
          {(isFull || (!isMinimal && variant === 'default')) && (
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium tracking-wider">
              EXPLORE • LEARN • CODE
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GoDepthLogo;
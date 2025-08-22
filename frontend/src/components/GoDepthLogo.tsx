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
      <div className={`${sizeClasses[size]} relative ${animated ? 'group cursor-pointer' : ''}`}>
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full ${animated ? 'transform transition-all duration-300 group-hover:scale-110 drop-shadow-lg group-hover:drop-shadow-xl' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Circle with Modern Gradient */}
          {!isMinimal && (
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="url(#modernBackgroundGradient)"
              className={animated ? 'transition-all duration-500 group-hover:fill-[url(#hoverBackgroundGradient)]' : ''}
              stroke="url(#borderGradient)"
              strokeWidth="1"
            />
          )}
          
          {/* Gopher Body - Enhanced */}
          <ellipse
            cx="50"
            cy="65"
            rx="25"
            ry="20"
            fill="url(#gopherBodyGradient)"
            className={animated ? 'transition-all duration-300 group-hover:filter group-hover:brightness-110' : ''}
            stroke="url(#gopherStroke)"
            strokeWidth="0.5"
          />
          
          {/* Gopher Head - Enhanced */}
          <ellipse
            cx="50"
            cy="40"
            rx="20"
            ry="18"
            fill="url(#gopherHeadGradient)"
            className={animated ? 'transition-all duration-300 group-hover:filter group-hover:brightness-110' : ''}
            stroke="url(#gopherStroke)"
            strokeWidth="0.5"
          />
          
          {/* Gopher Ears - Enhanced */}
          <ellipse cx="38" cy="28" rx="4" ry="8" fill="url(#gopherEarGradient)" 
            className={animated ? 'transition-all duration-300 group-hover:filter group-hover:brightness-110' : ''} 
            stroke="url(#gopherStroke)" strokeWidth="0.3" />
          <ellipse cx="62" cy="28" rx="4" ry="8" fill="url(#gopherEarGradient)"
            className={animated ? 'transition-all duration-300 group-hover:filter group-hover:brightness-110' : ''} 
            stroke="url(#gopherStroke)" strokeWidth="0.3" />
          
          {/* Inner ear details - Enhanced */}
          <ellipse cx="38" cy="28" rx="2" ry="4" fill="url(#earInnerGradient)" />
          <ellipse cx="62" cy="28" rx="2" ry="4" fill="url(#earInnerGradient)" />
          
          {/* Eyes - More Expressive */}
          <circle cx="43" cy="38" r="3.5" fill="white" stroke="#e0e7ff" strokeWidth="0.5" />
          <circle cx="57" cy="38" r="3.5" fill="white" stroke="#e0e7ff" strokeWidth="0.5" />
          
          {/* Pupils with animation */}
          <circle cx="43" cy="38" r="2" fill="url(#pupilGradient)" 
            className={animated ? 'transition-all duration-300 group-hover:r-2.5 group-hover:fill-[url(#pupilHoverGradient)]' : ''} />
          <circle cx="57" cy="38" r="2" fill="url(#pupilGradient)"
            className={animated ? 'transition-all duration-300 group-hover:r-2.5 group-hover:fill-[url(#pupilHoverGradient)]' : ''} />
          
          {/* Eye shine - Enhanced */}
          <circle cx="43.8" cy="37.2" r="0.8" fill="white" opacity="0.9" />
          <circle cx="57.8" cy="37.2" r="0.8" fill="white" opacity="0.9" />
          <circle cx="43.5" cy="37.5" r="0.3" fill="white" opacity="0.7" />
          <circle cx="57.5" cy="37.5" r="0.3" fill="white" opacity="0.7" />
          
          {/* Nose - Enhanced */}
          <ellipse cx="50" cy="44" rx="1.8" ry="1.2" fill="url(#noseGradient)" />
          
          {/* Mouth - More Expressive */}
          <path
            d="M 46 47 Q 50 51 54 47"
            stroke="url(#mouthGradient)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className={animated ? 'transition-all duration-300 group-hover:stroke-width-2.5' : ''}
          />
          
          {/* Arms - Enhanced */}
          <ellipse cx="28" cy="55" rx="6" ry="12" fill="url(#gopherArmGradient)" 
            className={animated ? 'transition-all duration-300 group-hover:filter group-hover:brightness-110' : ''} 
            stroke="url(#gopherStroke)" strokeWidth="0.3" />
          <ellipse cx="72" cy="55" rx="6" ry="12" fill="url(#gopherArmGradient)"
            className={animated ? 'transition-all duration-300 group-hover:filter group-hover:brightness-110' : ''} 
            stroke="url(#gopherStroke)" strokeWidth="0.3" />
          
          {/* Feet - Enhanced */}
          <ellipse cx="42" cy="80" rx="5.5" ry="3.5" fill="url(#feetGradient)" stroke="url(#gopherStroke)" strokeWidth="0.3" />
          <ellipse cx="58" cy="80" rx="5.5" ry="3.5" fill="url(#feetGradient)" stroke="url(#gopherStroke)" strokeWidth="0.3" />
          
          {/* Modern Code Symbol */}
          {!isMinimal && (
            <g className={animated ? 'transition-all duration-300 group-hover:scale-110' : ''}>
              <text
                x="50"
                y="72"
                textAnchor="middle"
                fontSize="9"
                fill="white"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="0.2"
                className="drop-shadow-sm"
              >
                {'</>'}
              </text>
            </g>
          )}

          {/* Enhanced Gradient Definitions */}
          <defs>
            {/* Background Gradients */}
            <linearGradient id="modernBackgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdfa" />
              <stop offset="30%" stopColor="#ccfbf1" />
              <stop offset="70%" stopColor="#99f6e4" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
            
            <linearGradient id="hoverBackgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="30%" stopColor="#e0f2fe" />
              <stop offset="70%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
            
            <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            
            {/* Gopher Gradients */}
            <radialGradient id="gopherBodyGradient" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="70%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0d9488" />
            </radialGradient>
            
            <radialGradient id="gopherHeadGradient" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#5eead4" />
              <stop offset="70%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#14b8a6" />
            </radialGradient>
            
            <radialGradient id="gopherEarGradient" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0d9488" />
            </radialGradient>
            
            <radialGradient id="gopherArmGradient" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0d9488" />
            </radialGradient>
            
            <linearGradient id="earInnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            
            <radialGradient id="pupilGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>
            
            <radialGradient id="pupilHoverGradient" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>
            
            <linearGradient id="noseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            
            <linearGradient id="mouthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            
            <radialGradient id="feetGradient" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0f766e" />
            </radialGradient>
            
            <linearGradient id="gopherStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
            
            {/* Enhanced Glow Filter */}
            {animated && (
              <filter id="enhancedGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>
        </svg>

        {/* Enhanced Animated Floating Code Symbols */}
        {animated && isFull && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
            <div className="absolute top-1 right-1 text-go-500 dark:text-go-400 text-xs font-bold font-mono animate-bounce bg-white dark:bg-gray-800 px-1 py-0.5 rounded shadow-lg" style={{animationDelay: '0.2s'}}>
              go
            </div>
            <div className="absolute bottom-1 left-1 text-primary-600 dark:text-primary-400 text-xs font-bold font-mono animate-bounce bg-white dark:bg-gray-800 px-1 py-0.5 rounded shadow-lg" style={{animationDelay: '0.4s'}}>
              func
            </div>
            <div className="absolute top-1/2 -right-1 text-go-600 dark:text-go-300 text-xs font-bold font-mono animate-bounce bg-white dark:bg-gray-800 px-1 py-0.5 rounded shadow-lg" style={{animationDelay: '0.6s'}}>
              {'{}'}
            </div>
            <div className="absolute top-1/3 -left-1 text-primary-500 dark:text-primary-400 text-xs font-bold font-mono animate-bounce bg-white dark:bg-gray-800 px-1 py-0.5 rounded shadow-lg" style={{animationDelay: '0.8s'}}>
              {'[]'}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Text Logo */}
      {showText && (
        <div className={`ml-3 ${animated ? 'group-hover:ml-4 transition-all duration-300' : ''}`}>
          <h1 className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-primary-600 via-go-600 to-primary-700 dark:from-primary-400 dark:via-go-400 dark:to-primary-500 bg-clip-text text-transparent ${animated ? 'transition-all duration-300 hover:from-primary-500 hover:via-go-500 hover:to-primary-600 dark:hover:from-primary-300 dark:hover:via-go-300 dark:hover:to-primary-400' : ''} font-heading tracking-tight drop-shadow-sm`}>
            Go Depth
          </h1>
          {(isFull || (!isMinimal && variant === 'default')) && (
            <p className={`text-xs text-gray-600 dark:text-gray-400 font-medium tracking-wider uppercase mt-0.5 ${animated ? 'transition-all duration-300 group-hover:text-gray-500 dark:group-hover:text-gray-300' : ''}`}>
              <span className="text-go-600 dark:text-go-400">Explore</span>
              {' • '}
              <span className="text-primary-600 dark:text-primary-400">Learn</span>
              {' • '}
              <span className="text-go-700 dark:text-go-300">Code</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GoDepthLogo;
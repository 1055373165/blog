import React, { forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

// Card 变体类型
export type CardVariant = 
  | 'default'
  | 'elevated'
  | 'outlined'
  | 'glass'
  | 'gradient'
  | 'neo'
  | 'floating'
  | 'minimal';

// Card 大小类型
export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

// Card 圆角类型
export type CardRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  radius?: CardRadius;
  hoverable?: boolean;
  animated?: boolean;
  blurred?: boolean;
  gradient?: string;
  children?: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  image?: string;
  imageAlt?: string;
  imagePosition?: 'top' | 'bottom' | 'left' | 'right' | 'background';
}

// 变体样式映射
const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-white dark:bg-gray-800 
    border border-gray-200 dark:border-gray-700
    shadow-sm hover:shadow-md
  `,
  elevated: `
    bg-white dark:bg-gray-800 
    shadow-lg hover:shadow-xl
    border border-gray-100 dark:border-gray-800
  `,
  outlined: `
    bg-white dark:bg-gray-800 
    border-2 border-gray-200 dark:border-gray-700
    hover:border-gray-300 dark:hover:border-gray-600
  `,
  glass: `
    backdrop-blur-xl border border-white/20 dark:border-gray-800/20
    shadow-2xl hover:shadow-3xl
    bg-white/10 dark:bg-gray-900/10
  `,
  gradient: `
    bg-gradient-to-br from-white via-white to-primary-50/30
    dark:from-gray-800 dark:via-gray-800 dark:to-primary-900/20
    border border-primary-200/50 dark:border-primary-800/50
    shadow-lg hover:shadow-xl
  `,
  neo: `
    bg-gray-100 dark:bg-gray-800
    border border-gray-200 dark:border-gray-700
  `,
  floating: `
    bg-white dark:bg-gray-800 
    shadow-strong hover:shadow-2xl
    border border-transparent
    transform hover:-translate-y-2
  `,
  minimal: `
    bg-transparent
    border-0
    shadow-none hover:shadow-sm
  `
};

// 大小样式映射
const sizeStyles: Record<CardSize, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

// 圆角样式映射
const radiusStyles: Record<CardRadius, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

// Neo 形态阴影样式
const neoShadowStyle = {
  light: 'shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.5)]',
  dark: 'dark:shadow-[8px_8px_16px_rgba(0,0,0,0.3),-8px_-8px_16px_rgba(255,255,255,0.05)]'
};

// Glass 效果样式
const glassEffect = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  size = 'md',
  radius = 'lg',
  hoverable = true,
  animated = true,
  blurred = false,
  gradient,
  children,
  className,
  header,
  footer,
  image,
  imageAlt,
  imagePosition = 'top',
  style,
  ...props
}, ref) => {
  // 基础样式
  const baseStyles = `
    relative overflow-hidden
    transition-all duration-300 ease-out
    ${animated && hoverable ? 'transform hover:scale-[1.02]' : ''}
    ${blurred ? 'backdrop-blur-sm' : ''}
  `;

  // Neo 形态特殊处理
  const isNeo = variant === 'neo';
  const neoStyles = isNeo ? `${neoShadowStyle.light} ${neoShadowStyle.dark}` : '';

  // Glass 效果特殊处理
  const isGlass = variant === 'glass';
  const glassStyles = isGlass ? glassEffect : {};

  // 渐变背景处理
  const gradientStyle = gradient ? { 
    background: gradient,
    ...style 
  } : (isGlass ? { ...glassStyles, ...style } : style);

  // 图片容器样式
  const getImageContainerStyles = () => {
    switch (imagePosition) {
      case 'top':
        return 'aspect-video w-full object-cover';
      case 'bottom':
        return 'aspect-video w-full object-cover';
      case 'left':
        return 'aspect-square w-24 h-24 object-cover';
      case 'right':
        return 'aspect-square w-24 h-24 object-cover';
      case 'background':
        return 'absolute inset-0 w-full h-full object-cover';
      default:
        return 'aspect-video w-full object-cover';
    }
  };

  // 内容布局样式
  const getContentLayout = () => {
    if (imagePosition === 'left') return 'flex items-start space-x-4';
    if (imagePosition === 'right') return 'flex items-start space-x-4 flex-row-reverse';
    return 'block';
  };

  // 渲染图片
  const renderImage = () => {
    if (!image) return null;

    return (
      <div className={imagePosition === 'background' ? 'absolute inset-0' : ''}>
        <img
          src={image}
          alt={imageAlt || ''}
          className={getImageContainerStyles()}
        />
        {imagePosition === 'background' && (
          <div className="absolute inset-0 bg-black/20 dark:bg-black/40" />
        )}
      </div>
    );
  };

  // 渲染内容
  const renderContent = () => (
    <div className={imagePosition === 'background' ? 'relative z-10' : ''}>
      {header && (
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          {header}
        </div>
      )}
      
      <div className={getContentLayout()}>
        {(imagePosition === 'left' || imagePosition === 'right') && renderImage()}
        <div className="flex-1">
          {children}
        </div>
      </div>
      
      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={ref}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        radiusStyles[radius],
        neoStyles,
        className
      )}
      style={gradientStyle}
      {...props}
    >
      {/* 背景图片 */}
      {imagePosition === 'background' && renderImage()}
      
      {/* 顶部图片 */}
      {imagePosition === 'top' && (
        <div className={`-m-${size === 'sm' ? '3' : size === 'md' ? '4' : size === 'lg' ? '6' : '8'} mb-${size === 'sm' ? '3' : size === 'md' ? '4' : size === 'lg' ? '6' : '8'} overflow-hidden ${radiusStyles[radius]}`}>
          {renderImage()}
        </div>
      )}

      {/* 主要内容 */}
      {renderContent()}

      {/* 底部图片 */}
      {imagePosition === 'bottom' && (
        <div className={`-m-${size === 'sm' ? '3' : size === 'md' ? '4' : size === 'lg' ? '6' : '8'} mt-${size === 'sm' ? '3' : size === 'md' ? '4' : size === 'lg' ? '6' : '8'} overflow-hidden ${radiusStyles[radius]}`}>
          {renderImage()}
        </div>
      )}

      {/* Glass 效果光影 */}
      {isGlass && (
        <div className="absolute inset-0 rounded-inherit pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-inherit" />
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-xl transform -translate-x-4 -translate-y-4" />
        </div>
      )}

      {/* 悬浮发光效果 */}
      {variant === 'floating' && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-accent-purple-500/20 rounded-inherit blur opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* 渐变边框效果 */}
      {variant === 'gradient' && (
        <div className="absolute inset-0 rounded-inherit bg-gradient-to-r from-primary-500/20 via-transparent to-accent-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
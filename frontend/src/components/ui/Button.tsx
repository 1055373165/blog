import React, { forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

// Button 变体类型
export type ButtonVariant = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'error'
  | 'ghost'
  | 'outline'
  | 'glass'
  | 'gradient';

// Button 大小类型
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Button 图标位置
export type IconPosition = 'left' | 'right' | 'only';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconPosition?: IconPosition;
  fullWidth?: boolean;
  rounded?: boolean;
  elevated?: boolean;
  animated?: boolean;
  className?: string;
}

// 变体样式映射
const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-primary-600 to-primary-700 
    hover:from-primary-700 hover:to-primary-800 
    active:from-primary-800 active:to-primary-900
    text-white border-transparent 
    shadow-lg hover:shadow-xl active:shadow-md
    focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  `,
  secondary: `
    bg-gradient-to-r from-gray-100 to-gray-200 
    hover:from-gray-200 hover:to-gray-300 
    active:from-gray-300 active:to-gray-400
    text-gray-900 border-transparent
    dark:from-gray-700 dark:to-gray-800 
    dark:hover:from-gray-600 dark:hover:to-gray-700
    dark:active:from-gray-500 dark:active:to-gray-600
    dark:text-gray-100
    shadow-md hover:shadow-lg active:shadow-sm
    focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
  `,
  tertiary: `
    bg-transparent hover:bg-gray-100 active:bg-gray-200
    text-gray-700 border-transparent
    dark:hover:bg-gray-800 dark:active:bg-gray-700
    dark:text-gray-300
    focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
  `,
  success: `
    bg-gradient-to-r from-success-600 to-success-700 
    hover:from-success-700 hover:to-success-800 
    active:from-success-800 active:to-success-900
    text-white border-transparent
    shadow-lg hover:shadow-xl active:shadow-md
    focus:ring-2 focus:ring-success-500 focus:ring-offset-2
  `,
  warning: `
    bg-gradient-to-r from-warning-500 to-warning-600 
    hover:from-warning-600 hover:to-warning-700 
    active:from-warning-700 active:to-warning-800
    text-white border-transparent
    shadow-lg hover:shadow-xl active:shadow-md
    focus:ring-2 focus:ring-warning-500 focus:ring-offset-2
  `,
  error: `
    bg-gradient-to-r from-error-600 to-error-700 
    hover:from-error-700 hover:to-error-800 
    active:from-error-800 active:to-error-900
    text-white border-transparent
    shadow-lg hover:shadow-xl active:shadow-md
    focus:ring-2 focus:ring-error-500 focus:ring-offset-2
  `,
  ghost: `
    bg-transparent hover:bg-primary-50 active:bg-primary-100
    text-primary-600 border-transparent
    dark:hover:bg-primary-900/20 dark:active:bg-primary-900/30
    dark:text-primary-400
    focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  `,
  outline: `
    bg-transparent border-2 border-primary-300 
    hover:border-primary-400 hover:bg-primary-50
    active:border-primary-500 active:bg-primary-100
    text-primary-700
    dark:border-primary-700 dark:hover:border-primary-600 
    dark:hover:bg-primary-900/20 dark:active:bg-primary-900/30
    dark:text-primary-300
    focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  `,
  glass: `
    backdrop-blur-xl border border-white/20 
    dark:border-gray-800/20 shadow-2xl 
    text-gray-900 dark:text-gray-100
    hover:shadow-3xl hover:backdrop-blur-2xl
    active:shadow-lg
    focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    transition-all duration-300
  `,
  gradient: `
    bg-gradient-to-r from-accent-purple-500 via-primary-500 to-accent-pink-500
    hover:from-accent-purple-600 hover:via-primary-600 hover:to-accent-pink-600
    active:from-accent-purple-700 active:via-primary-700 active:to-accent-pink-700
    text-white border-transparent
    shadow-lg hover:shadow-xl active:shadow-md
    focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
    bg-size-200 animate-gradient-x
  `
};

// 大小样式映射
const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs min-h-[24px]',
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-base min-h-[40px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
  xl: 'px-8 py-4 text-xl min-h-[56px]',
};

// 图标大小映射
const iconSizes: Record<ButtonSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-7 h-7',
};

// 加载动画组件
const LoadingSpinner = ({ size }: { size: ButtonSize }) => (
  <svg 
    className={clsx('animate-spin', iconSizes[size])} 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  leftIcon,
  rightIcon,
  iconPosition,
  fullWidth = false,
  rounded = false,
  elevated = false,
  animated = true,
  className,
  ...props
}, ref) => {
  // 确定是否只显示图标
  const isIconOnly = iconPosition === 'only' || (!children && (leftIcon || rightIcon));
  
  // 基础样式
  const baseStyles = `
    inline-flex items-center justify-center
    font-medium transition-all duration-200
    focus:outline-none focus:ring-offset-2
    relative overflow-hidden
    ${animated ? 'transform hover:scale-105 active:scale-95' : ''}
    ${disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
    ${fullWidth ? 'w-full' : ''}
    ${rounded ? 'rounded-full' : 'rounded-lg'}
    ${elevated ? 'shadow-lg hover:shadow-xl' : ''}
    ${isIconOnly ? 'aspect-square' : ''}
  `;

  // Glass effect 背景
  const glassBackground = variant === 'glass' ? {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  } : {};

  // 渲染图标
  const renderIcon = (icon: ReactNode, position: 'left' | 'right') => {
    if (!icon) return null;
    
    const spacing = isIconOnly ? '' : position === 'left' ? 'mr-2' : 'ml-2';
    
    return (
      <span className={clsx('flex items-center', spacing)}>
        {React.isValidElement(icon) 
          ? React.cloneElement(icon as React.ReactElement, {
              className: clsx(iconSizes[size], icon.props.className)
            })
          : icon
        }
      </span>
    );
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      style={glassBackground}
      {...props}
    >
      {/* 加载状态 */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size={size} />
        </span>
      )}
      
      {/* 按钮内容 */}
      <span className={clsx('flex items-center', loading && 'invisible')}>
        {leftIcon && !isIconOnly && renderIcon(leftIcon, 'left')}
        {isIconOnly ? renderIcon(leftIcon || rightIcon, 'left') : children}
        {rightIcon && !isIconOnly && renderIcon(rightIcon, 'right')}
      </span>
      
      {/* 涟漪效果 */}
      {animated && (
        <span className="absolute inset-0 rounded-inherit overflow-hidden">
          <span className="absolute inset-0 rounded-inherit bg-white/20 opacity-0 transition-opacity duration-200 group-active:opacity-100" />
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
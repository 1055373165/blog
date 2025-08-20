import React, { forwardRef, useState, useEffect, ReactNode } from 'react';
import { clsx } from 'clsx';

// Input 变体类型
export type InputVariant = 
  | 'default'
  | 'outlined'
  | 'filled'
  | 'glass'
  | 'minimal';

// Input 大小类型
export type InputSize = 'sm' | 'md' | 'lg' | 'xl';

// Input 状态类型
export type InputState = 'default' | 'success' | 'warning' | 'error';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  state?: InputState;
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  floating?: boolean;
  animated?: boolean;
  clearable?: boolean;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  onClear?: () => void;
}

// 变体样式映射
const variantStyles: Record<InputVariant, string> = {
  default: `
    bg-white dark:bg-gray-800 
    border border-gray-300 dark:border-gray-600
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
  outlined: `
    bg-transparent 
    border-2 border-gray-300 dark:border-gray-600
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
  filled: `
    bg-gray-100 dark:bg-gray-700 
    border border-transparent
    focus:bg-white dark:focus:bg-gray-800 
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,
  glass: `
    backdrop-blur-xl border border-white/30 dark:border-gray-700/30
    bg-white/10 dark:bg-gray-900/10
    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20
    focus:bg-white/20 dark:focus:bg-gray-900/20
  `,
  minimal: `
    bg-transparent 
    border-0 border-b-2 border-gray-300 dark:border-gray-600
    focus:border-primary-500 
    rounded-none
  `
};

// 大小样式映射
const sizeStyles: Record<InputSize, { input: string; icon: string; addon: string }> = {
  sm: {
    input: 'px-3 py-2 text-sm min-h-[32px]',
    icon: 'w-4 h-4',
    addon: 'px-2 text-sm'
  },
  md: {
    input: 'px-4 py-3 text-base min-h-[40px]',
    icon: 'w-5 h-5',
    addon: 'px-3 text-base'
  },
  lg: {
    input: 'px-4 py-3 text-lg min-h-[48px]',
    icon: 'w-6 h-6',
    addon: 'px-4 text-lg'
  },
  xl: {
    input: 'px-6 py-4 text-xl min-h-[56px]',
    icon: 'w-7 h-7',
    addon: 'px-5 text-xl'
  }
};

// 状态样式映射
const stateStyles: Record<InputState, string> = {
  default: '',
  success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
  warning: 'border-warning-500 focus:border-warning-500 focus:ring-warning-500/20',
  error: 'border-error-500 focus:border-error-500 focus:ring-error-500/20'
};

// 状态图标映射
const stateIcons: Record<Exclude<InputState, 'default'>, ReactNode> = {
  success: (
    <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-warning-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-error-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
};

// 清除按钮组件
const ClearButton = ({ onClick, size }: { onClick: () => void; size: InputSize }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
  >
    <svg className={sizeStyles[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
);

// 加载指示器组件
const LoadingSpinner = ({ size }: { size: InputSize }) => (
  <svg className={clsx('animate-spin', sizeStyles[size].icon)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  variant = 'default',
  size = 'md',
  state = 'default',
  label,
  helperText,
  errorText,
  leftIcon,
  rightIcon,
  leftAddon,
  rightAddon,
  floating = false,
  animated = true,
  clearable = false,
  loading = false,
  className,
  containerClassName,
  onClear,
  value,
  onChange,
  disabled,
  placeholder,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(Boolean(value));

  useEffect(() => {
    setHasValue(Boolean(value));
  }, [value]);

  // 浮动标签逻辑
  const shouldFloat = floating && (focused || hasValue || placeholder);

  // 基础样式
  const baseStyles = `
    w-full outline-none transition-all duration-200
    text-gray-900 dark:text-gray-100
    placeholder-gray-500 dark:placeholder-gray-400
    disabled:opacity-50 disabled:cursor-not-allowed
    ${animated ? 'transform focus:scale-[1.02]' : ''}
  `;

  // 容器样式
  const containerStyles = `
    relative
    ${animated && focused ? 'transform scale-[1.02]' : ''}
    transition-transform duration-200
  `;

  // 输入框样式
  const inputStyles = clsx(
    baseStyles,
    sizeStyles[size].input,
    variantStyles[variant],
    state !== 'default' ? stateStyles[state] : '',
    variant === 'minimal' ? 'focus:outline-none' : 'focus:outline-none',
    leftIcon || leftAddon ? 'pl-10' : '',
    rightIcon || rightAddon || clearable || loading ? 'pr-10' : '',
    className
  );

  // 标签样式
  const labelStyles = clsx(
    'absolute left-4 transition-all duration-200 pointer-events-none',
    floating ? (
      shouldFloat 
        ? 'top-2 text-xs text-primary-600 dark:text-primary-400 font-medium'
        : `top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 ${
            size === 'sm' ? 'text-sm' : 
            size === 'lg' ? 'text-lg' : 
            size === 'xl' ? 'text-xl' : 'text-base'
          }`
    ) : 'top-2 text-xs text-gray-700 dark:text-gray-300 font-medium'
  );

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(Boolean(e.target.value));
    onChange?.(e);
  };

  const handleClear = () => {
    setHasValue(false);
    onClear?.();
  };

  return (
    <div className={clsx(containerStyles, containerClassName)}>
      {/* 非浮动标签 */}
      {label && !floating && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* 输入框容器 */}
      <div className="relative">
        {/* 左侧装饰 */}
        {leftAddon && (
          <div className={clsx(
            'absolute left-0 top-0 h-full flex items-center bg-gray-50 dark:bg-gray-700 border-r border-gray-300 dark:border-gray-600 rounded-l-lg',
            sizeStyles[size].addon
          )}>
            {leftAddon}
          </div>
        )}

        {/* 左侧图标 */}
        {leftIcon && !leftAddon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {React.isValidElement(leftIcon) 
              ? React.cloneElement(leftIcon as React.ReactElement, {
                  className: sizeStyles[size].icon
                })
              : leftIcon
            }
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={ref}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          placeholder={floating ? undefined : placeholder}
          className={inputStyles}
          {...props}
        />

        {/* 浮动标签 */}
        {label && floating && (
          <label className={labelStyles}>
            {label}
          </label>
        )}

        {/* 右侧内容 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          {/* 清除按钮 */}
          {clearable && hasValue && !loading && !disabled && (
            <ClearButton onClick={handleClear} size={size} />
          )}

          {/* 加载指示器 */}
          {loading && <LoadingSpinner size={size} />}

          {/* 状态图标 */}
          {state !== 'default' && !loading && stateIcons[state]}

          {/* 右侧图标 */}
          {rightIcon && !loading && state === 'default' && (
            <div className="text-gray-400">
              {React.isValidElement(rightIcon) 
                ? React.cloneElement(rightIcon as React.ReactElement, {
                    className: sizeStyles[size].icon
                  })
                : rightIcon
              }
            </div>
          )}
        </div>

        {/* 右侧装饰 */}
        {rightAddon && (
          <div className={clsx(
            'absolute right-0 top-0 h-full flex items-center bg-gray-50 dark:bg-gray-700 border-l border-gray-300 dark:border-gray-600 rounded-r-lg',
            sizeStyles[size].addon
          )}>
            {rightAddon}
          </div>
        )}

        {/* Glass 效果增强 */}
        {variant === 'glass' && focused && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-500/10 to-accent-purple-500/10 pointer-events-none" />
        )}
      </div>

      {/* 帮助文本或错误信息 */}
      {(helperText || errorText) && (
        <div className="mt-1 text-sm">
          {errorText ? (
            <span className="text-error-600 dark:text-error-400 flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errorText}</span>
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{helperText}</span>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
import { useTheme } from '../contexts/ThemeContext';

interface HTMLRendererProps {
  content: string;
  className?: string;
}

export default function HTMLRenderer({ content, className = '' }: HTMLRendererProps) {
  const { settings } = useTheme();

  // 根据字号设置获取 prose 类
  const getProseClass = () => {
    const sizeMap = {
      sm: 'prose-sm',
      base: 'prose',
      lg: 'prose-lg',
      xl: 'prose-xl',
    };
    return sizeMap[settings.fontSize] || 'prose';
  };

  return (
    <div 
      className={`${getProseClass()} dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
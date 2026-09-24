/* 代码高亮模块 — 由 LazyCode 在代码块接近视口时才动态加载，
   让 react-syntax-highlighter（及全部主题）不进入文章首屏的关键路径。 */
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { getCodeTheme } from './code/codeThemes';


interface CodeHighlighterProps {
  code: string;
  language: string;
  themeName: string;
  isDark: boolean;
  wordWrap: boolean;
  fontSizeClass: string;
}

export default function CodeHighlighter({ code, language, themeName, isDark, wordWrap, fontSizeClass }: CodeHighlighterProps) {
  return (
    <SyntaxHighlighter
      style={getCodeTheme(themeName)}
      language={language || 'text'}
      PreTag="div"
      className={`!mt-0 !mb-0 !bg-transparent [&>*]:!bg-transparent [&_*]:!bg-transparent ${fontSizeClass}`}
      showLineNumbers={false}
      wrapLines={wordWrap}
      wrapLongLines={wordWrap}
      customStyle={{
        backgroundColor: isDark ? '#111827' : '#f9fafb',
        background: isDark ? '#111827' : '#f9fafb',
        border: 'none',
        borderRadius: '0px',
        padding: '16px',
        margin: '0'
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}

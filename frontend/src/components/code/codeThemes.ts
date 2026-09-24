/* 代码主题表与字体度量 — 随代码高亮模块一起懒加载（syntax-vendor chunk） */
import type { CSSProperties } from 'react';
import { 
  vscDarkPlus, 
  vs, 
  tomorrow,
  twilight,
  dracula,
  nord,
  oneLight,
  oneDark,
  materialDark,
  materialLight,
  atomDark,
  base16AteliersulphurpoolLight,
  coldarkCold,
  coldarkDark,
  prism,
  synthwave84,
  nightOwl,
  shadesOfPurple,
  lucario,
  duotoneDark,
  duotoneLight,
  okaidia,
  solarizedlight,
  darcula
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  github, 
  monokai,
  atelierCaveLight,
  atelierCaveDark,
  atelierDuneLight,
  atelierDuneDark,
  atelierEstuaryLight,
  atelierEstuaryDark,
  atelierForestLight,
  atelierForestDark,
  atelierHeathLight,
  atelierHeathDark,
  atelierLakesideLight,
  atelierLakesideDark,
  atelierPlateauLight,
  atelierPlateauDark,
  atelierSavannaLight,
  atelierSavannaDark,
  atelierSeasideLight,
  atelierSeasideDark,
  atelierSulphurpoolLight,
  atelierSulphurpoolDark
} from 'react-syntax-highlighter/dist/esm/styles/hljs';


export const themeMap = {
  // 经典主题
  vs,
  vscDarkPlus,
  github,
  tomorrow,
  twilight,
  monokai,
  dracula,
  nord,
  oneLight,
  oneDark,

  // 现代化主题 - Prism样式
  materialDark,
  materialLight,
  atomDark,
  coldarkCold,
  coldarkDark,
  prism,
  synthwave84,
  nightOwl,
  shadesOfPurple,
  lucario,
  duotoneDark,
  duotoneLight,
  okaidia,
  solarizedlight,
  darcula,
  base16AteliersulphurpoolLight,

  // 现代化主题 - HLJS样式
  atelierCaveLight,
  atelierCaveDark,
  atelierDuneLight,
  atelierDuneDark,
  atelierEstuaryLight,
  atelierEstuaryDark,
  atelierForestLight,
  atelierForestDark,
  atelierHeathLight,
  atelierHeathDark,
  atelierLakesideLight,
  atelierLakesideDark,
  atelierPlateauLight,
  atelierPlateauDark,
  atelierSavannaLight,
  atelierSavannaDark,
  atelierSeasideLight,
  atelierSeasideDark,
  atelierSulphurpoolLight,
  atelierSulphurpoolDark,
  };

export type CodeThemeName = keyof typeof themeMap;

export function getCodeTheme(name: string) {
  return themeMap[name as CodeThemeName] || vscDarkPlus;
}

export interface CodeMetrics {
  fontSize?: CSSProperties['fontSize'];
  lineHeight?: CSSProperties['lineHeight'];
  fontFamily?: CSSProperties['fontFamily'];
}

/** Font metrics a theme applies to code, so unhighlighted code can render at the same size. */
export function getCodeMetrics(name: string): CodeMetrics {
  const theme = getCodeTheme(name) as Record<string, CSSProperties>;
  const code = theme['code[class*="language-"]'] ?? theme.hljs ?? {};
  const pre = theme['pre[class*="language-"]'] ?? {};
  return {
    fontSize: code.fontSize ?? pre.fontSize,
    lineHeight: code.lineHeight ?? pre.lineHeight,
    fontFamily: code.fontFamily ?? pre.fontFamily,
  };
}

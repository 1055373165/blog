/**
 * 头像工具函数
 * 用于生成本地头像，避免依赖外部服务
 */

// 预定义的颜色组合
const AVATAR_COLORS = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // blue
  { bg: '#10B981', text: '#FFFFFF' }, // emerald
  { bg: '#8B5CF6', text: '#FFFFFF' }, // violet
  { bg: '#F59E0B', text: '#FFFFFF' }, // amber
  { bg: '#EF4444', text: '#FFFFFF' }, // red
  { bg: '#06B6D4', text: '#FFFFFF' }, // cyan
  { bg: '#84CC16', text: '#FFFFFF' }, // lime
  { bg: '#F97316', text: '#FFFFFF' }, // orange
  { bg: '#EC4899', text: '#FFFFFF' }, // pink
  { bg: '#6366F1', text: '#FFFFFF' }, // indigo
];

/**
 * 根据字符串生成一致的颜色索引
 */
function getColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

/**
 * 生成本地头像 SVG
 */
export function generateLocalAvatar(name: string, size: number = 40): string {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  
  const colorIndex = getColorIndex(name);
  const colors = AVATAR_COLORS[colorIndex];
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${colors.bg}" rx="${size / 8}"/>
      <text 
        x="50%" 
        y="50%" 
        dominant-baseline="middle" 
        text-anchor="middle" 
        fill="${colors.text}" 
        font-family="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        font-size="${size * 0.4}"
        font-weight="500"
      >
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * 获取头像 URL，优先使用用户头像，否则生成本地头像
 */
export function getAvatarUrl(userAvatar?: string, userName?: string, size: number = 40): string {
  if (userAvatar) {
    return userAvatar;
  }
  
  if (userName) {
    return generateLocalAvatar(userName, size);
  }
  
  // 默认头像
  return generateLocalAvatar('User', size);
}

# 折叠块插件使用说明

## 功能概述

折叠块插件为 ByteMD 编辑器添加了类似 Notion 的内容折叠/展开功能，支持在文章中创建可折叠的内容区域。

## 使用方法

### 1. 工具栏按钮

编辑器工具栏中新增了两个按钮：

- **折叠块按钮** (▼): 插入默认折叠的内容块
- **展开块按钮** (▲): 插入默认展开的内容块

### 2. 手动编写

在 Markdown 编辑器中直接输入 HTML 代码：

```html
<details>
<summary>点击展开/折叠</summary>

在这里输入折叠的内容...

</details>
```

### 3. 默认展开

如果希望内容默认展开，添加 `open` 属性：

```html
<details open>
<summary>默认展开 - 点击折叠</summary>

在这里输入默认展开的内容...

</details>
```

## 支持的内容

折叠块内可以包含任何 Markdown 内容：

- 文本段落
- 标题 (H1-H6)
- 列表 (有序/无序)
- 代码块
- 图片
- 链接
- 表格
- 嵌套的折叠块

## 样式特性

- 现代化的渐变背景
- 平滑的展开/折叠动画
- 悬停效果和阴影
- 支持暗色主题
- 响应式设计

## 示例

### 基础示例

```html
<details>
<summary>常见问题</summary>

**Q: 如何使用折叠功能？**
A: 点击工具栏中的折叠按钮，或手动输入 details 标签。

**Q: 支持嵌套吗？**
A: 是的，可以在折叠块内嵌套其他折叠块。

</details>
```

### 代码示例

```html
<details>
<summary>JavaScript 代码示例</summary>

```javascript
function toggleFold() {
  const details = document.querySelector('details');
  details.open = !details.open;
}
```

这个函数可以通过编程方式控制折叠状态。

</details>
```

### 嵌套示例

```html
<details>
<summary>技术文档</summary>

## API 参考

<details>
<summary>用户管理 API</summary>

### GET /api/users
获取用户列表

### POST /api/users
创建新用户

</details>

<details>
<summary>文章管理 API</summary>

### GET /api/articles
获取文章列表

### POST /api/articles
创建新文章

</details>

</details>
```

## 技术实现

- 基于 HTML5 `<details>` 和 `<summary>` 标签
- 使用 CSS 自定义样式
- 集成到 ByteMD 插件系统
- 支持 Markdown 和 HTML 混合编写

## 浏览器兼容性

- Chrome 12+
- Firefox 49+
- Safari 6+
- Edge 79+

## 注意事项

1. 折叠块内的 Markdown 语法会被正常解析
2. 建议在 summary 标签内使用简洁的标题
3. 嵌套折叠时注意层级关系
4. 在移动设备上点击区域可能需要调整

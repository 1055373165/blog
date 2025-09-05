# 折叠功能测试文章

这是一篇用于测试文章展示页面折叠功能的示例文章。

## 基础折叠测试

<details>
<summary>点击展开/折叠</summary>

这是一个基础的折叠内容示例。

支持 **Markdown** 语法，包括：
- 粗体和斜体
- 列表项
- 代码块

```javascript
function hello() {
    console.log('Hello, World!');
}
```

</details>

## 默认展开测试

<details open>
<summary>默认展开 - 点击折叠</summary>

这个折叠块默认是展开状态的。

### 嵌套标题

支持在折叠内容中使用各种 Markdown 元素：

1. 有序列表项 1
2. 有序列表项 2
3. 有序列表项 3

> 这是一个引用块
> 
> 可以包含多行内容

</details>

## 嵌套折叠测试

<details>
<summary>外层折叠块</summary>

这是外层的折叠内容。

<details>
<summary>内层折叠块</summary>

这是嵌套在内部的折叠内容。

支持多层嵌套：

- 列表项 1
- 列表项 2
  - 子列表项 A
  - 子列表项 B

</details>

外层内容继续...

</details>

## 复杂内容测试

<details>
<summary>包含表格和代码的折叠块</summary>

### 表格示例

| 功能 | 状态 | 说明 |
|------|------|------|
| 基础折叠 | ✅ | 已实现 |
| 嵌套折叠 | ✅ | 已实现 |
| 样式优化 | ✅ | 已实现 |

### 代码示例

```typescript
interface FoldableProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Foldable: React.FC<FoldableProps> = ({ 
  title, 
  children, 
  defaultOpen = false 
}) => {
  return (
    <details open={defaultOpen}>
      <summary>{title}</summary>
      {children}
    </details>
  );
};
```

### 图片支持

折叠块内也可以包含图片和其他媒体内容。

</details>

## 使用说明

在编辑器中，你可以：

1. 使用工具栏按钮插入折叠块
2. 手动编写 `<details>` 和 `<summary>` 标签
3. 嵌套多层折叠内容
4. 在折叠块内使用任意 Markdown 语法

<details>
<summary>技术实现细节</summary>

### 编辑器支持
- ByteMD 插件系统
- 工具栏按钮集成
- 自动模板插入

### 样式系统
- CSS 自定义样式
- 暗色主题支持
- 响应式设计
- 平滑动画效果

### 兼容性
- 基于 HTML5 标准
- 浏览器原生支持
- 无需额外 JavaScript
- SEO 友好

</details>

---

**测试完成！** 如果你能看到上述所有折叠块都正常工作，说明文章展示页面的折叠功能已成功实现。

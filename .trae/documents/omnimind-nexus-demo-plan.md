# OmniMind Nexus Demo — 纯白像素界面 实施计划

## 一、Summary

基于 `docs/omnimind-nexus/omnimind-nexus.html` 中的 OmniMind Nexus 项目概念，构建一个高端、纯白像素风格的品牌展示页（Landing Page）。页面以极简白底 + 像素网格视觉语言为核心，通过 Framer Motion 驱动的动效，将 32 Agent 集群、A2A 七层协议、Creator 自进化引擎等核心概念以视觉化方式呈现。

## 二、Current State Analysis

- 项目根目录 `/Users/luolinya/Downloads/every-agents/` 下仅有 `docs/omnimind-nexus/` 目录
- 无任何前端框架（无 package.json、无 React/Vue 配置）
- 现有 `omnimind-nexus.html` 是纯文档型页面，样式为传统文档风格（卡片网格、表格、粉紫渐变），非 demo 展示页
- 需要从零搭建项目

## 三、Design Decisions

### Visual Thesis
纯白像素指挥中心 — 极净白底上，以 1px 精度的像素网格线条、点阵节点、微妙的灰度层级构建出 AI Agent 网络的"数字指挥部"。冷峻、精确、未来感。

### Content Plan
1. **Hero** — 品牌名 OmniMind Nexus + 核心概念（A2A 协议 + 32 Agent）+ 单一 CTA
2. **Support** — A2A 七层协议栈可视化（像素化的层级结构）
3. **Detail** — Agent 生态全景（32 个 Agent 节点 + Creator 自进化）
4. **Final CTA** — 转化行动

### Interaction Thesis
1. **Hero 像素网格入场** — 页面加载时，像素网格从中心向外扩散构建，品牌文字从网格中浮现
2. **A2A 协议层 scroll-linked 揭示** — 七层协议随滚动逐层点亮，当前可视层高亮
3. **Agent 节点 hover 脉冲** — 悬停任意 Agent 节点时，相邻节点产生涟漪式连接线动画

### 设计约束
- 主色：纯白 `#FFFFFF` 背景 + `#0A0A0A` 文字
- 辅色：单一 accent 色 `#1A1A1A`（极暗灰，用于像素网格线、边框、hover 态）
- 像素网格线宽：1px，颜色 `#E5E5E5`（浅灰）或 `#D4D4D4`
- 字体：主标题用几何无衬线（如 Geist/Inter），正文用等宽像素感字体（如 Geist Mono）
- 零卡片：所有内容区使用纯布局（section + grid + divider），无 card 组件
- 无圆角或极小圆角（2px），保持像素精确感
- 无渐变、无阴影、无装饰色块

## 四、Proposed Changes

### 4.1 项目初始化

使用 Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Framer Motion 技术栈：
- `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack`
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4 用于像素级精确样式
- Framer Motion 11 用于动效
- 不引入任何 UI 组件库

### 4.2 核心文件结构

```
/Users/luolinya/Downloads/every-agents/
├── package.json
├── next.config.ts
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局 + 全局像素网格背景
│   │   ├── page.tsx            # 首页（组合所有 section）
│   │   └── globals.css         # Tailwind + 全局样式
│   ├── components/
│   │   ├── PixelGrid.tsx       # 全局像素网格背景层（1px 网格线）
│   │   ├── Nav.tsx             # 极简导航（纯文字，无背景）
│   │   ├── Hero.tsx            # 全屏 Hero 区
│   │   ├── ProtocolLayers.tsx  # A2A 七层协议可视化
│   │   ├── AgentNetwork.tsx    # 32 Agent 节点网络图
│   │   ├── CreatorSpotlight.tsx # Creator 自进化引擎展示
│   │   ├── Stats.tsx           # 数据指标行
│   │   ├── FinalCTA.tsx        # 底部 CTA
│   │   └── Footer.tsx          # 极简页脚
│   └── data/
│       └── agents.ts           # 32 Agent 数据 + A2A 协议层数据
```

### 4.3 各组件详细设计

#### PixelGrid.tsx — 全局像素网格背景
- 使用 CSS `background-image` + `repeating-linear-gradient` 绘制 1px 网格
- 网格间距 40px（桌面）/ 24px（移动端）
- 网格线颜色 `#EBEBEB`，极淡，不干扰阅读
- 页面加载时从中心向外扩散（scale + opacity 动画）

#### Nav.tsx
- 固定在顶部，透明背景，无边框
- 左侧：品牌名 "OMNIMIND NEXUS"（大写，letter-spacing 宽）
- 右侧：极简文字链接
- 滚动时保持透明，与纯白背景融合

#### Hero.tsx
- Full-bleed 全屏 Hero（`calc(100svh - 56px)` 扣除 nav 高度）
- 内容垂直居中，左对齐但内容区窄（max-w-lg）
- 视觉锚点：左侧大号像素化 "NEXUS" 文字（font-size 约 8-10rem），由像素点阵组成
- 层级：
  1. 标签行：`A2A™ PROTOCOL` — 等宽小字，letter-spacing 宽
  2. 品牌名：`OmniMind Nexus` — 巨大粗体
  3. 副标题：一行简短描述
  4. CTA 按钮：极简黑底白字按钮，2px 直角
- 入场动画：像素网格先出现 → 文字逐行从透明度 0 滑入（stagger 效果）

#### ProtocolLayers.tsx
- 七层协议栈，垂直排列
- 每层一条水平线 + 标签（L1-L7）+ 协议名 + 简短描述
- 随滚动：当前进入视口的层从左向右延伸高亮线（accent 色 `#1A1A1A`）
- 未进入视口的层保持浅灰线 `#E5E5E5`
- 使用 Framer Motion `useScroll` + `useTransform` 实现 scroll-linked 动画

#### AgentNetwork.tsx
- 32 个 Agent 以像素节点（4x4 或 6x6 像素方块）形式排列
- 四大分类（Core/Engineering/Business/Creative）用极细分隔线区分
- 每个节点：8x8px 的方块，默认 `#E5E5E5`，hover 时变为 `#1A1A1A`
- Hover 任意节点时，同分类节点产生 1px 连接线（SVG line）
- Creator Agent 节点特殊标识（略大 + 持续脉冲动画）

#### CreatorSpotlight.tsx
- 展示 Creator 的"缺口分析 → 设计 → 生成 → 测试 → 发布"五步流程
- 使用像素风格的步骤指示器（小方块代替圆点）
- 每步一行文字 + 左侧像素进度块
- 带入场 stagger 动画

#### Stats.tsx
- 四列数字：32 Agent / 7 协议层 / 12 预设团队 / ∞ 无限扩展
- 数字使用大号等宽字体，无彩色渐变（纯黑 `#0A0A0A`）
- 极细分隔线（1px `#E5E5E5`）分隔各列

#### FinalCTA.tsx
- 简短一行 CTA 文案
- 黑底白字按钮，直角，hover 时反向（白底黑字 + 黑边框）
- 无背景装饰

#### Footer.tsx
- 极简：品牌名 + 版权 + 1px 顶部分隔线
- 无任何多余信息

### 4.4 数据层 (`src/data/agents.ts`)

从 `omnimind-nexus.html` 提取结构化数据：
- 32 个 Agent 的 name、emoji、role、category、personality、description
- 7 个 A2A 协议层的 name、id、description、emoji
- 12 个预设团队的 name、tag、agents、mode
- 4 个统计数字

## 五、Assumptions & Decisions

1. **技术栈**：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Framer Motion 11。
2. **纯白像素风格**：以 1px 网格线、直角、等宽字体、无彩色（仅黑白灰）为核心视觉语言。accent 色使用极暗灰而非彩色，保持"纯白"感。
3. **图片**：不使用任何照片或插图。纯像素网格 + 文字排版构成全部视觉。Hero 中的视觉锚点由像素化文字本身充当。
4. **响应式**：移动端像素网格间距缩小至 24px，文字等比缩小，Agent 节点网格改为 2 列布局。
5. **动效性能**：所有 Framer Motion 动画使用 `will-change` 优化，scroll-linked 动画使用 `useScroll` 原生 API 确保 60fps。

## 六、Verification

1. `npm run dev` 启动开发服务器，页面正常渲染
2. 桌面端（1440px）Hero 区域品牌名清晰可见，像素网格背景正常
3. 滚动页面，A2A 协议层逐层高亮动画流畅
4. 悬停 Agent 节点，涟漪连接线动画正常
5. 移动端（375px）布局不溢出，像素网格间距适配
6. 所有文字对比度充足（黑 `#0A0A0A` 在白底上）
7. 页面无卡片、无圆角、无渐变、无彩色
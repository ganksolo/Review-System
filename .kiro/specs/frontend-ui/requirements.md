# Requirements Document - Frontend UI

## Introduction

本文档定义交易复盘系统的 Next.js 前端界面需求。该系统为用户提供友好的交易复盘录入和展示界面，支持 10 分钟快速复盘、动态规则库展示和数据可视化分析。

## Glossary

- **Frontend_Application**: Next.js 14+ 前端应用程序，使用 App Router 架构
- **Trade_Entry_Form**: 交易录入表单组件，用于收集交易复盘数据
- **Trade_List_View**: 交易列表页面组件，展示所有交易记录
- **Trade_Detail_View**: 交易详情页面组件，展示单个交易的完整信息
- **Rule_Library_Panel**: 动态规则库面板组件，展示永久排除清单、正确行为清单和环境错配提醒
- **Visualization_Dashboard**: 数据可视化仪表板组件，展示盈亏曲线、胜率统计等图表
- **Health_Report_View**: 系统健康度报告页面组件
- **Backend_API**: 后端 API 服务，提供数据接口
- **Form_Validator**: 表单验证器，使用 Zod 进行数据验证
- **Data_Fetcher**: 数据获取器，使用 TanStack Query 管理数据请求
- **Draft_Storage**: 草稿存储机制，使用浏览器本地存储保存未完成的表单数据
- **User**: 使用前端应用的交易者

## Requirements

### Requirement 1: 交易录入表单

**User Story:** 作为交易者，我希望通过分步骤表单快速录入交易复盘数据，以便在 10 分钟内完成一次完整复盘。

#### Acceptance Criteria

1. WHEN User 访问交易录入页面 THEN THE Trade_Entry_Form SHALL 显示分步骤表单界面，包含基础信息、决策环境、执行评估、归因反思四个步骤
2. WHEN User 在表单中输入数据 THEN THE Form_Validator SHALL 实时验证输入数据的有效性并显示验证错误信息
3. WHEN User 填写表单超过 30 秒 THEN THE Draft_Storage SHALL 自动保存当前表单数据到浏览器本地存储
4. WHEN User 返回未完成的表单 THEN THE Trade_Entry_Form SHALL 从 Draft_Storage 恢复之前保存的草稿数据
5. WHEN User 提交完整表单 THEN THE Frontend_Application SHALL 验证所有必填字段并通过 Backend_API 提交数据
6. WHEN 表单提交成功 THEN THE Frontend_Application SHALL 清除草稿数据并跳转到交易详情页面
7. WHEN 表单提交失败 THEN THE Frontend_Application SHALL 显示错误信息并保留用户输入的数据
8. THE Trade_Entry_Form SHALL 提供快捷按钮和预设选项以减少手动输入时间
9. THE Trade_Entry_Form SHALL 在移动端和桌面端均可正常使用并保持良好的用户体验

### Requirement 2: 交易列表页面

**User Story:** 作为交易者，我希望查看所有交易记录的列表，并能够通过多维度过滤和排序找到特定交易，以便快速定位和分析历史交易。

#### Acceptance Criteria

1. WHEN User 访问交易列表页面 THEN THE Trade_List_View SHALL 以表格形式显示所有交易记录，包含日期、股票代码、买入价格、卖出价格、盈亏金额、盈亏比例等关键字段
2. WHEN User 选择过滤条件（股票代码、日期范围、市场环境、结果类型）THEN THE Trade_List_View SHALL 仅显示符合所有选定条件的交易记录
3. WHEN User 点击列标题 THEN THE Trade_List_View SHALL 按该列进行升序或降序排序
4. WHEN 交易记录超过每页显示数量 THEN THE Trade_List_View SHALL 提供分页控件并支持页面跳转
5. WHEN User 点击交易记录行 THEN THE Frontend_Application SHALL 导航到该交易的详情页面
6. THE Trade_List_View SHALL 在页面顶部显示关键统计指标，包含总盈亏、胜率、盈亏比
7. WHEN User 点击导出按钮 THEN THE Frontend_Application SHALL 将当前筛选的交易记录导出为 CSV 或 Excel 文件

### Requirement 3: 交易详情页面

**User Story:** 作为交易者，我希望查看单个交易的完整信息和 LLM 分析结果，以便深入理解该交易的决策过程和改进方向。

#### Acceptance Criteria

1. WHEN User 访问交易详情页面 THEN THE Trade_Detail_View SHALL 显示完整的交易信息，包含基础信息、决策环境、执行评估、归因反思、LLM 分析结果五个模块
2. WHEN LLM 分析结果存在 THEN THE Trade_Detail_View SHALL 显示买入论点质量评分、归因分析、错误层级、行动指令
3. WHEN User 点击编辑按钮 THEN THE Frontend_Application SHALL 导航到编辑表单并预填充当前交易数据
4. WHEN User 点击删除按钮 THEN THE Frontend_Application SHALL 显示确认对话框并在确认后通过 Backend_API 删除该交易
5. WHEN 交易被删除 THEN THE Frontend_Application SHALL 导航回交易列表页面并显示删除成功消息
6. THE Trade_Detail_View SHALL 提供返回列表页面的导航链接

### Requirement 4: 动态规则库面板

**User Story:** 作为交易者，我希望查看动态更新的规则库，包含永久排除清单、正确行为清单和环境错配提醒，以便在交易决策时参考系统总结的规则。

#### Acceptance Criteria

1. WHEN User 访问规则库面板 THEN THE Rule_Library_Panel SHALL 显示三个独立区域：永久排除清单、正确行为清单、环境错配提醒
2. WHEN Backend_API 返回 permanent_exclusion_flag 为 true 的交易记录 THEN THE Rule_Library_Panel SHALL 在永久排除清单中显示这些记录的关键信息和排除原因
3. WHEN Backend_API 返回 result_type 为"正确盈利"的交易记录 THEN THE Rule_Library_Panel SHALL 在正确行为清单中显示这些记录的成功模式和关键要素
4. WHEN Backend_API 返回 environment_mismatch_flag 为 true 的交易记录 THEN THE Rule_Library_Panel SHALL 在环境错配提醒中显示这些记录的错配情况和建议
5. WHEN 新的 LLM 分析结果生成 THEN THE Rule_Library_Panel SHALL 自动刷新并显示最新的规则库内容
6. WHEN User 在规则库面板中输入搜索关键词 THEN THE Rule_Library_Panel SHALL 仅显示包含该关键词的规则条目
7. WHEN User 点击导出按钮 THEN THE Frontend_Application SHALL 将当前规则库内容导出为 PDF 文件

### Requirement 5: 数据可视化

**User Story:** 作为交易者，我希望通过图表直观地查看交易表现和统计分析，以便快速识别交易系统的优势和问题。

#### Acceptance Criteria

1. WHEN User 访问可视化仪表板 THEN THE Visualization_Dashboard SHALL 显示盈亏曲线图，展示累计盈亏随时间的变化趋势
2. WHEN User 访问可视化仪表板 THEN THE Visualization_Dashboard SHALL 显示胜率统计图，按市场环境和策略模式分组展示胜率
3. WHEN User 访问可视化仪表板 THEN THE Visualization_Dashboard SHALL 显示错误分布图，展示执行层、模式层、环境层错误的占比
4. WHEN User 访问可视化仪表板 THEN THE Visualization_Dashboard SHALL 显示选股维度效果对比图，比较不同选股维度的表现
5. WHEN User 访问可视化仪表板 THEN THE Visualization_Dashboard SHALL 显示策略模式效果对比图，比较不同策略模式的表现
6. WHEN Backend_API 返回的数据不足以生成图表 THEN THE Visualization_Dashboard SHALL 显示友好的提示信息说明数据不足
7. THE Visualization_Dashboard SHALL 使用 Recharts 库渲染所有图表并支持交互式操作（悬停显示详情、点击筛选等）

### Requirement 6: 系统健康度报告

**User Story:** 作为交易者，我希望查看交易系统的整体健康度评估和改进建议，以便了解系统的运行状态和优化方向。

#### Acceptance Criteria

1. WHEN User 访问系统健康度报告页面 THEN THE Health_Report_View SHALL 显示整体交易系统健康度评分（0-100 分）
2. WHEN User 访问系统健康度报告页面 THEN THE Health_Report_View SHALL 显示重复性错误统计，列出出现频率最高的错误类型和次数
3. WHEN User 访问系统健康度报告页面 THEN THE Health_Report_View SHALL 显示改进趋势图表，展示健康度评分随时间的变化
4. WHEN Backend_API 返回 LLM 生成的系统级建议 THEN THE Health_Report_View SHALL 显示这些建议的详细内容和优先级
5. THE Health_Report_View SHALL 提供时间范围选择器，允许 User 查看不同时间段的健康度报告

### Requirement 7: 数据获取和状态管理

**User Story:** 作为开发者，我希望前端应用能够高效地从后端 API 获取数据并管理加载状态，以便为用户提供流畅的使用体验。

#### Acceptance Criteria

1. THE Data_Fetcher SHALL 使用 TanStack Query 管理所有与 Backend_API 的数据交互
2. WHEN Data_Fetcher 发起数据请求 THEN THE Frontend_Application SHALL 显示加载指示器
3. WHEN Backend_API 返回数据 THEN THE Data_Fetcher SHALL 缓存数据并在后续请求中优先使用缓存
4. WHEN Backend_API 返回错误响应 THEN THE Frontend_Application SHALL 显示用户友好的错误消息并提供重试选项
5. WHEN Backend_API 响应超时 THEN THE Frontend_Application SHALL 显示超时错误消息并提供重试选项
6. THE Data_Fetcher SHALL 在数据过期时自动重新获取最新数据
7. WHEN User 执行创建、更新或删除操作 THEN THE Data_Fetcher SHALL 使数据缓存失效并重新获取相关数据

### Requirement 8: 响应式设计和用户体验

**User Story:** 作为交易者，我希望前端应用在不同设备和屏幕尺寸上都能正常使用，以便随时随地进行交易复盘。

#### Acceptance Criteria

1. THE Frontend_Application SHALL 在桌面端（屏幕宽度 >= 1024px）显示完整的多列布局
2. THE Frontend_Application SHALL 在平板端（屏幕宽度 768px - 1023px）调整布局以适应中等屏幕尺寸
3. THE Frontend_Application SHALL 在移动端（屏幕宽度 < 768px）使用单列布局并优化触摸交互
4. WHEN User 在移动端使用表单 THEN THE Trade_Entry_Form SHALL 使用适合移动设备的输入控件（日期选择器、下拉菜单等）
5. THE Frontend_Application SHALL 使用 Tailwind CSS 实现响应式设计
6. THE Frontend_Application SHALL 使用 shadcn/ui 组件库确保一致的视觉风格和交互体验
7. WHEN 页面加载或数据更新 THEN THE Frontend_Application SHALL 提供平滑的过渡动画以增强用户体验

### Requirement 9: 表单验证和错误处理

**User Story:** 作为交易者，我希望在填写表单时获得即时的验证反馈，以便及时纠正输入错误并确保数据质量。

#### Acceptance Criteria

1. THE Form_Validator SHALL 使用 Zod 定义所有表单字段的验证规则
2. WHEN User 输入数据到表单字段 THEN THE Form_Validator SHALL 在字段失去焦点时验证该字段
3. WHEN 表单字段验证失败 THEN THE Trade_Entry_Form SHALL 在字段下方显示具体的错误消息
4. WHEN User 尝试提交包含无效数据的表单 THEN THE Form_Validator SHALL 阻止提交并高亮显示所有错误字段
5. THE Form_Validator SHALL 验证必填字段不为空
6. THE Form_Validator SHALL 验证数值字段的范围和格式（例如价格必须为正数）
7. THE Form_Validator SHALL 验证日期字段的有效性和逻辑关系（例如卖出日期不早于买入日期）
8. THE Trade_Entry_Form SHALL 使用 React Hook Form 管理表单状态和验证流程

### Requirement 10: 环境配置和部署

**User Story:** 作为开发者，我希望前端应用能够通过环境变量配置后端 API 地址，并支持多种部署平台，以便灵活部署到不同环境。

#### Acceptance Criteria

1. THE Frontend_Application SHALL 从环境变量 NEXT_PUBLIC_API_URL 读取后端 API 的基础 URL
2. WHEN NEXT_PUBLIC_API_URL 未设置 THEN THE Frontend_Application SHALL 使用默认的本地开发 API 地址（http://localhost:8000）
3. THE Frontend_Application SHALL 支持部署到 Railway 平台
4. THE Frontend_Application SHALL 支持部署到 Vercel 平台
5. THE Frontend_Application SHALL 在构建时生成静态资源并优化性能
6. THE Frontend_Application SHALL 使用 Next.js 14+ 的 App Router 架构
7. THE Frontend_Application SHALL 使用 TypeScript 编写所有代码以提供类型安全

### Requirement 11: 数据导出功能

**User Story:** 作为交易者，我希望能够导出交易记录和规则库内容，以便进行离线分析或备份。

#### Acceptance Criteria

1. WHEN User 在交易列表页面点击导出按钮 THEN THE Frontend_Application SHALL 生成包含当前筛选结果的 CSV 文件
2. WHEN User 在交易列表页面选择 Excel 导出格式 THEN THE Frontend_Application SHALL 生成包含当前筛选结果的 Excel 文件
3. WHEN User 在规则库面板点击导出按钮 THEN THE Frontend_Application SHALL 生成包含所有规则库内容的 PDF 文件
4. THE Frontend_Application SHALL 在导出文件名中包含导出日期和时间
5. WHEN 导出操作进行中 THEN THE Frontend_Application SHALL 显示进度指示器
6. WHEN 导出操作完成 THEN THE Frontend_Application SHALL 自动下载生成的文件到用户设备

### Requirement 12: 性能优化

**User Story:** 作为交易者，我希望前端应用加载快速且响应迅速，以便高效地完成交易复盘工作。

#### Acceptance Criteria

1. THE Frontend_Application SHALL 在首次加载时实现代码分割，仅加载当前页面所需的 JavaScript 代码
2. THE Frontend_Application SHALL 对图片资源进行懒加载，仅在进入视口时加载
3. THE Frontend_Application SHALL 使用 Next.js 的服务端渲染（SSR）或静态生成（SSG）优化首屏加载速度
4. WHEN User 导航到新页面 THEN THE Frontend_Application SHALL 预加载该页面的关键资源
5. THE Data_Fetcher SHALL 实现请求去重，避免同时发起多个相同的 API 请求
6. THE Frontend_Application SHALL 使用虚拟滚动技术处理长列表，仅渲染可见区域的列表项
7. WHEN 页面包含大量数据 THEN THE Frontend_Application SHALL 使用分页或无限滚动减少单次渲染的数据量

### Requirement 13: 渲染策略 (SSR/CSR)

**User Story:** 作为用户，我希望不同页面根据其特性采用最优的渲染策略，以获得最佳的加载速度和交互体验。

#### Acceptance Criteria

1. THE Frontend SHALL 使用 SSR 渲染交易列表页面，确保首屏快速加载
2. THE Frontend SHALL 使用 CSR 渲染交易录入表单，优化表单交互性能
3. THE Frontend SHALL 使用 SSR 渲染动态规则库面板（PRD 要求），确保展示最新规则数据
4. THE Frontend SHALL 使用 CSR 渲染数据可视化仪表板，支持图表交互
5. THE Frontend SHALL 使用 SSR 渲染交易详情页，优化数据加载
6. THE Frontend SHALL 使用 SSR 渲染系统健康度报告页面
7. WHEN 使用 SSR THEN THE Frontend SHALL 通过 TanStack Query 进行客户端 hydration 以支持后续交互

## Notes

- 所有用户界面文本应支持国际化（i18n），优先支持中文
- 所有日期和时间显示应使用用户本地时区
- 所有货币金额应格式化为两位小数并添加货币符号
- 应用应遵循 WCAG 2.1 AA 级无障碍标准
- 所有 API 请求应包含适当的错误处理和重试机制
- 应用应在生产环境中启用性能监控和错误追踪

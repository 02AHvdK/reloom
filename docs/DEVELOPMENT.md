# 开发与维护入口

## 按任务找代码

| 要修改的内容 | 入口 |
| --- | --- |
| 工作区、导航、文档状态与编辑保存 | src/main.jsx |
| 卡片库与开场动画 | src/AgentLibrary.jsx |
| 文档解析、节点生成、原格式导出 | src/document.js |
| 保护内部节点类型标记 | src/sectionContent.js |
| 画布位置动画与排列 | src/AnimatedFlow.jsx、src/layout.js |
| 主题设置与配色 | src/Appearance.jsx、src/appearance.js |
| 当前界面样式调整 | src/reloom.css；其他 CSS 保留现有加载次序 |
| 本地库、AI 交换与结构检查 | src/IntegrationHub.jsx、src/integration.js |
| 调用规则与软件入口 | src/RuleEditor.jsx、src/rules.js、server/apps.js |
| 更新与反馈 | src/ProjectSupport.jsx、server/updates.js |
| HTTP API、服务启动与本地访问限制 | server/index.js |
| 旧独立工作流逻辑 | src/workflow.js、src/workflowExtras.js、src/WorkflowEditor.jsx |

旧独立工作流模块仍由单元测试覆盖；此次目录整理保留这些模块，不把它们当作废弃文件删除。

## 测试约定

单元测试放 tests/unit/，从这里通过 ../../src/ 或 ../../server/ 导入模块。测试素材只使用 tests/fixtures/ 中可公开的合成文档。浏览器脚本从项目根目录执行，结果写入 artifacts/，不修改真实浏览器的用户存储。

节点类别必须通过选择器修改；正文编辑隐藏内部 atlas-kind 标记，保存时恢复原标记。此行为由 protected-metadata.test.js 覆盖。

## 文件约定

当前说明放 docs/；历史参考和旧报告放本地 archive/，不要把旧验收结果当作当前测试结论。运行产物放 artifacts/ 或 dist/。发布候选包和已发布包分开保存。版本更新时修改 package.json、GitHub Release 与 releases.json，目录整理无需修改产品版本号。

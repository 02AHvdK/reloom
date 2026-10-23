# 项目目录

从项目根目录执行所有 npm 命令。当前程序版本见 package.json。

| 目录 | 用途 |
| --- | --- |
| src/ | React 界面、文档处理、主题与工作流逻辑 |
| server/ | 本地 Express API、更新检查、预设软件启动 |
| public/ | 随产品分发的静态资源、字体许可证、API 描述 |
| tests/unit/ | 当前单元测试，按功能命名 |
| tests/browser/ | 当前浏览器验收脚本 |
| tests/fixtures/ | 可公开的合成测试数据 |
| docs/ | 当前开发、验证和发布说明 |
| packaging/ | 当前公开发行包的构建脚本 |
| .github/ | GitHub 反馈表单 |
| dist/ | npm run build 生成的界面，不提交 Git |
| releases/ | 各版本发行包，已发布文件保持原样 |
| artifacts/ | 本地日志、截图与检查结果，不提交 Git |
| archive/ | 历史报告、旧脚本、旧设计资料及私人素材，不提交 Git |

## 常用入口

- 开发：`npm run dev`
- 验证：`npm test`、`npm run build`
- 浏览器验收：`npm run test:browser`（需要 Chrome；自动启停 4336 端口服务）
- 生产启动：`npm start`（先构建；默认端口 4317）
- 打包：`npm run release:web`（需要 Python 3）

浏览器验收输出位于 artifacts/reviews/support/。历史 review-v* 文件集中在 artifacts/reviews/。

## 历史文件

archive/file-moves.csv 记录本次归档的原路径与新路径。归档脚本保留原始代码，可能依赖旧版本 DOM、端口、目录或私人测试数据，不属于当前测试入口，也不应直接用来覆盖当前版本。旧版 Windows 打包脚本位于 archive/packaging/，其发布记录仍在 releases/0.16-demo/。

## 发布

公开包使用明确的目录清单，不依赖 Git 暂存区，不收集 archive、artifacts、node_modules 或 Futura 字体文件。将版本号、GitHub 发布标签与 releases.json 保持一致。代码目录整理本身不替换已发布下载包。

新构建写入 releases/版本/candidates/时间戳/，包含 ZIP 与 SHA256SUMS.txt；核对后再发布到 GitHub。既有版本根目录中的已发布包不会被覆盖。

## 相邻项目

介绍视频工程在 ../reloom-intro-video/，有自己的依赖与构建配置；旧版本 ZIP 与预览图在 ../archive/。它们不属于 RELOOM 应用源码仓库。

# NotebookLM 导入中心使用手册

状态: Active  
更新日期: 2026-04-09  
适用仓库: `/Users/smy/projects/blog`

## 1. 这是什么

你现在的博客后台已经有一个新的管理页:

- `/admin/notebooklm`

这个页面的目标不是“只接一个链接然后同步”，而是把不同来源的材料整理成一条可持续导入 NotebookLM 的管线。

目前支持四类入口:

1. `资源链接`
2. `本地文件`
3. `本地文件夹`
4. `微信视频号`

其中最重要的一条是:

`手机负责选内容，桌面负责采集，本地 agent 负责实体化内容，后台负责同步到 NotebookLM。`

---

## 2. 先说最重要的认证结论

截至 2026-04-09，这个集成对接的是 **NotebookLM Enterprise API**，官方示例使用的是:

- `Authorization: Bearer <access token>`

不是常见的:

- `API Key`

也就是说，你现在这版代码里真正要配置的是:

- `NOTEBOOKLM_ACCESS_TOKEN`

不是:

- `NOTEBOOKLM_API_KEY`

### 2.1 你这版代码当前的现实限制

这点很重要:

- 后端当前读取的是**静态** `NOTEBOOKLM_ACCESS_TOKEN`
- token 在后端进程启动时进入配置
- 当前代码**没有自动刷新 token**

所以:

1. 你先生成一个 access token
2. 写入环境变量 `NOTEBOOKLM_ACCESS_TOKEN`
3. 启动后端
4. token 过期后，重新生成 token
5. 更新环境变量
6. **重启后端**

这不是 Google API 的限制，而是当前项目这版 adapter 的实现选择。

---

## 3. Google Cloud / NotebookLM Enterprise 配置

这部分是“让真实同步可用”的前置条件。

## 3.1 你需要准备什么

至少需要:

1. 一个 Google Cloud Project
2. 已开启计费
3. 已启用 `Discovery Engine API`
4. 已开通 NotebookLM Enterprise 订阅或试用
5. 你的账号具备 NotebookLM 相关角色
6. 一个可用的 OAuth access token

## 3.2 推荐的多区域选择

Google 官方建议是:

- 如果你没有明确的合规/监管要求，优先选 `global`

这也和你当前代码默认值一致:

- `NOTEBOOKLM_LOCATION=global`

---

## 4. Google Cloud 控制台里的实际操作

## 4.1 创建或选择项目

进入 Google Cloud Console，选择一个项目，或者新建一个项目。

建议你记下两项:

- `PROJECT_ID`
- `PROJECT_NUMBER`

注意:

- 你这版代码需要的是 `PROJECT_NUMBER`
- 不是 `PROJECT_ID`

## 4.2 开启计费

在目标项目上启用 Billing。

## 4.3 启用 API

在项目里启用:

- `Discovery Engine API`

## 4.4 配置角色

至少要区分两类角色:

- `Cloud NotebookLM Admin`
- `Cloud NotebookLM User`

如果你要购买/分配许可证，还需要:

- `Discovery Engine Admin`

### 建议的分配方式

如果你自己既是管理员又是使用者，最省事的做法是给自己的 Google 账号至少加上:

1. `Cloud NotebookLM Admin`
2. `Cloud NotebookLM User`
3. `Discovery Engine Admin`

## 4.5 配置许可证

你必须先给账号分配 NotebookLM Enterprise license，否则即使 API 层权限对了，NotebookLM Enterprise 本身也可能不可用。

建议:

- 先在 `global` 区域开通 license
- 先手动把你自己的账号加入 license

---

## 5. 获取 Access Token

## 5.1 本地开发最简单的方式

先安装并登录 `gcloud`:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

然后生成 access token:

```bash
gcloud auth print-access-token
```

把输出结果填进:

- `NOTEBOOKLM_ACCESS_TOKEN`

### 推荐写法

```bash
export NOTEBOOKLM_ACCESS_TOKEN="$(gcloud auth print-access-token)"
```

## 5.2 如果你未来要接 Google Docs / Google Slides

NotebookLM Enterprise API 支持 Google Drive 内容源，但你当前项目这版后端还没有做 Drive source 的实际 adapter。

如果你未来要扩展这块，建议登录时额外考虑 Google Drive 授权。

## 5.3 关于 token 过期

Google Cloud 官方文档说明，access token 默认生命周期通常是短时有效的。  
对于你当前这版代码，这意味着:

1. token 生成后不要拖很久再启动服务
2. 如果同步突然开始 401/403，优先怀疑 token 过期
3. 重新执行:

```bash
export NOTEBOOKLM_ACCESS_TOKEN="$(gcloud auth print-access-token)"
```

4. 然后重启后端

---

## 6. 项目环境变量怎么配

## 6.1 后端必须关注的 NotebookLM 变量

你这版代码实际读取的是这些:

```env
NOTEBOOKLM_ENABLED=true
NOTEBOOKLM_MOCK_MODE=false
NOTEBOOKLM_API_BASE_URL=https://discoveryengine.googleapis.com
NOTEBOOKLM_PROJECT_NUMBER=123456789012
NOTEBOOKLM_LOCATION=global
NOTEBOOKLM_ACCESS_TOKEN=ya29.your_access_token_here
NOTEBOOKLM_AGENT_TOKEN=replace-with-a-long-random-secret
NOTEBOOKLM_TIMEOUT=60s
```

### 各字段含义

- `NOTEBOOKLM_ENABLED`
  - 是否启用真实 NotebookLM provider
- `NOTEBOOKLM_MOCK_MODE`
  - `true` 时只跑本地任务流，不真正调用 Google
- `NOTEBOOKLM_API_BASE_URL`
  - 当前默认应保持 `https://discoveryengine.googleapis.com`
- `NOTEBOOKLM_PROJECT_NUMBER`
  - Google Cloud 项目编号，不是项目 ID
- `NOTEBOOKLM_LOCATION`
  - 推荐先用 `global`
- `NOTEBOOKLM_ACCESS_TOKEN`
  - 真实调用 NotebookLM Enterprise API 的 Bearer token
- `NOTEBOOKLM_AGENT_TOKEN`
  - 本地桌面 agent 回传给博客后端时使用的独立 token
- `NOTEBOOKLM_TIMEOUT`
  - NotebookLM 请求超时

## 6.2 前端变量

前端至少要知道后端地址:

```env
VITE_API_BASE_URL=http://127.0.0.1:3001
```

## 6.3 建议的本地开发配置

你也可以直接从这两个模板文件开始:

- 后端模板: `/Users/smy/projects/blog/backend/.env.notebooklm.example`
- 前端模板: `/Users/smy/projects/blog/frontend/.env.notebooklm.example`

### 后端 `.env`

```env
DB_PASSWORD=your_mysql_password

NOTEBOOKLM_ENABLED=true
NOTEBOOKLM_MOCK_MODE=false
NOTEBOOKLM_API_BASE_URL=https://discoveryengine.googleapis.com
NOTEBOOKLM_PROJECT_NUMBER=123456789012
NOTEBOOKLM_LOCATION=global
NOTEBOOKLM_ACCESS_TOKEN=ya29.your_access_token_here
NOTEBOOKLM_AGENT_TOKEN=change-this-to-a-long-random-secret
NOTEBOOKLM_TIMEOUT=60s
```

### 前端 `frontend/.env`

```env
VITE_API_BASE_URL=http://127.0.0.1:3001
```

## 6.4 如果你还没准备好 Google 配置

你可以先这样跑完整链路:

```env
NOTEBOOKLM_ENABLED=false
NOTEBOOKLM_MOCK_MODE=true
```

这种模式下:

- 后台页面
- import job
- 本地 agent
- artifact 上传
- 事件回传

都可以先通，但不会真正写进 Google NotebookLM。

---

## 7. 如何启动项目

## 7.1 后端

```bash
cd /Users/smy/projects/blog/backend
make deps
make dev
```

如果你不用 `make`，也可以按你现有后端启动方式运行。

## 7.2 前端

```bash
cd /Users/smy/projects/blog/frontend
yarn install
yarn dev
```

## 7.3 本地 agent

本地 agent 位于:

- `/Users/smy/projects/blog/backend/cmd/local-capture-agent`

常见使用方式都已经在后台 `/admin/notebooklm` 的右侧卡片里自动生成。

---

## 8. 后台页面怎么用

进入:

- `/admin/notebooklm`

页面由三部分组成:

1. `Notebook Register`
2. `Source Model`
3. `Recent Jobs`

## 8.1 第一步: 创建 Notebook

先在页面左上区域创建一个 Notebook。

建议先用类似名字:

- `视频号学习资料`

## 8.2 第二步: 创建导入任务

选择一种来源:

1. `资源链接`
2. `本地文件`
3. `本地文件夹`
4. `微信视频号`

---

## 9. 四种导入模式怎么用

## 9.1 资源链接

适合:

- 公开网页
- 公开文章
- 公开论文落地页
- 可公开访问的视频落地页

流程:

1. 选择 `资源链接`
2. 填写 URL
3. 创建任务
4. 系统会自动尝试同步

## 9.2 本地文件

适合:

- PDF
- TXT
- Markdown
- 单个现成文件

流程:

1. 选择 `本地文件`
2. 选中文件
3. 创建任务
4. 系统会尝试自动同步

注意:

- 这一条复用了你项目原来的上传通道
- 如果以后遇到单文件体积限制，优先走桌面 agent 的“直传文件”路径

## 9.3 本地文件夹

适合:

- 先登记一批材料
- 后续再接批量 artifact 上传

当前阶段:

- 主要是创建任务与保存上下文
- 不是完整的批量同步器

## 9.4 微信视频号

这是本系统的主路径。

### 正确心智模型

不要再把它理解成:

- “先拿视频链接，再导入”

而要理解成:

- “先在桌面把内容实体化，再导入”

### 标准流程

1. 在手机微信里看到目标视频
2. 转发到文件传输助手，或先收藏
3. 在电脑微信里打开对应内容
4. 在后台创建一条 `微信视频号` 导入任务
5. 打开右侧 `Agent 配置卡片`
6. 复制并运行对应命令
7. 在电脑微信里播放一次，或点击“下载内容”
8. 等 agent 命中新文件并上传
9. 后台查看任务状态、事件时间线和最近线索

---

## 10. Agent 配置卡片怎么用

右侧卡片不是静态说明，它会自动联动当前视频号任务。

当前可用的命令分成 5 类。

## 10.1 Quick Start

用途:

- 正常主路径
- 自动探测常见候选目录
- 开始监听新文件并上传

适合:

- 你还不知道微信到底往哪个目录落文件
- 但想先跑一遍标准流程

## 10.2 Diagnostic

用途:

- 只看候选目录与已有文件预览
- 不开始真正监听

适合:

- 你想先判断 agent 有没有踩中微信实际目录
- 想先做一次“定位目录”排查

## 10.3 Guided Directories

用途:

- 用 agent 上一次探测出的目录作为显式 `--watch-dirs`

适合:

- 自动探测不稳定
- 你已经知道某几条目录更靠谱

## 10.4 MP4 Direct Upload

用途:

- 你已经手里有现成 `mp4`
- 不需要再监听微信目录

适合:

- 你已经从别的流程拿到了视频文件
- 或者你手工下载成功了

## 10.5 Transcript Fallback

用途:

- 原视频拿不到时，直接给当前 job 提供 transcript

适合:

- 你只有逐字稿
- 你只有整理好的 Markdown 笔记
- 你不想让任务卡死在“拿不到原视频”

---

## 11. 微信视频号推荐操作顺序

如果你要最稳地完成一次视频号导入，我建议按这个顺序来。

### 路线 A: 标准推荐

1. 创建 `微信视频号` 任务
2. 跑 `Quick Start`
3. 在电脑微信里播放视频
4. 看后台是否出现:
   - `目录探测`
   - `命中新文件`
   - `上传完成`

### 路线 B: 如果 A 不稳定

1. 跑 `Diagnostic`
2. 看候选目录是否合理
3. 如果有合理目录，改用 `Guided Directories`

### 路线 C: 如果你已经拿到 mp4

1. 跑 `MP4 Direct Upload`
2. 跳过监听

### 路线 D: 如果拿不到视频

1. 整理 transcript 或 Markdown 笔记
2. 跑 `Transcript Fallback`
3. 先把可理解文本推进 NotebookLM

---

## 12. Recent Jobs 面板怎么看

每条任务卡片会显示:

- 当前状态
- 所属 Notebook
- 进度
- artifacts 数量
- 最近更新时间

如果是视频号任务，还会看到:

- `Agent Insight`
- 候选目录
- 最近文件预览

---

## 13. 时间线与错误排查

“最近事件”时间线已经支持筛选:

1. `全部`
2. `目录`
3. `命中`
4. `上传`
5. `异常`

如果你在用视频号流程，我建议这样看:

## 13.1 没有任何目录事件

先检查:

- agent 是否真的运行了
- `NOTEBOOKLM_AGENT_TOKEN` 是否正确
- 后端地址是否写对

## 13.2 有目录事件，但没有命中事件

说明:

- agent 能跑
- 但没有找到“新的稳定文件”

优先排查:

1. 电脑微信是否真的触发了下载或缓存写入
2. 候选目录是否命中正确
3. 是否应该改用 `Guided Directories`

## 13.3 有命中事件，但没有上传完成

说明:

- 本地文件已经找到了
- 问题大概率出在上传阶段

优先展开错误事件，查看 payload 里的:

- `path`
- `error`

## 13.4 上传完成了，但任务没完成同步

优先检查:

1. `NOTEBOOKLM_ENABLED` 是否为 `true`
2. `NOTEBOOKLM_MOCK_MODE` 是否还是 `true`
3. `NOTEBOOKLM_PROJECT_NUMBER` 是否填写正确
4. `NOTEBOOKLM_ACCESS_TOKEN` 是否过期

---

## 14. 一套最小可用配置示例

## 14.1 先跑 Mock

如果你只是先验收 UI 和 job 流程:

```env
NOTEBOOKLM_ENABLED=false
NOTEBOOKLM_MOCK_MODE=true
NOTEBOOKLM_AGENT_TOKEN=dev-agent-token
```

## 14.2 再切真实 NotebookLM

```env
NOTEBOOKLM_ENABLED=true
NOTEBOOKLM_MOCK_MODE=false
NOTEBOOKLM_PROJECT_NUMBER=123456789012
NOTEBOOKLM_LOCATION=global
NOTEBOOKLM_ACCESS_TOKEN=ya29.your_access_token_here
NOTEBOOKLM_AGENT_TOKEN=dev-agent-token
NOTEBOOKLM_TIMEOUT=60s
```

切换后:

1. 重启后端
2. 进入 `/admin/notebooklm`
3. 先创建一个 Notebook
4. 用 `资源链接` 先做一次最简单的真实同步
5. 成功后再测试视频号链路

---

## 15. 生产环境建议

这部分是建议，不是当前代码已经完成的内容。

## 15.1 当前不建议长期依赖手工 token

原因:

- `gcloud auth print-access-token` 生成的是短期 access token
- 你这版后端没有自动刷新逻辑
- 所以长期跑在生产环境会不稳

## 15.2 更适合下一步实现的方向

后续建议把后端改成以下其中一种:

1. 服务账号 + 自动换取 access token
2. 服务账号模拟授权 + 周期刷新
3. 后端内部自己管理 OAuth token lifecycle

在那之前:

- 更适合先作为开发版或半手动运维版使用

---

## 16. 你当前最推荐的落地顺序

如果你现在要最快把整个功能真正跑起来，我建议按这个顺序:

1. 先把后端设成 `MOCK_MODE=true`，验证页面、job、agent、事件时间线都通
2. 去 Google Cloud 完成项目、计费、API、角色、license
3. 获取 `NOTEBOOKLM_ACCESS_TOKEN`
4. 填好真实环境变量
5. 重启后端
6. 先用 `资源链接` 做真实同步 smoke test
7. 再测试 `微信视频号`
8. 如果视频号提取不稳，优先使用:
   - `Diagnostic`
   - `Guided Directories`
   - `MP4 Direct Upload`
   - `Transcript Fallback`

---

## 17. 相关代码位置

关键前端页面:

- `/Users/smy/projects/blog/frontend/src/pages/admin/NotebookLMImportCenter.tsx`

前端 API:

- `/Users/smy/projects/blog/frontend/src/api/notebooklm.ts`

后端配置:

- `/Users/smy/projects/blog/backend/internal/config/config.go`

后端 handler:

- `/Users/smy/projects/blog/backend/internal/handlers/notebooklm.go`

后端 service:

- `/Users/smy/projects/blog/backend/internal/services/notebooklm.go`

本地桌面 agent:

- `/Users/smy/projects/blog/backend/cmd/local-capture-agent/main.go`

设计说明:

- `/Users/smy/projects/blog/docs/notebooklm-import-center-design.md`

---

## 18. 官方参考

- NotebookLM Enterprise setup:
  - https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-notebooklm
- NotebookLM Enterprise licensing:
  - https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-licensing
- Notebook create API:
  - https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks
- Notebook sources API:
  - https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources
- Google Cloud authentication with gcloud:
  - https://docs.cloud.google.com/docs/authentication/gcloud

## 19. 一句话总结

这套功能的关键不是“先拿视频号链接”，而是:

`先把内容实体化，再把它作为 NotebookLM 可接受的 source 推进去。`

而在真实接 Google 之前，你当前最需要配置的不是 API Key，而是:

- `NOTEBOOKLM_PROJECT_NUMBER`
- `NOTEBOOKLM_ACCESS_TOKEN`
- `NOTEBOOKLM_AGENT_TOKEN`

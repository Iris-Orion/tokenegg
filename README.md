# 🥚 TokenEgg

中国 AI 公司每天可领取的免费 token / 积分额度清单。纯静态页面，托管在 GitHub Pages，每天北京时间 00:10 由 GitHub Actions 自动抓取各平台**不需要登录的官方页面**核对额度。

平台清单最初整理自知乎用户「学写作的丧失」的回答 [opencode go取消首月5刀优惠会有什么影响？](https://www.zhihu.com/question/2075318872438265091/answer/2080272945654522135)，之后的额度数字以官方页面为准。

## 工作方式

```
data/platforms.json   平台清单 + 官方页面抓取配置（URL、关键词、解析正则）+ 抓取结果
data/meta.json        同步状态与历史（最近 60 次）
data/snapshots/*.md   每个官方页面最近一次抓取到的正文（前 20KB）
scripts/sync.mjs      同步脚本：逐个抓官方页面 → 摘出含关键词的行 → 按正则解析数字 → 更新额度、记录变化
.github/workflows/sync-and-deploy.yml  定时 + push + 手动触发；同步后提交数据并部署到 Pages
```

每个平台的抓取结果有三种状态：

| 状态 | 含义 | 卡片显示 |
|---|---|---|
| `ok` | 官方页面写明了数字，已解析 | 官方已核对（绿） |
| `no-number` | 页面能抓到，但没写具体数量，或页面是纯前端渲染 | 官方未标数量（黄），数字沿用社区数据 |
| `failed` | 页面抓取失败 | 官方页抓取失败（红），保留上次数据 |

抓取通过 Jina Reader（`r.jina.ai`）获取渲染后的正文，失败时回退到直接请求 HTML；AutoClaw 官网在 Reader 侧无法解析域名，因此直连优先。

## 本地运行

```bash
node scripts/sync.mjs            # 同步全部平台
node scripts/sync.mjs coze dumate  # 只同步指定平台（调试）
# 国内网络需要代理时：NODE_USE_ENV_PROXY=1 node scripts/sync.mjs
```

然后用任意静态服务器打开根目录（例如 `npx serve .`）。

## 维护

新增平台：在 `data/platforms.json` 的 `platforms` 数组里加一项，填 `official.url`（不登录能看的官方页面）、`official.keywords`（摘取原文用的关键词）和 `official.rules`（解析数字的正则，第一个捕获组是数字；token 类可用第二个捕获组匹配「万/亿」）。`community` 里放社区数据作为兜底。

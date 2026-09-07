# 🥚 TokenEgg

中国 AI 公司每天可领取的免费 token / 积分额度清单。纯静态页面，托管在 GitHub Pages，每天北京时间 00:10 由 GitHub Actions 自动抓取各平台**不需要登录的官方页面**核对额度。页面上只展示官方页面抓到的信息。

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
| `ok` | 官方页面写明了数字，已解析 | 官方已核对（绿），显示数字 |
| `no-number` | 页面能抓到，但没写具体数量，或页面是纯前端渲染 | 官方未标数量（黄），只显示官方措辞 |
| `failed` | 页面抓取失败 | 官方页抓取失败（红），保留上次结果 |

抓取通过 Jina Reader（`r.jina.ai`）获取渲染后的正文，失败时回退到直接请求 HTML（含浏览器 UA 重试）。AutoClaw 的 `autoclaw.zhipuai.cn` 在境外解析不到，改抓智谱同内容的 `autoglm.zhipuai.cn/autoclaw`。

## 本地运行

```bash
node scripts/sync.mjs              # 同步全部平台
node scripts/sync.mjs coze dumate  # 只同步指定平台（调试）
# 国内网络需要代理时：NODE_USE_ENV_PROXY=1 node scripts/sync.mjs
```

然后用任意静态服务器打开根目录（例如 `npx serve .`）。

## 维护

新增平台：在 `data/platforms.json` 的 `platforms` 数组里加一项，填 `official.url`（不登录能看的官方页面）、`official.keywords`（摘取原文用的关键词）和 `official.rules`（解析数字的正则，第一个捕获组是数字；token 类可用第二个捕获组匹配「万/亿」）。官方页面没有数字时，`fallbackDisplay` 决定卡片上显示的措辞。

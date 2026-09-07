# 🥚 TokenEgg

中国 AI 公司每天可领取的免费 token / 积分额度清单。纯静态页面，托管在 GitHub Pages，每天北京时间 00:10 由 GitHub Actions 自动同步。

数据来源：知乎用户「学写作的丧失」的回答 [opencode go取消首月5刀优惠会有什么影响？大家有其他plan推荐么？](https://www.zhihu.com/question/2075318872438265091/answer/2080272945654522135)。

## 工作方式

```
data/platforms.json   平台清单（名称、公司、官网、额度、模型、原文引用、补充说明）
data/meta.json        同步状态与历史（最近 60 次）
data/source-snapshot.md  最近一次抓取到的回答正文
scripts/sync.mjs      同步脚本：抓取回答 → 定位每个平台的原文行 → 解析「每天送 N 积分 / N 万 token」→ 更新额度
.github/workflows/sync-and-deploy.yml  定时 + push + 手动触发；同步后提交数据并部署到 Pages
```

- 抓取失败时保留旧数据，并在页面顶部提示失败原因。
- 原文里找不到某个平台时，卡片会标记「原文已移除？」，不会自动删除。
- 打卡记录只存在浏览器 localStorage，按北京日期自动重置。

## 本地运行

```bash
node scripts/sync.mjs          # 同步一次（国内网络需要代理时：NODE_USE_ENV_PROXY=1 node scripts/sync.mjs）
npx serve .                    # 或任意静态服务器，然后打开 http://localhost:3000
```

## 维护

新增平台：在 `data/platforms.json` 的 `platforms` 数组里加一项，`match.keywords` 填原文中能唯一识别它的关键词（小写），其余字段按现有条目填写即可。

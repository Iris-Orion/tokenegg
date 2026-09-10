<!-- https://docs.cnb.cool/zh/pricing.html fetched 2026-09-10T19:08:50.927Z -->
Title: 定价 | CNB 文档

URL Source: https://docs.cnb.cool/zh/pricing.html

Markdown Content:
[Skip to content](https://docs.cnb.cool/zh/pricing.html#VPContent)

[![Image 1](https://docs.cnb.cool/logo.color.svg)![Image 2](https://docs.cnb.cool/logo.color.svg)CNB 文档](https://docs.cnb.cool/zh/)

搜索文档 K

Main Navigation

指南

[快速开始](https://docs.cnb.cool/zh/guide/first-repo.html)

[Git 认证](https://docs.cnb.cool/zh/guide/git-access.html)

[访问令牌](https://docs.cnb.cool/zh/guide/access-token.html)

[部署令牌](https://docs.cnb.cool/zh/guide/deploy-key.html)

[角色权限](https://docs.cnb.cool/zh/guide/role-permissions.html)

[迁移工具](https://docs.cnb.cool/zh/guide/migration-tools.html)

功能

[云原生构建](https://docs.cnb.cool/zh/build/intro.html)

[云原生开发](https://docs.cnb.cool/zh/workspaces/intro.html)

[代码托管](https://docs.cnb.cool/zh/repo/intro.html)

[制品库](https://docs.cnb.cool/zh/artifact/intro.html)

[AI 助手](https://docs.cnb.cool/zh/ai/intro.html)

[安全扫描](https://docs.cnb.cool/zh/security/intro.html)

[任务集](https://docs.cnb.cool/zh/missions/intro.html)

[定价](https://docs.cnb.cool/zh/pricing.html)

开发者

[徽章](https://docs.cnb.cool/zh/develops/badge.html)

[Open API](https://docs.cnb.cool/zh/develops/openapi.html)

[Skills](https://docs.cnb.cool/zh/develops/skills.html)

[CNB CLI](https://docs.cnb.cool/zh/develops/cnb-cli.html)

[LLMs （在新窗口打开）](https://docs.cnb.cool/zh/llms.txt)

插件

[内置任务](https://docs.cnb.cool/zh/build/internal-steps.html)

[插件市场](https://docs.cnb.cool/zh/plugins.html)

[插件制作](https://docs.cnb.cool/zh/build/create-plugin.html)

[贡献插件](https://docs.cnb.cool/zh/build/contribute-plugin.html)

更多

[OAuth 授权](https://docs.cnb.cool/zh/oauth/user.html)

[平台赞赏](https://docs.cnb.cool/zh/sponsor.html)

[企业版](https://docs.cnb.cool/zh/enterprise.html)

[产品 Logo](https://docs.cnb.cool/zh/logo.html)

[常见问题](https://docs.cnb.cool/zh/faq.html)

平台集成

[TAPD](https://docs.cnb.cool/zh/saas/tapd.html)

简体中文

[English](https://docs.cnb.cool/en/pricing.html)

简体中文

[English](https://docs.cnb.cool/en/pricing.html)

外观

此页内容

*   [概述](https://docs.cnb.cool/zh/pricing.html#gai-shu)
*   [计费模式](https://docs.cnb.cool/zh/pricing.html#ji-fei-mo-shi)
    *   [计费规则](https://docs.cnb.cool/zh/pricing.html#ji-fei-gui-ze)
    *   [存储资源用量统计](https://docs.cnb.cool/zh/pricing.html#cun-chu-zi-yuan-yong-liang-tong-ji)
    *   [计算资源用量统计](https://docs.cnb.cool/zh/pricing.html#ji-suan-zi-yuan-yong-liang-tong-ji)

*   [AI 资源用量统计](https://docs.cnb.cool/zh/pricing.html#ai-zi-yuan-yong-liang-tong-ji)
    *   [用量计算规则](https://docs.cnb.cool/zh/pricing.html#yong-liang-ji-suan-gui-ze-1)

*   [免费额度说明](https://docs.cnb.cool/zh/pricing.html#mian-fei-e-du-shuo-ming)
*   [查看用量](https://docs.cnb.cool/zh/pricing.html#cha-kan-yong-liang)
*   [非营利组织特权](https://docs.cnb.cool/zh/pricing.html#fei-ying-li-zu-zhi-te-quan)
    *   [申领方式](https://docs.cnb.cool/zh/pricing.html#shen-ling-fang-shi)

# 定价

复制页面

*   [复制页面 将页面以 Markdown 格式复制供 LLMs 使用](javascript:void(0))
*   [以 Markdown 格式查看 以纯文本查看此页面](https://docs.cnb.cool/zh/pricing.md)

1298 字 约 4 分钟

## [概述](https://docs.cnb.cool/zh/pricing.html#gai-shu)

当前版本是 **云原生构建社区版**，每个顶级组织独立结算，**按量计费**，月初扣除上月费用。

企业客户如有网络隔离、数据安全等合规要求，请选择 [企业版](https://docs.cnb.cool/zh/enterprise.html)。

## [计费模式](https://docs.cnb.cool/zh/pricing.html#ji-fei-mo-shi)

免费额度 + 超额按量计费。免费额度用尽后，相关能力将受限。例如 AI Credits 用尽后，NPC 等 AI 能力将不可用。

前往 `组织-设置-用量管理`，绑定 [腾讯云-云原生构建预算](https://console.cloud.tencent.com/cnb)，可提升用量上限。

### [计费规则](https://docs.cnb.cool/zh/pricing.html#ji-fei-gui-ze)

| 计费项 | 免费额度 | 超额计费标准 | 统计范围 |
| --- | --- | --- | --- |
| 仓库存储 | 100 GiB | 1元/GiB/月 | Git 对象 |
| 对象存储 | 100 GiB | 1元/GiB/月 | 制品、LFS 对象等 |
| 云原生构建-CPU | 160 核时/月 | 0.125元/核时 | 云原生构建 CPU |
| 云原生开发-CPU | 1600 核时/月 | 0.125元/核时 | 云原生开发 CPU |
| 云原生构建-GPU | 0 核时/月 | 0.5元/核时 | 云原生构建 GPU |
| 云原生开发-GPU | 0 核时/月 | 0.5元/核时 | 云原生开发 GPU |
| AI Credits | 500 credits/月 | 0.05元/credit | NPC 等 AI Token |

*   **对象存储**包括制品、LFS 对象、图片及附件。
*   **AI Credits** 覆盖 NPC、云原生开发内置 CodeBuddy、AI 代码评审等 AI 能力的 Token 消耗。

### [存储资源用量统计](https://docs.cnb.cool/zh/pricing.html#cun-chu-zi-yuan-yong-liang-tong-ji)

计费公式：自然月内日均用量 − 免费额度。

### [计算资源用量统计](https://docs.cnb.cool/zh/pricing.html#ji-suan-zi-yuan-yong-liang-tong-ji)

计费公式：自然月内累积用量 − 免费额度。

#### [核时作为计量单位](https://docs.cnb.cool/zh/pricing.html#he-shi-zuo-wei-ji-liang-dan-wei)

*   `8核` 使用 `1小时` = `8核 × 1小时` = `8核时`
*   构建节点规格可按需声明，详见 [构建节点](https://docs.cnb.cool/zh/build/build-node.html)

#### [用量计算规则](https://docs.cnb.cool/zh/pricing.html#yong-liang-ji-suan-gui-ze)

*   启动云原生构建/云原生开发后，每 5 min 冻结一次用量，冻结用量 = 5 min × 节点规格。

*   若预冻结时检测到可用额度不足，系统将立即终止任务，避免产生额外费用。

*   构建任务完成后，按实际运行时间上报用量。

*   若构建任务跨月执行，用量将计入结束时间所在的自然月。

#### [冻结用量计算示例](https://docs.cnb.cool/zh/pricing.html#dong-jie-yong-liang-ji-suan-shi-li)

若构建任务节点规格为 8核，则每 5 min 预冻结的用量计算如下：

`8核 × 5 min = 0.67核时`

## [AI 资源用量统计](https://docs.cnb.cool/zh/pricing.html#ai-zi-yuan-yong-liang-tong-ji)

适用计费项：AI Credits

计费公式：自然月内累积用量 − 免费额度。

统计范围：NPC、云原生开发内置 CodeBuddy、AI 代码评审等 AI 能力的 Token 消耗。

### [用量计算规则](https://docs.cnb.cool/zh/pricing.html#yong-liang-ji-suan-gui-ze-1)

*   AI 任务启动后，每次模型调用完成，按实际 Token 消耗预冻结用量。

*   若预冻结时检测到可用额度不足，将终止当前任务，避免产生额外费用。

*   任务结束后，按实际消耗上报用量。

*   若任务跨月执行，用量将计入结束时间所在的自然月。

## [免费额度说明](https://docs.cnb.cool/zh/pricing.html#mian-fei-e-du-shuo-ming)

**仓库存储：** Git 对象占用的存储空间，免费额度 `100GiB`。

**对象存储：** 制品、LFS 对象、图片及附件占用的存储空间，免费额度 `100GiB`。

**云原生构建-CPU** 免费额度 `160核时/月`，月底清零，不叠加至次月。

| CPU（核） | 内存(GiB) | 免费额度可用时长 |
| --- | --- | --- |
| 1 | 2 | 160小时 |
| 2 | 4 | 80小时 |
| 4 | 8 | 40小时 |
| 8 | 16 | 20小时 |
| 16 | 32 | 10小时 |
| 32 | 64 | 5小时 |
| 64 | 128 | 2.5小时 |

**云原生开发-CPU** 免费额度 `1600核时/月`，月底清零，不叠加至次月。

| CPU（核） | 内存(GiB) | 免费额度可用时长 | 适用场景 |
| --- | --- | --- | --- |
| 1 | 2 | 1600小时 | 10人、8h/天、20天 |
| 2 | 4 | 800小时 | 5人、8h/天、20天 |
| 4 | 8 | 400小时 | 3人、8h/天、16天 |
| 8 | 16 | 200小时 | 1人、8h/天、25天 |
| 16 | 32 | 100小时 | 1人、8h/天、12天 |
| 32 | 64 | 50小时 | 1人、8h/天、6天 |
| 64 | 128 | 25小时 | 1人、8h/天、3天 |

*   **适用场景** 列描述：支持人数、每日使用小时数、持续天数。

**AI Credits:** 免费额度 `500 credits/月`，月底清零，不叠加至次月。

## [查看用量](https://docs.cnb.cool/zh/pricing.html#cha-kan-yong-liang)

可通过以下入口查看用量：

| 路径 | 说明 |
| --- | --- |
| `组织 → 设置 → 用量管理` | 组织级别整体用量 |
| `仓库 → 设置 → 用量统计` | 仓库级别用量详情 |
| `制品库 → 设置 → 用量统计` | 制品库级别用量详情 |

## [非营利组织特权](https://docs.cnb.cool/zh/pricing.html#fei-ying-li-zu-zhi-te-quan)

符合条件的非营利组织，可申请永久免费使用特权，特权内容包含：

**仓库存储**，Git 对象占用的存储空间，特权配额 `6TiB`。

**对象存储**，制品、LFS 对象、图片及附件占用的存储空间，特权配额 `60TiB`。

**云原生构建-CPU** 特权额度 `6400核时/月`，月底清零，不叠加至次月。

**云原生开发-CPU** 特权额度 `64000核时/月`，月底清零，不叠加至次月。

### [申领方式](https://docs.cnb.cool/zh/pricing.html#shen-ling-fang-shi)

请公益慈善机构前往 [腾讯技术公益数字工具箱](https://techforgood.qq.com/tools/toolsDetail/11) 完成申领。

0%

© 2026 cnb.cool


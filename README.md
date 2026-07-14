# 配货喵

手机优先的配货卡 PWA。订单和商品图片全部在浏览器本地处理，不上传服务器。

## 功能

- 上传 `.xlsx` 订单表并读取最后一个 Sheet
- 提取 WPS / 飞书 `DISPIMG` 内嵌图片
- 内置档口 → 楼层映射，可在手机维护
- 安全合并：商品 SKU → 多品名商品主编码 → 图片 ID
- 按档口生成可爱、高清、可打印的 PNG 配货卡
- 一键下载全部卡片 ZIP
- PWA 安装与离线应用壳

## 本地预览

```bash
python3 -m http.server 4173
```

浏览器打开 `http://localhost:4173`。

## GitHub Pages

推送到 `main` 后，GitHub Actions 会自动部署。

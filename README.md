# mrpx.github.io

mrpx 项目官网与在线模拟器，面向 GitHub Pages 托管。

## 结构

```
index.html            首页
play/                 WebAssembly 模拟器（复用 mrpx.js / mrpx.wasm / runtime / vendor）
library/              664 个 MRP 包索引与 242 张截图
docs/                 项目文档缩略版
assets/css/site.css   视觉系统
assets/js/site.js     首页动效
assets/js/library.js  应用库检索与分页
assets/data/          目录数据（catalog.json）
assets/img/games/     自动截图
play/app.js           模拟器外壳：对话框、声音、状态、目录抽屉
```

`play/controls.js`、`play/filesystem.js`、`play/midi.js` 来自原项目 `wasm/web/`，除必要路径外不做修改。

## 本地预览

```powershell
python serve.py 8100
# 打开 http://127.0.0.1:8100/
```

站点必须在 HTTP(S) 下运行：WebAssembly 运行时、目录数据与音色都通过同源 fetch 读取，`file://` 打开会失败。

## 部署

1. 推送到仓库 `master`（仓库名应为 `<user>.github.io`，或启用 Pages 的任意仓库）。
2. Settings → Pages → Source: Deploy from a branch → `master` / `/ (root)`。
3. `.nojekyll` 已存在，避免 Jekyll 处理下划线开头的路径。

页面内部链接全部是相对路径，因此放在 `<user>.github.io` 根域名或仓库子路径下都能工作；只有 `404.html` 用了根路径链接，如果站点部署在子路径（如 `/<repo>/`），把它的 `/assets`、`/play` 等前缀改掉即可。

体积约 46 MB，主要来自 `play/mrpx.wasm`（1.4 MB）、`play/vendor/spessasynth/GeneralUser-GS.sf2`（32 MB）与截图。音色与 worklet 必须随站点完整分发，网页只读同源资源，不访问 CDN。

## 数据与边界

- 目录只保存包信息与截图，不托管 MRP 文件；“启动”会从原资源仓库 `vmrp/vmrp.github.io` 的 `raw.githubusercontent.com` 拉取对应 MRP，跨域受限时请改用“导入 MRP”。
- 本站是 mrpx 的展示站点，项目源码与许可证以 <https://github.com/mythroadx/mrpx> 为准（GPL-3.0）。截图由自动化流程捕获，未经人工逐张复核。

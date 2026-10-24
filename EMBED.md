# 幻局 · AGNX 子应用

- **appId**: `phantom`
- **路径**: `~/.agnx-dev/apps/phantom`（从 Downloads/dou-di-zhu 拷贝）
- **形态**: Guest Web + supervised sidecar（FastAPI `:8765` + frontend `:5173`）

## 在 Agnx 桌面端打开

1. 确认本机 Agnx Dev 已指向 `~/.agnx-dev`
2. 侧栏点 **幻局**，或命令面板搜「打开幻局」
3. 首次打开会 ensure 拉起 Python（可能数秒～十余秒，含 torch）
4. Tab 内应满铺牌桌 UI；不要依赖外开系统浏览器

## 本地手动 ensure

```bash
node ~/.agnx-dev/apps/phantom/.agnx/tools/ensure-phantom.mjs --force-restart
curl -s http://127.0.0.1:8765/health
open http://127.0.0.1:5173/?mode=play
```

数据目录：`~/.agnx-dev/apps/data/phantom/`

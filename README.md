# 鋤大D

React + TypeScript PWA，規則以 [`RULES.md`](./RULES.md) 為準。

## 本機

```bash
pnpm install
pnpm test
pnpm dev
```

瀏覽器打開 Vite 位址就可以打「電腦對戰」。

真人開房需要 WebSocket server：

```bash
pnpm server
```

預設 `ws://127.0.0.1:8787/ws`，Vite 會把 `/ws` proxy 過去。

## 指令

- `pnpm dev`：frontend
- `pnpm server`：房間 WebSocket server
- `pnpm test`：規則引擎同房間測試
- `pnpm build`：production build

## 環境變數

- `VITE_WS_URL`：frontend WebSocket 位址
- `DATA_NAMESPACE`：房間 namespace，Production／Preview／Development 必須分開
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`：可選，用嚟做跨 instance 房間狀態

未設定 Redis 時，房間狀態只存在單一 process memory，適合本機同細規模試玩。

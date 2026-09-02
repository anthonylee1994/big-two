# 鋤大D PWA 開發計劃

## 1. 目標

用 React、TypeScript、Tailwind CSS 同 Zustand 開發一個可安裝嘅鋤大D PWA，並以 [`RULES.md`](./RULES.md) 作為唯一遊戲規則來源。

首個可玩版本需要：

- 同時支援 mobile 同 desktop browser。
- 可以離線同電腦對戰。
- 可以開房邀請真人網上對戰。
- 真人不足 4 人時，可以用電腦玩家補位。
- 重新整理或短暫斷線後，可以安全重連進行中嘅真人牌局。
- 隱藏其他玩家手牌，所有網上牌局由 server 驗證出牌，client 不可自行決定結果。

## 2. MVP 範圍

### 包含

- 4 人鋤大D。
- 單局及連續多局計分。
- 訪客名稱，不強制註冊帳戶。
- 電腦對戰：1 名真人加 3 名電腦。
- 真人對戰：建立私人房、房間碼／分享連結、加入房間、準備、開始。
- 房主可以將空位加入或移除電腦玩家。
- Responsive game table、手牌、出牌區、玩家狀態及操作列。
- PWA 安裝、離線載入、版本更新提示。
- 廣東話介面。

### 暫不包含

- 公開配對、大廳或排名榜。
- 帳戶、好友、聊天、觀戰及回放。
- 金錢下注或任何付款功能。
- 自訂規則；MVP 統一使用 `RULES.md`。
- 2 人或 3 人變體。

## 3. 技術方案

### Frontend

- **React + TypeScript**：畫面、component 同 client-side application logic。
- **Tailwind CSS**：responsive layout、主題、動畫同 safe-area spacing。
- **Zustand**：畫面狀態、玩家 session、房間狀態，以及 server snapshot cache。
- **Vite PWA**：Web App Manifest、service worker、離線 app shell 同更新流程。
- **Web Worker**：執行電腦玩家決策，避免 AI 思考阻塞 UI。

### Backend

真人網上對戰需要一個 authoritative game server；單靠靜態 PWA 做唔到可信嘅隱藏手牌及同步。

- 使用 TypeScript Node.js server。
- 使用 WebSocket 傳送即時房間及牌局事件。
- Server 持有完整牌局狀態，負責洗牌、派牌、驗證出牌、計分及決定勝負。
- 每個 client 只收到自己手牌、公開桌面資料、其他玩家剩餘牌數。
- Production 部署使用 Vercel Functions；WebSocket 使用 Vercel Fluid Compute 嘅 WebSocket Public Beta。
- 房間、牌局、presence、reconnect session、revision 同 command 去重資料放喺 serverless-compatible 外部 data store，唔依賴 Function memory。
- 跨 Function instance 嘅房間 event 經外部 pub/sub 協調；單一 instance memory 只可作 request 內短期 cache。

### Vercel deployment

成個 production application 部署去 Vercel：

- Vite frontend 由 Vercel CDN 提供 static assets 同 SPA entry point。
- Server API 放喺 `api/`，使用 Vercel Node.js Functions。
- WebSocket endpoint 使用 `wss://`，並開啟 Fluid Compute；client 必須處理 Function 時限、連線中斷及自動重連。
- 牌局狀態使用外部 durable store；WebSocket Function 唔可以將 room、presence 或牌局真相只保存在 process memory。
- Function region 設定到接近主要玩家及 data store 嘅亞洲 region，減少每次出牌延遲。
- Production、Preview、Development 分開 environment variables、data namespace 同 realtime channel namespace，Preview deployment 不可連入正式牌局。
- `main` branch 自動部署 Production；pull request／其他 branch 產生 Preview deployment。
- `vercel.json` 負責 SPA fallback、Function runtime／region 設定及必要 security headers。
- Secrets 只放 Vercel Environment Variables，唔寫入 frontend bundle 或 git。
- 發佈前必須喺 Vercel Preview 做兩個以上 browser session 嘅真人牌局 smoke test。

Vercel WebSocket 目前屬 Public Beta，所以 transport 層要保持可替換。如果 beta 限制、價格或穩定性唔符合需要，可以改用 Ably、PartyKit、Pusher 或其他 Vercel 建議嘅 realtime provider，而唔改遊戲 engine 同 UI。

### 共用 domain package

遊戲規則、型別同 protocol schema 由 frontend、AI、server 共用，避免三邊各寫一套規則：

```text
src/
  app/
  components/
  features/
    home/
    lobby/
    game/
    results/
  game/
    domain/
    engine/
    ai/
  stores/
  transport/
  workers/
  styles/
api/
  ws.ts
  health.ts
server/
  rooms/
  sessions/
  transport/
shared/
  game/
  protocol/
```

實際落手時，可以先留喺同一 repo；如果 frontend 同 server build 邊界變複雜，再改成 workspace packages。

## 4. 核心資料模型

最少需要以下 domain types：

- `Suit`：diamond、club、heart、spade。
- `Rank`：3 至 10、J、Q、K、A、2。
- `Card`：唯一 `id`、`suit`、`rank`。
- `Combination`：single、pair、triple、straight、flush、fullHouse、fourOfAKind、straightFlush。
- `Player`：id、名稱、座位、類型、連線狀態、剩餘牌數、分數。
- `GameState`：局數、目前玩家、牌權玩家、上一手牌、pass 次數、手牌、牌堆、狀態。
- `PublicGameState`：移除其他玩家手牌後，可安全傳送畀 client 嘅狀態。
- `GameAction`：playCards、pass、startRound、reconnect。

牌局狀態以 action 驅動，engine 對每個 action 回傳新狀態及 domain events。唔直接喺 React component 入面改遊戲規則。

## 5. Zustand 狀態設計

按責任拆開 store，避免將成個 app 塞入一個巨型 store：

- `useSessionStore`：player id、display name、reconnect token。
- `useLobbyStore`：room code、座位、ready 狀態、房主設定。
- `useGameStore`：目前 public snapshot、自己手牌、選中牌、server revision。
- `usePreferencesStore`：音效、動畫、牌面排序、觸覺回饋。
- `useConnectionStore`：connecting、connected、reconnecting、latency、last error。

原則：

- Online mode 嘅 Zustand 只係 server state projection，唔係真相來源。
- 出牌先送 command，收到 server 接納事件後先正式更新桌面。
- UI 可以顯示 pending 狀態，但唔做無法可靠 rollback 嘅 optimistic play。
- Offline mode 使用同一 game engine，由 local transport adapter 模擬 server command/event 流程。

## 6. 遊戲引擎

先完成純 TypeScript engine，之後先砌 UI 同網絡。

需要實作：

1. 建立牌組、可靠洗牌及派牌。
2. 辨認合法牌型。
3. 比較同類牌型及五張牌型級別。
4. 處理 `♦3` 開局、輪流出牌、Pass、重新取得牌權。
5. 處理一條龍及完局。
6. 計算每局罰分及累積分數。
7. 由完整狀態產生每位玩家專屬嘅安全 snapshot。
8. 拒絕錯誤玩家、錯誤 revision、非法牌組及重複 command。

Engine 必須係 deterministic：除咗注入嘅 shuffle seed／牌序之外，相同 state 加 action 永遠產生相同結果，方便測試、除錯及日後回放。

## 7. 電腦玩家

### MVP AI

唔需要一開始就整到識世界冠軍級策略，但要出牌合法、反應自然：

1. 列出當前所有合法出牌。
2. 無牌權時，傾向用最細而且能壓過上一手嘅組合。
3. 有牌權時，優先減少散牌，同時保留較有控制力嘅 `2`、大對子及高級五張牌。
4. 對手只剩 1–2 張牌時，提高阻截權重。
5. 評估出牌會否拆散蛇、夫佬、四條等有價值組合。
6. 加入短暫隨機思考時間，但測試環境可關閉延遲。

AI 只可以經正常 `GameAction` 出牌，唔可以繞過 engine。AI 計算放入 Web Worker；server 補位 bot 則重用相同策略模組。

### 後續改善

- Easy／Normal／Hard 難度。
- Monte Carlo rollout 或局面評分搜尋。
- 固定 seed benchmark，量度不同 AI 版本勝率及平均剩牌。

## 8. 真人對戰及同步

### 房間流程

```text
首頁 → 建立／加入房間 → 選位及準備 → 房主開始 → 洗牌派牌 → 多局遊戲 → 結果
```

### WebSocket protocol

Client command 最少包括：

- `room.create`
- `room.join`
- `room.ready`
- `room.addBot`
- `room.removeBot`
- `game.start`
- `game.playCards`
- `game.pass`
- `session.resume`
- `ping`

Server event 最少包括：

- `room.snapshot`
- `game.snapshot`
- `game.actionAccepted`
- `game.actionRejected`
- `game.roundEnded`
- `game.matchEnded`
- `player.connectionChanged`
- `error`
- `pong`

每個 command 帶 `commandId` 同預期 `revision`。Server event 帶遞增 `revision`，用嚟去重、偵測漏 event 同觸發完整 snapshot resync。

### 斷線處理

- Client 將短期 reconnect token 存於 local storage。
- 斷線後使用 exponential backoff 自動重連。
- 重連成功後向 server 取得最新 snapshot，而唔係重播 client 自己估計嘅狀態。
- 玩家斷線時先暫停有限時間；逾時後可由 bot 接管。
- 原玩家回來後，只可以喺安全時機取回座位，避免同 bot 同時出牌。

## 9. Responsive UI

### 共用設計原則

- Game table 保留四個固定座位方位，自己永遠顯示喺畫面下方。
- 牌面、間距同文字使用 fluid sizing，而唔係只靠兩套硬編碼尺寸。
- 所有主要操作支援 mouse、touch 同 keyboard。
- Click／tap target 最少 44 × 44 CSS pixels。
- 紅黑牌除咗顏色，亦保留清晰花色符號，避免只靠顏色傳意。
- 支援 `prefers-reduced-motion`、足夠 contrast、focus indicator 同 screen-reader label。

### Mobile

- 以 portrait 為主要方向，同時確保 landscape 可玩。
- 手牌橫向重疊排列，可 tap 選牌、拖動瀏覽。
- 操作列固定於 safe area 上方，清楚顯示「出牌」及「Pass」。
- 對手以精簡 avatar、名稱、牌數、連線及 Pass 狀態顯示。
- 避免 hover-only interaction。

### Desktop

- 桌面置中並限制最大寬度，利用額外空間顯示出牌紀錄、房間資料及快捷鍵提示。
- 支援 click、多選同鍵盤操作。
- 視窗縮窄時按內容需要收合 side panel，唔單靠 device 名稱判斷 layout。

### 主要畫面

1. Home：電腦對戰、建立房間、加入房間、規則及設定。
2. Lobby：房間碼、分享、四個座位、bot 設定、ready／開始。
3. Game：四方牌桌、手牌、上一手、輪到邊個、倒數／連線提示、操作列。
4. Round Result：勝方、剩餘手牌、今局罰分、累積分數。
5. Rules：將 `RULES.md` 內容轉成適合 app 閱讀嘅頁面。

## 10. PWA 及離線行為

- Manifest 提供 app 名稱、icons、theme color、standalone display 同 portrait-first orientation。
- Precache app shell、字型及必要牌面 assets。
- 電腦對戰完全離線可玩。
- 真人對戰離線時保留畫面並清楚顯示正在重連，不假裝 action 已成功。
- 新 service worker ready 時先提示玩家更新；進行中牌局唔強制 reload。
- IndexedDB／local storage 只保存偏好、訪客 session、未完成離線牌局；不保存真人牌局其他玩家嘅隱藏資料。
- 測試 installed standalone mode、iOS safe area、Android back navigation 及由分享連結開房。

## 11. 測試及驗收

### Unit tests

- 52 張牌唯一性、派牌完整性及 seed shuffle 可重現。
- 每種合法／非法牌型。
- 所有點數、花色及同牌型 tie-break。
- 特別蛇次序：`A2345 > 23456 > TJQKA`。
- `JQKA2` 等非法蛇。
- `♦3` 開局、Pass 後重新入局、三家 Pass 後重奪牌權。
- 一條龍、完局及計分。
- 任何玩家 snapshot 都不會洩漏其他玩家手牌。

### Integration tests

- Offline local transport 同 online server 對相同行動產生一致結果。
- 開房、加入、準備、開始、完整打一局。
- 重複 command 不會出兩次牌。
- Stale revision 被拒絕並 resync。
- 斷線、bot 接管及重連。

### UI／E2E tests

- Mobile portrait、mobile landscape、tablet、desktop 四個 viewport。
- Touch 選牌、Pass、出牌、房間分享及重連提示。
- Desktop keyboard navigation 同 focus order。
- PWA 安裝、離線重新開啟及更新提示。
- 真實 browser 檢查牌面有冇被裁走、操作列有冇遮住手牌、四個座位有冇重疊。

### 每階段基本檢查

```bash
pnpm test
pnpm lint
pnpm build
git diff --check
```

## 12. 開發階段

### Phase 1：規則引擎

- 建立 card、combination、game state types。
- 實作牌型辨認、比較、turn reducer、勝負及計分。
- 完成 `RULES.md` 所有 edge case unit tests。

**完成條件：** 純 TypeScript 測試可以由派牌行到完局，規則不依賴 React 或 Zustand。

### Phase 2：單機 playable prototype

- 建立 Zustand stores、local transport 同基本遊戲畫面。
- 加入合法選牌提示、出牌、Pass、牌權及結果頁。
- 實作最基本合法 AI，完成 1 真人對 3 電腦。

**完成條件：** Desktop 同 mobile browser 都可以完整玩完多局，冇 deadlock 或非法出牌。

### Phase 3：Responsive UI polish

- 完成正式牌桌、牌面、動畫、音效、錯誤提示同 accessibility。
- 針對 mobile safe area、landscape 及 desktop side panel 調整。
- 用真實 browser 量度並驗證 layout。

**完成條件：** 目標 viewport 無關鍵內容裁切或重疊，mouse、touch、keyboard 都可完成牌局。

### Phase 4：真人房間 server

- 建立部署於 Vercel Functions 嘅 authoritative WebSocket endpoint、room lifecycle 及安全 snapshot。
- 接駁外部 durable state store 及 pub/sub，所有 Function instance 共用同一份房間狀態。
- 實作建立／加入／準備／開始、server-side action validation。
- 支援空位 bot、command 去重、revision 同完整 resync。

**完成條件：** 四個獨立 browser session 可以經房間碼完成一局，而且任何 client 改 payload 都無法非法出牌或偷睇牌。

### Phase 5：重連及穩定性

- 加入 reconnect token、自動重連、斷線暫停、bot 接管及恢復。
- 測試亂序、重複 event、server restart 行為及慢網絡。
- 加入 structured logs、room id、command id 同錯誤監察。

**完成條件：** 短暫斷線及 reload 後可以回到正確牌局狀態，唔會重複出牌或洩漏手牌。

### Phase 6：PWA 及發佈

- 完成 icons、manifest、service worker caching、離線 fallback 及更新 UX。
- 建立 Vercel project、`vercel.json`、Fluid Compute、Function region 同 SPA routing 設定。
- 建立 Production／Preview／Development environment variables、health check 同 smoke test。
- 驗證 Preview deployment 同 Production 使用唔同房間 namespace 及 data namespace。

**完成條件：** Vercel production URL 可安裝、離線電腦模式可玩、真人模式可跨裝置連線及重連，production build 同 Preview smoke test 全部通過。

## 13. 主要風險

- **鋤大D 變體太多：** 所有實作及測試以 `RULES.md` 為準，修改規則時必須同步改測試。
- **Client／server 狀態分歧：** server authoritative、revision、command id、snapshot resync。
- **手牌資料洩漏：** server 為每位玩家建立專屬 snapshot，禁止直接 serialize 完整 state。
- **AI 拖慢 UI：** AI 放 Web Worker，限制計算時間，超時使用簡單合法策略。
- **細屏幕手牌難操作：** 重疊牌面、橫向瀏覽、safe area、真機 viewport 驗證。
- **Service worker 舊版 cache：** 版本化 assets，只喺安全畫面提示 reload。
- **Vercel Function 會擴縮及重啟：** 房間及牌局狀態由外部 durable store 保存，跨 instance event 經 pub/sub 傳送。
- **Vercel WebSocket 仍屬 Public Beta：** 做 load／reconnect／duration 測試，transport 保持抽象；有需要可轉用外部 realtime provider。
- **Preview 誤連 Production：** 每個 environment 使用獨立 secrets、data namespace 同 channel prefix。

## 14. 建議第一個 milestone

第一個 milestone 只做 Phase 1：先建立可信嘅純 TypeScript 遊戲引擎及完整規則測試。完成後，UI、AI、offline mode 同 online server 都可以共用同一套已驗證規則，減少後期同步修 bug 嘅成本。

## 15. Deployment 參考

- [Vercel：WebSocket support Public Beta](https://vercel.com/changelog/websocket-support-is-now-in-public-beta)
- [Vercel：使用 Express 及 WebSocket 時嘅 serverless 注意事項](https://vercel.com/kb/guide/using-express-with-vercel)
- [Vercel Functions](https://vercel.com/docs/functions)

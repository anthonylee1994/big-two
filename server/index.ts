import {createServer} from "node:http";
import {WebSocketServer, type WebSocket} from "ws";
import {RealtimeServer} from "../src/server/realtime.ts";

const port = Number(process.env.PORT ?? 8787);
const realtime = new RealtimeServer(process.env.DATA_NAMESPACE ?? "dev");

const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/api/health") {
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({ok: true, service: "big-two", ns: process.env.DATA_NAMESPACE ?? "dev"}));
        return;
    }
    res.writeHead(404);
    res.end("Not found");
});

const wss = new WebSocketServer({server, path: "/ws"});

wss.on("connection", (socket: WebSocket) => {
    realtime.attach({
        send: data => socket.send(data),
        onMessage: handler => {
            socket.on("message", data => handler(String(data)));
        },
        onClose: handler => {
            socket.on("close", handler);
        },
    });
});

server.listen(port, () => {
    console.log(`big-two server listening on ${port}`);
});

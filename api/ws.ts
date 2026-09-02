import type {IncomingMessage, ServerResponse} from "node:http";
import {WebSocketServer, type WebSocket} from "ws";
import {RealtimeServer} from "../src/server/realtime.ts";

export const config = {
    api: {
        bodyParser: false,
    },
};

const realtime = new RealtimeServer(process.env.DATA_NAMESPACE ?? "preview");
const wss = new WebSocketServer({noServer: true});

export default function handler(req: IncomingMessage, res: ServerResponse): void {
    if (req.headers.upgrade !== "websocket") {
        res.statusCode = 426;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ok: false, error: "Expected WebSocket upgrade"}));
        return;
    }
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (socket: WebSocket) => {
        realtime.attach({
            send: data => socket.send(data),
            onMessage: handlerFn => {
                socket.on("message", data => handlerFn(String(data)));
            },
            onClose: handlerFn => {
                socket.on("close", handlerFn);
            },
        });
    });
}

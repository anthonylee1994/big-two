import {chooseAction, type AiInput} from "../game/ai/strategy.ts";

self.onmessage = (event: MessageEvent<AiInput>) => {
    self.postMessage(chooseAction(event.data));
};

import React from "react";
import {FaCrown, FaDragon, FaFlagCheckered} from "react-icons/fa6";
import {GiCardAceSpades, GiPokerHand, GiSnake} from "react-icons/gi";
import {AppShell} from "../../components/app-shell.tsx";
import {Panel, SectionTitle} from "../../components/ui/panel.tsx";
import {useAppStore} from "../../stores/app.ts";

const SECTIONS: {title: string; icon: React.ReactNode; lines: string[]}[] = [
    {
        title: "基本",
        icon: <GiCardAceSpades />,
        lines: ["4 人各獲 13 張，最先出清手牌者勝出。", "最細 ♦3，最大 ♠2。", "點數：3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2", "花色：♦ < ♣ < ♥ < ♠"],
    },
    {
        title: "牌型",
        icon: <GiPokerHand />,
        lines: ["單牌、對子、三條。", "五張由細到大：蛇、花、夫佬、四條、同花順。"],
    },
    {
        title: "蛇",
        icon: <GiSnake />,
        lines: ["A2345 > 23456 > 10JQKA > … > 34567。", "JQKA2、QKA23、KA234 唔算蛇。"],
    },
    {
        title: "流程",
        icon: <FaFlagCheckered />,
        lines: ["持有 ♦3 先出，第一手必須含 ♦3。", "只可用相同張數更大牌型蓋牌，或者 Pass。", "三家連續 Pass 後，上一個出牌者取得牌權。"],
    },
    {
        title: "香港特別規則",
        icon: <FaDragon />,
        lines: ["一條龍：13 個點數齊全即勝。", "唔可以用單張 ♠2 埋齋。", "冇炸彈跨張數壓牌。"],
    },
    {
        title: "計分",
        icon: <FaCrown />,
        lines: ["勝方 0 分。", "剩 1–9 張每張 1 分。", "10–12 張每張 2 分。", "13 張每張 3 分（39 分）。"],
    },
];

export const RulesScreen = React.memo(() => {
    const setScreen = useAppStore(state => state.setScreen);

    return (
        <AppShell title="規則" subtitle="香港玩法" onBack={() => setScreen("home")} width="lg">
            <div className="grid gap-4 md:grid-cols-2">
                {SECTIONS.map(section => (
                    <Panel key={section.title} className="space-y-3">
                        <SectionTitle icon={section.icon}>{section.title}</SectionTitle>
                        <ul className="space-y-2 text-sm leading-relaxed font-medium text-white/75">
                            {section.lines.map(line => (
                                <li key={line} className="flex gap-2">
                                    <span className="text-gold-500 mt-1.5 size-1.5 flex-none rounded-full bg-current" aria-hidden="true" />
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                ))}
            </div>
        </AppShell>
    );
});

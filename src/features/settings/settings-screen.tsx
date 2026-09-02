import React from "react";
import {FaVolumeHigh} from "react-icons/fa6";
import {LuSparkles, LuVibrate} from "react-icons/lu";
import {AppShell} from "../../components/app-shell.tsx";
import {Panel, SectionTitle} from "../../components/ui/panel.tsx";
import {Segmented} from "../../components/ui/segmented.tsx";
import {Switch} from "../../components/ui/switch.tsx";
import {useAppStore} from "../../stores/app.ts";
import type {HandSort} from "../../stores/preferences.ts";
import {usePreferencesStore} from "../../stores/preferences.ts";

export const SettingsScreen = React.memo(() => {
    const setScreen = useAppStore(state => state.setScreen);
    const sound = usePreferencesStore(state => state.sound);
    const animation = usePreferencesStore(state => state.animation);
    const haptics = usePreferencesStore(state => state.haptics);
    const handSort = usePreferencesStore(state => state.handSort);
    const setSound = usePreferencesStore(state => state.setSound);
    const setAnimation = usePreferencesStore(state => state.setAnimation);
    const setHaptics = usePreferencesStore(state => state.setHaptics);
    const setHandSort = usePreferencesStore(state => state.setHandSort);

    return (
        <AppShell title="設定" onBack={() => setScreen("home")} width="md">
            <div className="space-y-6">
                <Panel className="space-y-3">
                    <SectionTitle>體驗</SectionTitle>
                    <Switch label="音效" description="出牌成功時發出提示音" icon={<FaVolumeHigh />} checked={sound} onChange={setSound} />
                    <Switch label="動畫" description="關閉可以減少動態效果" icon={<LuSparkles />} checked={animation} onChange={setAnimation} />
                    <Switch label="觸覺回饋" description="手機出牌時輕微震動" icon={<LuVibrate />} checked={haptics} onChange={setHaptics} />
                </Panel>

                <Panel className="space-y-3">
                    <SectionTitle>手牌</SectionTitle>
                    <div className="panel-inset flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <span className="font-black text-white">排序方式</span>
                        <Segmented
                            ariaLabel="手牌排序"
                            value={handSort}
                            onChange={value => setHandSort(value as HandSort)}
                            options={[
                                {value: "rank", label: "按點數"},
                                {value: "suit", label: "按花色"},
                            ]}
                        />
                    </div>
                </Panel>

                <p className="text-center text-xs font-semibold text-white/40">設定會存喺呢部裝置。</p>
            </div>
        </AppShell>
    );
});

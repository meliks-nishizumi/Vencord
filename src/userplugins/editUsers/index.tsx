import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Alerts, ChannelStore, Menu } from "@webpack/common";

import { openEditUserModal } from "./components/EditUserModal";
import { UserBadge } from "./components/UserBadge";
import { startDomTweaks, stopDomTweaks } from "./domTweaks";
import { t } from "./i18n";
import { installPatches } from "./patches";
import { logger } from "./patchUtils";
import { refreshDiscord } from "./refresh";
import { settings } from "./settings";
import { store } from "./store";
import { bannerState, clearCaches } from "./userData";

let unpatch: Array<() => void> = [];
let unsubscribe: (() => void) | null = null;

const userContextMenu: NavContextMenuPatchCallback = (children, { user }: { user?: any; }) => {
    if (!user) return;

    const reset = (e?: { shiftKey?: boolean; }) => {
        const remove = () => store.remove(user.id);
        if (e?.shiftKey) remove();
        else Alerts.show({
            title: t("reset"),
            body: t("resetConfirm"),
            confirmText: t("reset"),
            cancelText: t("cancel"),
            onConfirm: remove
        });
    };

    const item = (
        <Menu.MenuItem id="eu-local-settings" label={t("context")}>
            <Menu.MenuItem id="eu-change" label={t("change")} action={() => openEditUserModal(user)} />
            <Menu.MenuItem
                id="eu-reset"
                label={t("reset")}
                color="danger"
                disabled={!store.get(user.id)}
                action={reset as any}
            />
        </Menu.MenuItem>
    );

    const group = findGroupChildrenByChildId("devmode-copy-id", children, true);
    if (group) group.push(item);
    else children.push(<Menu.MenuGroup>{item}</Menu.MenuGroup>);
};

export default definePlugin({
    name: "EditUsers",
    description: "Locally edit users: name, avatar, banner, status, colors and tag. Port of DevilBro's EditUsers (BetterDiscord).",
    authors: [{ name: "EditUsers port", id: 0n }],
    settings,

    // Тот же приём, что в плагине USRBG: баннер профиля считается через getPreviewBanner,
    // поэтому подставляем свой URL перед оригинальным вызовом.
    patches: [
        {
            find: '.banner)==null?"COMPLETE"',
            replacement: {
                match: /(?<=void 0:)\i.getPreviewBanner\(\i,\i,\i\)/,
                replace: "$self.patchBannerUrl(arguments[0])||$&"
            }
        }
    ],

    patchBannerUrl({ displayProfile }: any): string | undefined {
        const data = displayProfile?.userId ? store.get(displayProfile.userId) : undefined;
        return bannerState(data) === "custom" ? data!.banner : undefined;
    },

    contextMenus: {
        "user-context": userContextMenu
    },

    // Тег рядом с ником в сообщениях и в списке участников.
    // В старых версиях Vencord вместо этих полей используются addMessageDecoration / addMemberListDecorator.
    renderMessageDecoration: ({ message }: { message: any; }) =>
        <UserBadge userId={message?.author?.id} guildId={ChannelStore.getChannel(message?.channel_id)?.guild_id} />,

    renderMemberListDecorator: ({ user, guildId }: { user?: any; guildId?: string; }) =>
        <UserBadge userId={user?.id} guildId={guildId} />,

    async start() {
        await store.load();

        unpatch = installPatches();
        startDomTweaks();

        unsubscribe = store.subscribe(refreshDiscord);
        refreshDiscord();
    },

    stop() {
        unsubscribe?.();
        unsubscribe = null;

        stopDomTweaks();
        for (const off of unpatch) {
            try { off(); } catch (e) { logger.error("unpatch failed", e); }
        }
        unpatch = [];

        clearCaches();
        refreshDiscord();
    }
});

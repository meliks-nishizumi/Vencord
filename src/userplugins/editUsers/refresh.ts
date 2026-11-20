import { GuildMemberStore, UserStore } from "@webpack/common";

import { PresenceStore, RelationshipStore, UserProfileStore } from "./stores";
import { logger } from "./patchUtils";

/** Аналог BDFDB.DiscordUtils.rerenderAll: просим Flux-сторы оповестить подписчиков. */
export function refreshDiscord() {
    for (const s of [UserStore, GuildMemberStore, PresenceStore, RelationshipStore, UserProfileStore]) {
        try { (s as any).emitChange(); } catch (e) { logger.warn("emitChange failed", e); }
    }
}

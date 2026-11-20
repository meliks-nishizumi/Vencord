import { GuildMemberStore } from "@webpack/common";

import { normalizeColor } from "../colors";
import { settings } from "../settings";
import { useUserData } from "./useUserData";

/** Тег рядом с ником (в сообщениях и списке участников). */
export function UserBadge({ userId, guildId }: { userId?: string; guildId?: string; }) {
    const data = useUserData(userId ?? "");
    if (!userId || !settings.store.tags || !data || !(data.tag || data.tagEmoji)) return null;

    const roleColor = data.ignoreTagColor && guildId
        ? (GuildMemberStore.getMember(guildId, userId) as any)?.colorString
        : undefined;

    return (
        <span
            className="eu-tag"
            style={{ background: roleColor || normalizeColor(data.color3), color: normalizeColor(data.color4) }}
        >
            {data.tagEmoji?.name}
            {data.tag}
        </span>
    );
}

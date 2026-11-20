import { GuildMemberStore } from "@webpack/common";

import { hexToInt, normalizeColor } from "./colors";
import { settings } from "./settings";
import { store } from "./store";
import { DiscordUser, UserData } from "./types";

/** Прозрачная заглушка вместо удалённого аватара. */
const EMPTY_IMAGE = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";
/** Оригинальный UserStore.getUser (без наших подмен). Заполняется в patches.ts. */
export const raw: { getUser: ((id: string) => DiscordUser | undefined) | null; } = { getUser: null };

type CacheEntry = { src: any; ver: number; out: any; };
const userCache = new Map<string, CacheEntry>();
const memberCache = new Map<string, CacheEntry>();
const profileCache = new Map<string, CacheEntry>();
const activityCache = new Map<string, CacheEntry>();

export function clearCaches() {
    userCache.clear();
    memberCache.clear();
    profileCache.clear();
    activityCache.clear();
}

/** Возвращает один и тот же объект, пока не изменились исходник и данные — иначе React будет перерисовываться бесконечно. */
function memo<T>(cache: Map<string, CacheEntry>, key: string, src: any, build: () => T): T {
    const hit = cache.get(key);
    if (hit && hit.src === src && hit.ver === store.version) return hit.out;
    const out = build();
    cache.set(key, { src, ver: store.version, out });
    return out;
}

const define = (o: any, key: string, value: any) =>
    Object.defineProperty(o, key, { value, configurable: true, enumerable: true, writable: true });

// ---------- Имя ----------

/** Аналог getUserNick из оригинала. undefined = ничего не менять. */
export function resolveNick(userId: string, nick?: string | null): string | undefined {
    const d = store.get(userId);
    if (!d || !settings.store.names) return undefined;

    if (d.useServerNick && nick) return nick;
    if (d.name) {
        const username = raw.getUser?.(userId)?.username;
        const suffix = d.showServerNick && nick
            ? `(${nick})`
            : d.showAccountName && username ? `(${username})` : "";
        return [d.name, suffix].filter(Boolean).join(" ");
    }
    return undefined;
}

// ---------- Аватар / баннер ----------

export function avatarOverride(d?: UserData): string | undefined {
    if (!d || !settings.store.avatars) return undefined;
    if (d.removeIcon) return EMPTY_IMAGE;
    return d.url || undefined;
}

export function bannerState(d?: UserData): "custom" | "removed" | null {
    if (!d || !settings.store.banners) return null;
    if (d.removeBanner) return "removed";
    return d.banner ? "custom" : null;
}

// ---------- Подмена объектов ----------

export function overlayUser<T extends DiscordUser | null | undefined>(user: T): T {
    if (!user) return user;
    const data = store.get(user.id);
    if (!data) return user;

    return memo(userCache, user.id, user, () => {
        const o = Object.create(user);

        if (settings.store.names && data.name) {
            if (user.globalName) define(o, "globalName", data.name);
            else {
                define(o, "username", data.name);
                define(o, "usernameNormalized", data.name.toLowerCase());
            }
            define(o, "toString", () => o.username);
        }

        const avatar = avatarOverride(data);
        if (avatar) {
            define(o, "getAvatarURL", () => avatar);
            define(o, "avatarURL", avatar);
            define(o, "guildMemberAvatars", {});
        }

        // Кастомный баннер подставляет патч в index.tsx; здесь только удаление
        if (bannerState(data) === "removed") define(o, "banner", null);

        return o;
    }) as T;
}

export function overlayMember(guildId: string, userId: string, member: any) {
    const d = store.get(userId);
    if (!d || !member) return member;

    return memo(memberCache, `${guildId}:${userId}`, member, () => {
        const o = Object.create(member);

        if (settings.store.nameColors) {
            const color = d.useRoleColor && member.colorString || normalizeColor(d.color1);
            if (color) define(o, "colorString", color);
        }

        const nick = resolveNick(userId, member.nick);
        if (nick) define(o, "nick", nick);

        if (avatarOverride(d)) define(o, "avatar", undefined);

        return o;
    });
}

export function overlayProfile(userId: string, profile: any) {
    const d = store.get(userId);
    if (!d || !profile) return profile;

    return memo(profileCache, userId, profile, () => {
        const o = Object.create(profile);

        if (bannerState(d) === "removed") define(o, "banner", null);

        if (settings.store.profileColors) {
            const accent = normalizeColor(d.color5);
            if (accent) {
                define(o, "accentColor", hexToInt(accent));
                define(o, "primaryColor", hexToInt(accent));
            }

            const c6 = normalizeColor(d.color6);
            const c7 = normalizeColor(d.color7);
            if (c6 || c7) {
                const light = document.documentElement.classList.contains("theme-light");
                const fallback = light ? "#ffffff" : "#000000";
                define(o, "themeColors", [hexToInt(c6 ?? fallback), hexToInt(c7 ?? fallback)]);
                define(o, "canEditThemes", true);
            }
        }

        return o;
    });
}

// ---------- Кастомный статус ----------

const CUSTOM_STATUS = 4;

function hasStatusOverride(d?: UserData): d is UserData {
    return !!d && settings.store.status && !!(d.removeStatus || d.status || d.statusEmoji);
}

export function customActivityFor(userId: string) {
    const d = store.get(userId);
    if (!hasStatusOverride(d) || d.removeStatus) return null;
    return {
        created_at: Date.now().toString(),
        emoji: d.statusEmoji ?? undefined,
        id: "custom",
        name: "Custom Status",
        state: d.status,
        type: CUSTOM_STATUS
    };
}

export function overlayActivities(userId: string, activities: any[] | undefined) {
    if (!hasStatusOverride(store.get(userId))) return activities;

    return memo(activityCache, userId, activities, () => {
        const others = (activities ?? []).filter(a => a?.type !== CUSTOM_STATUS);
        const custom = customActivityFor(userId);
        return custom ? [custom, ...others] : others;
    });
}

export function overlayFoundActivity(userId: string, found: any, predicate: (a: any) => boolean) {
    if (!hasStatusOverride(store.get(userId))) return found;
    const custom = customActivityFor(userId);

    if (found?.type === CUSTOM_STATUS) return custom ?? undefined;
    if (!found && custom && predicate?.(custom)) return custom;
    return found;
}

// ---------- Цвета ----------

/** Цвет имени для DOM-подмены (в ЛС нет роли → берём только свой цвет). */
export function nameColorForDom(userId: string, guildId?: string): string | undefined {
    const d = store.get(userId);
    if (!d || !settings.store.nameColors) return undefined;
    // getMember уже возвращает подменённый объект с нужным colorString
    const member = guildId ? GuildMemberStore.getMember(guildId, userId) : null;
    return (member as any)?.colorString || normalizeColor(d.color1);
}

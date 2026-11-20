import { GuildMemberStore, UserStore } from "@webpack/common";

import { logger, wrap } from "./patchUtils";
import { IconUtils, PresenceStore, RelationshipStore, UserProfileStore } from "./stores";
import { store } from "./store";
import {
    avatarOverride,
    bannerState,
    clearCaches,
    overlayActivities,
    overlayFoundActivity,
    overlayMember,
    overlayProfile,
    overlayUser,
    raw,
    resolveNick
} from "./userData";

/**
 * Вместо ~60 патчей компонентов (как в BD-версии) подменяем данные на уровне
 * сторов — все компоненты Discord читают имя/аватар/цвет оттуда.
 */
export function installPatches(): Array<() => void> {
    const off: Array<() => void> = [];

    clearCaches();
    raw.getUser = (UserStore as any).getUser.bind(UserStore);

    // Пользователь: имя, аватар, баннер
    off.push(wrap(UserStore, "getUser", (orig, [id]) => overlayUser(orig(id))));

    // Участник сервера: цвет имени, ник, серверный аватар
    off.push(wrap(GuildMemberStore, "getMember", (orig, [guildId, userId]) =>
        overlayMember(guildId, userId, orig(guildId, userId))));
    off.push(wrap(GuildMemberStore, "getNick", (orig, [guildId, userId]) => {
        const nick = orig(guildId, userId);
        return resolveNick(userId, nick) ?? nick;
    }));

    // Локальные ники друзей перебивают имя в ЛС — наше имя должно быть главнее
    off.push(wrap(RelationshipStore, "getNickname", (orig, [id]) => {
        const nick = orig(id);
        return resolveNick(id, nick) ?? nick;
    }));

    // Аватары, получаемые мимо объекта пользователя
    off.push(wrap(IconUtils, "getUserAvatarURL", (orig, [user, ...rest]) =>
        avatarOverride(user && store.get(user.id)) ?? orig(user, ...rest)));

    for (const name of ["getGuildMemberAvatarURL", "getGuildMemberAvatarURLSimple"]) {
        off.push(wrap(IconUtils, name, (orig, [arg, ...rest]) => {
            const id = arg?.userId ?? arg?.id;
            return (id && avatarOverride(store.get(id))) || orig(arg, ...rest);
        }));
    }

    // Баннер
    off.push(wrap(IconUtils, "getUserBannerURL", (orig, [arg, ...rest]) => {
        const d = arg?.id ? store.get(arg.id) : undefined;
        const state = bannerState(d);
        if (state === "removed") return undefined;
        if (state === "custom") return d!.banner;
        return orig(arg, ...rest);
    }));

    // Профиль: баннер, акцентные цвета, тема
    for (const name of ["getUserProfile", "getGuildMemberProfile"]) {
        off.push(wrap(UserProfileStore, name, (orig, args) =>
            overlayProfile(args[0], orig(...args))));
    }

    // Кастомный статус
    off.push(wrap(PresenceStore, "getActivities", (orig, [id, ...rest]) =>
        overlayActivities(id, orig(id, ...rest))));
    off.push(wrap(PresenceStore, "findActivity", (orig, [id, predicate, ...rest]) =>
        overlayFoundActivity(id, orig(id, predicate, ...rest), predicate)));

    logger.info(`Установлено патчей: ${off.length}`);
    return off;
}

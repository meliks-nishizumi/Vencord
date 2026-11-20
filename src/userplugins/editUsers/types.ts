/** Цвет в старом формате BetterDiscord: строка, массив (градиент) или объект {0: "#..."} */
export type ColorValue = string | string[] | Record<number, string> | null | undefined;

export interface EmojiRef {
    id?: string | null;
    name: string;
    animated?: boolean;
}

/**
 * Поля совпадают с теми, что хранил оригинальный EditUsers (BetterDiscord),
 * поэтому старые данные можно просто вставить в хранилище как есть.
 */
export interface UserData {
    // Имя / аватар
    name?: string;
    showAccountName?: boolean;
    showServerNick?: boolean;
    useServerNick?: boolean;
    url?: string;
    removeIcon?: boolean;

    // Кастомный статус
    status?: string;
    statusEmoji?: EmojiRef | null;
    removeStatus?: boolean;

    // Цвета имени / сообщений
    color1?: ColorValue; // цвет имени
    color2?: ColorValue; // цвет текста сообщений
    useRoleColor?: boolean;

    // Тег рядом с ником
    tag?: string;
    tagEmoji?: EmojiRef | null;
    color3?: ColorValue; // фон тега
    color4?: ColorValue; // цвет текста тега
    ignoreTagColor?: boolean;

    // Профиль
    banner?: string;
    removeBanner?: boolean;
    color5?: ColorValue; // акцент профиля
    color6?: ColorValue; // тема профиля (1)
    color7?: ColorValue; // тема профиля (2)
}

export interface DiscordUser {
    id: string;
    username: string;
    globalName?: string | null;
    avatar?: string | null;
    banner?: string | null;
    [key: string]: any;
}

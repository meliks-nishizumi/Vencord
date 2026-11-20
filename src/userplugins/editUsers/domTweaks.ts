import { ChannelStore, MessageStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { normalizeColor } from "./colors";
import { bannerState, nameColorForDom, raw } from "./userData";
import { settings } from "./settings";
import { store } from "./store";

/**
 * То, что нельзя подменить данными: цвет текста сообщений, цвет имени в ЛС
 * (там нет роли), заголовок окна и визуальная подстановка баннера в DOM
 * (когда патч компонента профиля не срабатывает или используется Data URL / GIF).
 */
const COLOR_SELECTOR = '[id^="message-username-"], [id^="message-content-"]';
const BANNER_SELECTOR = '[class*="banner_"]';
const COLOR_MARK = "euColor";
const BANNER_MARK = "euBanner";

let observer: MutationObserver | null = null;
let titleObserver: MutationObserver | null = null;
let unsubscribe: (() => void) | null = null;
let frame = 0;
const pending = new Set<Element>();

function findUserIdFromElement(el: Element): string | undefined {
    let cur: Element | null = el;
    for (let depth = 0; cur && depth < 18; depth++, cur = cur.parentElement) {
        const keys = Object.keys(cur);
        const fiberKey = keys.find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"));
        let fiber = fiberKey ? (cur as any)[fiberKey] : null;

        for (let hops = 0; fiber && hops < 30; hops++, fiber = fiber.return) {
            const p = fiber.memoizedProps;
            if (!p) continue;

            const candidate =
                p.user?.id ??
                p.displayProfile?.userId ??
                p.userId ??
                p.author?.id;

            if (typeof candidate === "string" && /^\d{15,22}$/.test(candidate)) {
                return candidate;
            }
        }
    }
    return undefined;
}

function applyColor(el: HTMLElement) {
    const isName = el.id.startsWith("message-username-");
    const messageId = el.id.slice(el.id.lastIndexOf("-") + 1);
    const li = el.closest<HTMLElement>('[id^="chat-messages-"]');
    const channelId = li?.id.split("-")[2] ?? SelectedChannelStore.getChannelId();

    const message = MessageStore.getMessage(channelId, messageId);
    const authorId: string | undefined = message?.author?.id;
    const data = authorId ? store.get(authorId) : undefined;

    let color: string | undefined;
    if (authorId && data) {
        if (isName) color = nameColorForDom(authorId, ChannelStore.getChannel(channelId)?.guild_id);
        else if (settings.store.messageColors) color = normalizeColor(data.color2);
    }

    if (color) {
        el.style.setProperty("color", color);
        el.dataset[COLOR_MARK] = "1";
    } else if (el.dataset[COLOR_MARK]) {
        el.style.removeProperty("color");
        delete el.dataset[COLOR_MARK];
    }
}

function clearBannerStyle(el: HTMLElement) {
    if (!el.dataset[BANNER_MARK]) return;
    el.style.removeProperty("background-image");
    el.style.removeProperty("background-size");
    el.style.removeProperty("background-position");
    el.style.removeProperty("background-repeat");
    delete el.dataset[BANNER_MARK];
}

function applyBanner(el: HTMLElement) {
    // Не трогаем превью внутри самого модального окна редактирования EditUsers, если оно там есть
    if (el.closest(".eu-modal")) return;

    const userId = findUserIdFromElement(el);
    const data = userId ? store.get(userId) : undefined;
    const state = bannerState(data);

    if (state === "custom" && data?.banner) {
        // Кавычки обязательны для data:image/... (в т.ч. GIF и base64)
        const safeUrl = data.banner.replace(/"/g, "%22");
        el.style.setProperty("background-image", `url("${safeUrl}")`, "important");
        el.style.setProperty("background-size", "cover", "important");
        el.style.setProperty("background-position", "center", "important");
        el.style.setProperty("background-repeat", "no-repeat", "important");
        el.dataset[BANNER_MARK] = "1";
    } else if (state === "removed") {
        el.style.setProperty("background-image", "none", "important");
        el.dataset[BANNER_MARK] = "1";
    } else {
        clearBannerStyle(el);
    }
}

function scan(root: ParentNode | Element) {
    if (root instanceof HTMLElement) {
        if (root.matches(COLOR_SELECTOR)) applyColor(root);
        if (root.matches(BANNER_SELECTOR)) applyBanner(root);
    }
    root.querySelectorAll<HTMLElement>(COLOR_SELECTOR).forEach(applyColor);
    root.querySelectorAll<HTMLElement>(BANNER_SELECTOR).forEach(applyBanner);
}

function flush() {
    frame = 0;
    for (const node of pending) scan(node);
    pending.clear();
}

function updateTitle() {
    if (!settings.store.appTitle || !settings.store.names) return;

    const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    if (!channel?.isDM?.()) return;

    const id: string | undefined = channel.recipients?.[0];
    if (!id || !store.get(id)?.name) return;

    const title = document.head.querySelector("title");
    const original = raw.getUser?.(id);
    const changed = UserStore.getUser(id);
    if (!title || !original || !changed) return;

    const oldName = original.globalName || original.username;
    const newName = changed.globalName || changed.username;
    const text = title.textContent ?? "";

    if (oldName !== newName && text.includes(`@${oldName}`)) {
        title.textContent = text.replace(`@${oldName}`, `@${newName}`);
    }
}

export function startDomTweaks() {
    scan(document.body);

    observer = new MutationObserver(mutations => {
        for (const m of mutations) m.addedNodes.forEach(n => n instanceof Element && pending.add(n));
        if (!frame && pending.size) frame = requestAnimationFrame(flush);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const title = document.head.querySelector("title");
    if (title) {
        titleObserver = new MutationObserver(updateTitle);
        titleObserver.observe(title, { childList: true });
    }
    updateTitle();

    unsubscribe = store.subscribe(() => {
        scan(document.body);
        updateTitle();
    });
}

export function stopDomTweaks() {
    observer?.disconnect();
    titleObserver?.disconnect();
    unsubscribe?.();
    observer = titleObserver = null;
    unsubscribe = null;

    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pending.clear();

    document.querySelectorAll<HTMLElement>(`[data-eu-color]`).forEach(el => {
        el.style.removeProperty("color");
        delete el.dataset[COLOR_MARK];
    });

    document.querySelectorAll<HTMLElement>(`[data-eu-banner]`).forEach(clearBannerStyle);
}

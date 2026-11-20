import { ChannelStore, MessageStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { normalizeColor } from "./colors";
import { nameColorForDom, raw } from "./userData";
import { settings } from "./settings";
import { store } from "./store";

/**
 * То, что нельзя подменить данными: цвет текста сообщений, цвет имени в ЛС
 * (там нет роли) и заголовок окна. Делается небольшим MutationObserver'ом
 * вместо патчей компонентов.
 */
const SELECTOR = '[id^="message-username-"], [id^="message-content-"]';
const MARK = "euColor";

let observer: MutationObserver | null = null;
let titleObserver: MutationObserver | null = null;
let unsubscribe: (() => void) | null = null;
let frame = 0;
const pending = new Set<Element>();

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
        el.dataset[MARK] = "1";
    } else if (el.dataset[MARK]) {
        el.style.removeProperty("color");
        delete el.dataset[MARK];
    }
}

function scan(root: ParentNode | Element) {
    if (root instanceof HTMLElement && root.matches(SELECTOR)) applyColor(root);
    root.querySelectorAll<HTMLElement>(SELECTOR).forEach(applyColor);
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
        delete el.dataset[MARK];
    });
}

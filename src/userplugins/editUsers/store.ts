import * as DataStore from "@api/DataStore";

import { UserData } from "./types";

const KEY = "EditUsers_users";

let users: Record<string, UserData> = {};
let version = 0;
const listeners = new Set<() => void>();

function emit() {
    version++;
    for (const fn of listeners) {
        try { fn(); } catch { /* слушатель не должен ломать остальных */ }
    }
}

/** Как в оригинале: объект, где все значения пустые/false, не хранится. */
function isEmpty(data: UserData) {
    return Object.values(data).every(v => v == null || v === false || v === "");
}

export const store = {
    get version() { return version; },

    async load() {
        users = (await DataStore.get<Record<string, UserData>>(KEY)) ?? {};
        emit();
    },

    get(id: string): UserData | undefined { return users[id]; },
    all() { return users; },

    async set(id: string, data: UserData) {
        if (isEmpty(data)) delete users[id];
        else users[id] = data;
        await DataStore.set(KEY, users);
        emit();
    },

    async remove(id: string) {
        delete users[id];
        await DataStore.set(KEY, users);
        emit();
    },

    async clear() {
        users = {};
        await DataStore.set(KEY, users);
        emit();
    },

    /** Принудительно сообщить, что что-то изменилось (например, настройки плагина). */
    bump() { emit(); },

    subscribe(fn: () => void) {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
    }
};

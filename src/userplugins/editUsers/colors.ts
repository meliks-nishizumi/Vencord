import { ColorValue } from "./types";

/** Первый цвет из значения (градиенты из BD сводятся к первому цвету). */
export function firstColor(c: ColorValue): string | undefined {
    if (!c) return undefined;
    if (Array.isArray(c)) return c[0] || undefined;
    if (typeof c === "object") return Object.values(c)[0] || undefined;
    return c;
}

/** Приводит любое поддерживаемое значение к "#rrggbb". */
export function normalizeColor(c: ColorValue): string | undefined {
    const v = firstColor(c)?.trim();
    if (!v) return undefined;

    if (/^#[0-9a-f]{6}/i.test(v)) return v.slice(0, 7).toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(v)) return "#" + [...v.slice(1)].map(x => x + x).join("").toLowerCase();

    const m = v.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (m) return "#" + m.slice(1, 4).map(n => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("");

    return undefined;
}

export function hexToInt(hex: string): number {
    return parseInt(hex.replace("#", "").slice(0, 6), 16);
}

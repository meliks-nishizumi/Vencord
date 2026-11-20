import { Logger } from "@utils/Logger";

export const logger = new Logger("EditUsers");

type Wrapper = (original: (...args: any[]) => any, args: any[], self: any) => any;

/**
 * Лёгкая замена BDFDB.PatchUtils.patch: оборачивает метод объекта.
 * Возвращает функцию, снимающую патч. При ошибке в обёртке вызывается оригинал.
 */
export function wrap(obj: any, key: string, wrapper: Wrapper): () => void {
    const original = obj?.[key];
    if (typeof original !== "function") {
        logger.warn(`Метод ${key} не найден, патч пропущен`);
        return () => { };
    }

    const patched = function (this: any, ...args: any[]) {
        try {
            return wrapper((...a: any[]) => original.apply(this, a), args, this);
        } catch (e) {
            logger.error(`Ошибка в патче ${key}`, e);
            return original.apply(this, args);
        }
    };

    obj[key] = patched;
    return () => { if (obj[key] === patched) obj[key] = original; };
}

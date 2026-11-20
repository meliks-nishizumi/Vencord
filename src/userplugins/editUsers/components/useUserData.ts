import { React } from "@webpack/common";

import { store } from "../store";

/** Хук: перерисовывает компонент при любом изменении данных плагина. */
export function useUserData(id: string) {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    React.useEffect(() => store.subscribe(force as () => void), []);
    return store.get(id);
}

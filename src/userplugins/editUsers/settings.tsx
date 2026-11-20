import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { ChangedUsersList } from "./components/ChangedUsersList";
import { store } from "./store";

const feature = (description: string) => ({
    type: OptionType.BOOLEAN as const,
    description,
    default: true,
    // Любое переключение перерисовывает всё, что зависит от данных плагина
    onChange: () => store.bump()
});

export const settings = definePluginSettings({
    names: feature("Change usernames / nicknames"),
    avatars: feature("Change avatars"),
    banners: feature("Change profile banners"),
    profileColors: feature("Change profile accent / theme colors"),
    status: feature("Change custom statuses"),
    nameColors: feature("Change name colors"),
    messageColors: feature("Change message text colors (DOM-based)"),
    tags: feature("Show custom tags next to names"),
    appTitle: feature("Change the app title in DMs"),

    changedUsers: {
        type: OptionType.COMPONENT,
        component: () => <ChangedUsersList />
    }
});

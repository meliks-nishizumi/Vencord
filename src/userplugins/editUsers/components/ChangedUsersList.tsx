import { Button } from "@components/Button";
import { Alerts, Forms, React, UserStore } from "@webpack/common";

import { t } from "../i18n";
import { store } from "../store";
import { openEditUserModal } from "./EditUserModal";

/** Блок в настройках плагина: список изменённых пользователей + «сбросить всех». */
export function ChangedUsersList() {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    React.useEffect(() => store.subscribe(force as () => void), []);

    const users = Object.keys(store.all())
        .map(id => UserStore.getUser(id))
        .filter(Boolean);

    return (
        <Forms.FormSection title={t("changedUsers")}>
            <div className="eu-list">
                {users.length
                    ? users.map(u => (
                        <img
                            key={u.id}
                            className="eu-avatar"
                            src={u.getAvatarURL(undefined, 32, false)}
                            title={u.globalName || u.username}
                            onClick={() => openEditUserModal(u)}
                        />
                    ))
                    : <Forms.FormText>{t("none")}</Forms.FormText>}
            </div>
            <Button
                variant="primary"
                disabled={!Object.keys(store.all()).length}
                onClick={() => Alerts.show({
                    title: t("resetAll"),
                    body: t("resetAllConfirm"),
                    confirmText: t("resetAll"),
                    cancelText: t("cancel"),
                    onConfirm: () => store.clear()
                })}
            >
                {t("resetAll")}
            </Button>
        </Forms.FormSection>
    );
}

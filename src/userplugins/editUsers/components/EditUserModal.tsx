import { Button } from "@components/Button";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Forms, GuildMemberStore, React, SelectedGuildStore } from "@webpack/common";

import { t } from "../i18n";
import { store } from "../store";
import { DiscordUser, EmojiRef, UserData } from "../types";
import { ColorField, ImageUrlField, Section, TextField, ToggleField } from "./fields";

const emoji = (name: string): EmojiRef | null => (name ? { id: null, name } : null);

/** Те же правила очистки, что и при сохранении в оригинале. */
function normalize(d: UserData): UserData {
    const out = { ...d };
    if (out.removeIcon) out.url = "";
    if (out.removeStatus) { out.status = ""; out.statusEmoji = null; }
    if (out.removeBanner) out.banner = "";
    return out;
}

function EditUserModal({ modalProps, user }: { modalProps: ModalProps; user: DiscordUser; }) {
    const [draft, setDraft] = React.useState<UserData>(() => ({ ...store.get(user.id) }));
    const set = (patch: Partial<UserData>) => setDraft(d => ({ ...d, ...patch }));

    const member: any = GuildMemberStore.getMember(SelectedGuildStore.getGuildId() as string, user.id);
    const subtitle = member?.nick || user.globalName || user.username;

    async function save() {
        await store.set(user.id, normalize(draft));
        modalProps.onClose();
    }

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <div className="eu-header">
                    <Forms.FormTitle tag="h2">{t("modalHeader")}</Forms.FormTitle>
                    <Forms.FormText>{subtitle}</Forms.FormText>
                </div>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent className="eu-modal">
                <Section title={t("secName")}>
                    <TextField label={t("username")} value={draft.name} onChange={name => set({ name })} />
                    <ToggleField label={t("showAccountName")} value={draft.showAccountName} onChange={showAccountName => set({ showAccountName })} />
                    <ToggleField label={t("showServerNick")} value={draft.showServerNick} onChange={showServerNick => set({ showServerNick })} />
                    <ToggleField label={t("useServerNick")} value={draft.useServerNick} onChange={useServerNick => set({ useServerNick })} />
                    <ImageUrlField label={t("avatarUrl")} value={draft.url} disabled={draft.removeIcon} invalidText={t("invalidUrl")} onChange={url => set({ url })} />
                    <ToggleField label={t("removeAvatar")} value={draft.removeIcon} onChange={removeIcon => set({ removeIcon })} />
                </Section>

                <Section title={t("secStatus")}>
                    <TextField label={t("statusEmoji")} value={draft.statusEmoji?.name} disabled={draft.removeStatus} onChange={v => set({ statusEmoji: emoji(v) })} />
                    <TextField label={t("statusText")} value={draft.status} disabled={draft.removeStatus} onChange={status => set({ status })} />
                    <ToggleField label={t("removeStatus")} value={draft.removeStatus} onChange={removeStatus => set({ removeStatus })} />
                </Section>

                <Section title={t("secColors")}>
                    <div className="eu-colors">
                        <ColorField label={t("nameColor")} value={draft.color1} onChange={color1 => set({ color1 })} />
                        <ColorField label={t("messageColor")} value={draft.color2} onChange={color2 => set({ color2 })} />
                    </div>
                    <ToggleField label={t("useRoleColor")} value={draft.useRoleColor} onChange={useRoleColor => set({ useRoleColor })} />
                </Section>

                <Section title={t("secTag")}>
                    <TextField label={t("tagText")} value={draft.tag} onChange={tag => set({ tag })} />
                    <TextField label={t("tagEmoji")} value={draft.tagEmoji?.name} onChange={v => set({ tagEmoji: emoji(v) })} />
                    <div className="eu-colors">
                        <ColorField label={t("tagBg")} value={draft.color3} disabled={draft.ignoreTagColor} onChange={color3 => set({ color3 })} />
                        <ColorField label={t("tagFg")} value={draft.color4} onChange={color4 => set({ color4 })} />
                    </div>
                    <ToggleField label={t("ignoreTagColor")} value={draft.ignoreTagColor} onChange={ignoreTagColor => set({ ignoreTagColor })} />
                </Section>

                <Section title={t("secProfile")}>
                    <ImageUrlField label={t("bannerUrl")} value={draft.banner} disabled={draft.removeBanner} invalidText={t("invalidUrl")} onChange={banner => set({ banner })} />
                    <ToggleField label={t("removeBanner")} value={draft.removeBanner} onChange={removeBanner => set({ removeBanner })} />
                    <div className="eu-colors">
                        <ColorField label={t("accent")} value={draft.color5} onChange={color5 => set({ color5 })} />
                        <ColorField label={t("theme1")} value={draft.color6} onChange={color6 => set({ color6 })} />
                        <ColorField label={t("theme2")} value={draft.color7} onChange={color7 => set({ color7 })} />
                    </div>
                </Section>
            </ModalContent>

            <ModalFooter>
                <Button variant="primary" onClick={save}>{t("save")}</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openEditUserModal(user: DiscordUser) {
    openModal(props => <EditUserModal modalProps={props} user={user} />);
}

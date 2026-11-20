import { findByPropsLazy, findStoreLazy } from "@webpack";

// Эти модули не экспортируются из @webpack/common во всех версиях Vencord,
// поэтому ищем их сами.
export const IconUtils = findByPropsLazy("getUserAvatarURL", "getUserBannerURL");
export const PresenceStore = findStoreLazy("PresenceStore");
export const RelationshipStore = findStoreLazy("RelationshipStore");
export const UserProfileStore = findStoreLazy("UserProfileStore");

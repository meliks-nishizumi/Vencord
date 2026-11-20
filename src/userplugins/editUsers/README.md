# EditUsers для Vencord

Порт плагина EditUsers (DevilBro, BetterDiscord) на Vencord. Папка целиком кладётся в `src/userplugins/editUsers/`.

## Установка

Нужен Vencord, собранный из исходников (userplugins в готовой сборке не работают).

```bash
cd Vencord/src/userplugins
# скопируйте сюда папку editUsers
cd ../..
pnpm build
pnpm inject
```

Затем включите **EditUsers** в Settings → Plugins. ПКМ по пользователю → «Локальные настройки пользователя».

## Структура

| Файл | Что делает |
|---|---|
| `index.tsx` | определение плагина, пункт контекстного меню, теги, start/stop |
| `settings.tsx` | настройки (переключатели функций + список изменённых) |
| `store.ts` | хранение данных (`DataStore`), подписки |
| `userData.ts` | подмена пользователя / участника / профиля / статуса |
| `patches.ts` | патчи сторов Discord (замена ~60 патчей компонентов из BD-версии) |
| `patchUtils.ts` | `wrap()` — замена `BDFDB.PatchUtils.patch` |
| `stores.ts` | поиск `IconUtils`, `PresenceStore`, `RelationshipStore`, `UserProfileStore` |
| `domTweaks.ts` | цвет сообщений, цвет имени в ЛС, заголовок окна |
| `refresh.ts` | перерисовка через `emitChange()` (замена `rerenderAll`) |
| `colors.ts`, `i18n.ts`, `types.ts` | вспомогательное (i18n: ru / en) |
| `components/` | модалка редактирования, тег, поля формы, список в настройках |

## BDFDB → Vencord

BDFDB целиком не переносится: в Vencord его роль играют встроенные API.

| BDFDB | Vencord |
|---|---|
| `PatchUtils.patch` | `wrap()` из `patchUtils.ts` / `patches` в `definePlugin` |
| `DataUtils.load/save` | `@api/DataStore` |
| `ModalUtils.open` | `openModal` из `@utils/modal` |
| `ContextMenuUtils` | `contextMenus` + `findGroupChildrenByChildId` |
| `LibraryStores.*` | `UserStore`, `GuildMemberStore`, … из `@webpack/common` |
| `ModalUtils.confirm` | `Alerts.show` |
| `PluginUtils.createSettingsPanel` | `definePluginSettings` |

## Формат данных

Поля пользователя (`name`, `url`, `color1`…`color7`, `tag`, …) совпадают с оригиналом.

## Что изменилось / не перенесено

- Переключатели «по местам» (`places`, `types`) заменены переключателями по функциям.
- Градиенты в цветах сводятся к первому цвету.
- Эмодзи статуса и тега — только Unicode (без выбора серверных эмодзи).
- Цвет имени в ЛС и цвет сообщений применяются через DOM (`domTweaks.ts`), а не через React.
- Не перенесены: поиск по новому имени в Quick Switcher / автодополнении, названия потоков, часть мест вроде своего аккаунта.
- Картинки по URL проверяются загрузкой; хосты вне CSP Discord могут не грузиться — используйте `data:`-ссылки или разрешённые хосты.

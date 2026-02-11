# Документація для розробника

Інструкції з розробки, збірки та випуску нових версій розширення Component Preview.

---

## Зміст

1. [Налаштування середовища](#1-налаштування-середовища)
2. [Структура проєкту](#2-структура-проєкту)
3. [Розробка та дебаг](#3-розробка-та-дебаг)
4. [Випуск нової версії](#4-випуск-нової-версії)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [Публікація на Open VSX](#6-публікація-на-open-vsx)
7. [Корисні команди](#7-корисні-команди)

---

## 1. Налаштування середовища

```bash
# Клонувати репозиторій
git clone https://github.com/artem-levchenko-2/cursor-extension.git
cd cursor-extension

# Встановити залежності
npm install

# Скомпілювати TypeScript
npm run compile
```

### Вимоги

- Node.js 18+
- npm 9+
- Cursor IDE 0.30+

---

## 2. Структура проєкту

```
cursor-extension/
├── src/                        ← Вихідний код (TypeScript)
│   ├── extension.ts            ← Точка входу розширення
│   ├── componentDetector.ts    ← Пошук компонентів у коді
│   ├── componentTree.ts        ← Дерево компонентів у Explorer
│   ├── previewFinder.ts        ← Пошук preview-зображень
│   ├── previewManager.ts       ← Керування станом preview
│   ├── previewPanel.ts         ← Webview-панель з preview
│   ├── codeTrigger.ts          ← Тригер при навігації курсором
│   └── explorerTrigger.ts      ← Тригер з контекстного меню
├── out/                        ← Скомпільований JS (генерується)
├── .github/workflows/
│   └── release.yml             ← CI/CD: збірка + публікація на Open VSX
├── scripts/
│   └── update-extension.sh     ← Скрипт оновлення через .vsix
├── package.json                ← Маніфест розширення
├── tsconfig.json               ← Конфігурація TypeScript
├── .vscodeignore               ← Файли, що виключаються з .vsix
├── preview-ext-2.png           ← Іконка розширення
├── LICENSE                     ← MIT ліцензія
├── README.md                   ← Документація для команди
└── DEVELOPMENT.md              ← Цей файл
```

---

## 3. Розробка та дебаг

### Режим спостереження

Запустіть автокомпіляцію при збереженні файлів:

```bash
npm run watch
```

### Запуск у режимі дебагу

1. Відкрийте папку `cursor-extension` в Cursor IDE
2. Натисніть **F5** (або Run → Start Debugging)
3. Відкриється нове вікно **Extension Development Host**
4. Зміни в коді автоматично компілюються (якщо запущено `npm run watch`)
5. Для застосування змін у debug-вікні: `Cmd+Shift+P` → "Developer: Reload Window"

### Основні файли для редагування

| Файл | Відповідає за |
|---|---|
| `src/extension.ts` | Реєстрація команд, активація розширення |
| `src/componentDetector.ts` | Логіка визначення компонента під курсором |
| `src/previewFinder.ts` | Пошук preview-зображень (конвенції A та B) |
| `src/previewPanel.ts` | HTML/CSS webview-панелі preview |
| `src/componentTree.ts` | TreeDataProvider для секції "Components" |
| `package.json` | Команди, меню, views, активаційні події |

---

## 4. Випуск нової версії

### Повний процес (крок за кроком)

```bash
# 1. Переконайтесь, що ви на main та все актуальне
git checkout main
git pull

# 2. Переконайтесь, що немає незакомічених змін
git status

# 3. Оновіть версію (автоматично створює коміт та тег)
npm version patch    # 0.1.1 → 0.1.2 (баг-фікси)
npm version minor    # 0.1.1 → 0.2.0 (нові фічі)
npm version major    # 0.1.1 → 1.0.0 (breaking changes)

# 4. Запушіть коміт та тег
git push && git push --tags
```

Після пушу тегу GitHub Actions автоматично:
- Скомпілює TypeScript
- Збере `.vsix` файл
- Створить GitHub Release з `.vsix`
- Опублікує на Open VSX (Cursor IDE)

### Якщо є незакомічені зміни

```bash
# Закомітити зміни
git add -A
git commit -m "Опис змін"

# Потім випустити версію
npm version patch
git push && git push --tags
```

### Перевірка релізу

- GitHub Actions: https://github.com/artem-levchenko-2/cursor-extension/actions
- GitHub Releases: https://github.com/artem-levchenko-2/cursor-extension/releases
- Open VSX: https://open-vsx.org/extension/artem-l/component-preview

---

## 5. CI/CD Pipeline

Файл: `.github/workflows/release.yml`

### Тригер

Pipeline запускається при пуші тегу `v*` (наприклад `v0.1.2`, `v1.0.0`).

### Кроки

1. Checkout коду
2. Налаштування Node.js 20
3. `npm ci` — встановлення залежностей
4. `npx ovsx package` — збірка .vsix (включає `npm run compile` через prepublish)
5. Створення GitHub Release з .vsix як asset
6. `npx ovsx publish` — публікація на Open VSX (Cursor IDE)

### Секрети

| Секрет | Опис | Де створити |
|---|---|---|
| `OVSX_PAT` | Access Token для Open VSX | open-vsx.org → Settings → Access Tokens |

Секрет налаштовується у: GitHub repo → Settings → Secrets and variables → Actions

### Оновлення токена

`OVSX_PAT` не має терміну дії, але якщо потрібно перевипустити:

1. Перейдіть на open-vsx.org → Settings → Access Tokens
2. Створіть новий токен
3. Оновіть секрет `OVSX_PAT` у GitHub

---

## 6. Публікація на Open VSX

### Поточні дані

| Параметр | Значення |
|---|---|
| Publisher ID | `artem-l` |
| Extension ID | `artem-l.component-preview` |
| Репозиторій | `artem-levchenko-2/cursor-extension` |
| Open VSX | https://open-vsx.org/extension/artem-l/component-preview |

### Ручна публікація (якщо CI не працює)

```bash
# Зібрати .vsix
npx ovsx package

# Опублікувати на Open VSX
npx ovsx publish component-preview-*.vsix -p ВАШ_OVSX_ТОКЕН
```

### Ручна збірка .vsix без публікації

```bash
npx ovsx package
```

---

## 7. Корисні команди

```bash
# Компіляція
npm run compile

# Автокомпіляція при змінах
npm run watch

# Збірка .vsix
npx ovsx package

# Перевірити що потрапить у .vsix
npx ovsx ls

# Випуск патч-версії (повний цикл)
npm version patch && git push && git push --tags

# Встановити .vsix локально для тестування
cursor --install-extension component-preview-*.vsix
```

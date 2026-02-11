# Component Preview Extension

Розширення для Cursor IDE (та VS Code), яке показує візуальні прев'ю UI-компонентів (TSX блоків) прямо в IDE — без запуску проєкту чи відкриття браузера.

---

## Зміст

1. [Швидкий старт — встановлення для команди](#1-швидкий-старт--встановлення-для-команди)
2. [Як налаштувати preview у вашому проєкті](#2-як-налаштувати-preview-у-вашому-проєкті)
3. [Конвенції іменування](#3-конвенції-іменування)
4. [Як користуватися](#4-як-користуватися)
5. [FAQ та вирішення проблем](#5-faq-та-вирішення-проблем)
6. [Для розробників розширення](#6-для-розробників-розширення)

---

## 1. Швидкий старт — встановлення для команди

Розширення поставляється як готовий `.vsix` файл — **окремий встановлювач**, який не потребує збірки чи компіляції. Просто завантажте та встановіть.

### Де взяти файл

Файл `component-preview-0.1.0.vsix` можна отримати одним із способів:

- **GitHub (рекомендовано):** завантажте з [репозиторію](https://github.com/artem-levchenko-2/cursor-extension) — файл лежить у корені проєкту
- **Спільна папка команди:** Google Drive / Dropbox / OneDrive
- **Месенджер:** Slack / Telegram — файл важить лише ~22 КБ
- **Репозиторій проєкту:** покладіть у папку `tools/` вашого робочого проєкту

### Встановлення у Cursor IDE

#### Варіант A: Через інтерфейс (найпростіший)

1. Відкрийте **Cursor IDE**
2. Натисніть `Cmd+Shift+P` (macOS) або `Ctrl+Shift+P` (Windows/Linux)
3. Введіть: **Extensions: Install from VSIX...**
4. У вікні вибору файлу знайдіть та оберіть `component-preview-0.1.0.vsix`
5. Дочекайтесь повідомлення "Extension installed successfully"
6. Натисніть **Reload Window** (або `Cmd+Shift+P` → "Developer: Reload Window")

#### Варіант B: Через термінал

```bash
# Для Cursor IDE
cursor --install-extension /шлях/до/component-preview-0.1.0.vsix

# Для VS Code
code --install-extension /шлях/до/component-preview-0.1.0.vsix
```

> Замініть `/шлях/до/` на реальний шлях до файлу. Наприклад:
> ```bash
> cursor --install-extension ~/Downloads/component-preview-0.1.0.vsix
> ```

#### Варіант C: Drag & Drop

1. Відкрийте Cursor IDE
2. Перейдіть на вкладку **Extensions** (іконка квадратиків у бічній панелі або `Cmd+Shift+X`)
3. Перетягніть файл `.vsix` прямо у панель Extensions

### Перевірка встановлення

Після встановлення переконайтесь, що все працює:

1. Відкрийте будь-який `.tsx` файл у вашому проєкті
2. У бічній панелі **Explorer** мають з'явитися дві нові секції:
   - **Components** — список компонентів, для яких є preview
   - **Component Preview** — панель із зображенням preview

Якщо секції не з'явились — перезавантажте вікно: `Cmd+Shift+P` → "Developer: Reload Window".

### Видалення розширення

Якщо потрібно видалити:

```bash
# Cursor
cursor --uninstall-extension component-preview.component-preview

# VS Code
code --uninstall-extension component-preview.component-preview
```

Або через інтерфейс: Extensions → знайдіть "Component Preview" → натисніть шестерню ⚙ → Uninstall.

---

## 2. Як налаштувати preview у вашому проєкті

Розширення працює з **заздалегідь підготовленими зображеннями** (скріншотами, thumbnails) ваших компонентів. Ніякої магії рендерингу — просто картинки поруч з кодом.

### Що потрібно зробити

Для кожного компонента, який ви хочете бачити у превʼю, покладіть поруч PNG або JPG зображення за одною з двох конвенцій (див. розділ 3).

### Приклад структури проєкту

```
my-project/
├── src/
│   ├── blocks/
│   │   ├── Hero03.tsx
│   │   ├── Hero03.preview.png        ← Конвенція A
│   │   ├── Feature17.tsx
│   │   ├── Feature17.preview.png     ← Конвенція A
│   │   ├── Feature50.tsx
│   │   └── __previews__/             ← Конвенція B
│   │       ├── Feature50.png
│   │       └── Pricing02.png
│   └── components/
│       └── ...
```

### Як створити preview-зображення

**Вручну:**
- Зробіть скріншот компонента з браузера
- Збережіть як PNG з назвою компонента
- Рекомендований розмір: 800x600px (для швидкого завантаження)
- Максимальний розмір: 2000x2000px

**Автоматично (Playwright / Puppeteer):**
Якщо у вас є Storybook або dev-сервер, можна автоматизувати створення скріншотів:

```js
// generate-previews.js (приклад з Playwright)
const { chromium } = require('playwright');

const components = ['Hero03', 'Feature17', 'Feature50'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  for (const name of components) {
    await page.goto(`http://localhost:6006/?path=/story/${name}`);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `src/blocks/${name}.preview.png`,
    });
    console.log(`✓ ${name}.preview.png`);
  }

  await browser.close();
})();
```

---

## 3. Конвенції іменування

Розширення підтримує **два варіанти** розміщення preview-зображень. Можна використовувати обидва одночасно в одному проєкті.

### Конвенція A: Файл поруч з компонентом

```
src/blocks/
├── Hero03.tsx
├── Hero03.preview.png     ← preview для Hero03
├── Feature17.tsx
└── Feature17.preview.png  ← preview для Feature17
```

Формат імені: `{НазваКомпонента}.preview.{png|jpg|jpeg}`

**Плюси:** Все поруч, легко знайти та оновити.

### Конвенція B: Окрема папка `__previews__`

```
src/blocks/
├── Hero03.tsx
├── Feature17.tsx
├── Feature50.tsx
└── __previews__/
    ├── Hero03.png         ← preview для Hero03
    ├── Feature17.png      ← preview для Feature17
    └── Feature50.png      ← preview для Feature50
```

Формат імені: `__previews__/{НазваКомпонента}.{png|jpg|jpeg}`

**Плюси:** Код не засмічений картинками, зручно для .gitignore якщо потрібно.

### Правила іменування

| Правило | Приклад |
|---|---|
| Назва файлу компонента = назва preview | `Feature17.tsx` → `Feature17.preview.png` |
| PascalCase обов'язковий | `Feature17`, не `feature17` чи `feature-17` |
| Підтримувані формати | `.png` (рекомендовано), `.jpg`, `.jpeg` |

---

## 4. Як користуватися

Після встановлення розширення та додавання preview-зображень у проєкт:

### Панель "Components" (бічна панель Explorer)

В Explorer з'являється секція **"Components"**, яка показує лише ті `.tsx` файли, для яких є preview-зображення. Кожен файл має:
- **Іконку ока** справа — натисніть, щоб побачити превʼю
- Натискання на назву файлу відкриває його в редакторі

### Превʼю при навігації по коду

Поставте **текстовий курсор** (каретку) на назву компонента у коді — превʼю автоматично оновиться через 150мс. Працює з:
- JSX тегами: `<Feature17 />`
- Імпортами: `import Feature17 from '...'`
- Змінними: `const block = Feature17`

### Контекстне меню Explorer

Натисніть правою кнопкою на `.tsx` файл у дереві файлів → **"Preview Component"**.

### Панель "Component Preview"

Знаходиться в Explorer sidebar, під секцією "Components". Показує:
- Назву компонента
- Зображення превʼю (масштабується під ширину панелі)
- Або повідомлення "No preview image found" із підказкою, якщо зображення не знайдено

---

## 5. FAQ та вирішення проблем

### Превʼю не з'являється при навігації курсором

**Причина:** Розширення не змогло знайти файл компонента або preview-зображення.

**Рішення:**
- Переконайтеся, що preview-зображення лежить у правильному місці (конвенція A або B)
- Назва зображення повинна точно збігатися з назвою компонента (PascalCase)
- Якщо імпорт використовує alias (наприклад `@/blocks/Hero08`), розширення спробує знайти preview через пошук по воркспейсу

### Секція "Components" порожня

**Причина:** Жоден `.tsx` файл у проєкті не має відповідного preview-зображення.

**Рішення:**
- Додайте хоча б одне preview-зображення (див. розділ 2)
- Натисніть кнопку **Refresh** (⟳) у заголовку секції "Components"

### Зображення не оновлюється після заміни файлу

Розширення автоматично слідкує за змінами `.png` / `.jpg` файлів і скидає кеш. Якщо все одно не оновлюється:
- Натисніть `Cmd+Shift+P` → "Developer: Reload Window"

### Розширення не активується

Розширення активується тільки при відкритті `.ts` або `.tsx` файлу. Відкрийте будь-який TypeScript файл у проєкті.

### Помилка "command not found: cursor"

Якщо команда `cursor` не знайдена у терміналі:
1. Відкрийте Cursor IDE
2. `Cmd+Shift+P` → "Shell Command: Install 'cursor' command in PATH"
3. Перезапустіть термінал

---

## 6. Для розробників розширення

Цей розділ потрібен лише тим, хто хоче доопрацювати або перезібрати розширення.

### Налаштування середовища розробки

```bash
# Клонуйте репозиторій
git clone https://github.com/artem-levchenko-2/cursor-extension.git
cd cursor-extension

# Встановіть залежності
npm install

# Скомпілюйте TypeScript
npm run compile

# Запустіть режим спостереження (автокомпіляція при змінах)
npm run watch
```

Відкрийте папку `cursor-extension` в Cursor IDE та натисніть **F5** — відкриється нове вікно Extension Development Host з активним розширенням.

### Збірка нової версії .vsix

```bash
# Встановіть vsce (якщо ще не встановлено)
npm install -g @vscode/vsce

# Зберіть .vsix
vsce package
```

Після виконання у папці з'явиться файл `component-preview-<версія>.vsix`.

---

## Підтримувані середовища

| Середовище | Версія |
|---|---|
| Cursor IDE | 0.30+ |
| VS Code | 1.85+ |
| Node.js | Вбудований в IDE (Electron) |

## Підтримувані формати зображень

| Формат | Статус |
|---|---|
| PNG | Рекомендовано |
| JPG / JPEG | Підтримується |
| SVG | Експериментально |

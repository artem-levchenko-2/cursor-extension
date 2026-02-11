# Component Preview

Розширення для Cursor IDE та VS Code, яке показує візуальні прев'ю UI-компонентів (TSX блоків) прямо в IDE — без запуску проєкту чи відкриття браузера.

---

## Встановлення

1. Відкрийте **Cursor IDE** (або VS Code)
2. Перейдіть у **Extensions** (`Cmd+Shift+X`)
3. Знайдіть **"Component Preview"**
4. Натисніть **Install**

Розширення оновлюється автоматично через Marketplace.

---

## Налаштування preview у проєкті

Розширення працює з **заздалегідь підготовленими зображеннями** ваших компонентів — скріншотами або thumbnails. Для кожного компонента покладіть PNG або JPG зображення за одною з двох конвенцій.

### Конвенція A: Файл поруч з компонентом

```
src/blocks/
├── Hero03.tsx
├── Hero03.preview.png     ← preview для Hero03
├── Feature17.tsx
└── Feature17.preview.png  ← preview для Feature17
```

Формат імені: `{НазваКомпонента}.preview.{png|jpg|jpeg}`

### Конвенція B: Окрема папка `__previews__`

```
src/blocks/
├── Hero03.tsx
├── Feature17.tsx
├── Feature50.tsx
└── __previews__/
    ├── Hero03.png
    ├── Feature17.png
    └── Feature50.png
```

Формат імені: `__previews__/{НазваКомпонента}.{png|jpg|jpeg}`

Обидві конвенції можна використовувати одночасно в одному проєкті.

### Приклад повної структури

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

### Правила іменування

| Правило | Приклад |
|---|---|
| Назва файлу = назва компонента | `Feature17.tsx` → `Feature17.preview.png` |
| PascalCase обов'язковий | `Feature17`, не `feature17` чи `feature-17` |
| Підтримувані формати | `.png` (рекомендовано), `.jpg`, `.jpeg` |

### Як створити preview-зображення

**Вручну:** зробіть скріншот компонента з браузера, збережіть як PNG з назвою компонента. Рекомендований розмір: 800x600px.

**Автоматично (Playwright):**

```js
const { chromium } = require('playwright');
const components = ['Hero03', 'Feature17', 'Feature50'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  for (const name of components) {
    await page.goto(`http://localhost:6006/?path=/story/${name}`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `src/blocks/${name}.preview.png` });
  }
  await browser.close();
})();
```

---

## Як користуватися

### Панель "Components"

В бічній панелі Explorer з'являється секція **"Components"** зі списком `.tsx` файлів, для яких є preview. Натисніть іконку ока справа, щоб побачити превʼю.

### Превʼю при навігації по коду

Поставте курсор на назву компонента — превʼю оновиться автоматично. Працює з:
- JSX тегами: `<Feature17 />`
- Імпортами: `import Feature17 from '...'`
- Змінними: `const block = Feature17`

### Контекстне меню

Правий клік на `.tsx` файл у Explorer → **"Preview Component"**.

### Панель "Component Preview"

Знаходиться в Explorer sidebar. Показує назву компонента та зображення превʼю.

---

## Вирішення проблем

| Проблема | Рішення |
|---|---|
| Превʼю не з'являється | Перевірте назву preview-файлу (PascalCase, точний збіг з компонентом) |
| Секція "Components" порожня | Додайте хоча б одне preview-зображення, натисніть Refresh |
| Зображення не оновлюється | `Cmd+Shift+P` → "Developer: Reload Window" |
| Розширення не активується | Відкрийте будь-який `.ts` або `.tsx` файл |

---

## Підтримувані середовища

| Середовище | Версія |
|---|---|
| Cursor IDE | 0.30+ |
| VS Code | 1.85+ |

## Підтримувані формати зображень

| Формат | Статус |
|---|---|
| PNG | Рекомендовано |
| JPG / JPEG | Підтримується |
| SVG | Експериментально |

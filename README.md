# SportGym

Статический сайт фитнес-зала. Без сборки и зависимостей: один `index.html`.

## Деплой на Vercel

1. Залей репозиторий на GitHub.
2. На vercel.com: **Add New → Project** и выбери репозиторий.
3. Framework Preset: **Other**. Build Command и Output Directory оставь пустыми.
4. Нажми **Deploy**.

## Что заменить перед запуском

- Адрес, телефон и почту в футере.
- Цены и тексты тарифов.
- Форма записи сейчас демонстрационная: заявки никуда не отправляются.
  Подключи Formspree, Vercel Serverless Function или свою CRM в обработчике `submit` в конце `index.html`.

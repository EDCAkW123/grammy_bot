# Telegram echo-бот на grammY

Простой webhook-бот: отправляет обратно текст каждого полученного текстового сообщения.

## Настройка

| Переменная | Обязательная | Пример | Назначение |
| --- | --- | --- | --- |
| `TELEGRAM_TOKEN` | да | `123456:ABC...` | Токен от BotFather |
| `WEBHOOK_DOMAIN` | да | `bot.example.com` | Публичный домен без `https://` и пути |
| `WEBHOOK_SECRET` | да | `случайная_строка` | Проверка запросов от Telegram |
| `WEBHOOK_PATH` | нет | `/` | HTTP-путь webhook, по умолчанию `/` |
| `WEBHOOK_HOST` | нет | `0.0.0.0` | Локальный интерфейс, по умолчанию `0.0.0.0` |
| `PORT` | нет | `3000` | Локальный порт, по умолчанию `3000` |

`WEBHOOK_PATH=/` подходит, если корневой путь домена не занят другим приложением. grammY сверяет `WEBHOOK_SECRET` с заголовком `X-Telegram-Bot-Api-Secret-Token`.

Сгенерировать секрет:

```bash
openssl rand -hex 32
```

## Запуск

```bash
npm install

export TELEGRAM_TOKEN="токен_от_BotFather"
export WEBHOOK_DOMAIN="bot.example.com"
export WEBHOOK_SECRET="случайная_секретная_строка"
export WEBHOOK_PATH="/"
export PORT="3000"

npm start
```

Домен должен вести на приложение по HTTPS. Reverse proxy или облачный хостинг должен передавать запросы на локальный `PORT` без изменения `WEBHOOK_PATH` и заголовка `X-Telegram-Bot-Api-Secret-Token`.

После запуска бот автоматически вызывает `setWebhook`. При остановке webhook не удаляется: Telegram сохранит обновления и доставит их после следующего запуска сервиса.

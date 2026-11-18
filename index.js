const { createServer } = require('node:http');
const { Bot, webhookCallback } = require('grammy');

const token = process.env.TELEGRAM_TOKEN;
const webhookDomain = process.env.WEBHOOK_DOMAIN;
const webhookSecret = process.env.WEBHOOK_SECRET;
const webhookPath = process.env.WEBHOOK_PATH || '/';
const webhookHost = process.env.WEBHOOK_HOST || '0.0.0.0';
const webhookPort = Number(process.env.PORT || 3000);

const missingVariables = [
  ['TELEGRAM_TOKEN', token],
  ['WEBHOOK_DOMAIN', webhookDomain],
  ['WEBHOOK_SECRET', webhookSecret],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVariables.length > 0) {
  console.error(`Не заданы переменные окружения: ${missingVariables.join(', ')}`);
  process.exit(1);
}

if (webhookDomain.includes('://') || webhookDomain.includes('/')) {
  console.error('WEBHOOK_DOMAIN должен содержать только домен, без протокола и пути');
  process.exit(1);
}

if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
  console.error('WEBHOOK_SECRET должен содержать от 1 до 256 символов: A-Z, a-z, 0-9, _ или -');
  process.exit(1);
}

if (!webhookPath.startsWith('/')) {
  console.error('WEBHOOK_PATH должен начинаться с /');
  process.exit(1);
}

if (!Number.isInteger(webhookPort) || webhookPort < 1 || webhookPort > 65535) {
  console.error('PORT должен быть целым числом от 1 до 65535');
  process.exit(1);
}

const bot = new Bot(token);

bot.on('message:text', async (ctx) => {
  await ctx.reply(ctx.message.text);
});

bot.catch((error) => {
  console.error(`Ошибка при обработке update ${error.ctx.update.update_id}:`, error.error);
});

const handleUpdate = webhookCallback(bot, 'http', {
  secretToken: webhookSecret,
});

const server = createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (request.method !== 'POST' || pathname !== webhookPath) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }

  handleUpdate(request, response).catch((error) => {
    console.error('Ошибка webhook:', error);

    if (!response.headersSent) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    }

    if (!response.writableEnded) {
      response.end('Internal Server Error');
    }
  });
});

const webhookUrl = `https://${webhookDomain}${webhookPath}`;

async function main() {
  await bot.init();

  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once('error', onError);
    server.listen(webhookPort, webhookHost, () => {
      server.off('error', onError);
      resolve();
    });
  });

  try {
    await bot.api.setWebhook(webhookUrl, {
      secret_token: webhookSecret,
    });
  } catch (error) {
    server.close();
    throw error;
  }

  console.log(`Webhook зарегистрирован: ${webhookUrl}`);
  console.log(`Сервер слушает ${webhookHost}:${webhookPort}`);
}

function shutdown(signal) {
  console.log(`Получен ${signal}, сервер останавливается`);

  if (!server.listening) {
    process.exit(0);
  }

  server.close((error) => {
    if (error) {
      console.error('Не удалось остановить сервер:', error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

main().catch((error) => {
  console.error('Не удалось запустить бота:', error);
  process.exit(1);
});

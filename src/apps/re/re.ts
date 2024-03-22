import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';

import { makeAgent } from '../../utils'
import { gatewayIdentity, userIdentity, delegateIdentity } from '../../identity'
import { getTokens, getTokenBySymbol } from '../../tokens'

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const CANISTER_ID = process.env.RE_CANISTER_ID || ""
const BOT_TOKEN = process.env.RE_BOT_TOKEN || ""
const WEBHOOK_PATH = process.env.RE_WEBHOOK_PATH || ""
const SECRET_TOKEN = process.env.RE_SECRET_TOKEN || ""

const bot = new Telegraf(BOT_TOKEN);

bot.on(message('text'), async ctx => {
  ctx.telegram.webhookReply = true
  const userId = ctx.message.from.id;
  const text = ctx.message.text

  if (text && text.startsWith('/')) {
    const command = text.split(' ')[0];

    switch (command) {
      case '/start':
        ctx.reply('Welcome to hello world bot!')
        break;
      case '/help':
        ctx.reply('Here are the available commands:\n/start - Start the bot\n/help - Show this help message')
        break;
      case '/listre':
        // call re_app list_re
        break;
      case '/createre':
        // transfer
        // call re_app create_re
        break;
      case '/sendre':
        // call re_app send_re
        break;
      case '/grabre':
        // call re_app send_re
        break;
      case '/revokere':
        // call re_app revoke_re
        break;
      case '/balance':
        const tokens = getTokens();
        tokens.forEach(token => {})
        ctx.reply("")
      default:
        ctx.reply('Invalid command. Type /help to see the available commands.')
    }
  } else {
    ctx.reply(ctx.message.text)
  }
});

export const callback = bot.webhookCallback(WEBHOOK_PATH, {secretToken: SECRET_TOKEN})
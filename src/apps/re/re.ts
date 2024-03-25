import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';

import { makeAgent } from '../../utils'
import { gatewayIdentity, userIdentity, delegateIdentity, hasUserIdentity } from '../../identity'
import { createPool, getTokens, getTokenBySymbol } from '../../tokens'
import { icrc1BalanceOf, icrc1Transfer } from "../ledger/ledger";

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
    const [cmd, ...args] = text.split(' ');
    // Ensure wallet address
    const createWalletCmds = ['/listre', '/createre', '/sendre', '/grabre', '/balance']
    if (createWalletCmds.includes(cmd) && !hasUserIdentity(userId)) {
      const principal = userIdentity(userId).getPrincipal().toText()
      ctx.reply(`Wallet address: ${principal}`)
      return 
    }
    // Process command
    switch (cmd) {
      case '/start':
        ctx.reply('Welcome to rbot!')
        break;
      case '/help':
        ctx.reply('Here are the available commands:\n/start - Start the bot\n/help - Show this help message')
        break;
      case '/listre':
        // call re_app list_re
        break;
      case '/createre':
        if (args.length !== 2) {
          ctx.reply(`Invalid input: ${text}`)
          return
        }
        try {
          typeof BigInt(args[1]) === 'bigint'
        } catch (error) {
          ctx.reply(`Invalid amount: ${args[1]}`)
          return
        }
        const token = await getTokenBySymbol(await createPool(), args[0])
        if (!token) {
          ctx.reply(`Invalid symbol: ${args[0]}`)
          return
        }
        const result = await icrc1Transfer(token, userId, BigInt(args[1]))
        if ('Err' in result) {
          ctx.reply(`Transfer error: ${result['Err']}`)
          return
        }
        // TODO: call re_app create_re
        break;
      case '/sendre':
        if (args.length !== 1) {
          ctx.reply(`Invalid input: ${text}`)
          return
        }
        // TODO: call re_app send_re
        break;
      case '/grabre':
        if (args.length !== 1) {
          ctx.reply(`Invalid input: ${text}`)
          return
        }
        // TODO: call re_app send_re
        break;
      case '/revokere':
        if (args.length !== 1) {
          ctx.reply(`Invalid input: ${text}`)
          return
        }
        // TODO: call re_app revoke_re
        break;
      case '/balance':
        const tokens = await getTokens(await createPool());
        const balances = await Promise.all(tokens.map(async (token) => ({
          symbol: token.symbol,
          balance: await icrc1BalanceOf(token, userId),
        })));
        ctx.reply(JSON.stringify(balances))
      default:
        ctx.reply('Invalid command. Type /help to see the available commands.')
    }
  } else {
    ctx.reply(ctx.message.text)
  }
});

export const callback = bot.webhookCallback(WEBHOOK_PATH, {secretToken: SECRET_TOKEN})
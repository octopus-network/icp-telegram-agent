import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';
import { Principal } from '@dfinity/principal';
import { Ed25519KeyIdentity } from "@dfinity/identity";
import type { ActorSubclass } from "@dfinity/agent";

import { createActor } from './declarations/rbot_backend';
import { RedEnvelope } from "./declarations/rbot_backend/rbot_backend.did";
import { _SERVICE } from "./declarations/rbot_backend/rbot_backend.did";
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
    const walletCmds = ['/balance', '/address', '/transfer']
    const reCmds = ['/listre', '/createre', '/sendre', '/grabre']
    if (walletCmds.includes(cmd) || reCmds.includes(cmd) && !hasUserIdentity(userId)) {
      const principal = userIdentity(userId).getPrincipal().toText()
      ctx.reply(`Wallet address: ${principal}`)
      return 
    }
    // Init identity & actor
    let agentIdentity: Ed25519KeyIdentity | null = null;
    let _userIdentity: Ed25519KeyIdentity | null = null;
    let serviceActor: ActorSubclass<_SERVICE> | null = null;
    if (walletCmds.includes(cmd)) {
      agentIdentity = gatewayIdentity()
      _userIdentity = userIdentity(userId)
      serviceActor = createActor(CANISTER_ID, {agent: await makeAgent({fetch, identity: agentIdentity})})
    }
    // Process command
    switch (cmd) {
      case '/start':
        ctx.reply('Welcome to rbot!')
        break;
      case '/help':
        ctx.reply('Here are the available commands:\n/start - Start the bot\n/help - Show this help message')
        break;
      // wallet commands
      case '/listre':
        // call re_app list_re
        break;
      case '/createre': {
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
        const ret1 = await icrc1Transfer(token, userId, BigInt(args[1]), Principal.fromText(CANISTER_ID))
        if ('Err' in ret1) {
          ctx.reply(`Transfer error: ${ret1['Err']}`)
          return
        }
        // TODO: call re_app create_re
        const re : RedEnvelope = {
          token_id: Principal.fromText(token.canister),
          owner: _userIdentity.getPrincipal(),
        }
        const ret2 = await serviceActor.create_red_envelope(re)
        ctx.reply(ret2)
        break;
      }
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
        try {
          typeof BigInt(args[0]) === 'bigint'
        } catch (error) {
          ctx.reply(`Invalid red envelope: ${args[0]}`)
          return
        }
        // TODO: call re_app grab_re
        const ret = await serviceActor.open_red_envelope(BigInt(args[0]), _userIdentity.getPrincipal())
        ctx.reply(ret)
        break;
      case '/revokere':
        if (args.length !== 1) {
          ctx.reply(`Invalid input: ${text}`)
          return
        }
        // TODO: call re_app revoke_re
        break;
      // wallet commands
      case '/address':
        const address = userIdentity(userId).getPrincipal().toText()
        ctx.reply(`Wallet address: ${address}`)
        break
      case '/balance':
        const tokens = await getTokens(await createPool());
        const balances = await Promise.all(tokens.map(async (token) => ({
          symbol: token.symbol,
          balance: await icrc1BalanceOf(token, userId),
        })));
        ctx.reply(JSON.stringify(balances))
        break
      case '/transfer': {
        if (args.length !== 3) {
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
        const result = await icrc1Transfer(token, userId, BigInt(args[1]), Principal.fromText(args[2]))
        if ('Err' in result) {
          ctx.reply(`Transfer error: ${ret['Err']}`)
        } else {
          ctx.reply(`Transfer ${args[1]} ${args[0]} to ${args[2]}`)
        }
        break
      }
      default:
        ctx.reply('Invalid command. Type /help to see the available commands.')
    }
  } else {
    ctx.reply(ctx.message.text)
  }
});

export const callback = bot.webhookCallback(WEBHOOK_PATH, {secretToken: SECRET_TOKEN})
import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';

import { createActor } from './declarations/whoami';
import { makeAgent } from '../../utils'
import { gatewayIdentity, userIdentity, delegateIdentity } from '../../identity'

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const CANISTER_ID = process.env.HELLOWORLD_CANISTER_ID || ""
const BOT_TOKEN = process.env.HELLOWORLD_BOT_TOKEN || ""
const WEBHOOK_PATH = process.env.HELLOWORLD_WEBHOOK_PATH || ""
const SECRET_TOKEN = process.env.HELLOWORLD_SECRET_TOKEN || ""

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
      case '/whoami':{
        const gtwIdentity = gatewayIdentity();
        console.log(`[Gateway] Principal: ${gtwIdentity.getPrincipal().toText()}`);
        const delIdentity = await delegateIdentity(userId, CANISTER_ID);
        console.log(`[Delegation] Principal: ${delIdentity.getPrincipal().toText()}`);
      
        const gwAgent = await makeAgent({fetch, identity: gtwIdentity})
        const gwActor = createActor(CANISTER_ID, {agent: gwAgent})
        const gwPrincipal = (await gwActor.whoami()).toText()
      
        const delAgent = await makeAgent({fetch, identity: delIdentity})
        const delActor = createActor(CANISTER_ID, {agent: delAgent})
        const userPrincipal = (await delActor.whoami()).toText()

        const result = 'Call with gateway identity, return gateway principal: ' + gwPrincipal + "\nCall via delegation, return user principal: " + userPrincipal;
        ctx.reply(result);
        break;
      }
      case '/helloworld': {
        const gtwIdentity = gatewayIdentity();
        const _userIdentity = userIdentity(userId);

        const gwAgent = await makeAgent({fetch, identity: gtwIdentity})
        const gwActor = createActor(CANISTER_ID, {agent: gwAgent})
        const response = await gwActor.helloworld(_userIdentity.getPrincipal().toText(), text)
        
        const result = "Call with gateway identity, pass user principal as parameter, caller is gatway, get user from parameters.\n\n" + response;
        ctx.reply(result);
        break;
      }
      default:
        ctx.reply('Invalid command. Type /help to see the available commands.')
    }
  } else {
    ctx.reply(ctx.message.text)
  }
});

export const callback = bot.webhookCallback(WEBHOOK_PATH, {secretToken: SECRET_TOKEN})

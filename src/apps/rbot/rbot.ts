import { Telegraf, Markup } from "telegraf";
import { message, callbackQuery } from 'telegraf/filters';
import { Principal } from '@dfinity/principal';
import type { ActorSubclass } from "@dfinity/agent";
import { table, getBorderCharacters } from "table";

import { createActor } from './declarations/rbot_backend';
import { RedEnvelope } from "./declarations/rbot_backend/rbot_backend.did";
import { _SERVICE } from "./declarations/rbot_backend/rbot_backend.did";
import * as C from './constants'
import { makeAgent } from '../../utils'
import { getAgentIdentity, getUserIdentity, hasUserIdentity } from '../../identity'
import { createPool, getTokens, getTokenBySymbol, getTokenBycanister } from '../../tokens'
import { icrc1BalanceOf, icrc1Transfer } from "../ledger/ledger";
import i18next, { I18nContext, getLanguage, setLanguage } from "./i18n";

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
// const debug = require('debug')('socialfi-agent:rbot')

const CANISTER_ID = process.env.RBOT_CANISTER_ID || ""
const BOT_TOKEN = process.env.RBOT_BOT_TOKEN || ""
const WEBHOOK_PATH = process.env.RBOT_WEBHOOK_PATH || ""
const SECRET_TOKEN = process.env.RBOT_SECRET_TOKEN || ""

const bot = new Telegraf<I18nContext>(BOT_TOKEN);

bot.use(async (ctx, next) => {
  // const lng = ctx.from?.language_code || 'en'
  let language = 'en'
  const userId = ctx.from?.id
  if (userId) {
    language = await getLanguage(await createPool(), userId)
  }
  ctx.i18n = i18next.getFixedT(language)
  await next()
});

bot.start(async ctx => {
  if (/^claimRedEnvelope_\d+$/.test(ctx.payload)) {
    const userId = ctx.from.id
    const firstName = ctx.from.first_name
    const rid = ctx.payload.split('_')[1];
    ctx.reply(await grabRedEnvelope(userId, firstName, [rid]))
  } else {
    if (ctx.message.chat.id > 0) {
      ctx.replyWithHTML(C.RBOT_START_IN_PRIVATE_MESSAGE, { reply_markup: C.RBOT_START_IN_PRIVATE_KEYBOARD })
    } else {
      ctx.replyWithHTML(C.RBOT_START_IN_GROUP_MESSAGE, { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
    }
  }
});

bot.command('start', ctx => {
  if (ctx.message.chat.id > 0) {
    ctx.replyWithHTML(C.RBOT_START_IN_PRIVATE_MESSAGE, { reply_markup: C.RBOT_START_IN_PRIVATE_KEYBOARD })
  } else {
    ctx.replyWithHTML(C.RBOT_START_IN_GROUP_MESSAGE, { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
  }
})

bot.command('help', ctx => {
  if (ctx.message.chat.id > 0) {
    ctx.replyWithHTML(C.RBOT_HELP_IN_PRIVATE_MESSAGE)
  } else {
    ctx.replyWithHTML(C.RBOT_HELP_IN_GROUP_MESSAGE)
  }
})

bot.command('address', async ctx => {
  const chatId = ctx.message.chat.id
  const userId = ctx.message.from.id;
  if (!limitChatScenario(chatId, [ChatScenario.Private])) {
    return ctx.replyWithHTML('Only allowed in private chat', { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
  }
  ctx.reply(await getAddress(userId))
})

bot.command('balance', async ctx => {
  const chatId = ctx.message.chat.id
  const userId = ctx.message.from.id;
  if (!limitChatScenario(chatId, [ChatScenario.Private])) {
    return ctx.replyWithHTML('Only allowed in private chat', { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
  }
  ctx.replyWithHTML(await getBalance(userId))
})

bot.command('transfer', async ctx => {
  const chatId = ctx.message.chat.id
  const userId = ctx.message.from.id;
  const [_, ...args] = ctx.message.text.split(' ');
  if (!limitChatScenario(chatId, [ChatScenario.Private])) {
    return ctx.replyWithHTML('Only allowed in private chat', { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
  }
  ctx.reply(await transferToken(userId, args))
})

bot.command('create', async ctx => {
  const chatId = ctx.message.chat.id
  const userId = ctx.message.from.id;
  const [_, ...args] = ctx.message.text.split(' ');
  if (!limitChatScenario(chatId, [ChatScenario.Private])) {
    return ctx.replyWithHTML('Only allowed in private chat', { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
  }
  const [message, markup] = await createRedEnvelope(userId, args)
  ctx.reply(message, markup)
})

bot.command('icreated', async ctx => {
  const chatId = ctx.message.chat.id
  const userId = ctx.message.from.id;
  if (!limitChatScenario(chatId, [ChatScenario.Private])) {
    return ctx.replyWithHTML('Only allowed in private chat', { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
  }
  ctx.reply(await listRedEnvelope(userId))
})

bot.command('redenvelope', async ctx => {
  const userId = ctx.message.from.id;
  const [_, ...args] = ctx.message.text.split(' ');
  const [message, markup] = await showRedEnvelope(userId, args)
  ctx.replyWithHTML(message, markup)
})

bot.command('revoke', async ctx => {
  const chatId = ctx.message.chat.id
  const userId = ctx.message.from.id;
  const [_, ...args] = ctx.message.text.split(' ');
  if (!limitChatScenario(chatId, [ChatScenario.Private])) {
    return ctx.replyWithHTML('Only allowed in private chat', { reply_markup: C.RBOT_START_IN_GROUP_KEYBOARD })
  }
  ctx.reply(await revokeRedEnvelope(userId, args))
})

bot.on(message('text'), async ctx => {
  if (ctx.message.chat.id > 0) {
    ctx.replyWithHTML(C.RBOT_HELP_IN_PRIVATE_MESSAGE)
  } else {
    ctx.replyWithHTML(C.RBOT_HELP_IN_GROUP_MESSAGE)
  }
  // const userId = ctx.message.from.id;
  // const [cmd, ...args] = ctx.message.text.split(' ');
  // const walletCmds = ['/balance', '/address', '/transfer']
  // const reCmds = ['/create', '/icreated', '/redenvelope', '/revoke']
  // if ((walletCmds.includes(cmd) || reCmds.includes(cmd)) && !hasUserIdentity(userId)) {
  //   const principal = getUserIdentity(userId).getPrincipal().toText()
  //   ctx.reply(`Wallet address: ${principal}`)
  //   return
  // }
})

bot.on(message('chat_shared'), async ctx => {
  const chatId = ctx.message.chat_shared.chat_id
  const requestId = ctx.message.chat_shared.request_id
  if (chatId && requestId) {
    const [message, markup] = await showRedEnvelope(0, [requestId.toString()])
    ctx.telegram.sendMessage(chatId, message, { ...markup, parse_mode: 'HTML' })
  }
})

bot.action('showAddress', async ctx => {
  const userId = ctx.callbackQuery.from.id
  ctx.reply(await getAddress(userId))
})

bot.action('showBalance', async ctx => {
  const userId = ctx.callbackQuery.from.id
  ctx.replyWithHTML(await getBalance(userId))
})

bot.action('showHowToTransfer', ctx => {
  ctx.reply(ctx.i18n('how_to_transfer'))
})

bot.action('showHowToCreateARedEnvelope', ctx => {
  ctx.reply(ctx.i18n('how_to_create_red_envelope'))
})

bot.action('showRedEnvelopesYouCreated', async ctx => {
  const userId = ctx.callbackQuery.from.id
  ctx.reply(await listRedEnvelope(userId))
})

bot.action('showCommandList', ctx => {
  ctx.replyWithHTML(C.RBOT_HELP_IN_PRIVATE_MESSAGE)
})

// bot.action(/^_\d+$/, async ctx => {
//   const userId = ctx.callbackQuery.from.id
//   const firstName = ctx.callbackQuery.from.first_name
//   const rid = ctx.match[0].split('_')[1];
//   ctx.reply(await grabRedEnvelope(userId, firstName, [rid]))
// })

bot.action('switchLanguage', async ctx => {
  const userId = ctx.callbackQuery.from.id
  const pool = await createPool()
  let lang = await getLanguage(pool, userId)
  lang =  (lang === 'en') ? 'zh' : 'en'
  await setLanguage(pool, userId, lang)
  ctx.reply(`Switch language to ${lang}`)
})

bot.on(callbackQuery("data"), async ctx => {
  const data = ctx.callbackQuery.data
  switch (true) {
    case /^claimRedEnvelope_\d+$/.test(data):
      const userId = ctx.callbackQuery.from.id
      const firstName = ctx.callbackQuery.from.first_name
      const rid = data.split('_')[1];
      ctx.reply(await grabRedEnvelope(userId, firstName, [rid]))
      break;
    default:
      break;
  }
})

export const callback = bot.webhookCallback(WEBHOOK_PATH, { secretToken: SECRET_TOKEN })


async function getAgentActor(): Promise<ActorSubclass<_SERVICE>> {
  const identity = getAgentIdentity();
  const agent = await makeAgent({ fetch, identity })
  return createActor(CANISTER_ID, { agent })
}

// ctx.message.chat.type
// export type Chat = Chat.PrivateChat | Chat.GroupChat | Chat.SupergroupChat | Chat.ChannelChat;
enum ChatScenario {
  InGroup,
  Private,
}

function limitChatScenario(chatId: number, allowed: ChatScenario[]): boolean {
  const allowedSet = new Set(allowed);
  if (chatId > 0 && allowedSet.has(ChatScenario.Private)) {
    return true
  }
  if (chatId < 0 && allowedSet.has(ChatScenario.InGroup)) {
    return true
  }
  return false
}

async function createRedEnvelope(userId: number, args: string[]): Promise<[string, object?]> {
  if (args.length !== 3) {
    return ['Invalid input\n\n/create [Symbol] [Amout] [Count]']
  }
  try {
    typeof BigInt(args[1]) === 'bigint'
  } catch (error) {
    return ['Invalid [Amout]\n/create [Symbol] [Amout] [Count]']
  }
  const count = parseInt(args[2], 10);
  if (isNaN(count) || String(count) !== args[2]) {
    return ['Invalid [Count]\n/create [Symbol] [Amout] [Count]']
  }
  const token = await getTokenBySymbol(await createPool(), args[0])
  if (!token) {
    return ['Invalid [Symbol]\n/create [Symbol] [Amout] [Count]']
  }
  const amout = BigInt(args[1])
  if (amout > token.re_maximum || amout < token.re_minimum) {
    return [`Invalid [Amout ${token.re_minimum}~${token.re_maximum}]\n/create [Symbol] [Amout] [Count]`]
  }

  // TODO: Approve to agent, transfer_from to re_app & fee_address
  const fee_amount = amout * BigInt(token.fee_ratio) / 100n
  const re_amount = amout - fee_amount
  let ret = await icrc1Transfer(token, userId, re_amount, Principal.fromText(CANISTER_ID))
  if ('Err' in ret) {
    return [`Transfer error: ${ret['Err']}`]
  }
  ret = await icrc1Transfer(token, userId, fee_amount, Principal.fromText(token.fee_address))
  if ('Err' in ret) {
    return [`Transfer error: ${ret['Err']}`]
  }

  const serviceActor = await getAgentActor()
  const re: RedEnvelope = {
    num: count,
    status: 0,
    participants: [],
    token_id: Principal.fromText(token.canister),
    owner: getUserIdentity(userId).getPrincipal(),
    memo: 'test memo',
    is_random: true,
    amount: re_amount,
    expires_at: []
  }
  const ret2 = await serviceActor.create_red_envelope(re)
  if ('Err' in ret2) {
    return [`Create red envelope error: ${ret2['Err']}`]
  } else {
    const rid = ret2['Ok']
    if (rid <= Number.MAX_SAFE_INTEGER && rid >= Number.MIN_SAFE_INTEGER) {
      const requestId = Number(rid)
      const keyboard = Markup.keyboard([Markup.button.groupRequest("Choose a Group", requestId)]).oneTime().resize()
      return [`Red envelope id: ${rid}`, keyboard]
    }
    return [`Red envelope id: ${rid}`]
  }
}

async function grabRedEnvelope(userId: number, username: string, args: string[]): Promise<string> {
  if (args.length !== 1) {
    return '/grab [RedEnvelopeID]'
  }
  try {
    typeof BigInt(args[0]) === 'bigint'
  } catch (error) {
    return '/grab [RedEnvelopeID]'
  }

  const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.open_red_envelope(BigInt(args[0]), userIdentity.getPrincipal())
  if ('Err' in ret) {
    return `${username} ${ret['Err']}`
  } else {
    return `${username} claim amount: ${ret['Ok']}`
  }
}

async function revokeRedEnvelope(userId: number, args: string[]): Promise<string> {
  if (args.length !== 1) {
    return '/revoke [RedEnvelopeID]'
  }
  try {
    typeof BigInt(args[0]) === 'bigint'
  } catch (error) {
    return '/revoke [RedEnvelopeID]'
  }

  const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.revoke_red_envelope(BigInt(args[0]), /* TODO: userIdentity.getPrincipal()*/)
  if ('Err' in ret) {
    return `Revoke red envelope error: ${ret['Err']}`
  } else {
    return `Revoke amount: ${ret['Ok']}`
  }
}
async function listRedEnvelope(userId: number) {
  const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.get_rids_by_owner(userIdentity.getPrincipal())
  return `Red envelopes: ${ret.map((v) => v.toString()).join(', ')}`
}

async function showRedEnvelope(userId: number, args: string[]): Promise<[string, object?]> {
  if (args.length !== 1) {
    return ['/redenvelope [RedEnvelopeID]']
  }
  try {
    typeof BigInt(args[0]) === 'bigint'
  } catch (error) {
    return ['/redenvelope [RedEnvelopeID]']
  }

  // const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.get_red_envelope(BigInt(args[0]))
  if (ret.length) {
    const token = await getTokenBycanister(await createPool(), ret[0].token_id.toText())
    const details = [
      ['Token', token ? token.symbol : ""],
      ['Amount', ret[0].amount],
      ['Count', ret[0].num],
      ['Random', ret[0].is_random ? 'Y' : 'N'],
      ['Memo', ret[0].memo],
      // ['Owner', ],
      // ['participants', ]
    ]
    const tableString = table(details, {
      border: getBorderCharacters('ramac'),
    })
    const markup = { reply_markup: C.RBOT_REDENVELOPE_KEYBOARD(BigInt(args[0])) }
    return ["<pre>" + tableString + "</pre>", markup]
  } else {
    return ['Red envelope does not exist']
  }
}

async function getAddress(userId: number): Promise<string> {
  const address = getUserIdentity(userId).getPrincipal().toText()
  return `Wallet address:\n ${address}`
}

async function getBalance(userId: number): Promise<string> {
  const tokens = await getTokens(await createPool());
  const balances = await Promise.all(tokens.map(async (token) => ([
    token.symbol,
    (await icrc1BalanceOf(token, userId)).toString()
  ])));
  balances.unshift(['Token', 'Amount']);
  const tableString = table(balances, {
    singleLine: true,
    border: getBorderCharacters('ramac'),
  })
  return "<pre>" + tableString + "</pre>"
}

async function transferToken(userId: number, args: string[]) {
  if (args.length !== 3) {
    return '/transfer [Symbol] [Amout] [To]'
  }
  try {
    typeof BigInt(args[1]) === 'bigint'
  } catch (error) {
    return '/transfer [Symbol] [Amout] [To]'
  }
  const token = await getTokenBySymbol(await createPool(), args[0])
  if (!token) {
    return '/transfer [Symbol] [Amout] [To]'
  }
  const to = Principal.fromText(args[2])
  if (!to._isPrincipal) {
    return '/transfer [Symbol] [Amout] [To]'
  }

  const ret = await icrc1Transfer(token, userId, BigInt(args[1]), to)
  if ('Err' in ret) {
    return `Transfer error: ${ret['Err']}`
  } else {
    return `Transfer ${args[1]} ${args[0]} to ${args[2]}`
  }
}
import assert from 'assert'
import { Telegraf, Markup } from "telegraf";
import { message } from 'telegraf/filters';
import { Principal } from '@dfinity/principal';
import type { ActorSubclass } from "@dfinity/agent";
import { table, getBorderCharacters } from "table";
import { TFunction } from "i18next";

import { createActor } from './declarations/rbot_backend';
import { RedEnvelope } from "./declarations/rbot_backend/rbot_backend.did";
import { _SERVICE } from "./declarations/rbot_backend/rbot_backend.did";
import { TransferError } from '../ledger/declarations/icrc1_ledger_canister/icrc1_ledger_canister.did';
import { makeAgent } from '../../utils'
import { getAgentIdentity, getUserIdentity } from '../../identity'
import { createPool, getTokenBySymbol, getTokenBycanister, getTokens } from '../../tokens'
import { icrc1BalanceOf, icrc1Transfer, icrc1Fee } from "../ledger/ledger";
import i18next, { I18nContext, getLanguage, setLanguage } from "./i18n";
import * as S from "./status"


if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
// const debug = require('debug')('socialfi-agent:rbot')

const CANISTER_ID = process.env.RBOT_CANISTER_ID || ""
const BOT_TOKEN = process.env.RBOT_BOT_TOKEN || ""
const BOT_USERNAME = process.env.RBOT_BOT_USERNAME || ""
const WEBHOOK_PATH = process.env.RBOT_WEBHOOK_PATH || ""
const SECRET_TOKEN = process.env.RBOT_SECRET_TOKEN || ""
const TOKEN_SYMBOL = process.env.RBOT_TOKEN_SYMBOL || ""
const TOKEN_DECIMALS = process.env.RBOT_TOKEN_DECIMALS || "2"
const ICP_SYMBOL = 'ICP'
const ICP_DECIMALS = '8'
const RE_COVER_PICTURE = 'https://storage.googleapis.com/omnity-rebot/%E7%BA%A2%E5%8C%85%E5%B0%81%E9%9D%A2.jpg'

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


bot.command('start', async ctx => {
  // ctx.telegram.webhookReply = true
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    // record wallet creation
    const userId = ctx.message.from.id
    const wallet = { uid: userId, principal: getUserIdentity(userId).getPrincipal().toText() }
    await S.insertWallet(await createPool(), wallet)

    ctx.replyWithPhoto(RE_COVER_PICTURE, {
      caption: ctx.i18n('msg_start'),
      parse_mode: "HTML",
      reply_markup: RBOT_START_IN_PRIVATE_KEYBOARD(ctx.i18n)
    })
  }
})

bot.command('help', ctx => {
  // ctx.telegram.webhookReply = true
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    ctx.replyWithHTML(ctx.i18n('msg_help'))
  }
})

bot.command('wallet', async ctx => {
  // ctx.telegram.webhookReply = true
  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    const address = await getAddress(userId)
    const balance = await getBalance(userId)
    const balance_icp = await getBalanceTCP(userId)
    const data = [
      [ctx.i18n('balance'), ctx.i18n('asset')],
      [balance, TOKEN_SYMBOL],
      [balance_icp, ICP_SYMBOL],
    ]
    const tableString = table(data, { border: getBorderCharacters('ramac'), })
    let htmlString = '<b>' + ctx.i18n('msg_wallet_title') + '</b>' + '\n'
    htmlString += `<pre>${tableString}</pre>`
    htmlString += `<code>${address}</code>`
    htmlString += '\n\n' + ctx.i18n('msg_wallet_notice')
    ctx.replyWithHTML(htmlString)
  }
})

bot.command('transfer', async ctx => {
  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  const [_, ...args] = ctx.message.text.split(' ');
  if (chatType === "private") {
    ctx.reply(await transferToken(userId, args.map(arg => arg.trim()), ctx.i18n))
  }
})

bot.command('create', async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.message.from.id;
  const chatType = ctx.message.chat.type
  const [_, args] = ctx.message.text.split(/ (.+)/, 2);
  if (chatType === "private") {
    const [message, markup] = await createRedEnvelope(userId, args, ctx.i18n)
    ctx.reply(message, markup)
  }
})

bot.command('list', async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.message.from.id;
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    ctx.replyWithHTML(await listRedEnvelope(userId, ctx.i18n))
  }
})

bot.command('send', async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  const [_, ...args] = ctx.message.text.split(' ');
  if (chatType === "private") {
    const [message, markup] = await sendRedEnvelope(userId, args, ctx.i18n)
    ctx.replyWithHTML(message, markup)
  }
})

bot.command('revoke', async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  const [_, ...args] = ctx.message.text.split(' ');
  if (chatType === "private") {
    ctx.reply(await revokeRedEnvelope(userId, args, ctx.i18n))
  }
})

bot.on(message('text'), async ctx => {
  // ctx.telegram.webhookReply = true
  if (ctx.message.chat.id > 0) {
    ctx.replyWithHTML(ctx.i18n('msg_help'))
  }
})

bot.on(message('chat_shared'), async ctx => {
  // ctx.telegram.webhookReply = false
  const chatId = ctx.message.chat_shared.chat_id
  const requestId = ctx.message.chat_shared.request_id
  if (chatId && requestId) {
    const username = ctx.message.from.username ? `@${ctx.message.from.username}` : ctx.message.from.first_name
    const [message, markup] = await showRedEnvelope(username, [requestId.toString()], ctx.i18n)
    if (markup) {
      try {
        await ctx.telegram.sendMessage(chatId, message, { ...markup, parse_mode: 'HTML' })
        // update re is_sent receiver
        // await S.updateReStatusIsSent(await createPool(), requestId, true)
        await S.updateReStatusReceiver(await createPool(), requestId, `g_${chatId}`)
        ctx.reply(ctx.i18n('msg_send_group'), Markup.removeKeyboard())
      } catch (error) {
        const msg = ctx.i18n('msg_send_failed_group', { botname: BOT_USERNAME })
        ctx.reply(msg, Markup.removeKeyboard())
      }
    } else {
      ctx.reply(ctx.i18n('reapp_error_1112', { id: requestId }), Markup.removeKeyboard())
    }
  }
})

bot.on(message('users_shared'), async ctx => {
  // ctx.telegram.webhookReply = false
  const user_ids = ctx.message.users_shared.user_ids
  const requestId = ctx.message.users_shared.request_id - 1
  if (user_ids.length > 0 && requestId) {
    const username = ctx.message.from.username ? `@${ctx.message.from.username}` : ctx.message.from.first_name
    const [message, markup] = await showRedEnvelope(username, [requestId.toString()], ctx.i18n)
    if (markup) {
      try {
        await ctx.telegram.sendMessage(user_ids[0], message, { ...markup, parse_mode: 'HTML' })
        // update re is_sent receiver
        // await S.updateReStatusIsSent(await createPool(), requestId, true)
        await S.updateReStatusReceiver(await createPool(), requestId, `u_${user_ids[0]}`)
        ctx.reply(ctx.i18n('msg_send_user'), Markup.removeKeyboard())
      } catch (error) {
        const msg = ctx.i18n('msg_send_failed_user', { botname: BOT_USERNAME })
        ctx.reply(msg, Markup.removeKeyboard())
      }
    } else {
      ctx.reply(ctx.i18n('reapp_error_1112', { id: requestId }), Markup.removeKeyboard())
    }
  }
})

bot.action('showWallet', async ctx => {
  // ctx.telegram.webhookReply = true
  const userId = ctx.callbackQuery.from.id
  const address = await getAddress(userId)
  const balance = await getBalance(userId)
  const balance_icp = await getBalanceTCP(userId)
  const data = [
    [ctx.i18n('balance'), ctx.i18n('asset')],
    [balance, TOKEN_SYMBOL],
    [balance_icp, ICP_SYMBOL],
  ]
  const tableString = table(data, { border: getBorderCharacters('ramac'), })
  let htmlString = '<b>' + ctx.i18n('msg_wallet_title') + '</b>' + '\n'
  htmlString += `<pre>${tableString}</pre>`
  htmlString += `<code>${address}</code>`
  htmlString += '\n\n' + ctx.i18n('msg_wallet_notice')
  ctx.replyWithHTML(htmlString)
})

bot.action('showHowToCreateRE', ctx => {
  // ctx.telegram.webhookReply = true
  ctx.reply(ctx.i18n('msg_how_to_create'))
})

bot.action('showHowToSendRE', ctx => {
  // ctx.telegram.webhookReply = true
  ctx.reply(ctx.i18n('msg_how_to_send'))
})

bot.action('showHowToRevokeRE', ctx => {
  // ctx.telegram.webhookReply = true
  ctx.reply(ctx.i18n('msg_how_to_revoke'))
})

bot.action('showHowToTransfer', ctx => {
  // ctx.telegram.webhookReply = true
  ctx.reply(ctx.i18n('msg_how_to_transfer'))
})

bot.action('showREs', async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.callbackQuery.from.id
  ctx.replyWithHTML(await listRedEnvelope(userId, ctx.i18n))
})

bot.action('switchLanguage', async ctx => {
  // ctx.telegram.webhookReply = true
  const userId = ctx.callbackQuery.from.id
  const pool = await createPool()
  let lang = await getLanguage(pool, userId)
  lang = (lang === 'en') ? 'zh' : 'en'
  await setLanguage(pool, userId, lang)

  // change language temporarily
  const i18n = i18next.getFixedT(lang)
  if (lang === 'zh') {
    ctx.reply(i18n('msg_switch_zh'))
  } else {
    ctx.reply(i18n('msg_switch_en'))
  }
})

bot.action('showCommandList', ctx => {
  // ctx.telegram.webhookReply = true
  ctx.replyWithHTML(ctx.i18n('msg_help'))
})

// bot.action(/^claimRedEnvelope_\d+$/, async ctx => {
bot.action(/^claimRedEnvelope_\d+(?:_[a-zA-Z0-9]+)?$/, async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.callbackQuery.from.id
  const firstName = ctx.callbackQuery.from.first_name
  const splited = ctx.match[0].split('_')
  const rid = splited[1];
  if (splited.length == 3 && splited[2] != BOT_USERNAME) {
    return
  }
  if (ctx.from.is_bot) {
    return
  }

  // repeat snatch send private msg
  const snatchStatus = await S.getSnatchStatus(await createPool(), Number(rid), userId)
  if (snatchStatus) { // if (snatchStatus && snatchStatus.code != -1) {
    const code = snatchStatus.code == 0 ? 'reapp_error_1110' : `reapp_error_${snatchStatus.code}`
    if (errorWithRedEnvelopeId(code)) {
      await ctx.telegram.sendMessage(userId, ctx.i18n(code, { id: rid }))
    } else {
      await ctx.telegram.sendMessage(userId, ctx.i18n(code))
    }
    return
  }

  // snatch re
  const grab = await grabRedEnvelope(userId, firstName, [rid], ctx.i18n)
  ctx.reply(grab[1])

  // hide snatch & reply "RE snatch up"
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.get_red_envelope(BigInt(rid))
  if (ret.length) {
    if (ret[0].participants.length == ret[0].num) {
      ctx.editMessageReplyMarkup(undefined)
      ctx.reply(ctx.i18n('reapp_error_1109', { id: rid }))
      // is_done
      // await S.updateReStatusIsDone(await createPool(), Number(rid), true)
    }
  }
})

export const callback = bot.webhookCallback(WEBHOOK_PATH, { secretToken: SECRET_TOKEN })


async function getAgentActor(): Promise<ActorSubclass<_SERVICE>> {
  const identity = getAgentIdentity();
  const agent = await makeAgent({ fetch, identity })
  return createActor(CANISTER_ID, { agent })
}

async function createRedEnvelope(userId: number, args: string, i18n: TFunction): Promise<[string, object?]> {
  const token = await getTokenBySymbol(await createPool(), TOKEN_SYMBOL)
  if (!token) {
    return [i18n('msg_how_to_create')]
  }

  if (args === null || args === undefined) {
    return [i18n('msg_how_to_create')]
  }

  /**
   * 88.88 5 F ababbaba
   * /^(\d+(?:\.\d{1,2})?)\s+(\d+)(?:\s+(F\b))?(?:\s+(.*))?$/
   * 
   * 88 5 F ababbaba
   * /^(\d+)\s+(\d+)(?:\s+(F\b))?(?:\s+(.*))?$/
   */
  let amountPattern = '\\d+(?:\\.\\d{1,' + TOKEN_DECIMALS + '})?';
  let creationPattern = '^(' + amountPattern + ')\\s+(\\d+)(?:\\s+(F\\b))?(?:\\s+(.*))?$';
  const pattern = new RegExp(creationPattern);
  // const pattern = /^(\d+)\s+(\d+)(?:\s+(F\b))?(?:\s+(.*))?$/
  const matches = args.trim().match(pattern)
  if (matches == null) {
    return [i18n('msg_how_to_create')]
  }

  // amount 88.88 -> 8888
  const amount = stringToBigint(matches[1], parseInt(TOKEN_DECIMALS))
  const count = parseInt(matches[2], 10);
  if (isNaN(count) || String(count) !== matches[2]) {
    return [i18n('msg_how_to_create')]
  }
  if (amount / BigInt(count) < token.re_minimum_each) {
    return [i18n('msg_create_minimum', { amount: bigintToString(token.re_minimum_each, parseInt(TOKEN_DECIMALS)) })]
  }

  const random = (matches[3] === 'F') ? false : true
  const memo = matches[4] || ''
  // default: utc nanoseconds + 24hours
  const expires_at = BigInt((new Date()).getTime() + (24 * 60 * 60 * 1000)) * 1000000n

  // TODO: Approve to agent, then transfer_from to re_app + fee_address
  const fee_amount = amount * BigInt(token.fee_ratio) / 100n
  const balance = await icrc1BalanceOf(token, userId)
  const transFee = await icrc1Fee(token, userId)
  if (balance < amount + fee_amount + transFee * 2n) {
    return [i18n('msg_create_insufficient')]
  }
  let ret = await icrc1Transfer(token, userId, amount, Principal.fromText(CANISTER_ID))
  if ('Err' in ret) {
    return [i18n('msg_create_transfer_failed')] //TODO: `${ret['Err']}`
  }
  ret = await icrc1Transfer(token, userId, fee_amount, Principal.fromText(token.fee_address))
  if ('Err' in ret) {
    return [i18n('msg_create_transfer_failed')] //TODO: `${ret['Err']}`
  }

  const serviceActor = await getAgentActor()
  const re: RedEnvelope = {
    num: count,
    status: 0,
    participants: [],
    token_id: Principal.fromText(token.canister),
    owner: getUserIdentity(userId).getPrincipal(),
    memo: memo,
    is_random: random,
    amount: amount,
    expires_at: [expires_at]
  }
  const ret2 = await serviceActor.create_red_envelope(re)
  if ('Err' in ret2) {
    const code = `reapp_error_${ret2['Err'][0].toString()}`
    if (errorWithRedEnvelopeId(code)) {
      return [i18n(code, { id: '' })]
    } else {
      return [i18n(code)]
    }
  } else {
    const rid = ret2['Ok']
    assert((rid <= Number.MAX_SAFE_INTEGER && rid >= Number.MIN_SAFE_INTEGER), `Whoops ${rid} ...`)
    // insert db
    const reStatus = {
      id: Number(rid),
      rune: TOKEN_SYMBOL,
      uid: userId,
      amount,
      count,
      expire_at: expires_at,
      fee_amount,
      is_sent: false,
      is_revoked: false
    }
    await S.insertReStatus(await createPool(), reStatus)
    // select user/group
    const keyboard = RBOT_SELECT_USER_GROUP_KEYBOARD(Number(rid), count, i18n)
    return [i18n('msg_create', {
      id: rid.toString(),
      fee: bigintToString(fee_amount, parseInt(TOKEN_DECIMALS))
    }), keyboard]
  }
}

async function sendRedEnvelope(userId: number, args: string[], i18n: TFunction): Promise<[string, object?]> {
  if (args.length !== 1) {
    return [i18n('msg_how_to_send')]
  }
  try {
    typeof BigInt(args[0]) === 'bigint'
  } catch (error) {
    return [i18n('msg_how_to_send')]
  }

  const pool = await createPool()
  const reStatus = await S.getReStatus(pool, Number(args[0]), userId)
  if (reStatus) {
    // [db] is_sent && is_revoked && expire
    if (reStatus.is_sent) {
      return [i18n('msg_send_repeat', { id: args[0] })]
    }
    if (reStatus.is_revoked) {
      return [i18n('reapp_error_1112', { id: args[0] })]
    }
    if (BigInt((new Date()).getTime()) * 1000000n > reStatus.expire_at) {
      return [i18n('reapp_error_1107', { id: args[0] })]
    }
    // [canister] get re
    const serviceActor = await getAgentActor()
    const ret = await serviceActor.get_red_envelope(BigInt(args[0]))
    if (ret.length === 0) {
      return [i18n('reapp_error_1112', { id: args[0] })]
    }

    const keyboard = RBOT_SELECT_USER_GROUP_KEYBOARD(Number(args[0]), ret[0].num, i18n)
    return [i18n('msg_send'), keyboard]
  } else {
    return [i18n('reapp_error_1108', { id: args[0] })]
  }
}

async function grabRedEnvelope(userId: number, username: string, args: string[], i18n: TFunction): Promise<[string, string]> {
  const rid = Number(args[0]);
  const pool = await createPool()

  // insert
  await S.insertSnatchStatus(pool, { id: rid, uid: userId, code: -1, amount: 0n, discard: 0 })

  const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.open_red_envelope(BigInt(args[0]), userIdentity.getPrincipal())
  if ('Err' in ret) {
    // update
    await S.updateSnatchStatus(pool, { id: rid, uid: userId, code: Number(ret['Err'][0]), amount: 0n, discard: 0 })
    const code = `reapp_error_${ret['Err'][0].toString()}`
    if (errorWithRedEnvelopeId(code)) {
      return [code, username + ' ' + i18n(code, { id: args[0] })]
    } else {
      return [code, username + ' ' + i18n(code)]
    }
  } else {
    // update
    await S.updateSnatchStatus(pool, { id: rid, uid: userId, code: 0, amount: ret['Ok'], discard: 0 })
    // amount 8888 -> 88.88
    const amount = bigintToString(ret['Ok'], parseInt(TOKEN_DECIMALS))
    let msg = i18n('msg_snatch', { username, amount, id: args[0] })
    if (await S.getWallet(pool, userId) == undefined) {
      msg += '\n' + i18n('msg_snatch_suffix', { botname: BOT_USERNAME })
    }
    return ['reapp_error_0', msg]
  }
}

async function revokeRedEnvelope(userId: number, args: string[], i18n: TFunction): Promise<string> {
  if (args.length !== 1) {
    return i18n('msg_how_to_revoke')
  }
  try {
    typeof BigInt(args[0]) === 'bigint'
  } catch (error) {
    return i18n('msg_how_to_revoke')
  }

  // is_revoked || expire_at
  const pool = await createPool()
  const reStatus = await S.getReStatus(pool, Number(args[0]), userId)
  if (reStatus) {
    // [db] is_revoked && expire
    if (reStatus.is_revoked) {
      return i18n('reapp_error_1112', { id: args[0] })
    }
    if (BigInt((new Date()).getTime()) * 1000000n < reStatus.expire_at) {
      return i18n('reapp_error_1113', { id: args[0] })
    }

    const userIdentity = getUserIdentity(userId)
    const serviceActor = await getAgentActor()
    const ret = await serviceActor.revoke_red_envelope(BigInt(args[0]), /* TODO: userIdentity.getPrincipal()*/)
    if ('Err' in ret) {
      const code = `reapp_error_${ret['Err'][0].toString()}`
      if (errorWithRedEnvelopeId(code)) {
        return i18n(code, { id: args[0] })
      } else {
        return i18n(code)
      }
    } else {
      await S.updateReStatusIsRevoked(await createPool(), Number(args[0]), true)
      return i18n('msg_revoke', { amount: ret['Ok'] })
    }
  } else {
    return i18n('reapp_error_1108', { id: args[0] })
  }
}

async function listRedEnvelope(userId: number, i18n: TFunction) {
  const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const rids = await serviceActor.get_rids_by_owner(userIdentity.getPrincipal())
  // top10: sort slice 
  const sorted = rids.sort((a, b) => Number(b) - Number(a))
  const top10 = sorted.slice(0, 10).map(bigint => Number(bigint))
  const status = await S.getReStatusByIds(await createPool(), top10, userId)
  const data = status.map(s => {
    let status = 'Unsend'
    if (s.is_revoked) {
      status = 'Revoked'
    } else {
      // is_done
      if (BigInt((new Date()).getTime()) * 1000000n > s.expire_at) {
        status = 'Expired'
      } else {
        if (s.is_sent) {
          status = 'Sent'
        }
      }
    }
    return [s.id.toString(), bigintToString(s.amount, parseInt(TOKEN_DECIMALS)), s.count.toString(), status]
  })
  data.unshift(['No.', 'Amount', 'Count', 'Status']);
  const tableString = table(data, { border: getBorderCharacters('ramac'), })
  let htmlString = '<b>' + i18n('msg_my_re_title') + '</b>' + '\n'
  htmlString += `<pre>${tableString}</pre>`
  return htmlString
}

async function showRedEnvelope(userName: string, args: string[], i18n: TFunction): Promise<[string, object?]> {
  // const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.get_red_envelope(BigInt(args[0]))
  if (ret.length) {
    const token = await getTokenBycanister(await createPool(), ret[0].token_id.toText())
    const details = [
      [i18n('reid'), args[0]],
      [i18n('runes'), token ? token.symbol : ""],
      [i18n('amount'), bigintToString(ret[0].amount, parseInt(TOKEN_DECIMALS))],
      [i18n('count'), ret[0].num],
      [i18n('random'), ret[0].is_random ? 'Y' : 'N'],
    ]
    const tableString = table(details, { border: getBorderCharacters('ramac'), })
    let htmlString = '<b>' + userName + ' ' + i18n('msg_re_title') + '</b>' + '\n'
    htmlString += `<pre>${tableString}</pre>`
    htmlString += ret[0].memo
    const markup = { reply_markup: RBOT_REDENVELOPE_KEYBOARD(i18n, BigInt(args[0])) }
    return [htmlString, markup]
  } else {
    return [i18n('reapp_error_1112', { id: args[0] })]
  }
}

async function getAddress(userId: number): Promise<string> {
  return getUserIdentity(userId).getPrincipal().toText()
}

async function getBalance(userId: number): Promise<string> {
  const token = await getTokenBySymbol(await createPool(), TOKEN_SYMBOL)
  let balance = '0'
  if (token) {
    const amount = await icrc1BalanceOf(token, userId)
    balance = bigintToString(amount, parseInt(TOKEN_DECIMALS))
  }
  return balance
}

async function getBalanceTCP(userId: number): Promise<string> {
  const token = await getTokenBySymbol(await createPool(), ICP_SYMBOL)
  let balance = '0'
  if (token) {
    const amount = await icrc1BalanceOf(token, userId)
    balance = bigintToString(amount, parseInt(ICP_DECIMALS))
  }
  return balance
}

// async function getBalances(userId: number): Promise<string> {
//   const tokens = await getTokens(await createPool());
//   const balances = await Promise.all(tokens.map(async (token) => ([
//     token.symbol,
//     (await icrc1BalanceOf(token, userId)).toString()
//   ])));
//   balances.unshift(['Token', 'Amount']);
//   const tableString = table(balances, {
//     singleLine: true,
//     border: getBorderCharacters('ramac'),
//   })
//   return "<pre>" + tableString + "</pre>"
// }

async function transferToken(userId: number, args: string[], i18n: TFunction): Promise<string> {
  if (args.length !== 3 && args.length !== 2) {
    return i18n('msg_how_to_transfer')
  }
  if (args.length === 3 && args[0] !== ICP_SYMBOL) {
    return i18n('msg_how_to_transfer')
  }
  const _token = args.length === 2 ? TOKEN_SYMBOL : args[0]
  const _amount = args.length === 2 ? args[0] : args[1]
  const _to = args.length === 2 ? args[1] : args[2]
  const _decimal = args.length === 2 ? TOKEN_DECIMALS : ICP_DECIMALS


  let pattern = new RegExp('^(\\d+(?:\\.\\d{1,' + _decimal + '})?)$')
  const matches = _amount.match(pattern)
  if (matches == null) {
    return i18n('msg_how_to_transfer')
  }

  const amount = stringToBigint(_amount, parseInt(_decimal))
  const token = await getTokenBySymbol(await createPool(), _token)
  if (!token) {
    return i18n('msg_how_to_transfer')
  }
  const to = Principal.fromText(_to)
  if (!to._isPrincipal) {
    return i18n('msg_how_to_transfer')
  }

  const ret = await icrc1Transfer(token, userId, amount, to)
  if ('Err' in ret) {
    const error = convertTransferError(ret['Err'], i18n)
    return i18n('msg_transfer_failed', { error })
  } else {
    return i18n('msg_transfer', { amount: _amount })
  }
}

function convertTransferError(err: TransferError, i18n: TFunction): string {
  let error = i18n('ledger_error_Unknown')
  if ('GenericError' in err) {
    error = i18n('ledger_error_GenericError', { error: err.GenericError.message })
  } else if ('TemporarilyUnavailable' in err) {
    error = i18n('ledger_error_TemporarilyUnavailable')
  } else if ('InsufficientFunds' in err) {
    error = i18n('ledger_error_InsufficientFunds', { error: err.InsufficientFunds.balance.toString() })
  }
  return error
}

function errorWithRedEnvelopeId(error: string): boolean {
  const errors: string[] = [
    'reapp_error_1107', 'reapp_error_1108', 'reapp_error_1109', 'reapp_error_1110',
    'reapp_error_1112', 'reapp_error_1113', 'reapp_error_1114'
  ];
  return errors.includes(error)
}

function stringToBigint(amount: string, decimals: number): bigint {
  const amountComponents = amount.split('.');
  const wholeComponent = BigInt(amountComponents[0]);
  const decimalComponent = BigInt(amountComponents[1] || '0');
  return wholeComponent * BigInt(10) ** BigInt(decimals) + decimalComponent;
}

function bigintToString(bigIntAmount: BigInt, decimals: number): string {
  const amountString = bigIntAmount.toString();
  const wholeComponent = amountString.length > decimals ? amountString.slice(0, -decimals) : '0';
  const decimalComponent = amountString.slice(-decimals).padStart(decimals, '0');
  return `${wholeComponent}.${decimalComponent}`;
}

const RBOT_SELECT_USER_GROUP_KEYBOARD = (rid: number, count: number, i18n: TFunction) => {
  if (count == 1) {
    return Markup.keyboard([
      Markup.button.userRequest(i18n('btn_select_user'), rid + 1),
      Markup.button.groupRequest(i18n('btn_select_group'), rid),
    ]).oneTime().resize()
  } else {
    return Markup.keyboard([
      Markup.button.groupRequest(i18n('btn_select_group'), rid),
    ]).oneTime().resize()
  }
}

const RBOT_START_IN_PRIVATE_KEYBOARD = (i18n: TFunction) => {
  return {
    inline_keyboard: [
      [
        { text: i18n('btn_create_re'), callback_data: "showHowToCreateRE" },
        { text: i18n('btn_send_re'), callback_data: "showHowToSendRE" },
      ],
      [
        { text: i18n('btn_my_re'), callback_data: "showREs" },
        { text: i18n('btn_revoke_re'), callback_data: "showHowToRevokeRE" },
      ],
      [
        { text: i18n('btn_wallet'), callback_data: "showWallet" },
        { text: i18n('btn_transfer'), callback_data: "showHowToTransfer" },
      ],
      [
        { text: i18n('btn_language'), callback_data: "switchLanguage" },
        { text: i18n('btn_help'), callback_data: "showCommandList" }
      ]
    ]
  }
}

const RBOT_REDENVELOPE_KEYBOARD = (i18n: TFunction, rid: bigint) => {
  return {
    inline_keyboard: [
      [
        {
          text: i18n('btn_snatch'),
          callback_data: `claimRedEnvelope_${rid.toString()}_${BOT_USERNAME}`
          // claimRedEnvelope_999_RE00bot
          // url: `https://t.me/${BOT_USERNAME}?start=claimRedEnvelope_${rid.toString()}`
        },
      ]
    ]
  }
}

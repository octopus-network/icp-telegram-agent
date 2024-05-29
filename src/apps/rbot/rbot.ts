import { Telegraf, Context, Markup } from "telegraf"
import { message } from 'telegraf/filters';
import { TFunction } from "i18next"

import { getUserIdentity } from '../../identity'
import { createPool } from '../../tokens'
import { getSwapPrice, doSwap } from './rbot_swap';
import { showWallet, transferToken } from './rbot_wallet'
import { createRedEnvelope, sendRedEnvelope, grabRedEnvelope, revokeRedEnvelope, listRedEnvelope, showRedEnvelope, isRedEnvelopeEmpty, errorWithRedEnvelopeId, parseShareLink, listSpreaders, listReferrals } from './rbot_re'
import i18next, { I18nContext, getLanguage, setLanguage } from "./i18n"
import * as S from "./status"


if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
// const debug = require('debug')('socialfi-agent:rbot')

const BOT_TOKEN = process.env.RBOT_BOT_TOKEN || ""
const BOT_USERNAME = process.env.RBOT_BOT_USERNAME || ""
const WEBHOOK_PATH = process.env.RBOT_WEBHOOK_PATH || ""
const SECRET_TOKEN = process.env.RBOT_SECRET_TOKEN || ""
const RE_START_PICTURE = 'https://storage.googleapis.com/socialfi-agent/rebot/snatch.jpg'
const RE_SNATCH_PICTURE = 'https://storage.googleapis.com/socialfi-agent/rebot/snatch.jpg'
const WEB_APP_URL = "https://re-webapp.vercel.app/"

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
  if (chatType !== "private") {
    return
  }

  // record wallet creation
  const userId = ctx.message.from.id
  const wallet = { uid: userId, principal: getUserIdentity(userId).getPrincipal().toText() }
  await S.insertWallet(await createPool(), wallet)

  // collect user profile
  await S.insertUser(await createPool(), {
    uid: ctx.message.from.id,
    username: ctx.message.from.username,
  })

  // share link
  const parsed = parseShareLink(ctx.payload)
  if (parsed) {
    const splited = parsed.split('_')
    // snatch_uid_rid
    if (splited.length === 3 && splited[0] === 'snatch') {
      const sender = await ctx.telegram.getChatMember(Number(splited[1]), Number(splited[1]))
      const username = sender.user.username ? `@${sender.user.username}` : sender.user.first_name
      const [message, cover, markup] = await showRedEnvelope(username, [splited[2]], ctx.i18n)
      if (cover && markup) {
        ctx.replyWithPhoto({ source: cover }, {
          caption: message,
          ...markup,
          parse_mode: 'HTML'
        })
        return
      }
    }
  }
  // start
  ctx.replyWithPhoto(RE_START_PICTURE, {
    caption: ctx.i18n('msg_start'),
    parse_mode: "HTML",
    reply_markup: RBOT_START_IN_PRIVATE_KEYBOARD(ctx.i18n)
  })
})

bot.command('help', async ctx => {
  // ctx.telegram.webhookReply = true
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    // collect user profile
    await S.insertUser(await createPool(), {
      uid: ctx.message.from.id,
      username: ctx.message.from.username,
    })

    ctx.replyWithHTML(ctx.i18n('msg_help'))
  }
})

bot.command('wallet', async ctx => {
  // ctx.telegram.webhookReply = true
  // collect user profile
  await S.insertUser(await createPool(), {
    uid: ctx.message.from.id,
    username: ctx.message.from.username,
  })

  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    const data = await showWallet(userId, ctx.i18n)
    ctx.replyWithHTML(data)
  }
})

bot.command('transfer', async ctx => {
  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  const [_, ...args] = ctx.message.text.split(' ');
  if (chatType === "private") {
    ctx.reply(await transferToken(
      userId,
      args.map(arg => arg.trim()).filter(arg => arg !== ''),
      ctx.i18n
    ))
  }
})

bot.command('create', async ctx => {
  // ctx.telegram.webhookReply = false
  // collect user profile
  await S.insertUser(await createPool(), {
    uid: ctx.message.from.id,
    username: ctx.message.from.username,
  })

  const userId = ctx.message.from.id;
  const chatType = ctx.message.chat.type
  const [_, args] = ctx.message.text.split(/ (.+)/, 2);
  if (chatType === "private") {
    ctx.reply(ctx.i18n('msg_create_waiting'))
    const [message, markup] = await createRedEnvelope(userId, args, ctx.i18n)
    ctx.reply(message, markup)
  }
})

bot.command('list', async ctx => {
  // ctx.telegram.webhookReply = false
  // collect user profile
  await S.insertUser(await createPool(), {
    uid: ctx.message.from.id,
    username: ctx.message.from.username,
  })

  const userId = ctx.message.from.id;
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    const [_, ...args] = ctx.message.text.split(' ');
    ctx.replyWithHTML(await listRedEnvelope(userId, args, ctx.i18n))
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

bot.command('preswap', async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  const [_, ...args] = ctx.message.text.split(' ');
  if (chatType === "private") {
    ctx.reply(await getSwapPrice(
      userId,
      args.map(arg => arg.trim()).filter(arg => arg !== ''),
      ctx.i18n
    ))
  }
})

bot.command('swap', async ctx => {
  // ctx.telegram.webhookReply = false
  const userId = ctx.message.from.id
  const chatType = ctx.message.chat.type
  const [_, ...args] = ctx.message.text.split(' ');
  if (chatType === "private") {
    ctx.reply(await doSwap(
      userId,
      args.map(arg => arg.trim()).filter(arg => arg !== ''),
      ctx.i18n
    ))
  }
})

bot.command('setmenu', ctx =>
	ctx.setChatMenuButton({
		text: "Launch",
		type: "web_app",
		web_app: { url: WEB_APP_URL },
	}),
)

bot.command('spreaders', async ctx => {
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    ctx.replyWithHTML(await listSpreaders(ctx.i18n))
  }
})

bot.command('referrals', async ctx => {
  const userId = ctx.message.from.id;
  const chatType = ctx.message.chat.type
  if (chatType === "private") {
    const [_, ...args] = ctx.message.text.split(' ');
    ctx.replyWithHTML(await listReferrals(userId, args, ctx.i18n))
  }
})

bot.on(message('text'), async ctx => {
  // ctx.telegram.webhookReply = true
  const chatType = ctx.message.chat.type
  if (chatType !== "private") {
    return
  }

  // collect user profile
  const userId = ctx.message.from.id
  const username = ctx.message.from.username
  await S.insertUser(await createPool(), {
    uid: userId,
    username: username,
  })

  const [cmd, ...args] = ctx.message.text.split(' ')
  switch (cmd) {
    case 'wallet':
      ctx.replyWithHTML(await showWallet(userId, ctx.i18n))
      break

    case 'transfer':
      ctx.reply(await transferToken(
        userId,
        args.map(arg => arg.trim()).filter(arg => arg !== ''),
        ctx.i18n
      ))
      break

    case 'create':
      ctx.reply(ctx.i18n('msg_create_waiting'))
      const [_, _args] = ctx.message.text.split(/ (.+)/, 2)
      const [message, markup] = await createRedEnvelope(userId, _args, ctx.i18n)
      ctx.reply(message, markup)
      break

    case 'list':
      ctx.replyWithHTML(await listRedEnvelope(userId, args, ctx.i18n))
      break

    case 'send':
      const [_message, _markup] = await sendRedEnvelope(userId, args, ctx.i18n)
      ctx.replyWithHTML(_message, _markup)
      break

    case 'revoke':
      ctx.reply(await revokeRedEnvelope(userId, args, ctx.i18n))
      break

    case 'preswap':
      ctx.reply(await getSwapPrice(
        userId,
        args.map(arg => arg.trim()).filter(arg => arg !== ''),
        ctx.i18n
      ))
      break

    case 'swap':
      ctx.reply(await doSwap(
        userId,
        args.map(arg => arg.trim()).filter(arg => arg !== ''),
        ctx.i18n
      ))
      break

    case 'spreaders':
      ctx.replyWithHTML(await listSpreaders(ctx.i18n))
      break

    case 'referrals':
      ctx.replyWithHTML(await listReferrals(userId, args, ctx.i18n))
      break

    default:
      ctx.replyWithHTML(ctx.i18n('msg_help'))
      break
  }
})

bot.on(message('chat_shared'), async ctx => {
  // ctx.telegram.webhookReply = false
  const chatId = ctx.message.chat_shared.chat_id
  const requestId = ctx.message.chat_shared.request_id
  if (chatId && requestId) {
    const username = ctx.message.from.username ? `@${ctx.message.from.username}` : ctx.message.from.first_name
    const [message, cover, markup] = await showRedEnvelope(username, [requestId.toString()], ctx.i18n)
    if (cover && markup) {
      const inGroup = await checkBotInGroup(ctx, chatId)
      if (inGroup) {
        try {
          // await ctx.telegram.sendMessage(chatId, message, { ...markup, parse_mode: 'HTML' })
          await ctx.telegram.sendPhoto(chatId, { source: cover }, {
            caption: message,
            ...markup,
            parse_mode: 'HTML'
          })
          // update re is_sent receiver send_time
          // await S.updateReStatusIsSent(await createPool(), requestId, true)
          await S.updateReStatusReceiver(await createPool(), requestId, `g_${chatId}`)
          const chat = await ctx.telegram.getChat(chatId)
          if (chat.type === 'group' || chat.type === 'supergroup') {
            ctx.reply(ctx.i18n('msg_send_group', {
              id: requestId,
              group: chat.title,
            }), Markup.removeKeyboard())
          }
        } catch (error) {
          const msg = ctx.i18n('msg_send_failed_group', { botname: BOT_USERNAME })
          ctx.reply(msg, Markup.removeKeyboard())
        }
      } else {
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
    const [message, cover, markup] = await showRedEnvelope(username, [requestId.toString()], ctx.i18n)
    if (cover && markup) {
      try {
        // await ctx.telegram.sendMessage(user_ids[0], message, { ...markup, parse_mode: 'HTML' })
        await ctx.telegram.sendPhoto(user_ids[0], { source: cover }, {
          caption: message,
          ...markup,
          parse_mode: 'HTML'
        })
        // update re is_sent receiver send_time
        // await S.updateReStatusIsSent(await createPool(), requestId, true)
        const chat_member = await ctx.telegram.getChatMember(user_ids[0], user_ids[0])
        await S.updateReStatusReceiver(await createPool(), requestId, `u_${user_ids[0]}`)
        ctx.reply(ctx.i18n('msg_send_user', {
          id: requestId,
          user: chat_member.user.first_name,
        }), Markup.removeKeyboard())
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
  // collect user profile
  await S.insertUser(await createPool(), {
    uid: ctx.callbackQuery.from.id,
    username: ctx.callbackQuery.from.username,
  })

  const userId = ctx.callbackQuery.from.id
  const data = await showWallet(userId, ctx.i18n)
  ctx.replyWithHTML(data)
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

bot.action('showPreswap', ctx => {
  // ctx.telegram.webhookReply = true
  ctx.reply(ctx.i18n('msg_how_to_preswap'))
})

bot.action('showSwap', ctx => {
  // ctx.telegram.webhookReply = true
  ctx.reply(ctx.i18n('msg_how_to_swap'))
})

bot.action('showREs', async ctx => {
  // ctx.telegram.webhookReply = false
  // collect user profile
  await S.insertUser(await createPool(), {
    uid: ctx.callbackQuery.from.id,
    username: ctx.callbackQuery.from.username,
  })

  const userId = ctx.callbackQuery.from.id
  ctx.replyWithHTML(await listRedEnvelope(userId, [], ctx.i18n))
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
    try {
      if (errorWithRedEnvelopeId(code)) {
        await ctx.telegram.sendMessage(userId, ctx.i18n(code, { id: rid }))
      } else {
        await ctx.telegram.sendMessage(userId, ctx.i18n(code))
      }
    } catch (error) {
    }
    return
  }

  // snatch re
  const grab = await grabRedEnvelope(userId, firstName, [rid], ctx.i18n)
  ctx.reply(grab[1])

  // hide snatch & reply "RE snatch up"
  const isEmpty = await isRedEnvelopeEmpty(BigInt(rid))
  if (isEmpty) {
    ctx.editMessageReplyMarkup(undefined)
    ctx.reply(ctx.i18n('reapp_error_1109', { id: rid }))
    // is_done
    // await S.updateReStatusIsDone(await createPool(), Number(rid), true)
  }
})


// bot.launch()

export const callback = bot.webhookCallback(WEBHOOK_PATH, { secretToken: SECRET_TOKEN })


async function checkBotInGroup(ctx: Context, chatId: number): Promise<boolean> {
  try {
    const count = await ctx.telegram.getChatMembersCount(chatId)
    return count > 1 ? true : false
  } catch (error) {
    return false
  }
}

async function checkBotLinkUser(ctx: Context, userId: number): Promise<boolean> {
  try {
    const photos = await ctx.telegram.getUserProfilePhotos(userId)
    return photos.total_count > 0 ? true : false
  } catch (error) {
    return false
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
        { text: i18n('btn_preswap'), callback_data: "showPreswap" },
        { text: i18n('btn_swap'), callback_data: "showSwap" },
      ],
      [
        { text: i18n('btn_language'), callback_data: "switchLanguage" },
        { text: i18n('btn_help'), callback_data: "showCommandList" }
      ]
    ]
  }
}

import { Request, Response } from '@google-cloud/functions-framework'
import { createHmac } from "node:crypto";

function HMAC_SHA256(key: string | Buffer, secret: string) {
  return createHmac("sha256", key).update(secret);
}

function getCheckString(data: URLSearchParams) {
	const items: [k: string, v: string][] = [];

	// remove hash
	for (const [k, v] of data.entries()) if (k !== "hash") items.push([k, v]);

	return items.sort(([a], [b]) => a.localeCompare(b)) // sort keys
		.map(([k, v]) => `${k}=${v}`) // combine key-value pairs
		.join("\n");
}

export async function miniApp(req: Request, res: Response) {
  // Set CORS headers for preflight requests
  // Allows GETs from any origin with the Content-Type header
  // and caches preflight response for 3600s

  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
  } else {
    if (req.originalUrl === '/validate-init') {
      console.log('/validate-init');

      const data = new URLSearchParams(req.body);

      const data_check_string = getCheckString(data);
      const secret_key = HMAC_SHA256("WebAppData", BOT_TOKEN).digest();
      const hash = HMAC_SHA256(secret_key, data_check_string).digest("hex");

      if (hash === data.get("hash")) {
        // validated!
        res.send(Object.fromEntries(data.entries()));
      } else {
        res.status(403).send('');
      }
    } else {
      res.status(401).send('');
    }
  }
}

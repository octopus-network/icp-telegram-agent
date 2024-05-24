import { Markup } from "telegraf"
import { Principal } from '@dfinity/principal'
import type { ActorSubclass } from "@dfinity/agent"
import { table, getBorderCharacters } from "table"
import { TFunction } from "i18next"
import { join } from "path"
import sharp from 'sharp'
import * as crypto from 'crypto'

import { makeAgent } from '../../utils'
import { getAgentIdentity, getUserIdentity } from '../../identity'
import { createPool, getTokenBySymbol, getTokenBycanister } from '../../tokens'
import { icrc1BalanceOf, icrc1Transfer, icrc1Fee } from "../ledger/icrc1"
import { createActor } from './declarations/rbot_backend'
import { RedEnvelope } from "./declarations/rbot_backend/rbot_backend.did"
import { _SERVICE } from "./declarations/rbot_backend/rbot_backend.did"
import { stringToBigint, bigintToString } from './rbot_utils'
import * as S from "./status"


const RBOT_CANISTER_ID = process.env.RBOT_CANISTER_ID || ""
const RBOT_BOT_USERNAME = process.env.RBOT_BOT_USERNAME || ""
const TOKEN_SYMBOL = process.env.RBOT_TOKEN_SYMBOL || ""
const TOKEN_DECIMALS = process.env.RBOT_TOKEN_DECIMALS || "2"

export async function createRedEnvelope(userId: number, args: string, i18n: TFunction): Promise<[string, object?]> {
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
  // amount <= 1000000.00 && count <=255 && each re minimum 
  if (amount > 100000000n) {
    return [i18n('msg_amount_maximum')]
  }
  if (count > 1000) {
    return [i18n('msg_count_maximum')]
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
  const total = amount + fee_amount + transFee * 2n
  if (balance < total) {
    return [i18n('msg_create_insufficient', { amount: bigintToString(total, parseInt(TOKEN_DECIMALS)) })]
  }
  let ret = await icrc1Transfer(token, userId, amount, Principal.fromText(RBOT_CANISTER_ID))
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
    // assert((rid <= Number.MAX_SAFE_INTEGER && rid >= Number.MIN_SAFE_INTEGER), `Whoops ${rid} ...`)
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
    let message = i18n('msg_create', {
      id: rid.toString(),
      fee: bigintToString(fee_amount, parseInt(TOKEN_DECIMALS)),
      icrc1_fee: bigintToString(transFee * 2n, parseInt(TOKEN_DECIMALS)),
    })
    // share link
    message += '\n\n' + i18n('msg_create_share')
    message += '\n' + generateShareLink(userId, rid.toString())
    return [message, keyboard]
  }
}

export async function sendRedEnvelope(userId: number, args: string[], i18n: TFunction): Promise<[string, object?]> {
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

export async function grabRedEnvelope(userId: number, username: string, args: string[], i18n: TFunction): Promise<[string, string]> {
  const rid = Number(args[0]);
  const pool = await createPool()

  // create wallet with channel
  const userPrincipal = getUserIdentity(userId).getPrincipal()
  const wallet = { uid: userId, principal: userPrincipal.toText(), channel: rid }
  await S.insertWallet(pool, wallet)

  // insert snatch status
  await S.insertSnatchStatus(pool, { id: rid, uid: userId, code: -1, amount: 0n, discard: 0 })
  // snatch re
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.open_red_envelope(BigInt(args[0]), userPrincipal)
  if ('Err' in ret) {
    // update snatch status
    await S.updateSnatchStatus(pool, { id: rid, uid: userId, code: Number(ret['Err'][0]), amount: 0n, discard: 0 })
    const code = `reapp_error_${ret['Err'][0].toString()}`
    if (errorWithRedEnvelopeId(code)) {
      return [code, username + ' ' + i18n(code, { id: args[0] })]
    } else {
      return [code, username + ' ' + i18n(code)]
    }
  } else {
    // update snatch status
    await S.updateSnatchStatus(pool, { id: rid, uid: userId, code: 0, amount: ret['Ok'], discard: 0 })
    // amount 8888 -> 88.88
    const amount = bigintToString(ret['Ok'], parseInt(TOKEN_DECIMALS))
    let msg = i18n('msg_snatch', { username, amount, id: args[0] })
    if (await S.getWallet(pool, userId) == undefined) {
      msg += '\n' + i18n('msg_snatch_suffix', { botname: RBOT_BOT_USERNAME })
    }
    return ['reapp_error_0', msg]
  }
}

export async function revokeRedEnvelope(userId: number, args: string[], i18n: TFunction): Promise<string> {
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
      return i18n('msg_revoke', { amount: bigintToString(ret['Ok'], parseInt(TOKEN_DECIMALS)) })
    }
  } else {
    return i18n('reapp_error_1108', { id: args[0] })
  }
}

export async function listRedEnvelope(userId: number, args: string[], i18n: TFunction) {
  const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const rids = await serviceActor.get_rids_by_owner(userIdentity.getPrincipal())
  const getStatusFromCanister = async (rids: bigint[]) => {
    const status = await Promise.all(rids.map(async (rid) => {
      let amount = 0n
      let used = 0n
      const ret = await serviceActor.get_red_envelope(BigInt(rid))
      if (ret[0]?.participants) {
        amount = ret[0].amount
        used = ret[0]?.participants.reduce((total, value) => total + value[1], BigInt(0))
      }
      return { rid, amount, used }
    }))
    return status
  }

  // page
  let page = 1
  const max = Math.ceil(rids.length / 10)
  if (args.length >= 1) {
    const num = Number(args[0])
    if (num > 0 && Number.isInteger(num)) {
      page = num
    }
    if (page > max) {
      page = max
    }
  }

  // sort slice 
  const sorted = rids.sort((a, b) => Number(b) - Number(a))
  const startIndex = (page - 1) * 10
  const endIndex = page * 10
  const pageData = sorted.slice(startIndex, endIndex)
  const pageDataNumber = pageData.map(bigint => Number(bigint))
  // console.log('listRedEnvelope t1: ', (new Date()).toISOString())
  const scStatus = await getStatusFromCanister(rids)
  const dbStatus = await S.getReStatusByIds(await createPool(), pageDataNumber, userId)
  // console.log('listRedEnvelope t2: ', (new Date()).toISOString())
  const data: string[][] = []
  for (const id of pageDataNumber) {
    const scItem = scStatus.find(item => item.rid === BigInt(id))
    const dbItem = dbStatus.find(item => Number(item.id) === id)
    if (scItem) {
      const amount = scItem.amount
      const remain = scItem.amount - scItem.used
      let status = 'Unsent'
      if (dbItem) {
        if (dbItem.is_revoked) {
          status = 'Revoked'
        } else {
          // is_done
          if (BigInt((new Date()).getTime()) * 1000000n > dbItem.expire_at) {
            status = 'Expired'
          } else {
            if (dbItem.is_sent) {
              status = 'Sent'
            }
          }
        }
      }
      data.push([
        id.toString(),
        bigintToString(amount, parseInt(TOKEN_DECIMALS)),
        bigintToString(remain, parseInt(TOKEN_DECIMALS)),
        status
      ])
    }
  }
  data.unshift(['No.', 'Amount', 'Left', 'Status']);
  const tableString = table(data, { border: getBorderCharacters('ramac'), })
  let htmlString = '<b>' + i18n('msg_my_re_title') + '</b>' + '\n'
  htmlString += `<pre>${tableString}</pre>`
  if (max > 1) {
    htmlString += `\n【${page}】/【${max}】`
  }
  return htmlString
}

export async function showRedEnvelope(userName: string, args: string[], i18n: TFunction): Promise<[string, string?, object?]> {
  // const userIdentity = getUserIdentity(userId)
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.get_red_envelope(BigInt(args[0]))
  if (ret.length) {
    const cover = await RBOT_REDENVELOPE_COVER(args[0], ret[0].amount, ret[0].num)
    let htmlString = '🧧🧧🧧 ' + i18n('from') + ' <b>' + userName + '</b>' + '\n'
    htmlString += ret[0].memo
    const markup = { reply_markup: RBOT_REDENVELOPE_KEYBOARD(i18n, BigInt(args[0])) }
    return [htmlString, cover, markup]
  } else {
    return [i18n('reapp_error_1112', { id: args[0] })]
  }
}

export async function isRedEnvelopeEmpty(rid: bigint): Promise<boolean> {
  const serviceActor = await getAgentActor()
  const ret = await serviceActor.get_red_envelope(rid)
  return (ret.length && ret[0].participants.length == ret[0].num) ? true : false
}

export function errorWithRedEnvelopeId(error: string): boolean {
  const errors: string[] = [
    'reapp_error_1107', 'reapp_error_1108', 'reapp_error_1109', 'reapp_error_1110',
    'reapp_error_1112', 'reapp_error_1113', 'reapp_error_1114'
  ];
  return errors.includes(error)
}

export function generateShareLink(userId: number, rid: string) {
  const start = `snatch_${userId}_${rid}`
  const secret = process.env.SOCIALFI_AGENT_SECRET_KEY!
  const key = Buffer.from(secret.slice(0, 32), 'hex')
  const iv = Buffer.from(secret.slice(32), 'hex')
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
  let encrypted = cipher.update(start, 'utf8', 'base64url')
  encrypted += cipher.final('base64url')
  return `https://t.me/${RBOT_BOT_USERNAME}?start=${encrypted}`
}

export function parseShareLink(payload: string): string | undefined {
  const secret = process.env.SOCIALFI_AGENT_SECRET_KEY!
  const key = Buffer.from(secret.slice(0, 32), 'hex')
  const iv = Buffer.from(secret.slice(32), 'hex')
  try {
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv)
    let decrypted = decipher.update(payload, 'base64url', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    return
  }
}

async function getAgentActor(): Promise<ActorSubclass<_SERVICE>> {
  const identity = getAgentIdentity();
  const agent = await makeAgent({ fetch, identity })
  return createActor(RBOT_CANISTER_ID, { agent })
}

const RBOT_REDENVELOPE_COVER = async (id: string, amount: bigint, count: number) => {
  // remove .00 & adjust font size
  let amountStr = bigintToString(amount, parseInt(TOKEN_DECIMALS))
  if (amountStr.endsWith('.00')) {
    amountStr = amountStr.slice(0, -3);
  }
  let size = 76
  if (amountStr.length > 6) {
    size -= 8 * Math.ceil((amountStr.length - 6) / 2)
  }
  const shares = count == 1 ? '1 Share' : `${count} Shares`
  // prepare svg
  const svg = Buffer.from(`
    <svg width="680" height="480" viewBox="0 0 680 480">
      <defs>
        <font-face font-family="ProductSansBold">
          <font-src>
            <font-face-uri href="https://storage.googleapis.com/socialfi-agent/rebot/ProductSans-Bold.ttf" />
          </font-src>
        </font-face>
        <font-face font-family="ProductSansRegular">
          <font-src>
            <font-face-uri href="https://storage.googleapis.com/socialfi-agent/rebot/ProductSans-Regular.ttf" />
          </font-src>
        </font-face>
      </defs>
      <text x="32" y="48" style="font-family: 'ProductSansRegular'; font-size: 32px; fill: #a6191b;" text-anchor="start" alignment-baseline="baseline">
        No.${id}
      </text>
      <text x="340" y="210" style="font-family: 'ProductSansBold'; font-size: ${size}px; fill: #fee499;" text-anchor="middle" alignment-baseline="central">
        ${amountStr}
      </text>
      <text x="340" y="280" style="font-family: 'ProductSansRegular'; font-size: 36px; fill: #fee499;" text-anchor="middle" alignment-baseline="central">
        ${shares}
      </text>
    </svg>
  `)
  const input = join(__dirname, 'static/RE02.jpg')
  const output = `/tmp/re_${id}.jpg`
  try {
    const image = sharp(input)
    const outputBuffer = await image.composite([{ input: svg }]).toBuffer()
    await sharp(outputBuffer).toFile(output)
    return output
  } catch (error) {
    console.error('Error adding text to image:', error)
    return input
  }
}

const RBOT_SELECT_USER_GROUP_KEYBOARD = (rid: number, count: number, i18n: TFunction) => {
  if (count == 1) {
    return Markup.keyboard([
      Markup.button.userRequest(i18n('btn_select_user'), rid + 1),
      Markup.button.groupRequest(i18n('btn_select_group'), rid),
    ]).oneTime().resize()
  } else {
    return Markup.keyboard([
      // TODO:
      Markup.button.userRequest(i18n('btn_select_user'), rid + 1),
      Markup.button.groupRequest(i18n('btn_select_group'), rid),
    ]).oneTime().resize()
  }
}

const RBOT_REDENVELOPE_KEYBOARD = (i18n: TFunction, rid: bigint) => {
  return {
    inline_keyboard: [
      [
        {
          text: i18n('btn_snatch'),
          callback_data: `claimRedEnvelope_${rid.toString()}_${RBOT_BOT_USERNAME}`
          // claimRedEnvelope_999_RE00bot
          // url: `https://t.me/${RBOT_BOT_USERNAME}?start=claimRedEnvelope_${rid.toString()}`
        },
      ]
    ]
  }
}

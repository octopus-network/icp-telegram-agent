import { Request, Response } from '@google-cloud/functions-framework'
import { createPool } from '../../tokens'
import * as S from "./status"

export async function statistics(req: Request, res: Response) {
  // HTTP CORS
  const requestOrigin = req.get('Origin');
  if (requestOrigin && requestOrigin.endsWith('.omnity.network')) {
    res.set('Access-Control-Allow-Origin', requestOrigin);
  }

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET')
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    res.set('Access-Control-Max-Age', '3600')
    res.status(204).send('')
    return
  }

  const duration = 24 * 60 * 60; // 24h
  const pool = await createPool()
  const stats = await Promise.all([
    S.getWalletCount(pool),
    S.getWalletCount(pool, duration),
    S.getReCount(pool),
    S.getReCount(pool, duration),
    S.getReAmount(pool),
    S.getReAmount(pool, duration),
    S.getSnatchCount(pool),
    S.getSnatchCount(pool, duration)
  ])

  const data = JSON.stringify({
    user: {
      total: stats[0],
      "24h": stats[1],
    },
    re: {
      count: {
        total: stats[2],
        "24h": stats[3],
      },
      amount: {
        total: stats[4],
        "24h": stats[5],
      },
      snatch: {
        total: stats[6],
        "24h": stats[7],
      },
    }
  })
  res.send(data)
}

export async function spreaders(req: Request, res: Response) {
  // group
  const top = req.query.top
  let limit = 10
  if (typeof top == 'string' && /^\d+$/.test(top)) {
    limit = parseInt(top)
  }
  const raw = `
    SELECT rs.uid, count(w.uid) as c_u, count(distinct rs.id) as c_r
    FROM wallets w
    JOIN re_status rs ON w.channel = rs.id
    GROUP BY rs.uid
    ORDER BY count(w.uid) DESC
    LIMIT ?
  `
  const pool = await createPool()
  const data = await pool.raw(raw, [limit])

  // username
  const uids = data.rows.map((row: { uid: number; }) => row.uid)
  const sql2 = `SELECT uid, username FROM users WHERE uid IN (${uids.map(() => '?').join(',')})`
  const users = await pool.raw(sql2, uids)
  const userMap = new Map();
  users.rows.forEach((user: { uid: number; username: string }) => {
    userMap.set(user.uid, user.username)
  })

  let csv = 'user_id,username,user_count,re_count\n'
  for (const row of data.rows) {
    const username = userMap.get(row.uid)
    csv += `${row.uid},${username},${row.c_u},${row.c_r}\n`
  }
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'inline; filename=spreaders.csv')
  res.send(csv)
}
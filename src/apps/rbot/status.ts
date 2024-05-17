import Knex from 'knex';

/*
CREATE TABLE re_status (
  id bigint PRIMARY KEY,
  rune text NOT NULL,
  uid bigint NOT NULL,
  amount text NOT NULL,
  count int4 NOT NULL,
  expire_at text NOT NULL,
  fee_amount text NOT NULL,
  is_sent bool DEFAULT FALSE,
  is_revoked bool DEFAULT FALSE,
  is_done bool DEFAULT FALSE,
  receiver TEXT,
  send_time TIMESTAMP,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX re_status_send_time_idx ON public.re_status (send_time);
*/
export interface ReStatus {
  id: number;
  rune: string,
  uid: number;
  amount: bigint;
  count: number;
  expire_at: bigint;
  fee_amount: bigint;
  is_sent?: boolean;
  is_revoked?: boolean;
  // is_done?: boolean;
  receiver?: string;
  send_time?: Date;
  create_time?: Date;
}

export const insertReStatus = async (pool: Knex.Knex, status: ReStatus) => {
  const { amount, expire_at, fee_amount, ...rest } = status;
  const modifiedStatus = {
    ...rest,
    amount: amount.toString(),
    expire_at: expire_at.toString(),
    fee_amount: fee_amount.toString(),
  };
  await pool('re_status')
    .insert({ ...modifiedStatus })
    .onConflict('id')
    .ignore();
}

export const updateReStatusIsSent = async (pool: Knex.Knex, id: number, is_sent: boolean) => {
  await pool('re_status')
    .where('id', id)
    .update({ is_sent })
}

export const updateReStatusIsRevoked = async (pool: Knex.Knex, id: number, is_revoked: boolean) => {
  await pool('re_status')
    .where('id', id)
    .update({ is_revoked })
}

// export const updateReStatusIsDone = async (pool: Knex.Knex, id: number, is_done: boolean) => {
//   await pool('re_status')
//     .where('id', id)
//     .update({ is_done })
// }

export const updateReStatusReceiver = async (pool: Knex.Knex, id: number, receiver: string) => {
  await pool('re_status')
    .where('id', id)
    .update({ is_sent: true, receiver })
    .update({ send_time: pool.fn.now() })
}

export const getReStatus = async (pool: Knex.Knex, id: number, uid: number) => {
  return await pool('re_status')
    .where('id', id)
    .andWhere('uid', uid)
    .first() as ReStatus | undefined
}

export const getReStatusByIds = async (pool: Knex.Knex, ids: number[], uid: number) => {
  return await pool('re_status')
    .whereIn('id', ids)
    .andWhere('uid', uid)
    .orderBy('id', 'desc')
    .select() as ReStatus[]
}

export const getReCount = async (pool: Knex.Knex, duration?: number): Promise<number> => {
  let query = pool('re_status')
    .count<Record<string, number>>('id as count')
    .where('is_sent', true)

  if (duration) {
    const startTime = new Date((new Date()).getTime() - duration * 1000)
    query = query.where('send_time', '>=', startTime.toISOString())
  }

  const result = await query.first()
  return result?.count || 0
}

export const getReAmount = async (pool: Knex.Knex, duration?: number): Promise<string> => {
  let query = pool('re_status')
    .sum<Record<string, number>>({ sum: pool.raw('CAST(amount AS bigint)') })
    .where('is_sent', true)

  if (duration) {
    const startTime = new Date((new Date()).getTime() - duration * 1000)
    query = query.where('send_time', '>=', startTime.toISOString())
  }

  const result = await query.first()
  return result?.sum.toString() || '0'
}

/*
CREATE TABLE snatch_status (
  id bigint NOT NULL,
  uid bigint NOT NULL,
  code int8 DEFAULT -1 NOT NULL,
  amount text NOT NULL,
  discard int8 DEFAULT 0 NOT NULL,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_id_uid UNIQUE (id, uid)
);
CREATE INDEX snatch_status_create_time_idx ON public.snatch_status (create_time);
*/
export interface SnatchStatus {
  id: number;
  uid: number;
  code: number;
  amount: bigint;
  discard: number;
  create_time?: Date;
}

export const insertSnatchStatus = async (pool: Knex.Knex, status: SnatchStatus) => {
  const { amount, ...rest } = status;
  const modifiedStatus = {
    ...rest,
    amount: amount.toString(),
  };
  // insertedCount ?
  await pool('snatch_status')
    .insert({ ...modifiedStatus })
    .onConflict(['id', 'uid'])
    .ignore();
}

export const getSnatchStatus = async (pool: Knex.Knex, id: number, uid: number) => {
  return await pool('snatch_status')
    .where({ id, uid })
    .first() as SnatchStatus | undefined
}

export const updateSnatchStatus = async (pool: Knex.Knex, status: SnatchStatus) => {
  const { amount, ...rest } = status;
  const modifiedStatus = {
    ...rest,
    amount: amount.toString(),
  };
  await pool('snatch_status')
    .insert({ ...modifiedStatus })
    .onConflict(['id', 'uid'])
    .merge({
      code: status.code,
      amount: status.amount,
      discard: status.discard,
    });
}

export const getSnatchCount = async (pool: Knex.Knex, duration?: number): Promise<number> => {
  let query = pool('snatch_status')
    .count<Record<string, number>>({ count: '*' })

  if (duration) {
    const startTime = new Date((new Date()).getTime() - duration * 1000)
    query = query.where('create_time', '>=', startTime.toISOString())
  }

  const result = await query.first()
  return result?.count || 0
}

/*
CREATE TABLE wallets (
  uid bigint PRIMARY KEY,
  principal TEXT NOT NULL,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  channel bigint
);
CREATE INDEX wallets_create_time_idx ON public.wallets (create_time);
*/
export interface Wallet {
  uid: number;
  principal: string;
  create_time?: Date;
  channel?: number;
}

export const insertWallet = async (pool: Knex.Knex, wallet: Wallet) => {
  await pool('wallets')
    .insert({ ...wallet })
    .onConflict('uid')
    .merge({
      channel: pool.raw('COALESCE(wallets.channel, EXCLUDED.channel)'),
    })
    .whereNull('wallets.channel')
}

export const getWallet = async (pool: Knex.Knex, uid: number) => {
  return await pool('wallets')
    .where({ uid })
    .first() as Wallet | undefined
}

export const getWalletCount = async (pool: Knex.Knex, duration?: number): Promise<number> => {
  let query = pool('wallets')
    .count<Record<string, number>>('uid as count')

  if (duration) {
    const startTime = new Date((new Date()).getTime() - duration * 1000)
    query = query.where('create_time', '>=', startTime.toISOString())
  }

  const result = await query.first()
  return result?.count || 0
}


/*
CREATE TABLE users (
  uid bigint PRIMARY KEY,
  username text,
  update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
*/
export interface User {
  uid: number;
  username?: string;
  update_time?: Date;
}

export const insertUser = async (pool: Knex.Knex, user: User) => {
  await pool('users')
    .insert({ ...user })
    .onConflict(['uid'])
    .merge({
      username: user.username,
      update_time: pool.fn.now(),
    });
}
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
  send_time TIMESTAMP
);
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

/*
CREATE TABLE snatch_status (
  id bigint NOT NULL,
  uid bigint NOT NULL,
  code int8 DEFAULT -1 NOT NULL,
  amount text NOT NULL,
  discard int8 DEFAULT 0 NOT NULL,
  CONSTRAINT unique_id_uid UNIQUE (id, uid)
);
*/
export interface SnatchStatus {
  id: number;
  uid: number;
  code: number;
  amount: bigint;
  discard: number;
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

/*
CREATE TABLE wallets (
  uid bigint PRIMARY KEY,
  principal TEXT NOT NULL,
  create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
*/
export interface Wallet {
  uid: number;
  principal: string;
  create_time?: Date;
}

export const insertWallet = async (pool: Knex.Knex, wallet: Wallet) => {
  await pool('wallets')
    .insert({ ...wallet })
    .onConflict('uid')
    .ignore();
}

export const getWallet = async (pool: Knex.Knex, uid: number) => {
  return await pool('wallets')
    .where({ uid })
    .first() as Wallet | undefined
}
import Knex from 'knex';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector'

export const createPool = async () => {
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.DB_INSTANCE_CONNECTION_NAME || "",
    ipType: IpAddressTypes.PUBLIC,
  });

  const dbConfig = {
    client: 'pg',
    connection: {
      ...clientOpts,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    },
    pool: {
      max: 5,
      min: 5,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
      createRetryIntervalMillis: 200,
    }
  };
  const knex = Knex(dbConfig)
  try {
    await knex.raw('SELECT now()')
    return knex
  } catch (error) {
    throw new Error('Unable to connect to Postgres via Knex. Ensure a valid connection.')
  }
};

export interface Token {
  symbol: string;
  canister: string;
  re_maximum: bigint;
  re_minimum: bigint;
  re_minimum_each: bigint;
  fee_ratio: number;
  fee_address: string;
  createTime?: Date;
  updateTime?: Date;
}

export const insertToken = async (pool: Knex.Knex, token: Token) => {
  const [symbol] = await pool('tokens')
    .insert({ token }, ['symbol'])
    .onConflict('symbol')
    .ignore();
  return symbol;
}

export const getTokens = async (pool: Knex.Knex) => {
  return await pool
    .select()
    .from('tokens')
    .orderBy('symbol') as Token[];
}

export const getTokenBySymbol = async (pool: Knex.Knex, symbol: string) => {
  return await pool
    .select()
    .from('tokens')
    .where({ symbol })
    .first() as Token | undefined;
}

export const getTokenBycanister = async (pool: Knex.Knex, canister: string) => {
  return await pool
    .select()
    .from('tokens')
    .where({ canister })
    .first() as Token | undefined;
}

export const updateToken = async (pool: Knex.Knex, token: Token) => {
  const { symbol, canister } = token;
  return await pool('tokens')
    .where({ symbol })
    .update({ canister, updatetime: pool.raw('DEFAULT') }); // TODO
}

export const deleteToken = async (pool: Knex.Knex, symbol: string) => {
  return await pool('tokens')
    .where({ symbol })
    .delete();
}


// CREATE TABLE tokens (
//   symbol TEXT PRIMARY KEY,
//   canister TEXT NOT NULL,
//   re_maximum TEXT NOT NULL,
//   re_minimum TEXT NOT NULL,
//   re_minimum_each TEXT NOT NULL,
//   fee_ratio number NOT NULL,
//   fee_address TEXT NOT NULL,
//   createTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
//   updateTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
// );
import Knex from 'knex';
import { Context } from "telegraf";
import i18next from 'i18next';
import type { TFunction } from 'i18next';
import en from './locales/en.json'
import zh from './locales/zh-cn.json'

i18next
  .init({
    debug: true,
    lng: 'en',
    fallbackLng: 'en',
    resources: { en, zh }
  });

export interface I18nContext extends Context {
  i18n: TFunction
}

export default i18next

// TODO: locales
// TODO: language switch

export interface RbotSettings {
  userid: number;
  language: string; // en zh
}

export const getLanguage = async (pool: Knex.Knex, userid: number) => {
  const settings = await pool
    .select()
    .from('rbot_settings')
    .where({ userid })
    .first() as RbotSettings | undefined;
  if (settings) {
    return settings.language
  } else {
    return 'en'
  }
}

export const setLanguage = async (pool: Knex.Knex, userid: number, language: string) => {
  await pool('rbot_settings')
    .insert({ userid, language })
    .onConflict('userid')
    .merge()
}

// CREATE TABLE rbot_settings (
//   userid bigint PRIMARY KEY,
//   language TEXT NOT NULL
// );
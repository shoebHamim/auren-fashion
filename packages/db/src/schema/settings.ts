import { sql } from 'drizzle-orm';
import { boolean, char, check, integer, jsonb, pgTable, smallint, text } from 'drizzle-orm/pg-core';
import { money, timestamps } from '../columns';

export type StoreAddress = {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  countryCode: string;
};

/** Singleton row (id = 1) holding store-wide configuration (PLAN §8.3 "Pricing & tax"). */
export const storeSettings = pgTable(
  'store_settings',
  {
    id: smallint().primaryKey().default(1),
    storeName: text().notNull().default('Auren'),
    legalName: text(),
    taxRegistrationId: text(),
    address: jsonb().$type<StoreAddress>(),
    email: text(),
    phone: text(),
    // Placeholder until Q1 (country/currency) is answered; locked once orders exist.
    currency: char({ length: 3 }).notNull().default('USD'),
    currencyExponent: smallint().notNull().default(2),
    timezone: text().notNull().default('UTC'),
    orderNumberPrefix: text().notNull().default('AU'),
    returnWindowDays: integer().notNull().default(14),
    lowStockDefault: integer().notNull().default(3),
    paymentHoldMinutes: integer().notNull().default(30),
    unpaidOrderCancelHours: integer().notNull().default(24),
    codEnabled: boolean().notNull().default(true),
    codMaxOrderAmount: money(),
    codRequiresReview: boolean().notNull().default(false),
    version: integer().notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    check('store_settings_singleton', sql`${t.id} = 1`),
    check('store_settings_currency_exponent', sql`${t.currencyExponent} BETWEEN 0 AND 4`),
    check(
      'store_settings_cod_max_positive',
      sql`${t.codMaxOrderAmount} IS NULL OR ${t.codMaxOrderAmount} > 0`,
    ),
    check(
      'store_settings_positive_windows',
      sql`${t.returnWindowDays} >= 0 AND ${t.lowStockDefault} >= 0 AND ${t.paymentHoldMinutes} > 0 AND ${t.unpaidOrderCancelHours} > 0`,
    ),
  ],
);

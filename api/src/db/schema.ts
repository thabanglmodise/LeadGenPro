import {
  pgTable,
  uuid,
  text,
  doublePrecision,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  biz_name: text('biz_name'),
  full_name: text('full_name'),
  role: text('role'),
  offering: text('offering'),
  benefits: text('benefits'),
  website: text('website'),
  phone: text('phone'),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  type: text('type'),
  types: jsonb('types').$type<string[]>().default([]),
  rating: doublePrecision('rating'),
  total_ratings: integer('total_ratings').default(0),
  place_id: text('place_id'),
  website: text('website'),
  phone: text('phone'),
  contact_name: text('contact_name'),
  contact_email: text('contact_email'),
  ai_score: text('ai_score'),
  ai_reason: text('ai_reason'),
  offering: text('offering'),
  status: text('status').notNull().default('new'),
  created_at: timestamp('created_at').defaultNow(),
});

export const sent_emails = pgTable('sent_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  to_email: text('to_email').notNull(),
  subject: text('subject'),
  body: text('body'),
  sent_at: timestamp('sent_at').defaultNow(),
});

export const user_config = pgTable('user_config', {
  id: uuid('id').primaryKey(),
  gp_key: text('gp_key'),
  cl_key: text('cl_key'),
  gm_email: text('gm_email'),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const activity_log = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  message: text('message').notNull(),
  created_at: timestamp('created_at').defaultNow(),
});

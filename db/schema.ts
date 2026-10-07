import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull(),
  phone: text('phone').notNull(), date: text('date').notNull(), time: text('time').notNull(),
  duration: text('duration').notNull(), eventType: text('event_type').notNull(),
  location: text('location').notNull(), notes: text('notes').notNull(),
  status: text('status').notNull().default('pending'), createdAt: text('created_at').notNull(),
});
export const content = sqliteTable('content', { id: text('id').primaryKey(), value: text('value').notNull() });

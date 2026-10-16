import { pgTable, text } from 'drizzle-orm/pg-core';
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull(),
  phone: text('phone').notNull(), date: text('date').notNull(), time: text('time').notNull(),
  duration: text('duration').notNull(), eventType: text('event_type').notNull(),
  location: text('location').notNull(), notes: text('notes').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'declined', 'cancelled'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
});
export const content = pgTable('content', { id: text('id').primaryKey(), value: text('value').notNull() });

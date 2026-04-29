import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { donorsTable } from "./donors";
import { hospitalsTable } from "./hospitals";
import { appealsTable } from "./appeals";

export const donationsTable = pgTable("donations", {
  id: serial("id").primaryKey(),
  donorId: integer("donor_id").notNull().references(() => donorsTable.id),
  hospitalId: integer("hospital_id").notNull().references(() => hospitalsTable.id),
  appealId: integer("appeal_id").notNull().references(() => appealsTable.id),
  bloodType: text("blood_type").notNull(),
  status: text("status", { enum: ["confirmed", "collected", "screened", "transfused"] }).default("confirmed").notNull(),
  donatedAt: timestamp("donated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDonationSchema = createInsertSchema(donationsTable).omit({ id: true, donatedAt: true, updatedAt: true });
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donationsTable.$inferSelect;

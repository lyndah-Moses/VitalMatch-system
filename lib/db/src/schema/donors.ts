import { pgTable, text, serial, timestamp, boolean, doublePrecision, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const donorsTable = pgTable("donors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  phone: text("phone").notNull(),
  bloodType: text("blood_type", { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }).notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  lastDonationDate: timestamp("last_donation_date"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  totalDonations: integer("total_donations").default(0).notNull(),
  badges: text("badges").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDonorSchema = createInsertSchema(donorsTable).omit({ id: true, createdAt: true });
export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donor = typeof donorsTable.$inferSelect;

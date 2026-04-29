import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hospitalsTable } from "./hospitals";

export const appealsTable = pgTable("appeals", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull().references(() => hospitalsTable.id),
  bloodType: text("blood_type", { enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }).notNull(),
  quantity: integer("quantity").notNull(),
  emergencyLevel: text("emergency_level", { enum: ["critical", "urgent", "standard"] }).notNull(),
  status: text("status", { enum: ["active", "fulfilled", "cancelled"] }).default("active").notNull(),
  description: text("description"),
  acceptedCount: integer("accepted_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertAppealSchema = createInsertSchema(appealsTable).omit({ id: true, createdAt: true });
export type InsertAppeal = z.infer<typeof insertAppealSchema>;
export type Appeal = typeof appealsTable.$inferSelect;

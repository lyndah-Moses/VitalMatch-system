import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appealsTable } from "./appeals";
import { donorsTable } from "./donors";

export const appealResponsesTable = pgTable("appeal_responses", {
  id: serial("id").primaryKey(),
  appealId: integer("appeal_id").notNull().references(() => appealsTable.id),
  donorId: integer("donor_id").notNull().references(() => donorsTable.id),
  action: text("action", { enum: ["accept", "decline"] }).notNull(),
  token: text("token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  appointmentDate: timestamp("appointment_date"),
  journeyStatus: text("journey_status", { enum: ["accepted", "scheduled", "arrived", "donated", "completed"] }).default("accepted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAppealResponseSchema = createInsertSchema(appealResponsesTable).omit({ id: true, createdAt: true });
export type InsertAppealResponse = z.infer<typeof insertAppealResponseSchema>;
export type AppealResponse = typeof appealResponsesTable.$inferSelect;

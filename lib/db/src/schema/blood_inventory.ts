import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { hospitalsTable } from "./hospitals";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const bloodInventoryTable = pgTable("blood_inventory", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id").notNull().references(() => hospitalsTable.id),
  bloodType: text("blood_type", { enum: BLOOD_TYPES }).notNull(),
  units: integer("units").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BloodInventory = typeof bloodInventoryTable.$inferSelect;

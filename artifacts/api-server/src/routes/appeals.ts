import { Router } from "express";
import { db } from "@workspace/db";
import { appealsTable, hospitalsTable, donorsTable, usersTable, appealResponsesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, AuthRequest, signToken } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/", async (req: AuthRequest, res) => {
  if (req.user!.role !== "hospital") { res.status(403).json({ error: "Only hospitals can create appeals" }); return; }
  const { bloodType, quantity, emergencyLevel, description } = req.body;
  if (!bloodType || !quantity || !emergencyLevel) {
    res.status(400).json({ error: "bloodType, quantity, and emergencyLevel are required" });
    return;
  }
  const [hospital] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.userId, req.user!.userId)).limit(1);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [appeal] = await db.insert(appealsTable).values({
    hospitalId: hospital.id, bloodType, quantity, emergencyLevel, description: description || null, expiresAt, acceptedCount: 0
  }).returning();
  res.status(201).json(appeal);
});

router.get("/nearby", async (req: AuthRequest, res) => {
  if (req.user!.role !== "donor") { res.status(403).json({ error: "Only donors can view nearby appeals" }); return; }
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const appeals = await db.select({
    id: appealsTable.id,
    hospitalId: appealsTable.hospitalId,
    bloodType: appealsTable.bloodType,
    quantity: appealsTable.quantity,
    emergencyLevel: appealsTable.emergencyLevel,
    status: appealsTable.status,
    description: appealsTable.description,
    acceptedCount: appealsTable.acceptedCount,
    createdAt: appealsTable.createdAt,
    expiresAt: appealsTable.expiresAt,
    hospitalName: hospitalsTable.name,
    hospitalAddress: hospitalsTable.address,
    hospitalPhone: hospitalsTable.phone,
    hospitalLatitude: hospitalsTable.latitude,
    hospitalLongitude: hospitalsTable.longitude,
  }).from(appealsTable)
    .innerJoin(hospitalsTable, eq(appealsTable.hospitalId, hospitalsTable.id))
    .where(eq(appealsTable.status, "active"));

  const compatibleTypes: Record<string, string[]> = {
    "O-": ["O-"], "O+": ["O-", "O+"], "A-": ["O-", "A-"], "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"], "B+": ["O-", "O+", "B-", "B+"], "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  };
  const donorCompatible = compatibleTypes[donor.bloodType] || [donor.bloodType];
  const filtered = appeals.filter(a => donorCompatible.includes(a.bloodType));
  const R = 6371;
  const result = filtered.map(a => {
    let distanceKm: number | null = null;
    let travelTimeMins: number | null = null;
    if (donor.latitude && donor.longitude && a.hospitalLatitude && a.hospitalLongitude) {
      const dLat = ((a.hospitalLatitude - donor.latitude) * Math.PI) / 180;
      const dLon = ((a.hospitalLongitude - donor.longitude) * Math.PI) / 180;
      const x = Math.sin(dLat / 2) ** 2 + Math.cos((donor.latitude * Math.PI) / 180) * Math.cos((a.hospitalLatitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      distanceKm = Math.round(2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 100) / 100;
      // Nairobi traffic average ~25 km/h
      travelTimeMins = Math.round((distanceKm / 25) * 60);
    }
    return { ...a, distanceKm, travelTimeMins };
  });
  res.json(donor.latitude ? result.filter(a => a.distanceKm === null || a.distanceKm <= 50) : result);
});

router.get("/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const [appeal] = await db.select({
    id: appealsTable.id, hospitalId: appealsTable.hospitalId, bloodType: appealsTable.bloodType,
    quantity: appealsTable.quantity, emergencyLevel: appealsTable.emergencyLevel, status: appealsTable.status,
    description: appealsTable.description, acceptedCount: appealsTable.acceptedCount,
    createdAt: appealsTable.createdAt, expiresAt: appealsTable.expiresAt,
    hospitalName: hospitalsTable.name, hospitalAddress: hospitalsTable.address,
    hospitalLatitude: hospitalsTable.latitude, hospitalLongitude: hospitalsTable.longitude,
    hospitalPhone: hospitalsTable.phone,
  }).from(appealsTable).innerJoin(hospitalsTable, eq(appealsTable.hospitalId, hospitalsTable.id)).where(eq(appealsTable.id, id)).limit(1);
  if (!appeal) { res.status(404).json({ error: "Appeal not found" }); return; }
  res.json({ ...appeal, distanceKm: null, travelTimeMins: null });
});

router.patch("/:id", async (req: AuthRequest, res) => {
  if (req.user!.role !== "hospital") { res.status(403).json({ error: "Only hospitals can update appeals" }); return; }
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const [updated] = await db.update(appealsTable).set({ status }).where(eq(appealsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Appeal not found" }); return; }
  res.json(updated);
});

router.post("/:id/respond", async (req: AuthRequest, res) => {
  if (req.user!.role !== "donor") { res.status(403).json({ error: "Only donors can respond to appeals" }); return; }
  const appealId = parseInt(req.params.id);
  const { action, appointmentDate } = req.body;
  if (!action || !["accept", "decline"].includes(action)) {
    res.status(400).json({ error: "action must be accept or decline" });
    return;
  }
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const [appeal] = await db.select().from(appealsTable).where(eq(appealsTable.id, appealId)).limit(1);
  if (!appeal) { res.status(404).json({ error: "Appeal not found" }); return; }
  let token = null;
  let tokenExpiresAt = null;
  let journeyStatus: "accepted" | "scheduled" | "arrived" | "donated" | "completed" = "accepted";
  if (action === "accept") {
    tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    token = signToken({
      type: "donor_visit",
      donorId: donor.id,
      hospitalId: appeal.hospitalId,
      appealId: appeal.id,
      exp: Math.floor(tokenExpiresAt.getTime() / 1000)
    });
    if (appointmentDate) {
      journeyStatus = "scheduled";
    }
    await db.update(appealsTable).set({ acceptedCount: appeal.acceptedCount + 1 }).where(eq(appealsTable.id, appealId));
  }
  const parsedAppointment = appointmentDate ? new Date(appointmentDate) : null;
  const [response] = await db.insert(appealResponsesTable).values({
    appealId, donorId: donor.id, action, token, tokenExpiresAt,
    appointmentDate: parsedAppointment,
    journeyStatus: action === "accept" ? journeyStatus : undefined,
  }).returning();
  res.json(response);
});

export default router;

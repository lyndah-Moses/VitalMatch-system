import { Router } from "express";
import { db } from "@workspace/db";
import {
  hospitalsTable, usersTable, donorsTable, appealsTable, donationsTable,
  appealResponsesTable, bloodInventoryTable
} from "@workspace/db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../lib/auth.js";
import { verifyToken as verifyJwt } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("hospital"));

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

async function getHospital(userId: number) {
  const [h] = await db.select().from(hospitalsTable).where(eq(hospitalsTable.userId, userId)).limit(1);
  return h;
}

async function ensureInventory(hospitalId: number) {
  const existing = await db.select().from(bloodInventoryTable).where(eq(bloodInventoryTable.hospitalId, hospitalId));
  const existingTypes = new Set(existing.map(i => i.bloodType));
  const missing = BLOOD_TYPES.filter(bt => !existingTypes.has(bt));
  if (missing.length > 0) {
    await db.insert(bloodInventoryTable).values(
      missing.map(bloodType => ({
        hospitalId,
        bloodType,
        units: Math.floor(Math.random() * 12) + 1,
      }))
    );
  }
}

router.get("/me", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  res.json({ ...hospital, email: user.email, verified: true });
});

router.patch("/me", async (req: AuthRequest, res) => {
  const { phone, address, latitude, longitude } = req.body;
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const updates: Partial<typeof hospitalsTable.$inferInsert> = {};
  if (phone) updates.phone = phone;
  if (address) updates.address = address;
  if (latitude != null) updates.latitude = latitude;
  if (longitude != null) updates.longitude = longitude;
  const [updated] = await db.update(hospitalsTable).set(updates).where(eq(hospitalsTable.id, hospital.id)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  res.json({ ...updated, email: user.email });
});

router.get("/me/appeals", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const appeals = await db.select().from(appealsTable).where(eq(appealsTable.hospitalId, hospital.id));
  res.json(appeals);
});

// Appointments: all accepted donor responses for this hospital's appeals
router.get("/me/appointments", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const rows = await db.select({
    responseId: appealResponsesTable.id,
    donorId: donorsTable.id,
    donorUserId: donorsTable.userId,
    bloodType: donorsTable.bloodType,
    totalDonations: donorsTable.totalDonations,
    appealId: appealResponsesTable.appealId,
    appealBloodType: appealsTable.bloodType,
    token: appealResponsesTable.token,
    journeyStatus: appealResponsesTable.journeyStatus,
    appointmentDate: appealResponsesTable.appointmentDate,
    createdAt: appealResponsesTable.createdAt,
  })
  .from(appealResponsesTable)
  .innerJoin(appealsTable, eq(appealResponsesTable.appealId, appealsTable.id))
  .innerJoin(donorsTable, eq(appealResponsesTable.donorId, donorsTable.id))
  .where(and(
    eq(appealsTable.hospitalId, hospital.id),
    eq(appealResponsesTable.action, "accept")
  ))
  .orderBy(desc(appealResponsesTable.createdAt));

  const userIds = [...new Set(rows.map(r => r.donorUserId))];
  const users = userIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(inArray(usersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, { name: u.name, email: u.email }]));

  res.json(rows.map(r => ({
    responseId: r.responseId,
    donorId: r.donorId,
    donorName: userMap[r.donorUserId]?.name || "Donor",
    bloodType: r.bloodType,
    totalDonations: r.totalDonations,
    appealId: r.appealId,
    appealBloodType: r.appealBloodType,
    journeyStatus: r.journeyStatus || "accepted",
    appointmentDate: r.appointmentDate?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
  })));
});

// Update appointment journey status
router.patch("/me/appointments/:responseId", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const responseId = parseInt(req.params.responseId);
  const { journeyStatus } = req.body;
  const validStatuses = ["accepted", "scheduled", "arrived", "donated", "completed"];
  if (!validStatuses.includes(journeyStatus)) {
    res.status(400).json({ error: "Invalid journeyStatus" }); return;
  }

  // Verify this response belongs to this hospital
  const [response] = await db.select({
    responseId: appealResponsesTable.id,
    donorId: appealResponsesTable.donorId,
    appealId: appealResponsesTable.appealId,
    hospitalId: appealsTable.hospitalId,
  })
  .from(appealResponsesTable)
  .innerJoin(appealsTable, eq(appealResponsesTable.appealId, appealsTable.id))
  .where(and(
    eq(appealResponsesTable.id, responseId),
    eq(appealsTable.hospitalId, hospital.id)
  ))
  .limit(1);

  if (!response) { res.status(404).json({ error: "Appointment not found" }); return; }

  await db.update(appealResponsesTable)
    .set({ journeyStatus: journeyStatus as any })
    .where(eq(appealResponsesTable.id, responseId));

  // If marking as completed or donated, update donor stats
  if (journeyStatus === "completed" || journeyStatus === "donated") {
    const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.id, response.donorId)).limit(1);
    if (donor) {
      const badges = [...(donor.badges || [])];
      const newTotal = donor.totalDonations + 1;
      if (newTotal >= 1 && !badges.includes("First Donor")) badges.push("First Donor");
      if (newTotal >= 3 && !badges.includes("Silver Donor")) badges.push("Silver Donor");
      if (newTotal >= 10 && !badges.includes("Gold Donor")) badges.push("Gold Donor");

      await db.update(donorsTable).set({
        totalDonations: newTotal,
        lastDonationDate: new Date(),
        badges,
      }).where(eq(donorsTable.id, response.donorId));

      // Create a donation record
      await db.insert(donationsTable).values({
        donorId: response.donorId,
        hospitalId: hospital.id,
        appealId: response.appealId,
        bloodType: donor.bloodType,
        status: journeyStatus === "completed" ? "transfused" : "confirmed",
      }).onConflictDoNothing();
    }
  }

  res.json({ success: true, journeyStatus });
});

// Blood inventory
router.get("/me/inventory", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  await ensureInventory(hospital.id);
  const inventory = await db.select().from(bloodInventoryTable)
    .where(eq(bloodInventoryTable.hospitalId, hospital.id))
    .orderBy(bloodInventoryTable.bloodType);
  res.json(inventory);
});

router.patch("/me/inventory/:bloodType", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const { bloodType } = req.params;
  const { units } = req.body;
  if (typeof units !== "number" || units < 0) {
    res.status(400).json({ error: "units must be a non-negative number" }); return;
  }
  await ensureInventory(hospital.id);
  const [row] = await db.select().from(bloodInventoryTable)
    .where(and(eq(bloodInventoryTable.hospitalId, hospital.id), eq(bloodInventoryTable.bloodType, bloodType as any)))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Blood type not found" }); return; }
  const [updated] = await db.update(bloodInventoryTable)
    .set({ units, updatedAt: new Date() })
    .where(eq(bloodInventoryTable.id, row.id))
    .returning();
  res.json(updated);
});

router.get("/me/donors-map", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const donors = await db.select({
    id: donorsTable.id,
    userId: donorsTable.userId,
    bloodType: donorsTable.bloodType,
    latitude: donorsTable.latitude,
    longitude: donorsTable.longitude,
    totalDonations: donorsTable.totalDonations,
  }).from(donorsTable).where(
    and(
      sql`${donorsTable.latitude} IS NOT NULL`,
      sql`${donorsTable.longitude} IS NOT NULL`
    )
  );
  const R = 6371;
  const nearby = donors
    .map(d => {
      const dLat = ((d.latitude! - hospital.latitude) * Math.PI) / 180;
      const dLon = ((d.longitude! - hospital.longitude) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos((hospital.latitude * Math.PI) / 180) * Math.cos((d.latitude! * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      const distanceKm = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...d, distanceKm };
    })
    .filter(d => d.distanceKm <= 10);

  const userIds = nearby.map(d => d.userId);
  const users = userIds.length > 0 ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds)) : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
  res.json(nearby.map(d => ({
    id: d.id,
    name: userMap[d.userId] || "Donor",
    bloodType: d.bloodType,
    latitude: d.latitude!,
    longitude: d.longitude!,
    distanceKm: Math.round(d.distanceKm * 100) / 100,
    totalDonations: d.totalDonations,
    isFrequent: d.totalDonations >= 3,
  })));
});

router.get("/me/stats", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const appeals = await db.select().from(appealsTable).where(eq(appealsTable.hospitalId, hospital.id));
  const totalAppeals = appeals.length;
  const activeAppeals = appeals.filter(a => a.status === "active").length;
  const donations = await db.select().from(donationsTable).where(eq(donationsTable.hospitalId, hospital.id));
  const totalDonationsReceived = donations.length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const donationsThisMonth = donations.filter(d => new Date(d.donatedAt || d.updatedAt) >= monthStart).length;
  const bloodTypeBreakdown: Record<string, number> = {};
  for (const d of donations) {
    bloodTypeBreakdown[d.bloodType] = (bloodTypeBreakdown[d.bloodType] || 0) + 1;
  }
  res.json({
    totalAppeals,
    activeAppeals,
    totalDonationsReceived,
    donationsThisMonth,
    avgResponseTimeMinutes: 25,
    bloodTypeBreakdown: Object.entries(bloodTypeBreakdown).map(([bloodType, count]) => ({ bloodType, count })),
  });
});

router.post("/me/verify-donor", async (req: AuthRequest, res) => {
  const hospital = await getHospital(req.user!.userId);
  if (!hospital) { res.status(404).json({ error: "Hospital not found" }); return; }
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: "Token is required" }); return; }
  const payload = verifyJwt(token);
  if (!payload || !(payload as any).type || (payload as any).type !== "donor_visit") {
    res.status(400).json({ error: "Invalid or expired token" });
    return;
  }
  const tokenData = payload as any;
  if (tokenData.hospitalId !== hospital.id) {
    res.status(400).json({ error: "Token not valid for this hospital" });
    return;
  }
  const [response] = await db.select().from(appealResponsesTable).where(
    and(eq(appealResponsesTable.token, token), eq(appealResponsesTable.donorId, tokenData.donorId))
  ).limit(1);
  if (!response) { res.status(400).json({ error: "Token not found" }); return; }
  if (response.tokenExpiresAt && response.tokenExpiresAt < new Date()) {
    res.status(400).json({ error: "Token has expired" });
    return;
  }
  // Mark as arrived
  await db.update(appealResponsesTable)
    .set({ journeyStatus: "arrived" })
    .where(eq(appealResponsesTable.id, response.id));

  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.id, tokenData.donorId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, donor.userId)).limit(1);
  const [appeal] = await db.select().from(appealsTable).where(eq(appealsTable.id, tokenData.appealId)).limit(1);
  const [donation] = await db.insert(donationsTable).values({
    donorId: donor.id, hospitalId: hospital.id, appealId: appeal.id, bloodType: donor.bloodType, status: "confirmed"
  }).returning();
  await db.update(donorsTable).set({ lastDonationDate: new Date() }).where(eq(donorsTable.id, donor.id));
  const badges = [...donor.badges];
  const newTotal = donor.totalDonations + 1;
  if (newTotal >= 1 && !badges.includes("First Donor")) badges.push("First Donor");
  if (newTotal >= 3 && !badges.includes("Silver Donor")) badges.push("Silver Donor");
  if (newTotal >= 10 && !badges.includes("Gold Donor")) badges.push("Gold Donor");
  if (appeal.emergencyLevel === "critical" && !badges.includes("Emergency Responder")) badges.push("Emergency Responder");
  await db.update(donorsTable).set({ totalDonations: newTotal, badges }).where(eq(donorsTable.id, donor.id));
  res.json({
    valid: true,
    donor: { ...donor, name: user.name, email: user.email, isEligible: true, lastDonationDate: donor.lastDonationDate?.toISOString() || null },
    appeal,
    donationId: donation.id
  });
});

export default router;

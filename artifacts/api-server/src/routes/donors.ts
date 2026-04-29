import { Router } from "express";
import { db } from "@workspace/db";
import { donorsTable, usersTable, donationsTable, hospitalsTable, appealResponsesTable, appealsTable } from "@workspace/db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("donor"));

router.get("/me", async (req: AuthRequest, res) => {
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  const daysSinceLastDonation = donor.lastDonationDate
    ? (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24)
    : null;
  const isEligible = daysSinceLastDonation === null || daysSinceLastDonation >= 56;
  const cooldownDaysLeft = !isEligible && daysSinceLastDonation !== null
    ? Math.ceil(56 - daysSinceLastDonation)
    : 0;
  res.json({
    ...donor,
    name: user.name,
    email: user.email,
    isEligible,
    cooldownDaysLeft,
    daysSinceLastDonation: daysSinceLastDonation ? Math.floor(daysSinceLastDonation) : null,
    lastDonationDate: donor.lastDonationDate ? donor.lastDonationDate.toISOString() : null,
    createdAt: donor.createdAt.toISOString(),
  });
});

router.patch("/me", async (req: AuthRequest, res) => {
  const { phone, latitude, longitude, lastDonationDate } = req.body;
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const updates: Partial<typeof donorsTable.$inferInsert> = {};
  if (phone) updates.phone = phone;
  if (latitude != null) updates.latitude = latitude;
  if (longitude != null) updates.longitude = longitude;
  if (lastDonationDate) updates.lastDonationDate = new Date(lastDonationDate);
  const [updated] = await db.update(donorsTable).set(updates).where(eq(donorsTable.id, donor.id)).returning();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  const isEligible = updated.lastDonationDate
    ? (Date.now() - new Date(updated.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24) >= 56
    : true;
  res.json({ ...updated, name: user.name, email: user.email, isEligible, lastDonationDate: updated.lastDonationDate?.toISOString() || null });
});

router.get("/me/donations", async (req: AuthRequest, res) => {
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const donations = await db.select({
    id: donationsTable.id,
    donorId: donationsTable.donorId,
    hospitalId: donationsTable.hospitalId,
    hospitalName: hospitalsTable.name,
    appealId: donationsTable.appealId,
    bloodType: donationsTable.bloodType,
    status: donationsTable.status,
    donatedAt: donationsTable.donatedAt,
    updatedAt: donationsTable.updatedAt,
  }).from(donationsTable)
    .innerJoin(hospitalsTable, eq(donationsTable.hospitalId, hospitalsTable.id))
    .where(eq(donationsTable.donorId, donor.id))
    .orderBy(desc(donationsTable.donatedAt));
  res.json(donations);
});

router.get("/me/token", async (req: AuthRequest, res) => {
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const [response] = await db.select({
    id: appealResponsesTable.id,
    token: appealResponsesTable.token,
    tokenExpiresAt: appealResponsesTable.tokenExpiresAt,
    appointmentDate: appealResponsesTable.appointmentDate,
    journeyStatus: appealResponsesTable.journeyStatus,
    appealId: appealResponsesTable.appealId,
    hospitalId: appealsTable.hospitalId,
    hospitalName: hospitalsTable.name,
    hospitalAddress: hospitalsTable.address,
    hospitalPhone: hospitalsTable.phone,
    hospitalLatitude: hospitalsTable.latitude,
    hospitalLongitude: hospitalsTable.longitude,
    bloodType: appealsTable.bloodType,
  }).from(appealResponsesTable)
    .innerJoin(appealsTable, eq(appealResponsesTable.appealId, appealsTable.id))
    .innerJoin(hospitalsTable, eq(appealsTable.hospitalId, hospitalsTable.id))
    .where(eq(appealResponsesTable.donorId, donor.id))
    .orderBy(desc(appealResponsesTable.createdAt))
    .limit(1);
  if (!response || !response.token) {
    res.status(404).json({ error: "No active accepted appeal" });
    return;
  }
  res.json({
    token: response.token,
    donorId: donor.id,
    hospitalId: response.hospitalId,
    hospitalName: response.hospitalName,
    hospitalAddress: response.hospitalAddress,
    hospitalPhone: response.hospitalPhone,
    hospitalLatitude: response.hospitalLatitude,
    hospitalLongitude: response.hospitalLongitude,
    appealId: response.appealId,
    bloodType: response.bloodType,
    appointmentDate: response.appointmentDate?.toISOString() || null,
    journeyStatus: response.journeyStatus || "accepted",
    expiresAt: response.tokenExpiresAt?.toISOString() || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    qrData: JSON.stringify({ token: response.token, donorId: donor.id }),
  });
});

router.get("/me/accepted-appeals", async (req: AuthRequest, res) => {
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const responses = await db.select({
    id: appealResponsesTable.id,
    appealId: appealResponsesTable.appealId,
    journeyStatus: appealResponsesTable.journeyStatus,
    createdAt: appealResponsesTable.createdAt,
  }).from(appealResponsesTable)
    .where(and(
      eq(appealResponsesTable.donorId, donor.id),
      eq(appealResponsesTable.status, "accepted")
    ))
    .orderBy(desc(appealResponsesTable.createdAt));
  res.json(responses.map(r => ({
    appealId: r.appealId,
    responseId: r.id,
    journeyStatus: r.journeyStatus || "accepted",
  })));
});

router.patch("/me/appointment/cancel", async (req: AuthRequest, res) => {
  const [donor] = await db.select().from(donorsTable).where(eq(donorsTable.userId, req.user!.userId)).limit(1);
  if (!donor) { res.status(404).json({ error: "Donor not found" }); return; }
  const [active] = await db.select({
    id: appealResponsesTable.id,
    appealId: appealResponsesTable.appealId,
    journeyStatus: appealResponsesTable.journeyStatus,
  }).from(appealResponsesTable)
    .where(and(
      eq(appealResponsesTable.donorId, donor.id),
      eq(appealResponsesTable.status, "accepted")
    ))
    .orderBy(desc(appealResponsesTable.createdAt))
    .limit(1);
  if (!active) { res.status(404).json({ error: "No active appointment to cancel" }); return; }
  if (["arrived", "donated", "completed"].includes(active.journeyStatus || "")) {
    res.status(400).json({ error: "Cannot cancel — donation already in progress" });
    return;
  }
  await db.update(appealResponsesTable)
    .set({ status: "cancelled" as any, journeyStatus: "cancelled" as any })
    .where(eq(appealResponsesTable.id, active.id));
  await db.update(appealsTable)
    .set({ status: "open" })
    .where(eq(appealsTable.id, active.appealId));
  res.json({ message: "Appointment cancelled. Slot reopened for other donors." });
});

router.get("/me/leaderboard", async (req: AuthRequest, res) => {
  const donors = await db.select({
    id: donorsTable.id,
    userId: donorsTable.userId,
    bloodType: donorsTable.bloodType,
    totalDonations: donorsTable.totalDonations,
    badges: donorsTable.badges,
  }).from(donorsTable).orderBy(desc(donorsTable.totalDonations)).limit(20);
  const userIds = donors.map(d => d.userId);
  const users = userIds.length > 0
    ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));
  res.json(donors.map((d, i) => ({ rank: i + 1, donorId: d.id, name: userMap[d.userId] || "Donor", bloodType: d.bloodType, totalDonations: d.totalDonations, badges: d.badges })));
});

export default router;

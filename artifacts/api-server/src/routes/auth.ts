import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, donorsTable, hospitalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, hashPassword, requireAuth, AuthRequest } from "../lib/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    res.status(400).json({ error: "Email, password, and role are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || user.password !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.role !== role) {
    res.status(401).json({ error: `This account is registered as ${user.role}` });
    return;
  }
  const token = signToken({ userId: user.id, role: user.role, email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
  res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, createdAt: user.createdAt }, token });
});

router.post("/register/donor", async (req, res) => {
  const { name, email, password, bloodType, phone, dateOfBirth } = req.body;
  if (!name || !email || !password || !bloodType || !phone || !dateOfBirth) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(), password: hashPassword(password), role: "donor", name
  }).returning();
  await db.insert(donorsTable).values({ userId: user.id, phone, bloodType, dateOfBirth });
  const token = signToken({ userId: user.id, role: user.role, email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
  res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, createdAt: user.createdAt }, token });
});

router.post("/register/hospital", async (req, res) => {
  const { name, email, password, phone, address, county, latitude, longitude } = req.body;
  if (!name || !email || !password || !phone || !address || !county || latitude == null || longitude == null) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(), password: hashPassword(password), role: "hospital", name
  }).returning();
  await db.insert(hospitalsTable).values({ userId: user.id, name, phone, address, county, latitude, longitude, isVerified: true });
  const token = signToken({ userId: user.id, role: user.role, email: user.email, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
  res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, name: user.name, createdAt: user.createdAt }, token });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }
  res.json({ id: user.id, email: user.email, role: user.role, name: user.name, createdAt: user.createdAt });
});

router.post("/logout", (_req, res) => {
  res.json({ success: true });
});

export default router;

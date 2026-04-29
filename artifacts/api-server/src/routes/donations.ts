import { Router } from "express";
import { db } from "@workspace/db";
import { donationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, AuthRequest } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("hospital"));

router.patch("/:id/status", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: "status is required" }); return; }
  const [updated] = await db.update(donationsTable).set({ status, updatedAt: new Date() }).where(eq(donationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Donation not found" }); return; }
  res.json(updated);
});

export default router;

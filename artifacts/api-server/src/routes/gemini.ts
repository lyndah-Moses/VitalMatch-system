import { Router } from "express";
import { db } from "@workspace/db";
import { conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ai } from "@workspace/integrations-gemini-ai";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

const VITALMATCH_SYSTEM_PROMPT = `You are AICheck, a blood donation eligibility assistant for VitalMatch, Kenya's emergency blood matching platform. 
You help potential blood donors understand if they are eligible to donate blood.

You are trained on the Kenya National Standards for Blood Transfusion Services. Here are key guidelines:

DEFERRAL PERIODS (reasons a donor must wait):
- Tattoos or body piercing: 6-month deferral from the date of tattoo/piercing
- Malaria: 6-month deferral after full recovery and clearance of treatment
- Malaria travel to endemic areas: 3-month deferral after leaving the area
- Medications: Generally 48-hour wait for antibiotics; aspirin requires 3 days for platelet donation; some medications require longer or permanent deferral
- Pregnancy: Deferred during pregnancy and for 6 months after delivery or breastfeeding ceases
- Dental procedures: 3-day deferral for minor dental work; 6-month deferral for major dental surgery
- Surgery: Major surgery requires 6-month deferral; minor surgery 1-month
- Fever/flu/cold: Defer until 14 days after full recovery
- Alcohol: Do not donate within 24 hours of consuming alcohol
- HIV, hepatitis B/C, syphilis: Permanent deferral
- Recent blood transfusion: 6-month deferral
- Blood donation: Minimum 56 days (8 weeks) between whole blood donations

ELIGIBILITY REQUIREMENTS:
- Age: 16-65 years (with parental consent under 18)
- Weight: Minimum 50 kg
- Hemoglobin: Minimum 12.5 g/dL for women, 13.5 g/dL for men
- Blood pressure: Systolic 90-180 mmHg, Diastolic 60-100 mmHg
- Pulse: 50-100 beats/min, regular
- Temperature: Normal (below 37.5°C)
- General health: Must be feeling well and healthy on the day of donation

Answer questions clearly and compassionately. If uncertain, advise consulting a medical professional.
For emergency situations, remind donors that their blood type may be urgently needed.
Keep responses concise and practical.`;

router.get("/conversations", async (req: AuthRequest, res) => {
  const conversations = await db.select().from(conversationsTable);
  res.json(conversations);
});

router.post("/conversations", async (req: AuthRequest, res) => {
  const { title } = req.body;
  const [conv] = await db.insert(conversationsTable).values({ title: title || "Eligibility Check" }).returning();
  res.status(201).json(conv);
});

router.get("/conversations/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id));
  res.json({ ...conv, messages });
});

router.delete("/conversations/:id", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id)).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id));
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req: AuthRequest, res) => {
  const convId = parseInt(req.params.id);
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "content is required" }); return; }
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }
  await db.insert(messagesTable).values({ conversationId: convId, role: "user", content });
  const existingMessages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, convId));
  const chatMessages = existingMessages.map(m => ({ role: m.role as "user" | "model", parts: [{ text: m.content }] }));
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  let fullResponse = "";
  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: VITALMATCH_SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Understood. I'm AICheck, your blood donation eligibility assistant for VitalMatch Kenya. How can I help you today?" }] },
        ...chatMessages.map(m => ({ role: m.role === "assistant" ? "model" : m.role, parts: m.parts })),
      ],
      config: { maxOutputTokens: 8192 },
    });
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }
    await db.insert(messagesTable).values({ conversationId: convId, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
    res.end();
  }
});

router.post("/generate-image", async (req: AuthRequest, res) => {
  const { generateImage } = await import("@workspace/integrations-gemini-ai/image");
  const { prompt } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt is required" }); return; }
  const { b64_json, mimeType } = await generateImage(prompt);
  res.json({ b64_json, mimeType });
});

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import hospitalsRouter from "./hospitals.js";
import appealsRouter from "./appeals.js";
import donorsRouter from "./donors.js";
import donationsRouter from "./donations.js";
import geminiRouter from "./gemini.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/hospitals", hospitalsRouter);
router.use("/appeals", appealsRouter);
router.use("/donors", donorsRouter);
router.use("/donations", donationsRouter);
router.use("/gemini", geminiRouter);

export default router;

import { Router } from "express";
import {
  analyzeDebt,
  explainCode,
  modernizeCode,
  rewriteCodebase,
} from "../controllers/aiController.js";

const router = Router();

router.post("/analyze-debt", analyzeDebt);
router.post("/explain-code", explainCode);
router.post("/modernize-code", modernizeCode);
router.post("/rewrite-codebase", rewriteCodebase);

export default router;


import express from "express";
import {
  createMedicalAdvice,
  getAllMedicalAdvice,
  getMedicalAdviceById,
  updateMedicalAdvice,
  deleteMedicalAdvice,
  searchMedicalAdvice,
  bulkCreateMedicalAdvice,
} from "../controller/medicalAdviceController.js";

const router = express.Router();

router.post("/", createMedicalAdvice); // create
router.post("/bulk", bulkCreateMedicalAdvice); // bulk insert
router.get("/", getAllMedicalAdvice); // list
router.get("/search", searchMedicalAdvice); // search with query params
router.get("/:id", getMedicalAdviceById); // read
router.put("/:id", updateMedicalAdvice); // update
router.delete("/:id", deleteMedicalAdvice); // delete

export default router;

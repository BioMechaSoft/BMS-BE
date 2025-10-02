import express from "express";
import {
  deleteAppointment,
  getAllAppointments,
  postAppointment,
  updateAppointmentStatus,
} from "../controller/appointmentController.js";
import {
  isAdminAuthenticated,
  isPatientAuthenticated,
  isAuthenticatedUser,
} from "../middlewares/auth.js";

const router = express.Router();

// router.post("/post", postAppointment);
router.post("/post", isAuthenticatedUser, postAppointment);
router.get("/getall", getAllAppointments);
router.put("/update/:id", isAdminAuthenticated, updateAppointmentStatus);
router.delete("/delete/:id", isAdminAuthenticated, deleteAppointment);

export default router;

import express from "express";
import {
  deleteAppointment,
  getAllAppointments,
  getAppointmentsByPatientId,
  postAppointment,
  searchAppointments,
  updateAppointmentByPatientId,
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
router.get("/patient/:id", getAppointmentsByPatientId);
router.get("/search", searchAppointments);
router.put("/update/:id", isAdminAuthenticated, updateAppointmentStatus);
// allow authenticated users (doctors/patients/admin) to update appointment by appointment id
router.put("/status/:id", updateAppointmentStatus);
router.put("/patient/update/:id", updateAppointmentByPatientId);
router.delete("/delete/:id", isAdminAuthenticated, deleteAppointment);

export default router;

import express from "express";
import {
  addNewAdmin,
  addNewDoctor,
  addNewCompounder,
  getAllDoctors,
  getUserDetails,
  login,
  logoutAdmin,
  logoutPatient,
  patientRegister,
  getPatientById,
  getPatientByNameOrPhone,
  updatePatientById,
  getDoctorById,
  getDoctorsList,
} from "../controller/userController.js";
import {
  isAdminAuthenticated,
  isPatientAuthenticated,
  isDashboardAuthenticated,
} from "../middlewares/auth.js";

const router = express.Router();

router.post("/patient/register", patientRegister);
router.post("/login", login);
router.post("/admin/addnew", addNewAdmin);
router.post('/compounder/addnew', isDashboardAuthenticated, addNewCompounder);
router.post("/doctor/addnew", addNewDoctor);
router.get("/doctors", getAllDoctors);
router.get("/patient/me", isPatientAuthenticated, getUserDetails);
router.get("/admin/me",isAdminAuthenticated, getUserDetails);
router.get("/patient/logout", logoutPatient);
router.get("/admin/logout", logoutAdmin);

// Patient endpoints
router.get("/patient/:id", getPatientById);
router.get("/patient/search", getPatientByNameOrPhone);
router.put("/patient/:id", updatePatientById);
router.get("/doctor/:id", getDoctorById);
router.get("/doctors/list", getDoctorsList);

export default router;

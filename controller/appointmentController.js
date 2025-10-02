import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Appointment } from "../models/appointmentSchema.js";
import { User } from "../models/userSchema.js";

export const postAppointment = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    appointment_date,
    department,
    doctor_firstName,
    doctor_lastName,
    hasVisited,
    address,
    password // optional, for new patient creation
  } = req.body;
  console.log("Appointment Request Body: ", req.body);
  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !nic ||
    !dob ||
    !gender ||
    !appointment_date ||
    !department ||
    !doctor_firstName ||
    !doctor_lastName ||
    !address
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  // Find doctor by name, department, and role
  const doctors = await User.find({
    firstName: doctor_firstName,
    lastName: doctor_lastName,
    role: "Doctor",
    doctorDepartment: department,
  });
  if (doctors.length === 0) {
    console.log("Doctors Data : ", doctors);
    return next(new ErrorHandler("Doctor not found", 404));
  }
  if (doctors.length > 1) {
    console.log("Multiple doctors found with same name, selecting the first one by default.", doctors);
  }
  const doctorId = doctors[0]._id;

  let patientId = req.user?._id;

  // If hasVisited is true, check if patient exists, else create
  if (hasVisited) {
    let patient = await User.findOne({
      $or: [
        { nic: nic },
        { email: email }
      ],
      role: "Patient"
    });
    if (!patient) {
      // If password is not provided, set a default password
      const patientPassword = password || "defaultPassword123";
      patient = await User.create({
        firstName,
        lastName,
        email,
        phone,
        nic,
        dob,
        gender,
        password: patientPassword,
        role: "Patient"
      });
    }
    patientId = patient._id;
  }

  const appointment = await Appointment.create({
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    appointment_date,
    department,
    doctor: {
      firstName: doctor_firstName,
      lastName: doctor_lastName,
    },
    hasVisited,
    address,
    doctorId,
    patientId,
  });
  res.status(200).json({
    success: true,
    appointment,
    message: "Appointment Send!",
  });
});

export const getAllAppointments = catchAsyncErrors(async (req, res, next) => {
  const appointments = await Appointment.find();
  res.status(200).json({
    success: true,
    appointments,
  });
});

// Get appointments by patient ID
export const getAppointmentsByPatientId = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const appointments = await Appointment.find({ patientId: id });
  if (!appointments || appointments.length === 0) {
    return next(new ErrorHandler("No appointments found for this patient!", 404));
  }
  res.status(200).json({
    success: true,
    appointments,
  });
});

// Search appointments by patient name or phone
export const searchAppointments = catchAsyncErrors(async (req, res, next) => {
  const { name, phone } = req.query;
  if (!name && !phone) {
    return next(new ErrorHandler("Please provide name or phone to search", 400));
  }
  const query = {};
  if (name) {
    const regex = new RegExp(name, "i");
    query.$or = [{ firstName: regex }, { lastName: regex }];
  }
  if (phone) {
    query.phone = phone;
  }
  const appointments = await Appointment.find(query);
  if (!appointments || appointments.length === 0) {
    return next(new ErrorHandler("No appointments found for given search", 404));
  }
  res.status(200).json({ success: true, appointments });
});

// Update latest appointment for a patient by patient ID
export const updateAppointmentByPatientId = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params; // patient id
  const appointments = await Appointment.find({ patientId: id });
  if (!appointments || appointments.length === 0) {
    return next(new ErrorHandler("No appointments found for this patient!", 404));
  }
  // pick latest by appointment_date
  appointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
  const latest = appointments[0];
  const updated = await Appointment.findByIdAndUpdate(latest._id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({ success: true, appointment: updated, message: "Appointment Updated!" });
});

export const updateAppointmentStatus = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    let appointment = await Appointment.findById(id);
    if (!appointment) {
      return next(new ErrorHandler("Appointment not found!", 404));
    }
    appointment = await Appointment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });
    res.status(200).json({
      success: true,
      message: "Appointment Status Updated!",
      appointment,
    });
  }
);

export const deleteAppointment = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const appointment = await Appointment.findById(id);
  if (!appointment) {
    return next(new ErrorHandler("Appointment Not Found!", 404));
  }
  await appointment.deleteOne();
  res.status(200).json({
    success: true,
    message: "Appointment Deleted!",
  });
});

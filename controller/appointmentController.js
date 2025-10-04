import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Appointment } from "../models/appointmentSchema.js";
import { Message } from "../models/messageSchema.js";
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
  // Normalize incoming payload: ensure result is an array and medicineAdvice is an array of normalized objects
  const payload = { ...req.body };
  if (payload.result && Array.isArray(payload.result)) {
    payload.result = payload.result.map((r) => {
      const copy = { ...r };
      // Ensure medicineAdvice is an array
      if (copy.medicineAdvice && !Array.isArray(copy.medicineAdvice)) {
        copy.medicineAdvice = [copy.medicineAdvice];
      }
      if (!copy.medicineAdvice) copy.medicineAdvice = [];

      // Normalize medicine object keys to: name,type,dose,frequency,route,duration
      copy.medicineAdvice = copy.medicineAdvice.map((med) => {
        if (!med || typeof med !== 'object') return med;
        return {
          name: med.name || med.Medicine || med.MedicineName || "",
          type: med.type || med.Type || "",
          dose: med.dose || med.Dose || "",
          frequency: med.frequency || med.Frequency || med.Interval || "",
          route: med.route || med.Rout || med.Route || med.rout || "",
          duration: med.duration || med.Duration || "",
          // keep any extra props if present
          ...med,
        };
      });

      return copy;
    });
  }

  const updated = await Appointment.findByIdAndUpdate(latest._id, payload, {
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
    const before = await Appointment.findById(id);
    appointment = await Appointment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });
    // create a message to notify patient when status changes
    try {
      const prevStatus = before?.status;
      const newStatus = appointment?.status;
      if (prevStatus !== newStatus) {
        const text = `Your appointment scheduled on ${appointment.appointment_date} is now ${newStatus}.`;
        await Message.create({ firstName: appointment.firstName, lastName: appointment.lastName, email: appointment.email, phone: appointment.phone, message: text, sentAt: new Date() });
      }
    } catch (e) {
      console.warn('Failed to create notification message:', e.message);
    }
+
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


import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
import { generateToken } from "../utils/jwtToken.js";
import cloudinary from "cloudinary";

export const patientRegister = catchAsyncErrors(async (req, res, next) => {
  const { firstName, lastName, email, phone, nic, dob, gender, password } =
    req.body;
  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !nic ||
    !dob ||
    !gender ||
    !password
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler("User already Registered!", 400));
  }

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    role: "Patient",
  });
  generateToken(user, "User Registered!", 200, res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, confirmPassword, role } = req.body;
  if (!email || !password || !confirmPassword || !role) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }
  if (password !== confirmPassword) {
    return next(
      new ErrorHandler("Password & Confirm Password Do Not Match!", 400)
    );
  }
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Email Or Password!", 400));
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid Email Or Password!", 400));
  }
  if (role !== user.role) {
    return next(new ErrorHandler(`User Not Found With This Role!`, 400));
  }
  generateToken(user, "Login Successfully!", 201, res);
});

export const addNewAdmin = catchAsyncErrors(async (req, res, next) => {
  const { firstName, lastName, email, phone, nic, dob, gender, password, role, assignedDoctors } = req.body;

  if (!firstName || !lastName || !email || !phone || !nic || !dob || !gender || !password) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler("User With This Email Already Exists!", 400));
  }

  // If creating a compounder, validate assignedDoctors and then create compounder and link to doctors
  if (role === 'Compounder') {
    // assignedDoctors must be an array of doctor IDs (optional)
    let doctorIds = Array.isArray(assignedDoctors) ? assignedDoctors : [];

    // Validate doctors exist and have role Doctor
    if (doctorIds.length > 0) {
      const doctors = await User.find({ _id: { $in: doctorIds }, role: 'Doctor' });
      if (doctors.length !== doctorIds.length) {
        return next(new ErrorHandler('One or more assignedDoctors are invalid', 400));
      }
    }

    const compounder = await User.create({
      firstName,
      lastName,
      email,
      phone,
      nic,
      dob,
      gender,
      password,
      role: 'Compounder',
      assignedDoctors: doctorIds,
    });

    // Update each doctor to include this compounder in their compounders list
    if (doctorIds.length > 0) {
      await User.updateMany(
        { _id: { $in: doctorIds } },
        { $addToSet: { compounders: compounder._id } }
      );
    }

    return res.status(200).json({ success: true, message: 'New Compounder Registered', compounder });
  }

  // Default: create Admin
  const admin = await User.create({
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    role: 'Admin',
  });
  res.status(200).json({ success: true, message: 'New Admin Registered', admin });
});

// Dedicated compounder creation handler (for dashboard users: Admins and Doctors)
export const addNewCompounder = catchAsyncErrors(async (req, res, next) => {
  const { firstName, lastName, email, phone, nic, dob, gender, password, assignedDoctors } = req.body;

  if (!firstName || !lastName || !email || !phone || !nic || !dob || !gender || !password) {
    return next(new ErrorHandler('Please Fill Full Form!', 400));
  }

  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(new ErrorHandler('User With This Email Already Exists!', 400));
  }

  let doctorIds = Array.isArray(assignedDoctors) ? assignedDoctors : [];
  if (doctorIds.length > 0) {
    const doctors = await User.find({ _id: { $in: doctorIds }, role: 'Doctor' });
    if (doctors.length !== doctorIds.length) {
      return next(new ErrorHandler('One or more assignedDoctors are invalid', 400));
    }
  }

  const compounder = await User.create({ firstName, lastName, email, phone, nic, dob, gender, password, role: 'Compounder', assignedDoctors: doctorIds });

  if (doctorIds.length > 0) {
    await User.updateMany({ _id: { $in: doctorIds } }, { $addToSet: { compounders: compounder._id } });
  }

  res.status(200).json({ success: true, message: 'New Compounder Registered', compounder });
});

export const addNewDoctor = catchAsyncErrors(async (req, res, next) => {
  // if (!req.files || Object.keys(req.files).length === 0) {
  //   return next(new ErrorHandler("Doctor Avatar Required!", 400));
  // }
  // const { docAvatar } = req.files;
  // const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  // if (!allowedFormats.includes(docAvatar.mimetype)) {
  //   return next(new ErrorHandler("File Format Not Supported!", 400));
  // }
  const {
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    doctorDepartment,
  } = req.body;
  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !nic ||
    !dob ||
    !gender ||
    !password ||
    !doctorDepartment 
    // ||
    // !docAvatar
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }
  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(
      new ErrorHandler("Doctor With This Email Already Exists!", 400)
    );
  }
  // const cloudinaryResponse = await cloudinary.uploader.upload(
  //   docAvatar.tempFilePath
  // );
  // if (!cloudinaryResponse || cloudinaryResponse.error) {
  //   console.error(
  //     "Cloudinary Error:",
  //     cloudinaryResponse.error || "Unknown Cloudinary error"
  //   );
  //   return next(
  //     new ErrorHandler("Failed To Upload Doctor Avatar To Cloudinary", 500)
  //   );
  // }
  const doctor = await User.create({
    firstName,
    lastName,
    email,
    phone,
    nic,
    dob,
    gender,
    password,
    role: "Doctor",
    doctorDepartment,
    // docAvatar: {
    //   public_id: cloudinaryResponse.public_id,
    //   url: cloudinaryResponse.secure_url,
    // },
  });
  res.status(200).json({
    success: true,
    message: "New Doctor Registered",
    doctor,
  });
});

export const getAllDoctors = catchAsyncErrors(async (req, res, next) => {
  const doctors = await User.find({ role: 'Doctor' }).populate({ path: 'compounders', select: 'firstName lastName email' });
  res.status(200).json({ success: true, doctors });
});

// Get patient by ID
export const getPatientById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const patient = await User.findOne({ _id: id, role: "Patient" });
  if (!patient) {
    return next(new ErrorHandler("Patient not found!", 404));
  }
  res.status(200).json({
    success: true,
    patient,
  });
});

// Get patient by name or phone (query params: name, phone)
export const getPatientByNameOrPhone = catchAsyncErrors(async (req, res, next) => {
  const { name, phone } = req.query;
  let query = { role: "Patient" };
  if (name) {
    // Search by first or last name (case-insensitive)
    query.$or = [
      { firstName: { $regex: name, $options: "i" } },
      { lastName: { $regex: name, $options: "i" } }
    ];
  }
  if (phone) {
    query.phone = phone;
  }
  const patients = await User.find(query);
  if (!patients || patients.length === 0) {
    return next(new ErrorHandler("Patient not found!", 404));
  }
  res.status(200).json({
    success: true,
    patients,
  });
});

// Update patient by ID
export const updatePatientById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  let patient = await User.findOne({ _id: id, role: "Patient" });
  if (!patient) {
    return next(new ErrorHandler("Patient not found!", 404));
  }
  patient = await User.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
    patient,
    message: "Patient updated successfully!",
  });
});

// Get doctor by ID
export const getDoctorById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const doctor = await User.findOne({ _id: id, role: "Doctor" });
  if (!doctor) {
    return next(new ErrorHandler("Doctor not found!", 404));
  }
  res.status(200).json({
    success: true,
    doctor,
  });
});

// Get list of doctors (id and name) for selection
export const getDoctorsList = catchAsyncErrors(async (req, res, next) => {
  const doctors = await User.find({ role: "Doctor" }, { firstName: 1, lastName: 1 });
  const list = doctors.map(d => ({ id: d._id, name: `${d.firstName} ${d.lastName}` }));
  res.status(200).json({ success: true, doctors: list });
});

export const getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

// Logout function for dashboard admin
export const logoutAdmin = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("adminToken", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Admin Logged Out Successfully.",
    });
});

// Logout function for frontend patient
export const logoutPatient = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("patientToken", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Patient Logged Out Successfully.",
    });
});

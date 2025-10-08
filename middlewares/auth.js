import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "./error.js";
import jwt from "jsonwebtoken";

export const isAuthenticatedUser = async (req, res, next) => {
  // Accept token from multiple sources as a fail-safe:
  // 1. adminToken cookie (dashboard)
  // 2. patientToken cookie (frontend)
  // 3. Authorization header: Bearer <token>
  // 4. query param ?token=
  // 5. FALLBACK_JWT env var (operator-provided pre-made token) - use with caution
  const headerToken = req.headers?.authorization
    ? req.headers.authorization.split(" ")[1]
    : null;
  const token =
    req.cookies?.adminToken || req.cookies?.patientToken || headerToken || req.query?.token || process.env.FALLBACK_JWT;

  if (!token) {
    return next(new ErrorHandler("Please login to access this resource", 401));
  }

  try {
    // Use the same secret key used for signing
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);

    if (!req.user) return next(new ErrorHandler("User not found", 404));

    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid or expired token", 401));
  }
};


// Middleware to authenticate dashboard users
export const isAdminAuthenticated = catchAsyncErrors(
  async (req, res, next) => {
    // Accept admin token via cookie, header, query param or fallback env for ops/debugging
    const headerToken = req.headers?.authorization
      ? req.headers.authorization.split(" ")[1]
      : null;
    const token = req.cookies?.adminToken || headerToken || req.query?.token || process.env.FALLBACK_JWT;
    if (!token) {
      return next(new ErrorHandler("Dashboard User is not authenticated!", 400));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = await User.findById(decoded.id);
      if (!req.user) return next(new ErrorHandler('User not found!', 404));
      if (req.user.role !== "Admin") {
        return next(new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403));
      }
      next();
    } catch (err) {
      return next(new ErrorHandler('Invalid or expired token', 401));
    }
  }
);

// Authenticate dashboard token but do not require Admin role
export const isDashboardAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const headerToken = req.headers?.authorization
    ? req.headers.authorization.split(" ")[1]
    : null;
  const token = req.cookies?.adminToken || headerToken || req.query?.token || process.env.FALLBACK_JWT;
  if (!token) {
    return next(new ErrorHandler('Dashboard User is not authenticated!', 400));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return next(new ErrorHandler('User not found!', 404));
    }
    // allow any dashboard role (Admin or Doctor) to proceed
    next();
  } catch (err) {
    return next(new ErrorHandler('Invalid or expired token', 401));
  }
});

// Middleware to authenticate frontend users
export const isPatientAuthenticated = catchAsyncErrors(
  async (req, res, next) => {
    const headerToken = req.headers?.authorization
      ? req.headers.authorization.split(" ")[1]
      : null;
    const token = req.cookies?.patientToken || headerToken || req.query?.token || process.env.FALLBACK_JWT;
    if (!token) {
      return next(new ErrorHandler("User is not authenticated!", 400));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = await User.findById(decoded.id);
      if (!req.user) return next(new ErrorHandler('User not found!', 404));
      if (req.user.role !== "Patient") {
        return next(new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403));
      }
      next();
    } catch (err) {
      return next(new ErrorHandler('Invalid or expired token', 401));
    }
  }
);

export const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `${req.user.role} not allowed to access this resource!`
        )
      );
    }
    next();
  };
};

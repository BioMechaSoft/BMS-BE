export const generateToken = (user, message, statusCode, res) => {
  const token = user.generateJsonWebToken();
  // Determine the cookie name based on the user's role
  // Dashboard users (Admin, Doctor and Compounder) receive the adminToken; patients receive patientToken
  const cookieName = (user.role === 'Admin' || user.role === 'Doctor' || user.role === 'Compounder') ? 'adminToken' : 'patientToken';

  // Cookie options: set secure & sameSite for cross-site cookies when in production (Render uses HTTPS)
  // COOKIE_EXPIRE may be stored as a string - coerce to a number and fallback to 7 days.
  const expireDays = Number(process.env.COOKIE_EXPIRE) || 7;
  const cookieOptions = {
    expires: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  // Allow operators to override cookie domain and sameSite via env (useful on Render)
  if (process.env.COOKIE_DOMAIN) cookieOptions.domain = process.env.COOKIE_DOMAIN;
  if (process.env.COOKIE_SAMESITE) cookieOptions.sameSite = process.env.COOKIE_SAMESITE;

  if (process.env.NODE_ENV === 'production') {
    // Ensure secure in production by default (Render provides HTTPS)
    cookieOptions.secure = true;
    // Default to None for cross-site cookie in prod unless overridden
    cookieOptions.sameSite = cookieOptions.sameSite || 'none';
  }

  // For environments where cookies cannot be set (e.g., cross-origin issues during testing),
  // allow sending the token in the JSON response and skip setting the cookie by using
  // SKIP_COOKIE=true in env. This is a fallback and should be used cautiously.
  const skipCookie = (process.env.SKIP_COOKIE || 'false').toLowerCase() === 'true';

  if (!skipCookie) {
    res.cookie(cookieName, token, cookieOptions);
  }

  // Always include token in response to support clients that cannot receive cookies.
  return res.status(statusCode).json({
    success: true,
    message,
    user,
    token,
    cookieSet: !skipCookie,
  });
};


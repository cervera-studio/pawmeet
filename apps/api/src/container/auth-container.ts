// Auth domain: registration, login, token refresh, password reset, social login

import { createForgotPassword } from '../use-cases/forgot-password.js';
import { createLoginUser } from '../use-cases/login-user.js';
import { createLogoutUser } from '../use-cases/logout-user.js';
import { createRefreshTokens } from '../use-cases/refresh-tokens.js';
import { createRegisterUser } from '../use-cases/register-user.js';
import { createResendVerification } from '../use-cases/resend-verification.js';
import { createResetPassword } from '../use-cases/reset-password.js';
import { createSocialLogin } from '../use-cases/social-login.js';
import { createVerifyEmailOtp } from '../use-cases/verify-email-otp.js';
import { authService, emailService, socialAuthVerifier, tokenRepo, userRepo } from './services.js';

export const authDeps = {
  registerUser: createRegisterUser({ userRepo, tokenRepo, authService, emailService }),
  loginUser: createLoginUser({ userRepo, tokenRepo, authService }),
  refreshTokens: createRefreshTokens({ tokenRepo, authService }),
  logoutUser: createLogoutUser({ tokenRepo, authService }),
  forgotPassword: createForgotPassword({ userRepo, tokenRepo, authService, emailService }),
  resetPassword: createResetPassword({ userRepo, tokenRepo, authService }),
  socialLogin: createSocialLogin({ userRepo, tokenRepo, authService, socialAuthVerifier }),
  verifyEmailOtp: createVerifyEmailOtp({ userRepo, tokenRepo, authService }),
  resendVerification: createResendVerification({ userRepo, tokenRepo, authService, emailService }),
};

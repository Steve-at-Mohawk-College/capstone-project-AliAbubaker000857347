const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends a verification or password reset email using SendGrid.
 * Generates appropriate email content based on the email type and includes
 * a secure token-based link for verification or password reset.
 *
 * @param {string} email - Recipient email address
 * @param {string} token - Secure token for verification/reset link
 * @param {string} [username='User'] - Recipient's username for personalization
 * @param {string|null} [linkOverride=null] - Custom link to override default URL
 * @param {boolean} [isReset=false] - Whether this is a password reset email (true) or verification email (false)
 * @returns {Promise<boolean>} True if email sent successfully, false otherwise
 */
async function sendVerificationEmail(email, token, username = 'User', linkOverride = null, isReset = false) {
  try {
    const actionLink = linkOverride || `${process.env.BASE_URL}/auth/${isReset ? 'reset-password' : 'verify'}?token=${token}`;
    
    const subject = isReset
      ? 'Reset Your Password - Pet Care Management'
      : 'Verify Your Email - Pet Care Management';

    const htmlContent = `
      <p>Hi ${username},</p>
      <p>${isReset 
        ? 'Click the link below to reset your password. This link is valid for 1 hour.'
        : 'Click the link below to verify your email address and activate your account.'}
      </p>
      <p><a href="${actionLink}" style="background:#0066cc;color:#fff;padding:10px 18px;text-decoration:none;border-radius:4px;">
        ${isReset ? 'Reset Password' : 'Verify Email'}
      </a></p>
      <p>If you did not request this, you can ignore this email.</p>
      <br>
      <p>– Pet Care Management</p>
    `;

    const textContent = isReset
      ? `Hi ${username},\n\nClick here to reset your password: ${actionLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\n– Pet Care Management`
      : `Hi ${username},\n\nClick here to verify your email: ${actionLink}\n\nThis link expires in 1 hour.\n\nIf you didn't create an account, please ignore this email.\n\n– Pet Care Management`;

    const msg = {
      to: email,
      from: 'no-reply@em3996.pet-care.live',
      subject: subject,
      html: htmlContent,
      text: textContent
    };

    await sgMail.send(msg);
    // console.log(`✅ Email sent to ${email} from em3996.pet-care.live`);
    return true;
  } catch (error) {
    // console.error('❌ Email sending failed:', error.response?.body || error.message);
    return false;
  }
}

module.exports = sendVerificationEmail;
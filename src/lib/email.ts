// Email notifications via nodemailer or simple fetch to a mail API
// Uses env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL

export async function sendAdminNotification(subject: string, body: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return; // silently skip if not configured

  try {
    // Use nodemailer if available
    const nodemailer = await import('nodemailer').catch(() => null);
    if (!nodemailer) return;

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: adminEmail,
      subject: `[ActivKids] ${subject}`,
      text: body,
    });
  } catch {
    // Email sending failure is non-critical - log and continue
    console.error('[email] Failed to send notification:', subject);
  }
}

// =============================================================================
// ELITEBUILD — Email Abstraction
// =============================================================================
// Placeholder email service. Implement a concrete provider when configured.
// =============================================================================

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const emailServer = process.env.EMAIL_SERVER
  if (!emailServer) {
    console.log('[Email] No email server configured. Skipping:', options.subject)
    return false
  }

  // Future: implement Resend, SMTP, SendGrid, etc.
  console.log('[Email] Would send:', options.subject, 'to:', options.to)
  return false
}

export async function sendInquiryNotification(inquiry: {
  name: string
  email: string
  subject?: string
  message: string
}) {
  const adminEmail = process.env.EMAIL_FROM
  if (!adminEmail) return false

  return sendEmail({
    to: adminEmail,
    subject: `New Inquiry: ${inquiry.subject || 'General Inquiry'}`,
    html: `
      <h2>New Contact Inquiry</h2>
      <p><strong>Name:</strong> ${inquiry.name}</p>
      <p><strong>Email:</strong> ${inquiry.email}</p>
      <p><strong>Subject:</strong> ${inquiry.subject || 'N/A'}</p>
      <p><strong>Message:</strong></p>
      <p>${inquiry.message}</p>
    `,
  })
}

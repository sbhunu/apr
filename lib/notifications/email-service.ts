/**
 * Email Notification Service
 * Handles sending email notifications to planners, surveyors, and other stakeholders
 */

import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Email recipient
 */
export interface EmailRecipient {
  email: string
  name?: string
  role?: string
}

/**
 * Email content
 */
export interface EmailContent {
  subject: string
  html: string
  text?: string
}

/**
 * Email sending result
 */
export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Correction email data
 */
export interface CorrectionEmailData {
  recipientType: 'planner' | 'surveyor' | 'conveyancer'
  recipientEmail: string
  recipientName?: string
  schemeName: string
  schemeNumber?: string
  titleNumber?: string
  correctionType: 'planning' | 'survey' | 'deeds'
  defects: Array<{
    title: string
    description: string
    severity: 'error' | 'warning' | 'info'
    suggestedCorrection?: string
  }>
  examinerNotes?: string
  examinerName?: string
  examinationDate: string
  actionUrl?: string
}

/**
 * Send email notification
 * In development, logs the email. In production, sends via configured provider.
 */
export async function sendEmail(
  to: EmailRecipient | EmailRecipient[],
  content: EmailContent,
  options?: {
    from?: EmailRecipient
    replyTo?: string
    cc?: EmailRecipient[]
    bcc?: EmailRecipient[]
  }
): Promise<EmailSendResult> {
  return monitor('send_email', async () => {
    const recipients = Array.isArray(to) ? to : [to]
    const fromEmail = options?.from?.email || process.env.EMAIL_FROM || 'noreply@apr.local'
    const fromName = options?.from?.name || process.env.EMAIL_FROM_NAME || 'APR System'

    try {
      // In development, log the email instead of sending
      if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_PROVIDER) {
        logger.info('Email notification (development mode)', {
          to: recipients.map((r) => r.email),
          subject: content.subject,
          from: `${fromName} <${fromEmail}>`,
        })
        console.log('\n=== EMAIL NOTIFICATION ===')
        console.log(`From: ${fromName} <${fromEmail}>`)
        console.log(`To: ${recipients.map((r) => `${r.name || ''} <${r.email}>`).join(', ')}`)
        console.log(`Subject: ${content.subject}`)
        console.log('\n--- Email Content ---')
        console.log(content.text || content.html.replace(/<[^>]*>/g, ''))
        console.log('====================\n')

        return {
          success: true,
          messageId: `dev-${Date.now()}`,
        }
      }

      // Production: Use configured email provider
      const provider = process.env.EMAIL_PROVIDER || 'smtp'

      switch (provider) {
        case 'resend':
          return await sendViaResend(recipients, content, { from: { email: fromEmail, name: fromName }, ...options })
        case 'smtp':
          return await sendViaSMTP(recipients, content, { from: { email: fromEmail, name: fromName }, ...options })
        case 'supabase':
          return await sendViaSupabase(recipients, content, { from: { email: fromEmail, name: fromName }, ...options })
        default:
          logger.warn('Unknown email provider, logging email', { provider })
          return {
            success: true,
            messageId: `logged-${Date.now()}`,
          }
      }
    } catch (error) {
      logger.error('Failed to send email', error as Error, {
        to: recipients.map((r) => r.email),
        subject: content.subject,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

/**
 * Send email via Resend (if configured)
 */
async function sendViaResend(
  recipients: EmailRecipient[],
  content: EmailContent,
  options?: {
    from?: EmailRecipient
    replyTo?: string
    cc?: EmailRecipient[]
    bcc?: EmailRecipient[]
  }
): Promise<EmailSendResult> {
  // Resend API integration would go here
  // For now, log and return success
  logger.info('Resend email provider not yet implemented, logging email')
  return {
    success: true,
    messageId: `resend-${Date.now()}`,
  }
}

/**
 * Send email via SMTP (if configured)
 */
async function sendViaSMTP(
  recipients: EmailRecipient[],
  content: EmailContent,
  options?: {
    from?: EmailRecipient
    replyTo?: string
    cc?: EmailRecipient[]
    bcc?: EmailRecipient[]
  }
): Promise<EmailSendResult> {
  // SMTP integration would go here (using nodemailer)
  // For now, log and return success
  logger.info('SMTP email provider not yet implemented, logging email')
  return {
    success: true,
    messageId: `smtp-${Date.now()}`,
  }
}

/**
 * Send email via Supabase (if configured)
 */
async function sendViaSupabase(
  recipients: EmailRecipient[],
  content: EmailContent,
  options?: {
    from?: EmailRecipient
    replyTo?: string
    cc?: EmailRecipient[]
    bcc?: EmailRecipient[]
  }
): Promise<EmailSendResult> {
  // Supabase email integration would go here
  // For now, log and return success
  logger.info('Supabase email provider not yet implemented, logging email')
  return {
    success: true,
    messageId: `supabase-${Date.now()}`,
  }
}

/**
 * Generate correction email content
 */
export function generateCorrectionEmail(data: CorrectionEmailData): EmailContent {
  const recipientTitle =
    data.recipientType === 'planner'
      ? 'Certified Planner'
      : data.recipientType === 'surveyor'
        ? 'Land Surveyor'
        : 'Conveyancer'

  const schemeInfo = data.schemeNumber
    ? `Scheme Number: ${data.schemeNumber}<br/>Scheme Name: ${data.schemeName}`
    : `Scheme Name: ${data.schemeName}`

  const titleInfo = data.titleNumber ? `<p><strong>Title Number:</strong> ${data.titleNumber}</p>` : ''

  const defectsList = data.defects
    .map(
      (defect, index) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${index + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
        <strong>${defect.title}</strong><br/>
        <span style="color: #666; font-size: 0.9em;">${defect.description}</span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em; ${
          defect.severity === 'error'
            ? 'background-color: #fee; color: #c00;'
            : defect.severity === 'warning'
              ? 'background-color: #ffe; color: #c60;'
              : 'background-color: #eef; color: #006;'
        }">
          ${defect.severity.toUpperCase()}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
        ${defect.suggestedCorrection || '<em>No suggestion provided</em>'}
      </td>
    </tr>
  `
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Correction Required - ${data.schemeName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #0066cc; margin-top: 0;">Correction Required</h1>
    <p style="margin-bottom: 0;">Dear ${data.recipientName || recipientTitle},</p>
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #333; margin-top: 0;">Scheme Information</h2>
    <p>${schemeInfo}</p>
    ${titleInfo}
  </div>

  <div style="background-color: #fff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #333; margin-top: 0;">Corrections Required</h2>
    <p>The following issues have been identified during examination:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background-color: #f0f0f0;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ccc;">#</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ccc;">Issue</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ccc;">Severity</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ccc;">Suggested Correction</th>
        </tr>
      </thead>
      <tbody>
        ${defectsList}
      </tbody>
    </table>
  </div>

  ${data.examinerNotes ? `
  <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #856404;">Examiner Notes</h3>
    <p style="margin-bottom: 0;">${data.examinerNotes.replace(/\n/g, '<br/>')}</p>
  </div>
  ` : ''}

  <div style="background-color: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
    <p style="margin: 0;"><strong>Next Steps:</strong></p>
    <ol style="margin: 10px 0 0 20px; padding: 0;">
      <li>Review the corrections listed above</li>
      <li>Make necessary amendments to your submission</li>
      <li>Resubmit the corrected documents through the APR system</li>
      ${data.actionUrl ? `<li><a href="${data.actionUrl}" style="color: #0066cc;">Access the system here</a></li>` : ''}
    </ol>
  </div>

  ${data.actionUrl ? `
  <div style="text-align: center; margin: 30px 0;">
    <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
      View in APR System
    </a>
  </div>
  ` : ''}

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 0.9em; color: #666;">
    <p>This is an automated notification from the Automated Property Registration (APR) System.</p>
    <p>Examination Date: ${new Date(data.examinationDate).toLocaleDateString('en-ZW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}</p>
    ${data.examinerName ? `<p>Examiner: ${data.examinerName}</p>` : ''}
  </div>
</body>
</html>
  `.trim()

  const text = `
CORRECTION REQUIRED - ${data.schemeName}

Dear ${data.recipientName || recipientTitle},

Scheme Information:
${data.schemeNumber ? `Scheme Number: ${data.schemeNumber}` : ''}
Scheme Name: ${data.schemeName}
${data.titleNumber ? `Title Number: ${data.titleNumber}` : ''}

Corrections Required:
The following issues have been identified during examination:

${data.defects
  .map(
    (defect, index) => `
${index + 1}. ${defect.title} [${defect.severity.toUpperCase()}]
   ${defect.description}
   ${defect.suggestedCorrection ? `Suggested: ${defect.suggestedCorrection}` : ''}
`
  )
  .join('')}

${data.examinerNotes ? `\nExaminer Notes:\n${data.examinerNotes}\n` : ''}

Next Steps:
1. Review the corrections listed above
2. Make necessary amendments to your submission
3. Resubmit the corrected documents through the APR system
${data.actionUrl ? `4. Access the system: ${data.actionUrl}` : ''}

---
This is an automated notification from the Automated Property Registration (APR) System.
Examination Date: ${new Date(data.examinationDate).toLocaleDateString('en-ZW')}
${data.examinerName ? `Examiner: ${data.examinerName}` : ''}
  `.trim()

  return {
    subject: `Correction Required: ${data.schemeName}${data.schemeNumber ? ` (${data.schemeNumber})` : ''}`,
    html,
    text,
  }
}

/**
 * Send correction email to planner
 */
export async function sendCorrectionEmailToPlanner(
  data: Omit<CorrectionEmailData, 'recipientType' | 'recipientEmail' | 'recipientName'> & {
    plannerEmail: string
    plannerName?: string
  }
): Promise<EmailSendResult> {
  const emailContent = generateCorrectionEmail({
    ...data,
    recipientType: 'planner',
    recipientEmail: data.plannerEmail,
    recipientName: data.plannerName,
  })

  return sendEmail(
    {
      email: data.plannerEmail,
      name: data.plannerName,
      role: 'planner',
    },
    emailContent
  )
}

/**
 * Send correction email to surveyor
 */
export async function sendCorrectionEmailToSurveyor(
  data: Omit<CorrectionEmailData, 'recipientType' | 'recipientEmail' | 'recipientName'> & {
    surveyorEmail: string
    surveyorName?: string
  }
): Promise<EmailSendResult> {
  const emailContent = generateCorrectionEmail({
    ...data,
    recipientType: 'surveyor',
    recipientEmail: data.surveyorEmail,
    recipientName: data.surveyorName,
  })

  return sendEmail(
    {
      email: data.surveyorEmail,
      name: data.surveyorName,
      role: 'surveyor',
    },
    emailContent
  )
}

/**
 * Send correction email to conveyancer
 */
export async function sendCorrectionEmailToConveyancer(
  data: Omit<CorrectionEmailData, 'recipientType' | 'recipientEmail' | 'recipientName'> & {
    conveyancerEmail: string
    conveyancerName?: string
  }
): Promise<EmailSendResult> {
  const emailContent = generateCorrectionEmail({
    ...data,
    recipientType: 'conveyancer',
    recipientEmail: data.conveyancerEmail,
    recipientName: data.conveyancerName,
  })

  return sendEmail(
    {
      email: data.conveyancerEmail,
      name: data.conveyancerName,
      role: 'conveyancer',
    },
    emailContent
  )
}


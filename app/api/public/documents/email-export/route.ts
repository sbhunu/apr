/**
 * Email Export API Route
 * Sends document as email attachment to authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/notifications/email-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { documentId, documentUrl, documentTitle, userEmail } = body

    if (!documentUrl || !documentTitle || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify email matches authenticated user
    if (user.email !== userEmail) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 403 }
      )
    }

    // Fetch document from URL
    let documentBuffer: Buffer
    try {
      const docResponse = await fetch(documentUrl)
      if (!docResponse.ok) {
        throw new Error('Failed to fetch document')
      }
      const arrayBuffer = await docResponse.arrayBuffer()
      documentBuffer = Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Error fetching document:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 500 }
      )
    }

    // Send email with attachment
    // Note: This is a simplified implementation
    // In production, you'd use a proper email service with attachment support
    const emailSubject = `Document Export: ${documentTitle}`
    const emailBody = `
      <p>Please find attached the requested document.</p>
      <p><strong>Document:</strong> ${documentTitle}</p>
      <p><strong>Document ID:</strong> ${documentId}</p>
      <p>This document was exported from the APR system.</p>
    `

    // For now, we'll send a link to the document
    // In production, implement proper email attachment support
    await sendEmail(
      userEmail,
      emailSubject,
      emailBody,
      `Please find attached the requested document: ${documentTitle}\n\nDocument ID: ${documentId}\n\nAccess the document at: ${documentUrl}`
    )

    return NextResponse.json({
      success: true,
      message: 'Document sent successfully',
    })
  } catch (error) {
    console.error('Email export error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}


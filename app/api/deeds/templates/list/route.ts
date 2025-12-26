/**
 * List available certificate templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRBACMiddleware } from '@/lib/admin/rbac'
import { templateManager } from '@/lib/documents/template-manager'
import { withErrorHandler } from '@/lib/api-error-handler'

export const GET = createRBACMiddleware({
  requiredPermissions: ['deeds:read'],
})(async (_request: NextRequest) => {
  return withErrorHandler(async () => {
    const templates = templateManager.listTemplates('certificate')

    const templateList = templates.map((template) => {
      const metadata = template.getMetadata()
      return {
        id: metadata.id,
        name: metadata.name,
        version: metadata.version,
        description: metadata.description,
        type: metadata.type,
      }
    })

    return NextResponse.json({
      success: true,
      templates: templateList,
    })
  })
})


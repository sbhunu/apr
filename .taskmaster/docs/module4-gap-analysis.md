# Module 4: Deeds Creation & Registration - Gap Analysis

## Current Implementation Status

### ✅ Implemented Features

1. **Drafting UI** (`/deeds/titles/draft`)
   - Section selection
   - Legal description editor
   - Holder information form
   - Draft saving

2. **Examination UI** (`/deeds/examination`)
   - Pending titles list
   - Detailed examination page with checklist
   - Cross-validation with survey
   - Approve/Reject/Request Revision workflow

3. **Registration UI** (`/deeds/registration`)
   - Approved titles list
   - Title registration workflow

4. **Certificate Generation** (`/deeds/certificates/generate`)
   - Registered titles list
   - Batch certificate generation
   - Single certificate generation

5. **Backend Services**
   - `drafting-service.ts` - Draft management
   - `examination-service.ts` - Examination workflow
   - `title-registration.ts` - Registration logic
   - `certificate-service.ts` - Certificate generation

### ❌ Missing Features (Per Integrated Plan)

#### 1. Scheme & Survey Selection Workflow
**Requirement**: "Select approved scheme & sealed survey"
- **Current**: Drafting page allows section selection but doesn't show scheme/survey context clearly
- **Missing**: 
  - Dedicated scheme selection page before drafting
  - Visual display of sealed survey status
  - Scheme metadata display (location, registration date, Body Corporate info)

#### 2. Property Description Upload
**Requirement**: "Draft unit-level legal descriptions and Property Description Upload"
- **Current**: Legal description is text-only
- **Missing**:
  - File upload for property descriptions
  - Document attachment to drafts
  - Document versioning

#### 3. GIS Viewer Integration
**Requirement**: "GIS viewer (to be able to 'see' the location of property)"
- **Current**: No GIS viewer in drafting/examination pages
- **Missing**:
  - Map display showing property location
  - Section boundaries visualization
  - Scheme layout display
  - Integration with Leaflet/PostGIS

#### 4. Documents Viewer
**Requirement**: "Documents Viewer (pdf/image)"
- **Current**: No document viewer component
- **Missing**:
  - PDF viewer component
  - Image viewer component
  - Document gallery for related documents
  - Integration with Supabase Storage

#### 5. Template Selection for Certificates
**Requirement**: "The system must provide an option to choose which template to use"
- **Current**: Certificate generation uses default template
- **Missing**:
  - Template selection UI
  - Multiple certificate templates
  - Template preview

#### 6. Communal Authorization Cross-Validation
**Requirement**: "Cross-validation with: Communal authorization"
- **Current**: Cross-validation only checks SG plans
- **Missing**:
  - Communal land custodian verification
  - Communal tenure rules validation
  - Authorization document checks

#### 7. Email Notifications
**Requirement**: "The system must be able to send a correction email to the planning scheme, and a Land Surveyor of interest"
- **Current**: No email notification system
- **Missing**:
  - Email service integration
  - Correction notification emails
  - Planner notification on defects
  - Surveyor notification on defects

#### 8. Automated Certificate Generation
**Requirement**: "Automated Certificate of Sectional Title Generation"
- **Current**: Manual certificate generation only
- **Missing**:
  - Automatic generation on title registration
  - Background job for certificate generation
  - Notification when certificate is ready

#### 9. Property Records Analysis
**Requirement**: "Ability to analyse all records relating to a property"
- **Current**: No comprehensive property view
- **Missing**:
  - Property detail page showing all related records
  - Timeline/history view
  - Related documents, plans, surveys, titles
  - Cross-module data aggregation

#### 10. Digital Signature Integration
**Requirement**: "All Submitted records must be digitally signed or manually signed or both"
- **Current**: PKI integration exists but may not be fully wired
- **Missing**:
  - Digital signature UI in drafting submission
  - Manual signature fallback
  - Signature verification display

## Implementation Priority

### Phase 1: Critical Workflow Enhancements
1. **Scheme Selection UI** - Improve drafting entry point
2. **GIS Viewer Integration** - Add map visualization
3. **Documents Viewer** - Add PDF/image viewing
4. **Template Selection** - Add certificate template choice

### Phase 2: Validation & Compliance
5. **Communal Authorization Validation** - Add tenure checks
6. **Email Notifications** - Add correction emails
7. **Property Records Analysis** - Add comprehensive property view

### Phase 3: Automation & Polish
8. **Automated Certificate Generation** - Auto-generate on registration
9. **Property Description Upload** - Add file upload capability
10. **Enhanced Digital Signatures** - Improve signature workflow

## Next Steps

1. Create implementation plan for Phase 1 features
2. Build scheme selection hub page
3. Integrate GIS viewer component
4. Create document viewer component
5. Add template selection to certificate generation


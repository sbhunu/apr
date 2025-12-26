# APR System User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Planning Module](#planning-module)
4. [Survey Module](#survey-module)
5. [Deeds Module](#deeds-module)
6. [Operations Module](#operations-module)
7. [Public Portal](#public-portal)
8. [Administration](#administration)
9. [Troubleshooting](#troubleshooting)
10. [Support](#support)

## Introduction

### About APR System

The Automated Property Registration (APR) system is a comprehensive digital platform for managing sectional title registrations in Zimbabwe. The system streamlines the entire process from planning approval through to title registration and certificate issuance.

### System Overview

The APR system consists of four main modules:

1. **Planning Module**: For planning officers to submit and review scheme applications
2. **Survey Module**: For surveyors to upload survey data and generate scheme plans
3. **Deeds Module**: For conveyancers and examiners to draft and review legal documents
4. **Operations Module**: For post-registration operations like transfers and mortgages

### Key Features

- **Digital Workflow**: Complete paperless process
- **Spatial Data Management**: GIS integration for accurate boundary management
- **Digital Signatures**: PKI-based signatures for legal compliance
- **Real-time Tracking**: Track application status throughout the process
- **Certificate Verification**: Public portal for certificate authenticity verification

## Getting Started

### System Access

1. Navigate to: https://apr.gov.zw
2. Click "Login" in the top right corner
3. Enter your username and password
4. Click "Sign In"

### First-Time Login

1. You will be prompted to complete your profile
2. Enter your professional registration number
3. Upload your professional certificate
4. Select your role and organization
5. Submit for approval

### Dashboard Overview

After login, you'll see your personalized dashboard showing:

- **Pending Tasks**: Items requiring your attention
- **Recent Activity**: Your recent submissions and reviews
- **Statistics**: Key metrics for your role
- **Quick Actions**: Common tasks shortcuts

### Navigation

- **Top Navigation Bar**: Access main modules and user menu
- **Sidebar**: Module-specific navigation (when applicable)
- **Breadcrumbs**: Shows your current location in the system

## Planning Module

### Creating a New Scheme Application

1. Navigate to **Planning** → **New Scheme**
2. **Step 1: Scheme Metadata**
   - Enter scheme name
   - Select location
   - Enter description
   - Specify number of sections
   - Click "Next"

3. **Step 2: Planner Information**
   - Enter planner name
   - Enter registration number
   - Select organization
   - Click "Next"

4. **Step 3: Documents**
   - Upload planning documents (PDF, DOCX)
   - Review uploaded files
   - Click "Submit"

### Reviewing Scheme Applications

1. Navigate to **Planning** → **Review**
2. Select a pending scheme from the list
3. Review scheme details and documents
4. Complete the review checklist:
   - Compliance items
   - Technical requirements
   - Legal considerations
   - Spatial requirements
5. Add review notes if needed
6. Click **Approve** or **Request Revision**

### Tracking Application Status

- Navigate to **Planning** → **My Applications**
- View status: Draft, Submitted, Under Review, Approved, Revision Requested
- Click on an application to view details and history

## Survey Module

### Uploading Parent Parcel Coordinates

1. Navigate to **Survey** → **Computations** → **Upload Coordinates**
2. Select the approved planning plan
3. Choose coordinate file format (CSV, Shapefile, KML)
4. Upload coordinate file
5. Review parsed coordinates in the table
6. Verify geometry on the map
7. Check closure error (must be within tolerance)
8. Click "Save Geometry"

### Coordinate File Format

CSV format example:
```
Point,Eastings,Northings
1,500000.00,8000000.00
2,500100.00,8000000.00
3,500100.00,8000100.00
4,500000.00,8000100.00
```

### Executing Survey Computations

1. Navigate to **Survey** → **Computations**
2. Select survey plan with uploaded geometry
3. Click "Execute Computation"
4. Review computation report:
   - Closure error
   - Accuracy ratio
   - Area calculation
   - Quality control results
5. If acceptable, proceed to generate sections

### Generating Sectional Geometries

1. Navigate to **Survey** → **Geometries** → **Generate**
2. Select survey plan with computed outside figure
3. Review planning specifications
4. Click "Generate Sections"
5. Review generated sections:
   - Verify containment (all sections within parent)
   - Check for overlaps
   - Review floor levels
6. Calculate participation quotas

### Calculating Participation Quotas

1. Navigate to **Survey** → **Quotas** → **Calculate**
2. Select survey plan
3. Review calculated quotas
4. Verify quotas sum to 100%
5. Adjust quotas manually if needed (with justification)
6. Save quotas

### Surveyor-General Review

1. Navigate to **Survey** → **Approval**
2. Select survey plan for review
3. Complete compliance checklist:
   - Geometry accuracy
   - Compliance with regulations
   - Documentation completeness
   - Legal requirements
4. Review survey data and computations
5. Add review notes
6. Click **Seal** to apply digital seal
7. Verify seal hash and signature

## Deeds Module

### Drafting Legal Descriptions

1. Navigate to **Deeds** → **Drafting**
2. Select sealed survey plan
3. Choose section to draft
4. Review legal description template (pre-populated)
5. Enter holder information:
   - Holder name
   - Holder type (Individual/Company)
   - ID number
6. Review and edit:
   - Legal description
   - Rights and conditions
   - Restrictions
7. Validate against survey data
8. Save draft

### Submitting Deeds for Examination

1. Navigate to **Deeds** → **My Drafts**
2. Select completed draft
3. Review all information
4. Click "Submit for Examination"
5. Confirm submission
6. Track status: Submitted → Under Examination → Approved/Revision Requested

### Deeds Examination

1. Navigate to **Deeds** → **Examination**
2. Select submitted deed packet
3. Complete examination checklist:
   - Legal compliance
   - Survey cross-reference
   - Holder information
   - Documentation
   - Tenure conditions
4. Cross-validate with sealed survey
5. Identify any defects
6. Click **Approve** or **Request Revision**

### Title Registration

1. Navigate to **Deeds** → **Registration**
2. Select approved deed packet
3. Review all documentation
4. System allocates unique title number
5. Review title number
6. Apply registrar digital signature
7. Click "Register Title"
8. Certificate generates automatically

## Operations Module

### Ownership Transfer

1. Navigate to **Operations** → **Transfers**
2. Select registered title
3. Click "Transfer Ownership"
4. Enter new holder information
5. Upload transfer documents
6. Review stamp duty calculation
7. Submit transfer
8. New certificate generates automatically

### Mortgage Registration

1. Navigate to **Operations** → **Mortgages**
2. Select registered title
3. Click "Register Mortgage"
4. Enter lender information
5. Enter mortgage amount
6. Upload mortgage documents
7. Submit registration
8. Encumbrance notation added to certificate

### Scheme Amendments

1. Navigate to **Operations** → **Amendments**
2. Select scheme
3. Select amendment type:
   - Scheme extension
   - Section subdivision
   - Section consolidation
4. Upload amendment documents
5. Submit for approval
6. Track through approval workflow

## Public Portal

### Certificate Verification

1. Navigate to: https://apr.gov.zw/verify
2. Enter certificate number OR scan QR code
3. Click "Verify"
4. Review verification results:
   - Certificate details
   - Hash validation status
   - Signature validation status
   - Registration date
   - Current status

### Public Dashboard

1. Navigate to: https://apr.gov.zw
2. View national statistics:
   - Total registrations
   - Monthly trends
   - Provincial breakdown
   - System performance

## Administration

### User Management

1. Navigate to **Admin** → **Users**
2. View user list
3. Click on user to:
   - View profile
   - Update role
   - Activate/deactivate account
   - View activity log

### System Monitoring

1. Navigate to **Admin** → **Monitoring**
2. View system metrics:
   - Performance metrics
   - Error rates
   - User activity
   - System health

### Backup Status

1. Navigate to **Admin** → **Backups**
2. View backup status:
   - Latest backups
   - Backup age
   - Verification status

## Troubleshooting

### Common Issues

#### Cannot Login
- Verify username and password
- Check if account is active
- Contact administrator if locked out

#### File Upload Fails
- Check file size (max 50MB)
- Verify file format (PDF, DOCX, CSV)
- Check internet connection
- Try smaller file

#### Coordinate Parsing Errors
- Verify file format matches template
- Check coordinate system (UTM Zone 35S)
- Ensure all required columns present
- Validate coordinate values

#### Workflow Not Progressing
- Check all required fields completed
- Verify previous step completed
- Review error messages
- Contact support if issue persists

### Error Messages

**"Invalid coordinates"**
- Verify coordinate format
- Check coordinate system
- Ensure values within valid range

**"Workflow transition not allowed"**
- Verify current status
- Check user role permissions
- Ensure prerequisites met

**"File too large"**
- Reduce file size
- Compress images
- Split large documents

## Support

### Getting Help

- **Help Documentation**: Available in system
- **Email Support**: support@apr.gov.zw
- **Phone Support**: [Phone Number]
- **Office Hours**: Monday-Friday, 8:00 AM - 5:00 PM

### Reporting Issues

1. Navigate to **Help** → **Report Issue**
2. Fill in issue form:
   - Description
   - Steps to reproduce
   - Screenshots (if applicable)
   - Your contact information
3. Submit issue
4. Track resolution in "My Issues"

### Training Resources

- **Video Tutorials**: Available in Help section
- **User Guides**: Downloadable PDFs
- **Training Sessions**: Scheduled monthly
- **FAQ**: Frequently asked questions

## Appendix

### Keyboard Shortcuts

- `Ctrl + S`: Save draft
- `Ctrl + Enter`: Submit form
- `Esc`: Cancel/Close dialog
- `Ctrl + F`: Search

### File Format Requirements

- **Documents**: PDF, DOCX (max 50MB)
- **Images**: JPG, PNG (max 10MB)
- **Coordinates**: CSV, Shapefile, KML
- **Certificates**: PDF only

### Browser Requirements

- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

### System Requirements

- Internet connection: Broadband recommended
- Screen resolution: 1280x720 minimum
- JavaScript: Must be enabled
- Cookies: Must be enabled


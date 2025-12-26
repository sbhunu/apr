# User Acceptance Testing (UAT) Guide

## Overview

This guide provides comprehensive procedures for conducting User Acceptance Testing (UAT) of the Automated Property Registration (APR) system. UAT ensures the system meets user requirements and is ready for production deployment.

## UAT Objectives

1. **Validate Functionality**: Verify all features work as expected
2. **User Experience**: Ensure the system is intuitive and user-friendly
3. **Performance**: Confirm system meets performance requirements
4. **Integration**: Verify all modules work together seamlessly
5. **Compliance**: Ensure system meets legal and regulatory requirements
6. **Training**: Prepare users for system operation

## UAT Participants

### Core Testing Team

- **Planning Officers** (2-3 users)
- **Surveyors** (2-3 users)
- **Conveyancers** (2-3 users)
- **Deeds Examiners** (2 users)
- **Registrars** (1-2 users)
- **System Administrators** (1-2 users)
- **IT Support Staff** (1-2 users)

### Roles and Responsibilities

- **UAT Coordinator**: Manages UAT process, tracks issues, coordinates testing
- **Test Users**: Execute test scenarios, report issues, provide feedback
- **Technical Support**: Resolves technical issues, provides guidance
- **Business Analysts**: Validates business requirements, reviews results

## UAT Environment

### Test Environment Setup

- **URL**: https://apr-staging.example.com
- **Database**: Staging Supabase project with test data
- **Access**: Test accounts for each user role
- **Data**: Pre-loaded test schemes, surveys, and titles

### Test Data Requirements

- Sample planning applications (various provinces)
- Test survey plans with different configurations
- Sample deeds packets
- Test certificates and documents
- Mock user accounts for all roles

## UAT Test Scenarios

### Module 1: Planning Module

#### Scenario 1.1: Create New Scheme Application
**Objective**: Verify planners can create and submit scheme applications

**Steps**:
1. Login as Planning Officer
2. Navigate to "New Scheme Application"
3. Fill in scheme metadata (name, location, description)
4. Enter planner information
5. Upload planning documents
6. Review and submit application
7. Verify submission confirmation

**Expected Results**:
- Form accepts valid data
- File uploads work correctly
- Submission creates draft record
- Confirmation message displayed
- Application appears in "My Applications"

**Acceptance Criteria**:
- ✅ All form fields validate correctly
- ✅ File upload accepts valid formats
- ✅ Draft saves automatically
- ✅ Submission workflow initiates

#### Scenario 1.2: Review and Approve Scheme
**Objective**: Verify Planning Authority can review and approve schemes

**Steps**:
1. Login as Planning Authority Officer
2. Navigate to "Review Dashboard"
3. Select pending scheme
4. Complete review checklist
5. Add review notes
6. Approve scheme
7. Verify plan locks after approval

**Expected Results**:
- Review dashboard shows pending schemes
- Checklist items can be completed
- Approval workflow executes
- Plan becomes locked (immutable)
- Notification sent to planner

**Acceptance Criteria**:
- ✅ Review checklist covers all requirements
- ✅ Approval workflow transitions correctly
- ✅ Plan locking prevents edits
- ✅ Notifications sent appropriately

### Module 2: Survey Module

#### Scenario 2.1: Upload Parent Parcel Coordinates
**Objective**: Verify surveyors can upload and validate coordinate data

**Steps**:
1. Login as Surveyor
2. Navigate to approved planning plan
3. Select "Upload Coordinates"
4. Upload coordinate file (CSV format)
5. Review parsed coordinates
6. Verify geometry on map
7. Validate closure error
8. Save geometry

**Expected Results**:
- Coordinate file parses correctly
- Coordinates display in table
- Geometry visualizes on map
- Closure error calculated
- Geometry saves to database

**Acceptance Criteria**:
- ✅ Multiple coordinate formats supported
- ✅ Parsing handles edge cases
- ✅ Map visualization accurate
- ✅ Closure validation works

#### Scenario 2.2: Execute Survey Computations
**Objective**: Verify survey computation engine produces accurate results

**Steps**:
1. Select survey plan with uploaded geometry
2. Navigate to "Computations"
3. Execute outside figure computation
4. Review computation report
5. Verify closure error within tolerance
6. Check accuracy assessment

**Expected Results**:
- Computation executes successfully
- Report shows closure error
- Accuracy ratio calculated
- Quality control checks pass
- Results stored in database

**Acceptance Criteria**:
- ✅ Closure error within 1:10,000 tolerance
- ✅ Area calculations accurate
- ✅ Accuracy assessment correct
- ✅ Report format professional

#### Scenario 2.3: Generate Sectional Geometries
**Objective**: Verify system generates unit geometries from planning specs

**Steps**:
1. Select survey plan with computed outside figure
2. Navigate to "Generate Sections"
3. Review planning specifications
4. Execute geometry generation
5. Review generated sections
6. Verify containment and overlap checks
7. Calculate participation quotas

**Expected Results**:
- Geometries generated for all units
- All sections contained within parent
- No overlaps detected
- Quotas calculated correctly
- Quotas sum to 100%

**Acceptance Criteria**:
- ✅ All units have valid geometries
- ✅ Containment validation passes
- ✅ Overlap detection works
- ✅ Quota calculation accurate

#### Scenario 2.4: Surveyor-General Review and Sealing
**Objective**: Verify SG can review and digitally seal survey plans

**Steps**:
1. Login as Surveyor-General Officer
2. Navigate to "Survey Review"
3. Select survey plan for review
4. Complete compliance checklist
5. Review survey data and computations
6. Add review notes
7. Apply digital seal
8. Verify seal hash and signature

**Expected Results**:
- Review checklist available
- Survey data displays correctly
- Digital seal applies successfully
- Seal hash generated
- Survey status changes to "sealed"
- Survey becomes immutable

**Acceptance Criteria**:
- ✅ Review process comprehensive
- ✅ Digital seal applies correctly
- ✅ Seal verification works
- ✅ Immutability enforced

### Module 3: Deeds Module

#### Scenario 3.1: Draft Legal Descriptions
**Objective**: Verify conveyancers can draft unit legal descriptions

**Steps**:
1. Login as Conveyancer
2. Navigate to "Deeds Drafting"
3. Select sealed survey plan
4. Choose section for drafting
5. Review legal description template
6. Enter holder information
7. Add conditions and restrictions
8. Validate against survey data
9. Save draft

**Expected Results**:
- Templates populate with survey data
- Legal descriptions editable
- Validation checks consistency
- Draft saves successfully
- Warnings shown for discrepancies

**Acceptance Criteria**:
- ✅ Templates accurate and complete
- ✅ Validation prevents errors
- ✅ Draft saving works reliably
- ✅ Survey data integration correct

#### Scenario 3.2: Deeds Examination
**Objective**: Verify Deeds Examiners can review and approve deeds

**Steps**:
1. Login as Deeds Examiner
2. Navigate to "Examination Dashboard"
3. Select submitted deed packet
4. Complete examination checklist
5. Cross-validate with sealed survey
6. Identify any defects
7. Approve or request revision
8. Submit examination decision

**Expected Results**:
- Examination checklist available
- Cross-validation works correctly
- Defects identified and documented
- Approval workflow executes
- Notifications sent to conveyancer

**Acceptance Criteria**:
- ✅ Examination process thorough
- ✅ Cross-validation accurate
- ✅ Defect tracking works
- ✅ Workflow transitions correctly

#### Scenario 3.3: Title Registration
**Objective**: Verify Registrars can register approved titles

**Steps**:
1. Login as Registrar
2. Navigate to "Title Registration"
3. Select approved deed packet
4. Review all documentation
5. Allocate unique title number
6. Apply registrar signature
7. Register title
8. Generate registration certificate

**Expected Results**:
- Title number allocated uniquely
- Registration creates immutable record
- Certificate generated with QR code
- Title status changes to "registered"
- Notification sent to holder

**Acceptance Criteria**:
- ✅ Title numbers unique
- ✅ Registration immutable
- ✅ Certificates complete
- ✅ QR codes functional

### Module 4: Operations Module

#### Scenario 4.1: Ownership Transfer
**Objective**: Verify ownership transfer processing

**Steps**:
1. Login as Conveyancer
2. Navigate to registered title
3. Select "Transfer Ownership"
4. Enter new holder information
5. Upload transfer documents
6. Calculate stamp duty
7. Submit transfer
8. Verify new certificate issued

**Expected Results**:
- Transfer form validates correctly
- Stamp duty calculated accurately
- Transfer processes successfully
- New certificate generated
- Ownership updated in register

**Acceptance Criteria**:
- ✅ Transfer validation works
- ✅ Stamp duty calculation correct
- ✅ Certificate reissuance works
- ✅ Register updated accurately

#### Scenario 4.2: Mortgage Registration
**Objective**: Verify mortgage registration system

**Steps**:
1. Login as Conveyancer
2. Navigate to registered title
3. Select "Register Mortgage"
4. Enter lender information
5. Enter mortgage amount
6. Upload mortgage documents
7. Submit registration
8. Verify encumbrance notation

**Expected Results**:
- Mortgage registers successfully
- Encumbrance appears on certificate
- Priority handling works correctly
- Lender verification successful

**Acceptance Criteria**:
- ✅ Mortgage registration works
- ✅ Encumbrance notation correct
- ✅ Priority system functions
- ✅ Discharge process works

### Module 5: Public Portal

#### Scenario 5.1: Certificate Verification
**Objective**: Verify public can verify certificate authenticity

**Steps**:
1. Navigate to public verification portal
2. Enter certificate number OR scan QR code
3. Submit verification request
4. Review verification results
5. Verify hash and signature validation

**Expected Results**:
- Certificate found by number
- QR code scanning works
- Verification results accurate
- Hash validation works
- Signature verification successful

**Acceptance Criteria**:
- ✅ Certificate lookup works
- ✅ QR code scanning functional
- ✅ Verification accurate
- ✅ Security features work

#### Scenario 5.2: Public Dashboard
**Objective**: Verify public dashboard displays statistics

**Steps**:
1. Navigate to public landing page
2. Review national statistics
3. View provincial breakdown
4. Check monthly trends
5. Verify no sensitive data exposed

**Expected Results**:
- Statistics display correctly
- Charts render properly
- Data updates in real-time
- No sensitive information visible

**Acceptance Criteria**:
- ✅ Statistics accurate
- ✅ Visualizations clear
- ✅ Performance acceptable
- ✅ Security maintained

## UAT Execution Process

### Phase 1: Preparation (Week 1)

1. **Environment Setup**
   - Configure staging environment
   - Load test data
   - Create test user accounts
   - Set up monitoring

2. **Training Sessions**
   - System overview presentation
   - Role-specific training
   - Hands-on practice sessions
   - Q&A sessions

3. **Test Plan Review**
   - Review test scenarios
   - Assign test cases to users
   - Clarify acceptance criteria
   - Set testing schedule

### Phase 2: Execution (Weeks 2-3)

1. **Daily Testing**
   - Execute assigned test scenarios
   - Document results
   - Report issues immediately
   - Daily standup meetings

2. **Issue Tracking**
   - Log all issues in tracking system
   - Prioritize critical issues
   - Track resolution progress
   - Verify fixes

3. **Progress Monitoring**
   - Track test completion
   - Monitor issue resolution
   - Review daily progress
   - Adjust schedule as needed

### Phase 3: Review and Sign-off (Week 4)

1. **Results Review**
   - Compile test results
   - Review issue log
   - Assess system readiness
   - Prepare UAT report

2. **User Sign-off**
   - Present UAT results
   - Obtain user sign-off
   - Document outstanding issues
   - Plan go-live date

## Issue Tracking

### Issue Severity Levels

- **Critical**: System unusable, blocks core functionality
- **High**: Major feature broken, workaround available
- **Medium**: Minor feature issue, acceptable workaround
- **Low**: Cosmetic issue, enhancement request

### Issue Reporting Template

```
Issue ID: [Auto-generated]
Title: [Brief description]
Module: [Planning/Survey/Deeds/etc.]
Severity: [Critical/High/Medium/Low]
Reporter: [Name]
Date: [Date]

Description:
[Detailed description of the issue]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Result:
[What should happen]

Actual Result:
[What actually happens]

Screenshots:
[Attach screenshots if applicable]

Environment:
- Browser: [Browser and version]
- Role: [User role]
- Test Data: [Reference test data used]
```

## Acceptance Criteria

### Overall System Acceptance

- ✅ All critical test scenarios pass
- ✅ No critical or high-severity issues unresolved
- ✅ Performance meets requirements (<2s response time)
- ✅ Security requirements met
- ✅ User training completed
- ✅ Documentation complete
- ✅ Support procedures established

### Module-Specific Acceptance

Each module must meet:
- ✅ All core functionality works
- ✅ User workflows complete successfully
- ✅ Data integrity maintained
- ✅ Integration with other modules works
- ✅ Error handling appropriate
- ✅ User interface intuitive

## UAT Sign-off

### Sign-off Requirements

- **Planning Module**: [ ] Approved by Planning Authority
- **Survey Module**: [ ] Approved by Surveyor-General
- **Deeds Module**: [ ] Approved by Deeds Office
- **Operations Module**: [ ] Approved by Operations Manager
- **Public Portal**: [ ] Approved by Public Relations
- **System Administration**: [ ] Approved by IT Manager

### Sign-off Form

```
UAT Sign-off Form

System: Automated Property Registration (APR)
Version: 1.0.0
UAT Period: [Start Date] to [End Date]

I have reviewed the UAT results and confirm:

[ ] All critical test scenarios passed
[ ] System meets business requirements
[ ] User training completed
[ ] Documentation reviewed
[ ] Ready for production deployment

Name: _________________________
Role: _________________________
Date: _________________________
Signature: ____________________
```

## Post-UAT Activities

1. **Issue Resolution**
   - Fix all critical and high issues
   - Retest fixed issues
   - Verify system stability

2. **Documentation Updates**
   - Update user manuals
   - Revise training materials
   - Update system documentation

3. **Go-Live Preparation**
   - Finalize go-live plan
   - Prepare support team
   - Schedule go-live date
   - Communicate to stakeholders


**Automated Property Registration (APR) System**

**Enterprise Architecture Description Document**

**Context:** Sectional Titles on Communal Land – Zimbabwe\
**System Role:** National Land Administration & Deeds Registration Platform

-----
**1. Executive Overview**

The **Automated Property Registration (APR) System** is a **national enterprise land administration platform** supporting the **end-to-end lifecycle of sectional titles on communal land**, from **planning approval** through **survey validation**, **scheme registration**, and **issuance of legally defensible Certificates of Sectional Title**.

Below, is the architecture of an **Automated Property Registration** system for sectional Titles on Communal land in Zimbabwe. The eventual output will be Sectional Titles Plan for the Scheme and Certificate of Sectional Title for individual Unit. The system will have    a number of elements: 

1. Plan submission-A detailed plan is submitted by the Planner(s), with accompanying information of the Proposed Units, Proposed Areas, and Graphical Layout. 
1. The Survey Computation- Uploading of Parent property, -Upload of outside figure coordinates. Computation of Areas, production of Sectional Scheme Plans, verifications and approval and digital sign-off 
1. Deeds Creation and Registration: Upload property description, Generation of Certificate of Sectional Title and digitally sign-off. 


APR acts as:

- **A system of record** for planning, survey, and deeds
- **A workflow orchestration engine**
- **A spatial truth repository**
- **A legal and records authority**, with immutable audit trails

The system enforces **strict institutional separation of duties**:

- Planning defines *intent*
- Survey defines *geometry*
- Deeds defines *rights*
- APR guarantees *traceability, integrity, and trust*
-----
**2. Architectural Principles**

1. **Planner-Initiated Lifecycle**\
   No scheme exists unless initiated and approved by Planning Authority.
1. **Spatial Certainty Before Legal Rights**\
   Deeds registration is impossible without SG-sealed survey data.
1. **Immutability & Legal Traceability**\
   Records are never deleted, only superseded.
1. **Role-Based Authority (RBAC)**\
   Users only act within their statutory mandate.
1. **Digital-by-Default with Manual Fallback**\
   Supports both digital and wet signatures.
1. **Enterprise Scalability**\
   Designed for national volumes, multi-province operations, and inter-agency integrations.
-----
**3. High-Level System Architecture**

**Logical Layers**

1. **Presentation Layer**
   1. Web (Next.js)
   1. Role-specific dashboards
   1. GIS Viewer & Document Viewer
1. **Application & Workflow Layer**
   1. Supabase Edge Functions
   1. State-machine driven workflows
   1. Rule-based validations
1. **Spatial & Data Layer**
   1. PostgreSQL + PostGIS
   1. Versioned schemas (APR-prefixed)
1. **Security & Trust Layer**
   1. Supabase Auth
   1. External PKI (EJBCA or equivalent)
   1. Immutable audit logs
1. **Integration Layer**
   1. Financial institutions
   1. Courts
   1. National ID / Civil Registry
   1. Land Commission systems
-----
**4. Functional Modules with Workflows, CRUD & RBAC**

-----
**MODULE 0: Public Landing & National Dashboard**

**Purpose**

Public-facing information, transparency, and national statistics.

General Conditions:

1\.	The Landing page, module 0, will be accessible to all users

2\.	Module 1 : Accessible to Planners

3\.	Module 2: Land surveying Professionals

4\.	Module 3 and Module 4: Deeds Staff and Conveyancers

5\.	Module5: Dsignated Staff member from Planning, deeds, and Surveyor General

6\.	Module 6: Registered Users Approved 

7\.	Module 7: All registered

The Landing Page must have a modern navigation menu with links to different routes. Also, there must be summarised dash board with key statistics:



**Key Features**

- National inscription: **“Automating Communal Sectional Titles”**
- Public dashboards:
  - Deeds processed per month
  - Plans uploaded per province
  - Annual registration totals
- Read-only access

**CRUD**

|**Entity**|**C**|**R**|**U**|**D**|
| :-: | :-: | :-: | :-: | :-: |
|Statistics|✖|✔|✖|✖|

**Roles**

- Public
- Registered Viewers
-----
**MODULE 1: Planning & Scheme Submission**

**Actors**

- Certified Planner
- Lands Department (Planning Authority)

**Workflow**

1. Planner creates scheme
1. Uploads planning layout & metadata
1. Planning Authority reviews
1. Approval → Plan locked
1. Workflow advances to Survey

**Core Functions**

- Digital plan submission
- Automated file & schema validation
- GIS visualization:
  - Parent land
  - Proposed scheme
  - Neighbouring cadastral parcels
- Versioning & digital signatures

**CRUD**

|**Entity**|**Planner**|**Planning Authority**|
| :-: | :-: | :-: |
|Scheme Plan|C/R/U|R/U|
|Documents|C/R|R|
|Status|✖|U|

**RBAC Rules**

- Surveyors **cannot edit planning data**
- Approved plans become **immutable**

**Plan/Scheme description:**

- Proposed Sectional Title Plan
- Scheme metadata:
  - Scheme name
  - Parent communal land identifier
  - Number of sections
  - Proposed participation quotas
- Unit schedules:
  - Section numbers
  - Proposed areas
  - Exclusive use areas (if any)

**Note:** 

This Module must include a GIS viewer, Documents Viewer (pdf/image) and also a list of submitted records and ability to edit, remove and submit. The System must Display in the GIS, parent property layer , Proposed Scheme and scheme units as well as neighbouring property as displayed in a cadastral layer

-----
**MODULE 2: Survey Computation & Spatial Verification**

**Actors**

- Professional Land Surveyor
- Surveyor-General Officer

**Workflow**

1. Retrieve approved planning plan
1. Upload parent parcel & control
   1. Parent communal land geometry
   1. Boundary coordinates
   1. Control points & datum
   1. Upload of:
      1. Cadastral framework
      1. GNSS or conventional survey metadata

1. **Compute outside figure (Automated & Manual Computations)**
   - Validate closure & accuracy
   - Compute:
     - Outside figure
     - Land area consistency
   - Check overlap with:
     - Adjacent communal lands
     - Public servitudes

1. **Generate sectional geometries** 

   For each unit:

- Compute:
  - Unit areas (m²)
  - Dimensions of boundaries 
  - Common areas  and Participating quotas
- Validate:
  - No overlaps
  - Full containment within building footprint
- Compute:
  - Common property
  - Participation quota (as per SA formula)

1. **Automated Sectional Scheme Plan Generation**

   System generates:

- Sectional Title Scheme Plan:
  - Sheets
  - Legends
  - Notes
- Section diagrams
- Area schedules
- Participation quota table
1. Surveyor-General Review & Approval
   1. Digital markup & corrections
   1. Compliance checklist (Act & Regulations)
   1. **Digital signature**
   1. Approval certificate



**Core Functions**

- Topology validation
- Area consistency checks
- Overlap detection
- Automated generation:
  - Section diagrams
  - Scheme plans
- Deduction of residual parent land

**CRUD**

|**Entity**|**Surveyor**|**SG Officer**|
| :-: | :-: | :-: |
|Survey Plan|C/R/U|R/U|
|Geometry|C/R/U|R|
|Approval Status|✖|U|

**Enforcement Rule**

🚫 Deeds cannot proceed unless **survey\_status = sealed**

**Note:**

- All Submitted records must be digitally signed or manually signed or both
- This Module must include a GIS viewer, Documents Viewer (pdf/image), and ability to analyse all records relating to a property. Also, the system must be able to send a correction email to the planning scheme, and an Land Surveyor of interest
- The System must provide for automatic creation of Individual Section Diagrams, Scheme plans as per store templates. 

The System will then update SG records relating to the remaining area of the parent property, If it was not utelised in whole-So called Deductions.

-----
**MODULE 3: Sectional Scheme Registration**

**Purpose**

Formal registration of the sectional scheme as a legal entity.

**Key Processes**

- Scheme number allocation
- Registration of:
  - Scheme
  - Common property
- Creation of:
  - Body Corporate (statutory)
- Link communal land custodian

**CRUD**

|**Entity**|**Deeds Office**|
| :-: | :-: |
|Scheme Register|C/R|
|Body Corporate|C/R|

-----
**MODULE 4: Deeds Creation & Registration**

**Actors**

- Conveyancer
- Deeds Examiner
- Registrar of Deeds

**Workflow**

1. Select approved scheme & sealed survey
1. Draft unit-level legal descriptions and Property Description Upload
   - Unit description (as per approved plan)
   - Participation quota
   - Rights & conditions
   - Restrictions (communal tenure overlays)

1. **Automated Certificate of Sectional Title Generation Deeds examination**

   System generates:

- Certificate of Sectional Title:
  - Unit number
  - Scheme name
  - Owner/rights holder
  - Conditions
- QR-coded and hash-secured document
1. **Deeds Registry Examination**
- Legal compliance checks
- Cross-validation with:
  - SG-approved plans
  - Communal authorization
- Digital endorsement
1. **Digital Registration & Issuance**
- Title registered in Deeds Registry
- Digital certificate issued
- Immutable audit record

**Core Outputs**

- QR-coded, hash-secured Certificates
- Multiple certificate templates
- GIS-based spatial verification

**CRUD**

|**Entity**|**Conveyancer**|**Deeds Office**|
| :-: | :-: | :-: |
|Sectional Title|C/R/U|R/U|
|Certificates|✖|C/R|

**Note:**

- All Submitted records must be digitally signed or manually signed or both
- This Module must include a GIS viewer (to be able to “see” the location of property in question, Documents Viewer (pdf/image), and ability to analyse all records relating to a property. The system must provide an option to choose which template to use in creation of Certificate of sectional Title.




-----
**MODULE 5: General Operations** 

**Capabilities**

- Rights transfers (inheritance, lease, mortgage)
- Scheme amendments & extensions
- Dispute & objection workflows
- User management & digital signatures

**Enterprise Features**

- RBAC enforcement
- PKI integration
- Immutable audit logs
- Multi-agency workflows

**5.1 Rights Management & Transfers**

- inheritance and ownership updates
- Mortgage or charge  
- Lease registration
- Integration with financial institutions records
-----
**5.2 Amendments & Extensions of Schemes**

- Section extensions
- Subdivision or consolidation of sections
- Exclusive use area changes
-----
**5.3 Dispute Resolution & Objections/ Records**

- Objection window after plan submission
- Dispute workflow involving:
  - Scheme Bodies  
  - District & Provincial Adminsitration, Land Commission and Ministry 



**6.0  User Access, Security & Compliance**

**Capabilities**

- User management & digital signatures

**Enterprise Features**

- RBAC enforcement
- PKI integration
- Immutable audit logs

This module must manage creation of Digital signatures and authentication

- Role-based access
- Digital signatures (Surveyor, Registrar, planner)
- Immutable audit logs
- Versioned legal documents
- Registration of New Users
- Role Allocations

**MODULE 7: Analytics & Reporting**

**Features**

- Spatial analytics (province, district)
- Performance dashboards
- Status tracking across lifecycle
- Exportable reports
-----
**MODULE 8: Records Verification**  

**Features**

- Public & institutional verification
- Address / document number lookup
- Signature and hash validation
- Read-only access for banks & courts
-----
**5. Technology Stack (Latest Stable – 2025)**

|**Layer**|**Technology**|
| :-: | :-: |
|Frontend|**Next.js  (App Router)**|
|UI|**Tailwind CSS**, **Shadcn/UI**, **Recharts**|
|Maps|**Leaflet**, PostGIS|
|Backend|**Supabase (PostgreSQL  + PostGIS)**|
|Auth|**Supabase Auth (JWT, RBAC)**|
|Storage|**Supabase Storage (S3-compatible)**|
|Workflows|**Supabase Edge Functions (Deno)**|
|Signatures|**External PKI (EJBCA)**|
|Analytics|PostGIS + SQL + Recharts|

-----
**6. National Enterprise Features (Additional)**

✔ Inter-ministerial integration\
✔ Court & bank verification portals\
✔ Disaster recovery & backups\
✔ Multi-language support\
✔ Legal time-stamping\
✔ Audit-ready compliance\
✔ Policy-driven configuration\
✔ Cloud or sovereign on-prem deployment

-----
1. **APR DATA SCHEMAS (CONSOLIDATED & PREFIXED)**

**Data Architecture (Key Registers)**

|**Register**|**Purpose**|
| :-: | :-: |
|Communal Land Register|Parent custodial land|
|Sectional Scheme Register|Scheme-level rights|
|Section Register|Unit-level rights|
|Survey Computation Register|Spatial truth|
|Deeds Register|Legal ownership|
|Body Corporate Register|Governance|



**apr.users**

- user\_id (PK)
- name
- role
- organization
- status
-----
**apr.sectional\_scheme\_plans**

- plan\_id (PK)
- scheme\_name
- planner\_id (FK → apr.users)
- approval\_status
- approval\_date
- locked
-----
**apr.survey\_sectional\_plans**

- survey\_id (PK)
- planning\_plan\_id (FK)
- status
- seal\_hash
- approval\_date
-----
**apr.sectional\_schemes**

- scheme\_id (PK)
- scheme\_number
- communal\_land\_id
- body\_corporate\_id
-----
**apr.sections**

- section\_id (PK)
- scheme\_id (FK)
- area
- participation\_quota
-----
**apr.sectional\_titles**

- title\_id (PK)
- section\_id (FK)
- holder\_id
- registration\_status
- digital\_signature\_id
-----
**apr.body\_corporates**

- body\_corporate\_id (PK)
- scheme\_id
- registration\_date
-----
**apr.digital\_signatures**

- signature\_id (PK)
- document\_id
- signed\_by
- role
- certificate\_serial
- signed\_at
-----
**apr.record\_registry**

- record\_id (PK)
- entity\_type
- entity\_id
- version
- hash
- status
- created\_at
-----
**8. Final Legally Defensible Outputs**

✔ Approved Sectional Scheme Plan\
✔ Section Diagrams\
✔ Registered Sectional Scheme\
✔ Certificate of Sectional Title (per unit)

-----
Below are **clear, implementation-ready BPMN diagrams per module**, expressed in **standard BPMN logic with swimlanes, events, gateways, and hand-offs**.\
They are written so they can be **directly translated into Supabase Edge Function workflows**, and they align exactly with your APR architecture, RBAC, and legal controls.

I’ve kept them **concise but precise**, suitable for:

- GUI flow design
- Workflow engine implementation
- Legal review
- Developer handover
-----
**BPMN – Automated Property Registration (APR)**

-----
**MODULE 0 – Public Landing & Statistics (Read-Only)**

**Swimlanes**

- Public User
- APR System

**BPMN Flow**

**Start Event**\
→ User accesses landing page\
→ APR System loads national statistics\
→ Display dashboards (read-only)\
→ **End Event**

📌 *No gateways; no state change*

-----
**MODULE 1 – Planning & Scheme Submission BPMN**

**Swimlanes**

- Planner
- Planning Authority (Lands Dept)
- APR System
-----
**BPMN Flow**

**Start Event**\
(Planner initiates scheme)

1. **Planner**
   1. Create Sectional Scheme Application
   1. Upload planning layout & documents
   1. Digitally sign submission
1. **APR System**
   1. Validate file formats
   1. Validate mandatory metadata
   1. Store versioned records
   1. Set status = submitted
1. **Planning Authority**
   1. Review planning compliance

**Exclusive Gateway – Approval Decision**

- ❌ Reject\
  → Record decision\
  → Notify Planner\
  → **End Event**
- ✅ Approve\
  → Digitally sign approval
4. **APR System**
   1. Lock planning record (locked = true)
   1. Set status = approved
   1. Route workflow to Survey module

**End Event – “Planning Approved”**

🚫 *Survey cannot start unless this end event is reached*

-----
**MODULE 2 – Survey Computation & SG Approval BPMN**

**Swimlanes**

- Land Surveyor
- Surveyor-General Officer
- APR System
-----
**BPMN Flow**

**Start Event**\
(Triggered by approved planning plan)

1. **Land Surveyor**
   1. Retrieve approved planning plan
   1. Upload parent parcel & control data
   1. Perform outside figure computation
   1. Generate sectional geometries
1. **APR System**
   1. Topology validation
   1. Area & overlap checks
   1. Compute participation quotas
   1. Generate scheme plan drafts
1. **Surveyor-General Officer**
   1. Review geometry & compliance
   1. Annotate corrections (if required)

**Exclusive Gateway – Geometry Compliance**

- ❌ Corrections Required\
  → Return to Surveyor\
  → Loop back to geometry update
- ✅ Compliant\
  → Digitally seal survey
4. **APR System**
   1. Store seal hash
   1. Set status = sealed
   1. Freeze spatial data
   1. Notify Deeds module

**End Event – “Survey Sealed”**

🚫 *Deeds cannot proceed unless survey is sealed*

-----
**MODULE 3 – Sectional Scheme Registration BPMN**

**Swimlanes**

- Deeds Registry Officer
- APR System
-----
**BPMN Flow**

**Start Event**\
(Triggered by sealed survey)

1. **APR System**
   1. Allocate sectional scheme number
1. **Deeds Registry Officer**
   1. Register:
      1. Sectional Scheme
      1. Common Property
      1. Body Corporate
1. **APR System**
   1. Persist scheme as legal entity
   1. Link communal land custodian
   1. Update scheme register

**End Event – “Scheme Registered”**

-----
**MODULE 4 – Deeds Creation & Registration BPMN**

**Swimlanes**

- Conveyancer
- Deeds Examiner
- Registrar of Deeds
- APR System
-----
**BPMN Flow**

**Start Event**\
(Scheme registered)

1. **Conveyancer**
   1. Select scheme & sealed survey
   1. Draft unit descriptions & conditions
   1. Submit deeds packet
1. **APR System**
   1. Validate against:
      1. SG plan
      1. Scheme register
      1. Communal tenure rules
1. **Deeds Examiner**
   1. Examine legal compliance

**Exclusive Gateway – Legal Compliance**

- ❌ Defects Found\
  → Return to Conveyancer\
  → Loop to correction
- ✅ Compliant\
  → Forward for registration
4. **Registrar of Deeds**
   1. Digitally register title
   1. Apply PKI signature
4. **APR System**
   1. Generate Certificate of Sectional Title
   1. Hash, QR-code & store
   1. Update deeds register

**End Event – “Title Issued”**

-----
**MODULE 5 – Operations, Amendments & Disputes BPMN**

**Swimlanes**

- Rights Holder / Applicant
- Regulatory Authority
- APR System
-----
**BPMN Flow**

**Start Event**\
(Operation request submitted)

1. **Applicant**
   1. Request:
      1. Transfer
      1. Lease
      1. Mortgage
      1. Amendment
      1. Objection
1. **APR System**
   1. Validate request type
   1. Identify responsible authority
1. **Regulatory Authority**
   1. Review request

**Exclusive Gateway – Decision**

- ❌ Reject\
  → Record reason\
  → Notify applicant\
  → **End Event**
- ✅ Approve\
  → Digitally sign decision
4. **APR System**
   1. Version affected records
   1. Preserve history
   1. Update current state

**End Event – “Operation Completed”**

-----
**MODULE 6 – Analytics & Reporting BPMN**

**Swimlanes**

- Authorized User
- APR System
-----
**BPMN Flow**

**Start Event**\
(User requests analytics)

1. **Authorized User**
   1. Select report / spatial query
1. **APR System**
   1. Execute analytics
   1. Aggregate spatial & legal data
   1. Render dashboards or exports

**End Event**

📌 *Read-only, no state mutation*

-----
**MODULE 7 – Verification & Public Trust BPMN**

**Swimlanes**

- External Stakeholder (Bank / Court / Public)
- APR System
- PKI Provider
-----
**BPMN Flow**

**Start Event**

1. **External Stakeholder**
   1. Submit verification query (address / document no.)
1. **APR System**
   1. Retrieve record
   1. Extract hash & signature ID
1. **PKI Provider**
   1. Validate certificate chain

**Exclusive Gateway – Signature Valid**

- ❌ Invalid\
  → Return verification failure
- ✅ Valid\
  → Confirm authenticity
4. **APR System**
   1. Display verified status
   1. Provide certified view/download

**End Event – “Record Verified”**

-----
## **End-to-End Process Flow** 
### **Stage 1: Planning Authority (Entry Point of the System)**
🔹 **The APR process always starts with the Planner**
#### *Actors*
- Registered Planner
- Lands Department (Planning Authority)
#### *Process*
1. **Planner creates a Sectional Scheme Planning Application**
1. Planner uploads:
   1. Planning layout
   1. Land-use justification
   1. Compliance documents
1. Lands Department:
   1. Reviews planning compliance
   1. Approves or rejects the **Sectional Scheme Plan**
1. **Once approved**, the plan becomes the **authoritative planning record**
1. Approved plans are **locked and uploaded into APR after being manually or digitally signed**
#### *Data Ownership*
- Planning data is immutable after approval
- Surveyors cannot alter planning intent
#### *Schema Impact (NEW / REFINED)*
planning.sectional\_scheme\_plans

\--------------------------------

plan\_id UUID PK

scheme\_name TEXT

planner\_id UUID FK → auth.users

planning\_authority TEXT

approval\_status ENUM('submitted','approved','rejected')

approval\_date DATE

document\_id UUID FK → documents.files

locked BOOLEAN DEFAULT false

📌 **Key Rule**

Survey work **cannot begin** unless approval\_status = 'approved' AND locked = true

-----
## **2. Stage 2: Surveyor-General Domain (Geometry & Spatial Legality)**
🔹 Surveyors **do not initiate schemes** — they validate geometry against approved plans
#### *Actors*
- Professional Land Surveyor
- Surveyor-General Officer
#### *Process*
1. Surveyor retrieves **approved planning plan** from APR
1. Surveyor:
   1. Creates parent parcel geometry
   1. Establishes control points
   1. Generates sectional geometries (3D)
1. System performs:
   1. Topology validation
   1. Area consistency checks
   1. Overlap detection
1. Surveyor-General:
   1. Checks geometrical correctness
   1. Approves or rejects survey
1. Once approved, survey data becomes **authoritative spatial record**
#### *Refined Status Flow*
submitted → checked → approved → sealed
#### *Schema Clarification*
survey.sectional\_plans

\--------------------------------

plan\_id UUID PK

planning\_plan\_id UUID FK → planning.sectional\_scheme\_plans

status ENUM('submitted','checked','approved','sealed')

approved\_by UUID FK

approval\_date DATE

seal\_hash TEXT

📌 **Critical Rule**

Conveyancing and deeds **cannot proceed unless survey status = sealed**

-----
## **3. Stage 3: Conveyancing & Deeds Registration**
🔹 Legal rights are created **only after spatial certainty**
#### *Actors*
- Conveyancer
- Deeds Examiner
- Registrar of Deeds
#### *Process*
1. Conveyancer selects:
   1. Approved Scheme
   1. Sealed Survey Plan
1. Drafts:
   1. Sectional title schedules
   1. Conditions of tenure
1. Submits deeds packet
1. Deeds Office:
   1. Examines legality
   1. Registers titles
1. Certificates issued digitally
#### *Schema Reinforcement*
deeds.sectional\_titles

\--------------------------------

title\_id UUID PK

scheme\_id UUID FK

section\_id UUID FK

holder\_id UUID FK

registration\_status ENUM('draft','registered','cancelled')

digital\_signature\_id UUID

-----
## **4. Records Management & Legal Traceability (System-Wide)**
🔹 APR is a **records authority**, not just a workflow engine
### **Central Principles**
- No record deletion
- Versioned documents
- Hash-based integrity
- Time-stamped approvals
#### *Records Management Schema (NEW)*
records.record\_registry

\--------------------------------

record\_id UUID PK

entity\_type TEXT

entity\_id UUID

version INTEGER

hash TEXT

status ENUM('active','superseded','revoked')

created\_at TIMESTAMP

📌 **Legal Protection**

Any land dispute can reconstruct the full lifecycle of a scheme

-----
## **5. Multi-Stakeholder Read-Only & Verification Access**
### **External Stakeholders**
- Banks
- Estate Administrators
- Insolvency Practitioners
- Courts
- Local Authorities
### **Capabilities**
✔ View progress status\
✔ Verify authenticity\
✔ Validate signatures\
✔ Download certified copies
#### *Role-Based Access*
auth.roles (extended)

\--------------------------------

Bank\_Viewer

Estate\_Admin

Court\_Clerk

Auditor

📌 **No editing rights — verification only**

-----
## **6. Digital Signature & PKI Integration (EJBCA)**
🔹 APR does not issue certificates — it **consumes trust**
### **Integration Model**
- External PKI (EJBCA or equivalent)
- APR sends:
  - Document hash
  - Signatory role
  - Approval metadata
- PKI returns:
  - Signature ID
  - Certificate chain
  - Timestamp
#### *Integration Table (NEW)*
security.digital\_signatures

\--------------------------------

signature\_id UUID PK

document\_id UUID FK

signed\_by UUID FK

role TEXT

pki\_provider TEXT

certificate\_serial TEXT

signed\_at TIMESTAMP

📌 **Applies to**

- Planning approvals
- Survey seals
- Deeds registration
- Title certificates
-----
## **7. Refined Authority & Responsibility Matrix**

|**Stage**|**Authority**|**System Role**|
| :-: | :-: | :-: |
|Planning|Lands Dept|Scheme approval|
|Survey|Surveyor-General|Geometry authority|
|Legal|Deeds Office|Rights creation|
|Records|APR|Immutable registry|
|Trust|PKI (EJBCA)|Digital legality|


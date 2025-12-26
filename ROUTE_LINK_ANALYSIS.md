# Route Link Analysis Report

## Summary
This report identifies routes/pages that may not have direct GUI links in the navigation or components.

## Routes with Links ✅

### Public Routes
- `/` (landing page) - ✅ Main entry point
- `/dashboard` - ✅ In Reporting menu
- `/documents/search` - ✅ In Reporting menu
- `/login` - ✅ In UserMenu component
- `/planning` - ✅ In Property Processes menu
- `/property/search` - ✅ In Reporting menu
- `/verify/certificate` - ✅ In Verifications menu
- `/verify/signature` - ✅ In Verifications menu
- `/verify/survey` - ✅ In Reporting menu

### Authenticated Routes - Planning
- `/planning/schemes` - ✅ In Verifications menu ("My Submissions")
- `/planning/schemes/new` - ✅ In Verifications menu ("New Planning Submission")
- `/planning/review` - ✅ In Verifications menu ("Planning Reviews")
- `/planning/schemes/[id]` - ✅ Dynamic route (accessed from list)

### Authenticated Routes - Survey
- `/survey/computations/upload` - ✅ In Property Processes menu
- `/survey/processes` - ✅ In Property Processes menu
- `/survey/approval` - ✅ Likely accessed from survey processes
- `/survey/approval/[id]` - ✅ Dynamic route (accessed from list)

### Authenticated Routes - Deeds
- `/deeds/processes` - ✅ In Property Processes menu
- `/deeds/schemes` - ✅ In Property Processes menu
- `/deeds/schemes/register` - ✅ In deeds/processes/page.tsx and deeds/schemes/page.tsx
- `/deeds/titles/select` - ✅ In Property Processes menu
- `/deeds/titles/draft` - ✅ In Property Processes menu
- `/deeds/examination` - ✅ In Property Processes menu
- `/deeds/examination/[id]` - ✅ Dynamic route (accessed from examination list)
- `/deeds/registration` - ✅ In Property Processes menu
- `/deeds/registration/[id]` - ✅ Dynamic route (accessed from registration list)
- `/deeds/certificates/generate` - ✅ In deeds/processes/page.tsx

### Authenticated Routes - Operations
- `/operations/transfers` - ✅ In Property Processes menu
- `/operations/transfers/submit` - ✅ In transfers/page.tsx
- `/operations/transfers/[id]` - ✅ Dynamic route (accessed from list)
- `/operations/amendments` - ✅ In Property Processes menu
- `/operations/amendments/submit` - ✅ In amendments/page.tsx
- `/operations/amendments/[id]` - ✅ Dynamic route (accessed from list)
- `/operations/mortgages` - ✅ In deeds/processes/page.tsx
- `/operations/mortgages/register` - ✅ In mortgages/page.tsx
- `/operations/mortgages/[id]` - ✅ Dynamic route (accessed from list)
- `/operations/leases` - ⚠️ **MISSING LINK** (not in navigation or deeds/processes)
- `/operations/leases/register` - ✅ In leases/page.tsx
- `/operations/leases/[id]` - ✅ Dynamic route (accessed from list)
- `/operations/objections` - ⚠️ **MISSING LINK** (not in navigation or deeds/processes)
- `/operations/objections/submit` - ✅ In objections/page.tsx
- `/operations/objections/[id]` - ✅ Dynamic route (accessed from list)
- `/operations/disputes` - ⚠️ **MISSING LINK** (not in navigation or deeds/processes)
- `/operations/disputes/create` - ✅ In disputes/page.tsx
- `/operations/disputes/[id]` - ✅ Dynamic route (accessed from list)

### Authenticated Routes - Admin & Analytics
- `/admin/monitoring` - ✅ In Security & PKI menu
- `/admin/security` - ✅ In Security & PKI menu and UserMenu
- `/admin/users` - ✅ In Security & PKI menu (headerNavigation)
- `/analytics/dashboard` - ✅ In Reporting menu
- `/analytics/performance` - ✅ In Security & PKI menu
- `/analytics/spatial` - ✅ In analytics/dashboard/page.tsx
- `/property/analysis` - ✅ In Property Processes menu
- `/settings/password` - ✅ In UserMenu component

## Routes Potentially Missing Links ⚠️

### Test/Development Routes (Expected - No Links Needed)
- `/test-cogo` - ⚠️ Test page (no link needed)
- `/test-error` - ⚠️ Test page (no link needed)
- `/test-spatial` - ⚠️ Test page (no link needed)
- `/test-topology` - ⚠️ Test page (no link needed)
- `/test-ui` - ⚠️ Test page (no link needed)

### Routes That May Need Links

1. **`/admin/jobs`** - ⚠️ **MISSING LINK**
   - Admin jobs page
   - Should be accessible from admin/security or admin/monitoring
   - Recommendation: Add to Security & PKI menu or admin/security page

2. **`/verify`** - ⚠️ **MISSING LINK** (but has redirect)
   - Public verify page (redirects to /verify/certificate)
   - May be intentional redirect page
   - Status: Has redirect logic in verify/certificate/page.tsx

3. **`/verify/certificate/[titleId]`** - ✅ Dynamic route (accessed via QR code or direct link)

4. **`/news`** - ⚠️ **MISSING LINK**
   - Referenced in navigation structure as "Public Announcements"
   - Not found in actual navigation menus
   - Recommendation: Add to Reporting menu or landing page

5. **`/navigation/reporting`** - ⚠️ **MISSING LINK**
   - Navigation category page
   - Should be accessible from Reporting menu CTA
   - Status: Referenced in navigation structure CTA

6. **`/navigation/verifications`** - ⚠️ **MISSING LINK**
   - Navigation category page
   - Should be accessible from Verifications menu CTA
   - Status: Referenced in navigation structure CTA

7. **`/navigation/property-processes`** - ⚠️ **MISSING LINK**
   - Navigation category page
   - Should be accessible from Property Processes menu CTA
   - Status: Referenced in navigation structure CTA

8. **`/navigation/administration`** - ⚠️ **MISSING LINK**
   - Navigation category page (Security & PKI)
   - Should be accessible from Security & PKI menu CTA
   - Status: Referenced in navigation structure CTA

## Recommendations

### High Priority
1. **Add `/admin/jobs` link** to Security & PKI menu or admin/security page
2. **Add `/news` link** to Reporting menu or landing page
3. **Add operations pages links** (`/operations/leases`, `/operations/objections`, `/operations/disputes`) to:
   - Property Processes menu in navigation structure, OR
   - deeds/processes/page.tsx hub page (alongside mortgages)
4. **Create navigation category pages** (`/navigation/*`) or update CTAs to point to actual pages

### Medium Priority
1. Ensure all dynamic routes ([id]) are accessible from their parent list pages (most already are)

### Low Priority
1. Test pages can remain without links (development only)
2. `/verify` redirect page is fine as-is

## Notes
- Dynamic routes ([id]) are typically accessed programmatically from list pages, which is correct
- Some routes may be accessed via direct URL entry or bookmarks (acceptable)
- Navigation structure has CTAs pointing to `/navigation/*` pages that may not exist yet


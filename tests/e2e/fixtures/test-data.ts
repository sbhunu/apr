/**
 * E2E Test Data Fixtures
 * Provides test data for end-to-end tests
 */

export interface TestUser {
  email: string
  password: string
  role: string
  name: string
}

export interface TestScheme {
  schemeName: string
  location: string
  description: string
  numberOfSections: number
}

export interface TestCoordinates {
  coordinates: Array<{ x: number; y: number }>
  format: 'decimal' | 'utm' | 'dms'
}

/**
 * Test users for different roles
 */
export const testUsers: Record<string, TestUser> = {
  planner: {
    email: 'planner@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'planner',
    name: 'Test Planner',
  },
  planningAuthority: {
    email: 'planning.authority@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'planning_authority',
    name: 'Test Planning Authority',
  },
  surveyor: {
    email: 'surveyor@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'surveyor',
    name: 'Test Surveyor',
  },
  surveyorGeneral: {
    email: 'surveyor.general@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'surveyor_general',
    name: 'Test Surveyor-General',
  },
  conveyancer: {
    email: 'conveyancer@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'conveyancer',
    name: 'Test Conveyancer',
  },
  deedsExaminer: {
    email: 'deeds.examiner@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'deeds_examiner',
    name: 'Test Deeds Examiner',
  },
  registrar: {
    email: 'registrar@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'registrar',
    name: 'Test Registrar',
  },
  admin: {
    email: 'admin@test.apr.gov.zw',
    password: 'TestPassword123!',
    role: 'admin',
    name: 'Test Admin',
  },
}

/**
 * Sample scheme data
 */
export const testSchemes: TestScheme[] = [
  {
    schemeName: 'Test Residential Scheme Alpha',
    location: 'Harare, Zimbabwe',
    description: 'Test residential sectional scheme',
    numberOfSections: 5,
  },
  {
    schemeName: 'Test Commercial Scheme Beta',
    location: 'Bulawayo, Zimbabwe',
    description: 'Test commercial sectional scheme',
    numberOfSections: 10,
  },
]

/**
 * Sample coordinate data (UTM Zone 35S - Zimbabwe)
 */
export const testCoordinates: TestCoordinates = {
  coordinates: [
    { x: 300000, y: 8000000 },
    { x: 300100, y: 8000000 },
    { x: 300100, y: 8000100 },
    { x: 300000, y: 8000100 },
    { x: 300000, y: 8000000 }, // Close polygon
  ],
  format: 'utm',
}

/**
 * Sample CSV coordinate data
 */
export const testCSVCoordinates = `x,y
300000,8000000
300100,8000000
300100,8000100
300000,8000100
300000,8000000`


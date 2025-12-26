/**
 * Deeds Module Constants
 * Safe to import in both client and server components
 */

/**
 * Province codes for Zimbabwe
 */
export const PROVINCE_CODES = [
  'HARARE',
  'BULAWAYO',
  'MANICALAND',
  'MASHONALAND_CENTRAL',
  'MASHONALAND_EAST',
  'MASHONALAND_WEST',
  'MASVINGO',
  'MATABELELAND_NORTH',
  'MATABELELAND_SOUTH',
  'MIDLANDS',
] as const

export type ProvinceCode = (typeof PROVINCE_CODES)[number]


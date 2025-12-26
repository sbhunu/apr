/**
 * Type definitions for wellknown package
 */

declare module 'wellknown' {
  export interface Point {
    type: 'Point'
    coordinates: [number, number]
  }

  export interface LineString {
    type: 'LineString'
    coordinates: number[][]
  }

  export interface Polygon {
    type: 'Polygon'
    coordinates: number[][][]
  }

  export interface MultiPolygon {
    type: 'MultiPolygon'
    coordinates: number[][][][]
  }

  export type Geometry = Point | LineString | Polygon | MultiPolygon

  function parse(wkt: string): Geometry | null
  function stringify(geometry: Geometry): string

  export default {
    parse,
    stringify,
  }

  export { parse, stringify }
}


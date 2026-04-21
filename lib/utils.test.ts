import { describe, expect, it } from 'vitest'
import { trend } from './utils'

describe('trend', () => {
  it('returns steady when prior is missing', () => {
    expect(trend(50, undefined)).toBe('steady')
    expect(trend(undefined, 50)).toBe('steady')
  })

  it('returns up when latest exceeds prev by more than threshold', () => {
    expect(trend(60, 50)).toBe('up')
    expect(trend(54, 50)).toBe('up')
  })

  it('returns down when latest falls below prev by more than threshold', () => {
    expect(trend(40, 50)).toBe('down')
    expect(trend(46, 50)).toBe('down')
  })

  it('returns steady when change is within threshold', () => {
    expect(trend(50, 50)).toBe('steady')
    expect(trend(52, 50)).toBe('steady')
    expect(trend(47, 50)).toBe('steady')
  })

  it('honours a custom threshold', () => {
    expect(trend(55, 50, 10)).toBe('steady')
    expect(trend(65, 50, 10)).toBe('up')
  })
})

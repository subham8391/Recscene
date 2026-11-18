import { describe, expect, it } from 'vitest'
import { CAMERA_LOOKS, cameraFilter, lookById, lookFilter, mixedLook, sharpenKernel, sharpenLabel } from './looks'

describe('looks', () => {
  it('ships original plus twelve looks', () => {
    expect(CAMERA_LOOKS).toHaveLength(13)
    expect(CAMERA_LOOKS[0]!.id).toBe('original')
    expect(lookById('nope').id).toBe('original')
  })
  it('original and zero intensity change nothing', () => {
    expect(lookFilter('original', 1)).toBe('')
    expect(lookFilter('punch', 0)).toBe('')
    expect(mixedLook('mono', 0.5).grayscale).toBe(0.5)
  })
  it('builds filter functions at full intensity', () => {
    expect(lookFilter('mono', 1)).toBe('contrast(1.08) sepia(0.25) grayscale(1)')
    expect(lookFilter('cinema', 1)).toContain('hue-rotate(-8deg)')
  })
  it('sharpen kernel and combined filter', () => {
    expect(sharpenKernel(0)).toBe('0 0 0 0 1 0 0 0 0')
    expect(sharpenKernel(0.5)).toBe('0 -0.6 0 -0.6 3.4 -0.6 0 -0.6 0')
    expect(cameraFilter({ lut: 'original', lutIntensity: 1, sharpen01: 0 })).toBe('')
    expect(cameraFilter({ lut: 'studio', lutIntensity: 1, sharpen01: 0.3 })).toBe('brightness(1.04) contrast(1.08) saturate(1.08) url(#recscene-camera-sharpen)')
    expect(sharpenLabel(0)).toBe('Off')
    expect(sharpenLabel(0.42)).toBe('42%')
  })
})

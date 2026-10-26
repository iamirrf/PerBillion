import { describe, expect, it } from 'vitest'
import { lessons, tracks } from './curriculumCatalog'

describe('current curriculum', () => {
  it('keeps 24 stable lessons across four six-lesson tracks', () => {
    expect(tracks).toHaveLength(4)
    expect(lessons).toHaveLength(24)
    expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(24)
    for (const track of tracks) expect(lessons.filter(lesson => lesson.track === track.id)).toHaveLength(6)
  })

  it('ships only public metadata and the agreed preview arc', () => {
    const previewIds = ['money-to-investing', 'compound-interest', 'diversification']
    for (const id of previewIds) expect(lessons.find(lesson => lesson.id === id)).toBeDefined()
    for (const lesson of lessons) expect(Object.keys(lesson)).not.toEqual(expect.arrayContaining(['sections', 'takeaway', 'quiz', 'answers']))
    expect(new Set(lessons.map(lesson => lesson.visual)).size).toBeGreaterThanOrEqual(6)
  })
})

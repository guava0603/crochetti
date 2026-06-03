import { describe, expect, it } from 'vitest'

import { filterNonDraftProjects, isProjectDraft } from '@/utils/projectDraft'

describe('projectDraft', () => {
  it('detects draft projects', () => {
    expect(isProjectDraft({ is_draft: true })).toBe(true)
    expect(isProjectDraft({ is_draft: false })).toBe(false)
    expect(isProjectDraft({})).toBe(false)
  })

  it('filters drafts from project lists', () => {
    const list = [
      { id: '1', is_draft: false },
      { id: '2', is_draft: true },
      { id: '3' }
    ]
    expect(filterNonDraftProjects(list).map((p) => p.id)).toEqual(['1', '3'])
  })
})

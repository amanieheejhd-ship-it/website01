import { ValidationError } from '@fardeen/shared';
import type { ProjectStatus } from '@fardeen/types';
import { Slug } from '../value-objects/slug.vo';
import { Project, type ProjectProps } from './project.entity';

function makeProps(overrides: Partial<ProjectProps> = {}): ProjectProps {
  return {
    id: 'proj-1',
    slug: Slug.create('atrium-house'),
    title: 'Atrium House',
    summary: 'A courtyard home',
    body: 'Full body copy',
    categoryId: 'cat-1',
    location: 'Dubai',
    year: 2024,
    coverMediaId: 'media-1',
    galleryMediaIds: ['media-2', 'media-3'],
    status: 'published' as ProjectStatus,
    featured: false,
    metrics: { area: '450m2', durationMonths: 18 },
    ...overrides,
  };
}

describe('Project entity — featured invariant', () => {
  it('throws when featured + draft', () => {
    expect(() =>
      Project.create(makeProps({ featured: true, status: 'draft', coverMediaId: 'media-1' })),
    ).toThrow(ValidationError);
  });

  it('throws when featured + published but no cover', () => {
    expect(() =>
      Project.create(makeProps({ featured: true, status: 'published', coverMediaId: null })),
    ).toThrow(ValidationError);
  });

  it('accepts featured + published + cover', () => {
    const p = Project.create(makeProps({ featured: true, status: 'published', coverMediaId: 'm' }));
    expect(p.featured).toBe(true);
  });

  it('accepts a non-featured draft with no cover', () => {
    const p = Project.create(makeProps({ featured: false, status: 'draft', coverMediaId: null }));
    expect(p.featured).toBe(false);
    expect(p.coverMediaId).toBeNull();
  });

  it('rehydrate bypasses invariants (trusts persisted state)', () => {
    expect(() =>
      Project.rehydrate(makeProps({ featured: true, status: 'draft', coverMediaId: null })),
    ).not.toThrow();
  });
});

describe('Project entity — isPublished + getters', () => {
  it('isPublished reflects status', () => {
    expect(Project.create(makeProps({ status: 'published' })).isPublished()).toBe(true);
    expect(
      Project.create(makeProps({ status: 'draft', featured: false })).isPublished(),
    ).toBe(false);
  });

  it('exposes all props through getters', () => {
    const props = makeProps();
    const p = Project.create(props);
    expect(p.id).toBe(props.id);
    expect(p.slug).toBe(props.slug);
    expect(p.title).toBe(props.title);
    expect(p.summary).toBe(props.summary);
    expect(p.body).toBe(props.body);
    expect(p.categoryId).toBe(props.categoryId);
    expect(p.location).toBe(props.location);
    expect(p.year).toBe(props.year);
    expect(p.coverMediaId).toBe(props.coverMediaId);
    expect(p.galleryMediaIds).toBe(props.galleryMediaIds);
    expect(p.status).toBe(props.status);
    expect(p.metrics).toBe(props.metrics);
  });
});

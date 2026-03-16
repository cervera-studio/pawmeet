import { describe, expect, it } from 'vitest';
import { extractHashtags } from './hashtag';

describe('extractHashtags', () => {
  it('extracts simple hashtags', () => {
    expect(extractHashtags('Hello #world #dog')).toEqual(['world', 'dog']);
  });

  it('returns empty array when no hashtags', () => {
    expect(extractHashtags('Hello world')).toEqual([]);
  });

  it('deduplicates case-insensitively', () => {
    expect(extractHashtags('#Dog #dog #DOG')).toEqual(['dog']);
  });

  it('handles hashtags with numbers and underscores', () => {
    expect(extractHashtags('#walk_2024 #day1')).toEqual(['walk_2024', 'day1']);
  });

  it('handles Italian accented characters', () => {
    expect(extractHashtags('#passeggiata #città #perché')).toEqual([
      'passeggiata',
      'città',
      'perché',
    ]);
  });

  it('ignores hash without word characters', () => {
    expect(extractHashtags('# #! #')).toEqual([]);
  });

  it('handles hashtags at start and end', () => {
    expect(extractHashtags('#start text #end')).toEqual(['start', 'end']);
  });
});

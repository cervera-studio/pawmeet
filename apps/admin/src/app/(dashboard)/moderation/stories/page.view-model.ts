import { useCallback, useEffect, useState } from 'react';
import type { AdminStory } from '@/repositories';
import { storyAdminRepository } from '@/repositories';

export function useStoryModerationViewModel() {
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStories = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await storyAdminRepository.listStories({ page, pageSize: 20 });
      setStories(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      console.error('[StoryModeration] Failed to fetch stories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchStories();
  }, [fetchStories]);

  async function handleDelete(storyId: string) {
    setIsDeleting(true);
    try {
      await storyAdminRepository.deleteStory(storyId);
      void fetchStories();
    } catch (error) {
      console.error('[StoryModeration] Failed to delete story:', error);
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    stories,
    page,
    totalPages,
    total,
    isLoading,
    isDeleting,
    handleDelete,
    setPage,
    refetch: fetchStories,
  };
}

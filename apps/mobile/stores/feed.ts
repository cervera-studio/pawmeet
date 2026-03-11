import { create } from 'zustand';

interface FeedStore {
  hasNewPosts: boolean;
  setHasNewPosts: (value: boolean) => void;
}

export const useFeedStore = create<FeedStore>((set) => ({
  hasNewPosts: false,
  setHasNewPosts: (value) => set({ hasNewPosts: value }),
}));

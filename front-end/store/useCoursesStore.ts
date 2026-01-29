import { create } from "zustand";
import type { Course, CourseContent } from "@/lib/courses-api";
import { listCourses, listCourseContents } from "@/lib/courses-api";

type FilterKey = string; // `${courseId}|${category}|${week}`

interface CoursesState {
  courses: Course[];
  coursesLoading: boolean;
  contentsCache: Record<FilterKey, CourseContent[]>;
  contentsLoading: boolean;
  selectedCourseId: string;
  error: string | null;
  setSelectedCourseId: (id: string) => void;
  setError: (err: string | null) => void;
  loadCourses: (token: string | null) => Promise<void>;
  loadContents: (
    token: string | null,
    courseId: string,
    category?: string,
    week?: number
  ) => Promise<CourseContent[]>;
}

export const useCoursesStore = create<CoursesState>((set, get) => ({
  courses: [],
  coursesLoading: false,
  contentsCache: {},
  contentsLoading: false,
  selectedCourseId: "",
  error: null,
  setSelectedCourseId: (id: string) => set({ selectedCourseId: id }),
  setError: (err) => set({ error: err }),
  loadCourses: async (token) => {
    if (!token) {
      set({ courses: [], coursesLoading: false, error: "Not signed in." });
      return;
    }
    set({ coursesLoading: true, error: null });
    try {
      const data = await listCourses(token);
      set({ courses: data, coursesLoading: false });
      // if no selectedCourseId, pick first
      const current = get().selectedCourseId;
      if (!current && data.length > 0) {
        set({ selectedCourseId: data[0].id });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load courses.",
        coursesLoading: false,
      });
    }
  },
  loadContents: async (token, courseId, category, week) => {
    if (!token || !courseId) {
      return [];
    }
    const key = `${courseId}|${category ?? "all"}|${week ?? ""}`;
    const cached = get().contentsCache[key];
    if (cached) return cached;
    set({ contentsLoading: true, error: null });
    const params: { category?: string; week?: number } = {};
    if (category && category !== "all") params.category = category;
    if (week) params.week = week;
    try {
      const data = await listCourseContents(token, courseId, params);
      set((s) => ({ contentsCache: { ...s.contentsCache, [key]: data }, contentsLoading: false }));
      return data;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load materials.",
        contentsLoading: false,
      });
      return [];
    }
  },
}));


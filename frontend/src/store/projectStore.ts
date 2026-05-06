import { create } from "zustand";
import { api, Project, Shot } from "@/lib/api";

interface ProjectState {
  currentProject: Project | null;
  shots: Shot[];
  loading: boolean;
  loadProject: (id: string) => Promise<void>;
  updateShot: (shotId: string, data: Partial<Shot>) => Promise<void>;
  addShot: () => Promise<void>;
  deleteShot: (shotId: string) => Promise<void>;
  reorderShots: (items: Shot[]) => Promise<void>;
  setShots: (shots: Shot[]) => void;
  clear: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  shots: [],
  loading: false,

  loadProject: async (id: string) => {
    set({ loading: true });
    try {
      const { project, shots } = await api.getProject(id);
      set({ currentProject: project, shots, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  updateShot: async (shotId: string, data: Partial<Shot>) => {
    const project = get().currentProject;
    if (!project) return;
    const updated = await api.updateShot(project.id, shotId, data);
    set((state) => ({
      shots: state.shots.map((s) => (s.id === shotId ? updated : s)),
    }));
  },

  addShot: async () => {
    const project = get().currentProject;
    if (!project) return;
    const newShot = await api.createShot(project.id, {
      shot_number: get().shots.length + 1,
    });
    set((state) => ({ shots: [...state.shots, newShot] }));
  },

  deleteShot: async (shotId: string) => {
    await api.deleteShot(shotId);
    set((state) => ({
      shots: state.shots
        .filter((s) => s.id !== shotId)
        .map((s, i) => ({ ...s, shot_number: i + 1 })),
    }));
  },

  reorderShots: async (items: Shot[]) => {
    const reordered = items.map((s, i) => ({ ...s, shot_number: i + 1 }));
    set({ shots: reordered });
    await api.reorderShots(
      reordered.map((s, i) => ({ id: s.id, sort_order: i + 1 }))
    );
  },

  setShots: (shots: Shot[]) => {
    set({ shots });
  },

  clear: () => {
    set({ currentProject: null, shots: [], loading: false });
  },
}));

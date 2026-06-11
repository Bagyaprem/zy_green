import { create } from 'zustand';
import { supabase } from '../services/supabase';

const DEFAULT_THRESHOLDS = { pm2_5: 55.4, pm10: 154, co2: 1000 };

export const useAppStore = create((set, get) => ({
  session: null,
  profile: null,
  readings: [],
  liveReading: null,
  loading: false,
  realtimeSubscription: null,
  settings: {
    theme: 'dark',
    soundAlerts: false,
    thresholds: DEFAULT_THRESHOLDS,
  },

  setSession:  (session)  => set({ session }),
  setProfile:  (profile)  => set({ profile }),
  setReadings: (readings) => set({ readings }),

  addReading: (reading) => {
    const prev = get().readings;
    set({ readings: [...prev, reading].slice(-1000), liveReading: reading });
  },

  loadReadings: async () => {
    if (get().loading) return;
    set({ loading: true });

    // Fetch most-recent 1000 rows, ordered by id (works even before created_at exists)
    const { data, error } = await supabase
      .from('air_quality')
      .select('*')
      .order('id', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('[ZyGreen] Supabase read error:', error.message, error.hint || '');
      set({ loading: false });
      return;
    }

    const sorted = [...(data || [])].reverse();
    set({ readings: sorted, liveReading: data?.[0] || null, loading: false });

    // Only set up one realtime subscription — skip if already active
    if (get().realtimeSubscription) return;

    const channel = supabase
      .channel('realtime-air-quality')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'air_quality' },
        (payload) => { if (payload?.new) get().addReading(payload.new); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[ZyGreen] Realtime connected');
        }
      });

    set({ realtimeSubscription: channel });
  },

  stopRealtime: () => {
    const { realtimeSubscription } = get();
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
    }
    set({ realtimeSubscription: null, loading: false });
  },

  updateThresholds: (thresholds) => set((state) => ({
    settings: { ...state.settings, thresholds: { ...state.settings.thresholds, ...thresholds } },
  })),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),
}));

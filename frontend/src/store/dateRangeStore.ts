import dayjs, { Dayjs } from 'dayjs';
import { create } from 'zustand';

export type DatePreset = 'today' | '7d' | '30d' | 'custom';

interface DateRangeState {
  preset: DatePreset;
  range: [Dayjs, Dayjs];
  setPreset: (preset: DatePreset) => void;
  setRange: (range: [Dayjs, Dayjs]) => void;
}

const presetRange = (preset: DatePreset): [Dayjs, Dayjs] => {
  const now = dayjs();
  if (preset === 'today') {
    return [now.startOf('day'), now.endOf('day')];
  }
  if (preset === '7d') {
    return [now.subtract(6, 'day').startOf('day'), now.endOf('day')];
  }
  return [now.subtract(29, 'day').startOf('day'), now.endOf('day')];
};

export const useDateRangeStore = create<DateRangeState>((set) => ({
  preset: '30d',
  range: presetRange('30d'),
  setPreset: (preset) =>
    set((state) => ({
      preset,
      range: preset === 'custom' ? state.range : presetRange(preset),
    })),
  setRange: (range) => set({ preset: 'custom', range }),
}));

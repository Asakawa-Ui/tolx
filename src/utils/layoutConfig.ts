import { PanelLayoutConfig, TabCategory } from '../types';
import { ALGORITHMS, TURBULENCE_ALGORITHMS } from '../data/mockData';

export const DEFAULT_PANEL_LAYOUT: PanelLayoutConfig = {
  categoryOrder: ['flight', 'icing', 'turbulence'] as TabCategory[],
  icingOrder: ALGORITHMS.map(a => a.id),
  icingVisibility: Object.fromEntries(ALGORITHMS.map(a => [a.id, true])),
  turbulenceOrder: TURBULENCE_ALGORITHMS.map(a => a.id),
  turbulenceVisibility: Object.fromEntries(TURBULENCE_ALGORITHMS.map(a => [a.id, true]))
};

const STORAGE_KEY = 'tolx_panel_layout_v1';

export function loadPanelLayout(): PanelLayoutConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PANEL_LAYOUT;
    const parsed = JSON.parse(raw);

    // Ensure all categories exist
    const categoryOrder: TabCategory[] = Array.isArray(parsed.categoryOrder)
      ? parsed.categoryOrder.filter((c: any): c is TabCategory => ['flight', 'icing', 'turbulence'].includes(c))
      : [...DEFAULT_PANEL_LAYOUT.categoryOrder];
    (['flight', 'icing', 'turbulence'] as TabCategory[]).forEach((c) => {
      if (!categoryOrder.includes(c)) categoryOrder.push(c);
    });

    // Ensure all icing algorithms exist in order
    const icingOrder: string[] = Array.isArray(parsed.icingOrder) ? [...parsed.icingOrder] : [];
    ALGORITHMS.forEach(a => {
      if (!icingOrder.includes(a.id)) icingOrder.push(a.id);
    });

    // Ensure all turbulence algorithms exist in order
    const turbulenceOrder: string[] = Array.isArray(parsed.turbulenceOrder) ? [...parsed.turbulenceOrder] : [];
    TURBULENCE_ALGORITHMS.forEach(a => {
      if (!turbulenceOrder.includes(a.id)) turbulenceOrder.push(a.id);
    });

    const icingVisibility: Record<string, boolean> = {
      ...DEFAULT_PANEL_LAYOUT.icingVisibility,
      ...(parsed.icingVisibility || {})
    };

    const turbulenceVisibility: Record<string, boolean> = {
      ...DEFAULT_PANEL_LAYOUT.turbulenceVisibility,
      ...(parsed.turbulenceVisibility || {})
    };

    return {
      categoryOrder,
      icingOrder,
      icingVisibility,
      turbulenceOrder,
      turbulenceVisibility
    };
  } catch {
    return DEFAULT_PANEL_LAYOUT;
  }
}

export function savePanelLayout(layout: PanelLayoutConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {}
}

export function resetPanelLayoutStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

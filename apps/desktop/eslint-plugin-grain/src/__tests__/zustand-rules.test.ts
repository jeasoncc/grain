import { describe, it, expect } from 'vitest';
import { runLint } from './test-utils.js';

describe('zustand-patterns', () => {
  describe('selector usage', () => {
    it('should allow using selector', () => {
      const code = `
import { useSidebarStore } from '@/state/sidebar.state';

export const Component = () => {
  const isOpen = useSidebarStore(state => state.isOpen);
  return <div />;
};`;
      const errors = runLint(code, { 'grain/zustand-patterns': 'error' });
      expect(errors.filter(e => e.ruleId === 'grain/zustand-patterns')).toHaveLength(0);
    });
    
    it('should report error when not using selector', () => {
      const code = `
import { useSidebarStore } from '@/state/sidebar.state';

export const Component = () => {
  const store = useSidebarStore();
  return <div />;
};`;
      const errors = runLint(code, { 'grain/zustand-patterns': 'error' });
      const ruleErrors = errors.filter(e => e.ruleId === 'grain/zustand-patterns');
      expect(ruleErrors.length).toBeGreaterThan(0);
    });
  });
  
  describe('store definition', () => {
    it('should allow basic store definition', () => {
      const code = `
import { create } from 'zustand';

export const useSidebarStore = create((set) => ({
  isOpen: false,
  toggle: () => set(state => ({ isOpen: !state.isOpen })),
}));`;
      const errors = runLint(code, { 'grain/zustand-patterns': 'error' });
      expect(errors.filter(e => e.ruleId === 'grain/zustand-patterns')).toHaveLength(0);
    });
    
    it('should allow using Immer for mutations', () => {
      const code = `
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useStore = create(immer((set) => ({
  items: [],
  addItem: (item) => set((state) => {
    state.items.push(item);
  }),
})));`;
      const errors = runLint(code, { 'grain/zustand-patterns': 'error' });
      expect(errors.filter(e => e.ruleId === 'grain/zustand-patterns')).toHaveLength(0);
    });
    
    it('should allow store with <= 10 state properties', () => {
      const code = `
import { create } from 'zustand';

export const useStore = create((set) => ({
  prop1: 1,
  prop2: 2,
  prop3: 3,
  prop4: 4,
  prop5: 5,
  prop6: 6,
  prop7: 7,
  prop8: 8,
  prop9: 9,
  prop10: 10,
  action: () => set({ prop1: 2 }),
}));`;
      const errors = runLint(code, { 'grain/zustand-patterns': 'error' });
      expect(errors.filter(e => e.ruleId === 'grain/zustand-patterns')).toHaveLength(0);
    });
    
    it('should report error when store has > 10 state properties', () => {
      const code = `
import { create } from 'zustand';

export const useStore = create((set) => ({
  prop1: 1,
  prop2: 2,
  prop3: 3,
  prop4: 4,
  prop5: 5,
  prop6: 6,
  prop7: 7,
  prop8: 8,
  prop9: 9,
  prop10: 10,
  prop11: 11,
  action: () => set({ prop1: 2 }),
}));`;
      const errors = runLint(code, { 'grain/zustand-patterns': 'error' });
      const ruleErrors = errors.filter(e => e.ruleId === 'grain/zustand-patterns');
      expect(ruleErrors.length).toBeGreaterThan(0);
    });
  });
});

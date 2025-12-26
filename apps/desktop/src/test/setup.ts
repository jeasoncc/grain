/**
 * @file setup.ts
 * @description Vitest 测试环境设置
 *
 * 配置 React Testing Library 和其他测试工具
 */

import "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Mock ResizeObserver
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// 每个测试后自动清理
afterEach(() => {
	cleanup();
});

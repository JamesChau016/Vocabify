import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Shared test setup for Vocabify frontend service/component tests.
//
// Provides two stubs used across the suite:
//   1. A fresh in-memory `localStorage` implementation (jsdom's is fine, but we
//      reset it between tests so persistence tests start from a clean slate).
//   2. A mocked `axios` default export so service modules can be tested without
//      making real network calls.
// ---------------------------------------------------------------------------

// --- localStorage stub -----------------------------------------------------
// A minimal, spec-compliant localStorage backed by a Map. Installed on the
// global `window`/`globalThis` so both `window.localStorage` and bare
// `localStorage` references resolve to it.
class LocalStorageStub implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const localStorageStub = new LocalStorageStub();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageStub,
});

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageStub,
  });
}

// --- axios stub ------------------------------------------------------------
// Mocks the `axios` module's default export. Individual tests can override
// return values via, e.g., `vi.mocked(axios.post).mockResolvedValue(...)`.
vi.mock("axios", () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    create: vi.fn(),
  };
  // `axios.create()` returns an instance with the same shape.
  mockAxios.create.mockReturnValue(mockAxios);
  return { default: mockAxios, ...mockAxios };
});

// --- lifecycle -------------------------------------------------------------
beforeEach(() => {
  localStorageStub.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

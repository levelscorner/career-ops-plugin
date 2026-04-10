import { describe, expect, it, beforeEach, vi } from 'vitest';

// Mock Dexie before importing the module under test.
// The customization table is a simple key-value store keyed by 'singleton'.
const mockCustomizationTable = {
  get: vi.fn(),
  put: vi.fn(),
};

vi.mock('../../src/background/storage/db', () => ({
  getDb: () => ({
    customization: mockCustomizationTable,
  }),
}));

// Import after mock is installed.
const { getCustomization } = await import('../../src/background/storage/profile');

describe('getCustomization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default outputToggles when no customization exists', async () => {
    mockCustomizationTable.get.mockResolvedValue(undefined);

    const result = await getCustomization();

    expect(result.outputToggles).toEqual({
      gaps: true,
      keywords: true,
      dealBreakers: true,
      rawOutput: false,
      salary: false,
      interviewTips: false,
    });
  });

  it('backfills missing outputToggles on existing customization rows', async () => {
    // Simulate a row persisted before outputToggles was added.
    mockCustomizationTable.get.mockResolvedValue({
      id: 'singleton',
      archetypeOrder: [],
      narrativeByArchetype: {},
      proofPoints: '',
      negotiationNotes: '',
      weightOverrides: {},
      dealBreakers: [],
      updatedAt: 1000,
    });

    const result = await getCustomization();

    expect(result.outputToggles).toEqual({
      gaps: true,
      keywords: true,
      dealBreakers: true,
      rawOutput: false,
      salary: false,
      interviewTips: false,
    });
    // Original fields are preserved.
    expect(result.updatedAt).toBe(1000);
  });

  it('merges partial outputToggles with defaults', async () => {
    mockCustomizationTable.get.mockResolvedValue({
      id: 'singleton',
      archetypeOrder: [],
      narrativeByArchetype: {},
      proofPoints: '',
      negotiationNotes: '',
      weightOverrides: {},
      dealBreakers: [],
      outputToggles: { gaps: false, rawOutput: true },
      updatedAt: 2000,
    });

    const result = await getCustomization();

    expect(result.outputToggles).toEqual({
      gaps: false,
      keywords: true,
      dealBreakers: true,
      rawOutput: true,
      salary: false,
      interviewTips: false,
    });
  });
});

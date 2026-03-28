import { calculateScore } from "@/lib/jobs/score-leads";

describe("Lead Scoring", () => {
  test("Fresh new lead with full contact info scores high", () => {
    const factors = {
      engagementCount: 1,
      daysSinceCreation: 0,
      daysSinceUpdate: 0,
      hasPhone: true,
      hasEmail: true,
      status: "new",
      campaignPerformance: "high" as const,
    };

    const { score } = calculateScore(factors);

    // Base 50 + 15 (fresh) + 10 (contact) + 15 (new) + 15 (high perf) = 105 → clamped to 100
    expect(score).toBe(100);
  });

  test("Old lost lead scores low", () => {
    const factors = {
      engagementCount: 1,
      daysSinceCreation: 30,
      daysSinceUpdate: 30,
      hasPhone: false,
      hasEmail: false,
      status: "lost",
      campaignPerformance: "low" as const,
    };

    const { score } = calculateScore(factors);

    // Base 50 + 0 (old) + 0 (no contact) - 20 (lost) - 10 (low perf) = 20
    expect(score).toBeLessThan(30);
  });

  test("Score is always clamped to 0-100", () => {
    const factors = {
      engagementCount: 100,
      daysSinceCreation: 0,
      daysSinceUpdate: 0,
      hasPhone: true,
      hasEmail: true,
      status: "booked",
      campaignPerformance: "high" as const,
    };

    const { score } = calculateScore(factors);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("Reason field is populated correctly", () => {
    const factors = {
      engagementCount: 1,
      daysSinceCreation: 0,
      daysSinceUpdate: 0,
      hasPhone: true,
      hasEmail: true,
      status: "new",
      campaignPerformance: "unknown" as const,
    };

    const { reason } = calculateScore(factors);

    expect(reason).toContain("Fresh lead");
    expect(reason).toContain("Complete contact info");
  });

  test("Lead with no contact info gets penalty", () => {
    const factors = {
      engagementCount: 1,
      daysSinceCreation: 5,
      daysSinceUpdate: 5,
      hasPhone: false,
      hasEmail: false,
      status: "new",
      campaignPerformance: "unknown" as const,
    };

    const { score, reason } = calculateScore(factors);

    expect(score).toBeLessThan(50);
    expect(reason).toContain("Missing contact info");
  });

  test("Campaign performance is factored correctly", () => {
    const baseFactors = {
      engagementCount: 1,
      daysSinceCreation: 5,
      daysSinceUpdate: 5,
      hasPhone: true,
      hasEmail: true,
      status: "new",
      campaignPerformance: "unknown" as const,
    };

    const { score: baseScore } = calculateScore(baseFactors);

    const highPerfFactors = { ...baseFactors, campaignPerformance: "high" as const };
    const { score: highScore } = calculateScore(highPerfFactors);

    expect(highScore).toBeGreaterThan(baseScore);
  });
});

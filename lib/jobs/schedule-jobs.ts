import { scoreAllLeads } from "./score-leads";

let scoreJobInterval: NodeJS.Timeout | null = null;

export function initializeJobScheduler() {
  if (scoreJobInterval) {
    console.log("Job scheduler already initialized");
    return;
  }

  console.log("Initializing job scheduler");

  // Run scoring job every hour
  scoreJobInterval = setInterval(async () => {
    console.log("Running scheduled scoring job...");
    try {
      await scoreAllLeads();
      console.log("Scoring job completed successfully");
    } catch (error) {
      console.error("Scoring job failed:", error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Also run on startup
  scoreAllLeads().catch((error) =>
    console.error("Initial scoring job failed:", error)
  );
}

export function stopJobScheduler() {
  if (scoreJobInterval) {
    clearInterval(scoreJobInterval);
    scoreJobInterval = null;
    console.log("Job scheduler stopped");
  }
}

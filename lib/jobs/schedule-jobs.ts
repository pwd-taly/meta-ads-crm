import { scoreAllLeads } from "./score-leads";
import { syncAllCampaigns } from "./meta-sync";

let scoreJobInterval: NodeJS.Timeout | null = null;
let metaSyncJobInterval: NodeJS.Timeout | null = null;

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

  // Run campaign sync every 6 hours
  metaSyncJobInterval = setInterval(async () => {
    console.log("Running scheduled campaign sync...");
    try {
      await syncAllCampaigns();
      console.log("Campaign sync completed successfully");
    } catch (error) {
      console.error("Campaign sync failed:", error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

export function stopJobScheduler() {
  if (scoreJobInterval) {
    clearInterval(scoreJobInterval);
    scoreJobInterval = null;
  }
  if (metaSyncJobInterval) {
    clearInterval(metaSyncJobInterval);
    metaSyncJobInterval = null;
  }
  console.log("Job scheduler stopped");
}

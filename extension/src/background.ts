import { syncNow } from "./sync.js";

void chrome.alarms.create("vocabify-sync", { periodInMinutes: 1 });
void syncNow().catch(() => undefined);
chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create("vocabify-sync", { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "vocabify-sync") void syncNow().catch(() => undefined);
});
chrome.runtime.onMessage.addListener(message => {
  if (message === "sync-now") void syncNow().catch(() => undefined);
});

import { addDaysIso } from './crm.ts';

export interface FollowupCadenceUpdate {
  lastContactDate: string;
  nextFollowupDate: string;
  followupCount: number;
}

// Shared by the manual "Mark as replied" status transition (status.ts), the
// manual "Log follow-up" button (log-followup.ts), and Generate Reply's
// "Mark as sent" — every path that touches a lead's contact cadence goes
// through here so the Day 3 / Day 7 rule lives in exactly one place.
//
// startingCadence=true (first touch on a 'new' lead) resets followup_count
// to 0 and schedules +3 days. Any later touch (already 'replied' or
// 'quoted') schedules +7 days and increments followup_count.
export function computeFollowupCadence(startingCadence: boolean, previousFollowupCount: number, today: string): FollowupCadenceUpdate {
  return startingCadence
    ? { lastContactDate: today, nextFollowupDate: addDaysIso(today, 3), followupCount: 0 }
    : { lastContactDate: today, nextFollowupDate: addDaysIso(today, 7), followupCount: previousFollowupCount + 1 };
}

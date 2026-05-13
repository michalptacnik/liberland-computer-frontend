import { describe, expect, it } from "vitest";
import { buildScrumMessage, formatDuration, groupTodaySessions } from "@/lib/scrum";
import type { Task, WorkSession } from "@/lib/api/types";

describe("scrum helpers", () => {
  it("formats duration as HH:MM:SS", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
    expect(formatDuration(-1)).toBe("00:00:00");
  });

  it("groups job sessions and marks chat-backed groups scrumable", () => {
    const now = new Date("2026-05-12T20:00:00.000Z");
    const tasks: Task[] = [
      {
        id: 10,
        title: "Write update",
        project: "Accepted job",
        priority: "medium",
        status: "inProgress",
        projectType: "job",
        jobId: 22,
      },
    ];
    const sessions: WorkSession[] = [
      {
        id: 1,
        userId: 2,
        taskId: 10,
        startedAt: "2026-05-12T18:00:00.000Z",
        stoppedAt: "2026-05-12T19:00:00.000Z",
        durationSec: 3600,
        running: false,
      },
    ];

    const groups = groupTodaySessions(
      tasks,
      sessions,
      [{ jobId: 22, title: "Accepted job", chatRoomId: "!room:matrix" }],
      now,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].scrumable).toBe(true);
    expect(buildScrumMessage(groups[0], now)).toContain("Write update");
  });
});


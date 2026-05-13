import { describe, expect, it } from "vitest";
import { acceptedJobProjectsFromBids, normalizeTasks, normalizeWorkSessions } from "@/lib/api/client";

describe("client normalization", () => {
  it("derives accepted job projects from bids", () => {
    const projects = acceptedJobProjectsFromBids([
      {
        id: 1,
        accepted: true,
        job: {
          id: 5,
          title: "Build frontend",
          chatRoomId: "!job:matrix",
          userId: 7,
          user: { fullName: "Issuer" },
        },
      },
      { id: 2, accepted: false, job: { id: 6, title: "Ignored" } },
    ]);

    expect(projects).toEqual([
      {
        jobId: 5,
        title: "Build frontend",
        chatRoomId: "!job:matrix",
        issuerUserId: 7,
        issuerName: "Issuer",
      },
    ]);
  });

  it("sorts tasks and work sessions deterministically", () => {
    expect(
      normalizeTasks([
        { id: 2, title: "B", project: "P", priority: "medium", status: "todo", projectType: "own", dueAt: "2026-05-13" },
        { id: 1, title: "A", project: "P", priority: "medium", status: "todo", projectType: "own", dueAt: "2026-05-12" },
      ]).map((item) => item.id),
    ).toEqual([1, 2]);

    expect(
      normalizeWorkSessions([
        { id: 1, userId: 1, taskId: 1, startedAt: "2026-05-12T10:00:00Z", durationSec: 1, running: false },
        { id: 2, userId: 1, taskId: 1, startedAt: "2026-05-12T11:00:00Z", durationSec: 1, running: false },
      ]).map((item) => item.id),
    ).toEqual([2, 1]);
  });
});


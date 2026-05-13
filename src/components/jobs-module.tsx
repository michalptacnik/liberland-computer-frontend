"use client";

import { BriefcaseBusiness, Check, Plus, Search, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { useCoreData } from "@/components/data-hooks";
import { api, type JobKind } from "@/lib/api/client";
import type { Bid, Job } from "@/lib/api/types";
import { numberInput, textInput } from "@/lib/utils";
import { Button, EmptyState, Field, Input, Panel, Select, StatusPill, Textarea } from "@/components/ui";

type CoreData = ReturnType<typeof useCoreData>;

const jobKinds: { label: string; value: JobKind; categoryId: number }[] = [
  { label: "Security", value: "security-incidence", categoryId: 100 },
  { label: "Geo Located", value: "geo-located", categoryId: 200 },
  { label: "Global", value: "global", categoryId: 300 },
  { label: "Ride", value: "ride", categoryId: 400 },
];

export function JobsModule({ data }: { data: CoreData }) {
  const [searchText, setSearchText] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [feedType, setFeedType] = useState("all");
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ["jobs-feed", searchText, feedType],
    queryFn: () =>
      searchText
        ? api.jobSearch({ text: searchText, type: feedType, page: 1 })
        : api.jobFeed(1, feedType),
  });
  const bidsQuery = useQuery({
    queryKey: ["job-bids", selectedJob?.id],
    queryFn: () => api.jobBids(selectedJob?.id ?? 0),
    enabled: Boolean(selectedJob?.id),
  });

  const createJob = useMutation({
    mutationFn: ({ kind, payload }: { kind: JobKind; payload: Record<string, unknown> }) =>
      api.createJob(kind, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs-feed"] }),
  });
  const closeJob = useMutation({
    mutationFn: api.closeJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs-feed"] }),
  });
  const createBid = useMutation({
    mutationFn: ({ job, payload }: { job: Job; payload: Record<string, unknown> }) =>
      api.createBid(Number(job.id), jobKindForCategory(job.categoryId), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-bids"] });
      queryClient.invalidateQueries({ queryKey: ["my-bids"] });
    },
  });
  const bidAction = useMutation({
    mutationFn: ({ jobId, bidId, action }: { jobId: number; bidId: number; action: "accept" | "reject" | "shortlist" | "withdraw" }) =>
      api.bidAction(jobId, bidId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-bids"] });
      queryClient.invalidateQueries({ queryKey: ["my-bids"] });
    },
  });

  function submitJob(formData: FormData) {
    const kind = formData.get("kind")?.toString() as JobKind;
    const selectedKind = jobKinds.find((item) => item.value === kind) ?? jobKinds[2];
    const geoTag = kind === "security-incidence" || kind === "geo-located" || kind === "ride";
    const payload: Record<string, unknown> = {
      title: textInput(formData.get("title"), kind === "ride" ? "New ride request" : ""),
      desc: textInput(formData.get("desc")),
      numPositions: numberInput(formData.get("numPositions"), 1),
      payTerm: kind === "security-incidence" || kind === "ride" ? "fixed" : textInput(formData.get("payTerm"), "fixed"),
      offerPrice: numberInput(formData.get("offerPrice"), 1),
      currency: textInput(formData.get("currency"), "LLD"),
      duration: numberInput(formData.get("duration"), 1),
      durationUnit: textInput(formData.get("durationUnit"), "hour"),
      radius: numberInput(formData.get("radius"), 1),
      categoryId: selectedKind.categoryId,
      hashtagIds: [],
      filenames: [],
      geoTag,
      permanent: formData.get("permanent") === "on",
      willSignContractLater: formData.get("willSignContractLater") === "on",
    };
    if (geoTag) {
      payload.address = textInput(formData.get("address"), "Liberland");
      payload.country = textInput(formData.get("country"), "Liberland");
      payload.lat = numberInput(formData.get("lat"), 45.768);
      payload.lon = numberInput(formData.get("lon"), 18.877);
    }
    if (kind === "ride") {
      payload.destinationAddress = textInput(formData.get("destinationAddress"), "Destination");
      payload.destinationLat = numberInput(formData.get("destinationLat"), 45.768);
      payload.destinationLon = numberInput(formData.get("destinationLon"), 18.877);
    }
    createJob.mutate({ kind: selectedKind.value, payload });
  }

  function submitBid(formData: FormData) {
    if (!selectedJob?.id) return;
    const payload: Record<string, unknown> = {
      desc: textInput(formData.get("desc")),
      offerPrice: numberInput(formData.get("offerPrice"), Number(selectedJob.offerPrice) || 1),
      currency: textInput(formData.get("currency"), selectedJob.currency || "LLD"),
      duration: numberInput(formData.get("duration"), Number(selectedJob.duration) || 1),
      durationUnit: textInput(formData.get("durationUnit"), selectedJob.durationUnit || "hour"),
      payTerm: textInput(formData.get("payTerm"), selectedJob.payTerm || "fixed"),
    };
    const vehicleId = textInput(formData.get("vehicleId"));
    if (vehicleId) payload.vehicleId = vehicleId;
    createBid.mutate({ job: selectedJob, payload });
  }

  const jobs = (jobsQuery.data?.data ?? []) as Job[];

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Panel title="Create Job">
        <form action={submitJob} className="grid gap-3">
          <Field label="Kind">
            <Select name="kind" defaultValue="global">
              {jobKinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input name="title" required />
          </Field>
          <Field label="Description">
            <Textarea name="desc" required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price">
              <Input name="offerPrice" type="number" min="1" defaultValue="50" />
            </Field>
            <Field label="Currency">
              <Select name="currency" defaultValue="LLD">
                {["LLD", "LLM", "EUR", "USD", "BTC", "ETH"].map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Positions">
              <Input name="numPositions" type="number" min="1" defaultValue="1" />
            </Field>
            <Field label="Pay Term">
              <Select name="payTerm" defaultValue="fixed">
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
              </Select>
            </Field>
            <Field label="Radius">
              <Input name="radius" type="number" min="1" defaultValue="10" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Duration">
              <Input name="duration" type="number" min="1" defaultValue="1" />
            </Field>
            <Field label="Unit">
              <Select name="durationUnit" defaultValue="hour">
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="month">Month</option>
              </Select>
            </Field>
          </div>
          <Field label="Address">
            <Input name="address" defaultValue="Liberland" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Country">
              <Input name="country" defaultValue="Liberland" />
            </Field>
            <Field label="Lat">
              <Input name="lat" type="number" step="0.000001" defaultValue="45.768" />
            </Field>
            <Field label="Lon">
              <Input name="lon" type="number" step="0.000001" defaultValue="18.877" />
            </Field>
          </div>
          <Field label="Destination">
            <Input name="destinationAddress" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Destination Lat">
              <Input name="destinationLat" type="number" step="0.000001" />
            </Field>
            <Field label="Destination Lon">
              <Input name="destinationLon" type="number" step="0.000001" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="permanent" type="checkbox" /> Permanent
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="willSignContractLater" type="checkbox" /> Sign contract later
          </label>
          <Button disabled={createJob.isPending}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </form>
      </Panel>

      <div className="grid gap-4">
        <Panel title="Jobs">
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_160px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search jobs"
              />
            </div>
            <Select value={feedType} onChange={(event) => setFeedType(event.target.value)}>
              <option value="all">All</option>
              <option value="regular">Regular</option>
              <option value="permanent">Permanent</option>
            </Select>
          </div>
          {jobs.length ? (
            <div className="grid gap-2">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="rounded-md border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{job.title}</div>
                    <StatusPill tone={job.closed ? "red" : "green"}>
                      {job.closed ? "Closed" : "Open"}
                    </StatusPill>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {job.currency} {job.offerPrice} · {job.numBids ?? 0} bids
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState>{jobsQuery.isLoading ? "Loading jobs." : "No jobs returned."}</EmptyState>
          )}
        </Panel>

        <Panel
          title="Job Details"
          action={
            selectedJob?.id ? (
              <Button variant="secondary" onClick={() => closeJob.mutate(selectedJob.id!)}>
                <X className="h-4 w-4" />
                Close
              </Button>
            ) : null
          }
        >
          {selectedJob ? (
            <div className="grid gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-lg font-semibold">{selectedJob.title}</h3>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {selectedJob.desc}
                </p>
              </div>
              <form action={submitBid} className="grid gap-3 rounded-md border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-950">Place Bid</div>
                <Field label="Proposal">
                  <Textarea name="desc" required />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Price">
                    <Input
                      name="offerPrice"
                      type="number"
                      min="1"
                      defaultValue={selectedJob.offerPrice ?? 1}
                    />
                  </Field>
                  <Field label="Currency">
                    <Input name="currency" defaultValue={selectedJob.currency ?? "LLD"} />
                  </Field>
                  <Field label="Pay Term">
                    <Select name="payTerm" defaultValue={selectedJob.payTerm ?? "fixed"}>
                      <option value="fixed">Fixed</option>
                      <option value="hourly">Hourly</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Duration">
                    <Input
                      name="duration"
                      type="number"
                      min="1"
                      defaultValue={selectedJob.duration ?? 1}
                    />
                  </Field>
                  <Field label="Unit">
                    <Select name="durationUnit" defaultValue={selectedJob.durationUnit ?? "hour"}>
                      <option value="hour">Hour</option>
                      <option value="day">Day</option>
                      <option value="month">Month</option>
                    </Select>
                  </Field>
                  <Field label="Vehicle">
                    <Input name="vehicleId" />
                  </Field>
                </div>
                <Button disabled={createBid.isPending}>
                  <Plus className="h-4 w-4" />
                  Submit Bid
                </Button>
              </form>
              <BidList
                bids={(bidsQuery.data?.data ?? []) as Bid[]}
                job={selectedJob}
                onAction={(bid, action) => {
                  if (!selectedJob.id || !bid.id) return;
                  bidAction.mutate({ jobId: selectedJob.id, bidId: bid.id, action });
                }}
              />
            </div>
          ) : (
            <EmptyState>Select a job.</EmptyState>
          )}
        </Panel>

        <Panel title="My Bids">
          {data.bids.length ? (
            <div className="grid gap-2">
              {data.bids.map((bid) => (
                <div key={bid.id} className="rounded-md border border-slate-200 p-3">
                  <div className="font-medium">{bid.job?.title ?? `Job #${bid.jobId}`}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {bid.currency} {bid.offerPrice} · {bid.accepted ? "accepted" : bid.rejected ? "rejected" : "pending"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No bids returned.</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  );
}

function jobKindForCategory(categoryId?: number): JobKind {
  return jobKinds.find((kind) => kind.categoryId === categoryId)?.value ?? "global";
}

function BidList({
  bids,
  job,
  onAction,
}: {
  bids: Bid[];
  job: Job;
  onAction: (bid: Bid, action: "accept" | "reject" | "shortlist" | "withdraw") => void;
}) {
  if (!job.id) return null;
  if (!bids.length) return <EmptyState>No bids for this job.</EmptyState>;

  return (
    <div className="grid gap-2">
      {bids.map((bid) => (
        <div key={bid.id} className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium">{bid.user?.fullName ?? `Bid #${bid.id}`}</div>
              <div className="mt-1 text-sm text-slate-500">
                {bid.currency} {bid.offerPrice}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => onAction(bid, "shortlist")}>
                Shortlist
              </Button>
              <Button variant="secondary" onClick={() => onAction(bid, "accept")}>
                <Check className="h-4 w-4" />
                Accept
              </Button>
              <Button variant="ghost" onClick={() => onAction(bid, "reject")}>
                Reject
              </Button>
            </div>
          </div>
          {bid.desc ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{bid.desc}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

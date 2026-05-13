"use client";

import { ArrowRightLeft, Home, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { useCoreData } from "@/components/data-hooks";
import { api } from "@/lib/api/client";
import type { PropertyAsset } from "@/lib/api/types";
import { numberInput, textInput } from "@/lib/utils";
import { Button, EmptyState, Field, Input, Panel, Select, StatusPill } from "@/components/ui";

type CoreData = ReturnType<typeof useCoreData>;

export function PropertyModule({ data }: { data: CoreData }) {
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<PropertyAsset | null>(null);
  const queryClient = useQueryClient();
  const assets = useQuery({
    queryKey: ["properties", status],
    queryFn: () => api.properties(status || undefined),
    initialData: status ? undefined : data.properties,
  });
  const handovers = useQuery({
    queryKey: ["handovers", selected?.id],
    queryFn: () => api.handovers(selected?.id ?? ""),
    enabled: Boolean(selected?.id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["properties"] });
  const createAsset = useMutation({ mutationFn: api.createProperty, onSuccess: invalidate });
  const updateAsset = useMutation({
    mutationFn: ({ id, asset }: { id: string | number; asset: Partial<PropertyAsset> }) =>
      api.updateProperty(id, asset),
    onSuccess: invalidate,
  });
  const requestHandover = useMutation({
    mutationFn: ({ id, toUserId, handoverType }: { id: string | number; toUserId: number; handoverType: string }) =>
      api.requestHandover(id, { toUserId, handoverType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["handovers"] }),
  });

  function submitAsset(formData: FormData) {
    const documentUrl = textInput(formData.get("documentUrl"));
    const asset = {
      name: textInput(formData.get("name")),
      status: textInput(formData.get("status"), "private"),
      ownerType: textInput(formData.get("ownerType"), "user"),
      ownerCompanyName: textInput(formData.get("ownerCompanyName")) || null,
      ownerUserId: numberInput(formData.get("ownerUserId"), 0) || null,
      responsibleUserId: numberInput(formData.get("responsibleUserId"), 0) || null,
      temporaryOwnerUserId:
        numberInput(formData.get("temporaryOwnerUserId"), 0) || null,
      latitude: numberInput(formData.get("latitude"), 0) || null,
      longitude: numberInput(formData.get("longitude"), 0) || null,
      invoiceTransactionId:
        numberInput(formData.get("invoiceTransactionId"), 0) || null,
      documents: documentUrl
        ? [
            {
              url: documentUrl,
              name: textInput(formData.get("documentName"), "Document"),
              type: "url",
              public: formData.get("documentPublic") === "on",
            },
          ]
        : [],
    };

    if (selected?.id) {
      updateAsset.mutate({ id: selected.id, asset });
    } else {
      createAsset.mutate(asset);
    }
  }

  function submitHandover(formData: FormData) {
    if (!selected?.id) return;
    requestHandover.mutate({
      id: selected.id,
      toUserId: numberInput(formData.get("toUserId")),
      handoverType: textInput(formData.get("handoverType"), "temporary"),
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div className="grid gap-4">
        <Panel title={selected ? "Edit Asset" : "Create Asset"}>
          <form action={submitAsset} className="grid gap-3">
            <Field label="Name">
              <Input name="name" required defaultValue={selected?.name ?? ""} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <Select name="status" defaultValue={selected?.status ?? "private"}>
                  <option value="private">Private</option>
                  <option value="for_rent">For Rent</option>
                  <option value="for_sale">For Sale</option>
                </Select>
              </Field>
              <Field label="Owner Type">
                <Select name="ownerType" defaultValue={selected?.ownerType ?? "user"}>
                  <option value="user">User</option>
                  <option value="company">Company</option>
                </Select>
              </Field>
            </div>
            <Field label="Owner Company">
              <Input name="ownerCompanyName" defaultValue={selected?.ownerCompanyName ?? ""} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Owner User">
                <Input name="ownerUserId" type="number" defaultValue={selected?.ownerUserId ?? ""} />
              </Field>
              <Field label="Responsible">
                <Input name="responsibleUserId" type="number" defaultValue={selected?.responsibleUserId ?? ""} />
              </Field>
              <Field label="Temporary">
                <Input name="temporaryOwnerUserId" type="number" defaultValue={selected?.temporaryOwnerUserId ?? ""} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Latitude">
                <Input name="latitude" type="number" step="0.000001" defaultValue={selected?.latitude ?? ""} />
              </Field>
              <Field label="Longitude">
                <Input name="longitude" type="number" step="0.000001" defaultValue={selected?.longitude ?? ""} />
              </Field>
            </div>
            <Field label="Invoice Transaction ID">
              <Input name="invoiceTransactionId" type="number" defaultValue={selected?.invoiceTransactionId ?? ""} />
            </Field>
            <Field label="Document URL">
              <Input name="documentUrl" defaultValue={selected?.documents?.[0]?.url ?? ""} />
            </Field>
            <Field label="Document Name">
              <Input name="documentName" defaultValue={selected?.documents?.[0]?.name ?? ""} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="documentPublic" type="checkbox" defaultChecked={selected?.documents?.[0]?.public} />
              Public document
            </label>
            <Button disabled={createAsset.isPending || updateAsset.isPending}>
              <Plus className="h-4 w-4" />
              Save
            </Button>
          </form>
        </Panel>

        <Panel title="Handover">
          <form action={submitHandover} className="grid gap-3">
            <Field label="To User ID">
              <Input name="toUserId" type="number" required />
            </Field>
            <Field label="Type">
              <Select name="handoverType" defaultValue="temporary">
                <option value="temporary">Temporary</option>
                <option value="legal">Legal</option>
              </Select>
            </Field>
            <Button variant="secondary" disabled={!selected || requestHandover.isPending}>
              <ArrowRightLeft className="h-4 w-4" />
              Request
            </Button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-4">
        <Panel title="Assets">
          <div className="mb-3 max-w-xs">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="private">Private</option>
              <option value="for_rent">For Rent</option>
              <option value="for_sale">For Sale</option>
            </Select>
          </div>
          {assets.data?.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {assets.data.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelected(asset)}
                  className="rounded-md border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <Home className="h-4 w-4 text-emerald-700" />
                        {asset.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {asset.ownerCompanyName || asset.ownerUserId || asset.ownerType}
                      </div>
                    </div>
                    <StatusPill tone={asset.status === "private" ? "slate" : "green"}>
                      {asset.status}
                    </StatusPill>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState>{assets.isLoading ? "Loading assets." : "No assets returned."}</EmptyState>
          )}
        </Panel>

        <Panel title="Handover Requests">
          {selected ? (
            Array.isArray(handovers.data) && handovers.data.length ? (
              <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify(handovers.data, null, 2)}
              </pre>
            ) : (
              <EmptyState>No handover requests returned.</EmptyState>
            )
          ) : (
            <EmptyState>Select an asset.</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  );
}


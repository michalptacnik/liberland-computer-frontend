"use client";

import { ArrowRightLeft, Building, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { useCoreData } from "@/components/data-hooks";
import { api } from "@/lib/api/client";
import { numberInput, textInput } from "@/lib/utils";
import { Button, EmptyState, Field, Input, Panel, Select, Textarea } from "@/components/ui";

type CoreData = ReturnType<typeof useCoreData>;

const currencies = ["EUR", "USD", "LLD", "LLM", "RSD", "HUF", "BTC", "ETH"];

export function AccountingModule({ data }: { data: CoreData }) {
  const [currency, setCurrency] = useState("");
  const queryClient = useQueryClient();
  const companies = useQuery({ queryKey: ["companies"], queryFn: api.companies });
  const transactions = useQuery({
    queryKey: ["transactions", currency],
    queryFn: () => api.transactions(currency || undefined),
    initialData: currency ? undefined : data.transactions,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["balances"] });
    queryClient.invalidateQueries({ queryKey: ["companies"] });
  };

  const createTransaction = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: invalidate,
  });
  const createCompany = useMutation({
    mutationFn: api.createCompany,
    onSuccess: invalidate,
  });
  const transfer = useMutation({
    mutationFn: api.transfer,
    onSuccess: invalidate,
  });

  function submitTransaction(formData: FormData) {
    createTransaction.mutate({
      occurredAt: textInput(formData.get("occurredAt")) || new Date().toISOString(),
      currency: textInput(formData.get("currency"), "EUR"),
      amount: numberInput(formData.get("amount")),
      description: textInput(formData.get("description")),
      companyProfileId: numberInput(formData.get("companyProfileId"), 0) || null,
      attachmentUrls: textInput(formData.get("attachmentUrls"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  function submitCompany(formData: FormData) {
    createCompany.mutate({
      name: textInput(formData.get("name")),
      address: textInput(formData.get("address")),
      registrationNumber: textInput(formData.get("registrationNumber")),
      vatNumber: textInput(formData.get("vatNumber")),
      permittedUserIds: textInput(formData.get("permittedUserIds"))
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item)),
    });
  }

  function submitTransfer(formData: FormData) {
    transfer.mutate({
      toUserId: numberInput(formData.get("toUserId")),
      currency: textInput(formData.get("currency"), "EUR"),
      amount: numberInput(formData.get("amount")),
      description: textInput(formData.get("description")),
    });
  }

  const balanceEntries = Object.entries(data.balances);

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <div className="grid gap-4">
        <Panel title="Add Transaction">
          <form action={submitTransaction} className="grid gap-3">
            <Field label="Occurred At">
              <Input name="occurredAt" type="datetime-local" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Currency">
                <Select name="currency" defaultValue="EUR">
                  {currencies.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount">
                <Input name="amount" type="number" step="0.00000001" required />
              </Field>
            </div>
            <Field label="Company">
              <Select name="companyProfileId" defaultValue="">
                <option value="">None</option>
                {companies.data?.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description">
              <Textarea name="description" required />
            </Field>
            <Field label="Attachment URLs">
              <Input name="attachmentUrls" />
            </Field>
            <Button disabled={createTransaction.isPending}>
              <Plus className="h-4 w-4" />
              Save
            </Button>
          </form>
        </Panel>

        <Panel title="Company Profile">
          <form action={submitCompany} className="grid gap-3">
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Address">
              <Input name="address" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Registration">
                <Input name="registrationNumber" required />
              </Field>
              <Field label="VAT">
                <Input name="vatNumber" required />
              </Field>
            </div>
            <Field label="Permitted User IDs">
              <Input name="permittedUserIds" />
            </Field>
            <Button variant="secondary" disabled={createCompany.isPending}>
              <Building className="h-4 w-4" />
              Create
            </Button>
          </form>
        </Panel>

        <Panel title="Transfer">
          <form action={submitTransfer} className="grid gap-3">
            <Field label="To User ID">
              <Input name="toUserId" type="number" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Currency">
                <Select name="currency" defaultValue="EUR">
                  {currencies.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount">
                <Input name="amount" type="number" step="0.00000001" required />
              </Field>
            </div>
            <Field label="Description">
              <Textarea name="description" required />
            </Field>
            <Button variant="secondary" disabled={transfer.isPending}>
              <ArrowRightLeft className="h-4 w-4" />
              Transfer
            </Button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-4">
        <Panel title="Balances">
          {balanceEntries.length ? (
            <div className="grid gap-2 sm:grid-cols-4">
              {balanceEntries.map(([key, value]) => (
                <div key={key} className="rounded-md bg-slate-50 px-3 py-2">
                  <div className="text-xs text-slate-500">{key}</div>
                  <div className="text-lg font-semibold">{Number(value).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No balances returned.</EmptyState>
          )}
        </Panel>

        <Panel title="Transactions">
          <div className="mb-3 max-w-xs">
            <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="">All currencies</option>
              {currencies.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </div>
          {transactions.data?.length ? (
            <div className="overflow-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Company</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.data.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 text-slate-500">
                        {new Date(item.occurredAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3">{item.description}</td>
                      <td className="py-2 pr-3 text-slate-500">
                        {item.companyProfile?.name ?? item.companyProfileId ?? ""}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {item.currency} {Number(item.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No transactions returned.</EmptyState>
          )}
        </Panel>

        <Panel title="Companies">
          {companies.data?.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {companies.data.map((company) => (
                <div key={company.id} className="rounded-md border border-slate-200 p-3">
                  <div className="font-medium">{company.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{company.registrationNumber}</div>
                  <div className="mt-1 text-sm text-slate-500">{company.address}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No company profiles returned.</EmptyState>
          )}
        </Panel>
      </div>
    </div>
  );
}


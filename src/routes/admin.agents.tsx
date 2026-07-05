import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Pencil } from "lucide-react";

import {
  createAgent,
  getAllAgents,
  setAgentActive,
  updateAgent,
  type AgentDetail,
} from "@/lib/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/admin/agents")({
  component: AdminAgents,
});

function AdminAgents() {
  const qc = useQueryClient();
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents-all"],
    queryFn: getAllAgents,
  });

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createAgent({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        whatsappNumber: whatsappNumber.trim() || null,
      }),
    onSuccess: (agent) => {
      toast.success(`${agent.fullName} added`);
      setFullName("");
      setPhoneNumber("");
      setWhatsappNumber("");
      qc.invalidateQueries({ queryKey: ["agents-all"] });
      // ListingForm's agent dropdown uses this key — keep it fresh too.
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add agent"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phoneNumber.trim()) {
      toast.error("Full name and phone number are required");
      return;
    }
    create.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Agents</h1>
        <p className="mt-1 text-muted-foreground">
          Add the agents who get assigned to listings and contacted by inquiries.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <UserPlus className="h-5 w-5" /> New agent
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ag-name">Full name</Label>
            <Input id="ag-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ag-phone">Phone number</Label>
            <Input
              id="ag-phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+254…"
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ag-whatsapp">WhatsApp number (optional)</Label>
            <Input
              id="ag-whatsapp"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+254… — leave blank to use phone number only"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Listings only show a "WhatsApp" button on the public site when this is set.
            </p>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add agent"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">All agents</h2>
        <div className="mt-3 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && agents.length === 0 && (
            <p className="text-sm text-muted-foreground">No agents yet — add one above.</p>
          )}
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentDetail }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(agent.fullName);
  const [phoneNumber, setPhoneNumber] = useState(agent.phoneNumber);
  const [whatsappNumber, setWhatsappNumber] = useState(agent.whatsappNumber ?? "");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["agents-all"] });
    qc.invalidateQueries({ queryKey: ["agents"] });
  };

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => setAgentActive(agent.id, isActive),
    onSuccess: () => { toast.success("Updated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      updateAgent(agent.id, {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        whatsappNumber: whatsappNumber.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Agent updated");
      setEditing(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update agent"),
  });

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor={`name-${agent.id}`}>Full name</Label>
            <Input id={`name-${agent.id}`} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`phone-${agent.id}`}>Phone number</Label>
            <Input id={`phone-${agent.id}`} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`wa-${agent.id}`}>WhatsApp number</Label>
            <Input id={`wa-${agent.id}`} value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setFullName(agent.fullName);
              setPhoneNumber(agent.phoneNumber);
              setWhatsappNumber(agent.whatsappNumber ?? "");
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (!fullName.trim() || !phoneNumber.trim()) {
                toast.error("Full name and phone number are required");
                return;
              }
              save.mutate();
            }}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="font-medium text-foreground">{agent.fullName}</p>
        <p className="text-xs text-muted-foreground">
          {agent.phoneNumber}
          {agent.whatsappNumber && ` · WhatsApp: ${agent.whatsappNumber}`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          {agent.isActive ? "Active" : "Deactivated"}
        </span>
        <Switch
          checked={agent.isActive}
          onCheckedChange={(v) => toggleActive.mutate(v)}
          disabled={toggleActive.isPending}
        />
      </div>
    </div>
  );
}

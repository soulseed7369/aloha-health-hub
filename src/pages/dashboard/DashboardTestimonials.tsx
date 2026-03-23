import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, AlertCircle, Check, ShieldCheck, Send, MessageSquare, Star, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import { useMyBillingProfile } from "@/hooks/useStripe";
import {
  useMyTestimonialInvites,
  useSendTestimonialInvite,
  useRespondToTestimonial,
  useRequestTestimonialEdit,
} from "@/hooks/useVerifiedTestimonials";
import type { VerifiedTestimonialRow } from "@/types/database";
import { calculateInviteQuota } from "@/lib/testimonialUtils";

const TIER_QUOTAS = {
  free: 0,
  premium: 10,
  featured: 20,
};

const FLAG_REASONS = [
  "Inappropriate content",
  "Not a real client",
  "Spam or fake",
  "Other",
];

type TestimonialStatus = "pending" | "submitted" | "published" | "flagged" | "expired";

export default function DashboardTestimonials() {
  const { data: practitioner, isLoading: practitionerLoading } = useMyPractitioner();
  const { data: billing, isLoading: billingLoading } = useMyBillingProfile();
  const { data: invites = [], isLoading: invitesLoading } = useMyTestimonialInvites(
    practitioner?.id ?? null
  );

  const sendInvite = useSendTestimonialInvite();
  const respondToTestimonial = useRespondToTestimonial();
  const requestEdit = useRequestTestimonialEdit();

  // Form state for new invite
  const [inviteEmail, setInviteEmail] = useState("");

  // Form state for responses (testimonialId -> response text)
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Form state for edit request dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogMode, setEditDialogMode] = useState<'reason' | 'sent'>('reason');
  const [editReason, setEditReason] = useState('');
  const [editResultMessage, setEditResultMessage] = useState('');
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);

  const isLoading = practitionerLoading || billingLoading || invitesLoading;
  const tier = billing?.tier ?? "free";
  const quota = TIER_QUOTAS[tier];
  const thisMonthInvites = calculateInviteQuota(invites);
  const remainingQuota = quota - thisMonthInvites;
  const canInvite = quota > 0 && remainingQuota > 0;

  // Group testimonials by status
  const pending = invites.filter((t) => t.invite_status === "pending");
  const submitted = invites.filter((t) => t.invite_status === "submitted");
  const published = invites.filter((t) => t.invite_status === "published");
  const hasAny = pending.length > 0 || submitted.length > 0 || published.length > 0;

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!practitioner) {
      toast.error("Practitioner profile not found.");
      return;
    }

    try {
      await sendInvite.mutateAsync({
        practitionerId: practitioner.id,
        clientEmail: inviteEmail,
      });

      toast.success("Invitation sent!");
      setInviteEmail("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(msg);
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleAddResponse = async (testimonialId: string) => {
    const response = responses[testimonialId]?.trim();
    if (!response) {
      toast.error("Please enter a response.");
      return;
    }

    if (response.length > 200) {
      toast.error("Response must be 200 characters or less.");
      return;
    }

    try {
      await respondToTestimonial.mutateAsync({
        testimonialId,
        response,
      });
      toast.success("Response added!");
      setResponses((prev) => {
        const next = { ...prev };
        delete next[testimonialId];
        return next;
      });
    } catch (err) {
      toast.error("Failed to add response. Please try again.");
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const openEditDialog = (testimonialId: string) => {
    setEditingTestimonialId(testimonialId);
    setEditReason('');
    setEditDialogMode('reason');
    setEditResultMessage('');
    setEditDialogOpen(true);
  };

  const handleRequestEdit = async () => {
    if (!editingTestimonialId) return;
    try {
      const result = await requestEdit.mutateAsync({
        testimonialId: editingTestimonialId,
        reason: editReason.trim() || undefined,
      });
      setEditResultMessage(result.message);
      setEditDialogMode('sent');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request edit';
      toast.error(msg);
      setEditDialogOpen(false);
      setEditingTestimonialId(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const TestimonialCard = ({
    testimonial,
    showFlag = false,
  }: {
    testimonial: VerifiedTestimonialRow;
    showFlag?: boolean;
  }) => {
    const isExpanded = expandedIds.has(testimonial.id);
    const isEditingResponse = responses[testimonial.id] !== undefined;
    const hasResponse = !!testimonial.practitioner_response;

    return (
      <Card className="border-l-4 border-l-amber-300">
        <CardContent className="p-4 space-y-3">
          {/* Header: name, island, date */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1">
              <p className="font-medium text-sm">
                {testimonial.client_display_name || "Anonymous"}
                {testimonial.client_island && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    · {testimonial.client_island}
                  </span>
                )}
              </p>
              {testimonial.submitted_at && (
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(testimonial.submitted_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <Badge
              variant={
                testimonial.invite_status === "published"
                  ? "default"
                  : testimonial.invite_status === "pending"
                    ? "secondary"
                    : testimonial.invite_status === "flagged"
                      ? "destructive"
                      : "outline"
              }
              className="text-xs shrink-0"
            >
              {testimonial.invite_status === "pending" && "Awaiting response"}
              {testimonial.invite_status === "submitted" && "Submitted"}
              {testimonial.invite_status === "published" && "Published"}
              {testimonial.invite_status === "flagged" && "Flagged"}
              {testimonial.invite_status === "expired" && "Expired"}
            </Badge>
          </div>

          {/* Highlight (AI-selected excerpt) */}
          {testimonial.highlight && (
            <div className="bg-amber-50 border-l-2 border-amber-300 pl-3 py-2 rounded text-sm italic text-amber-900">
              "{testimonial.highlight}"
            </div>
          )}

          {/* Full text (expandable if longer than highlight) */}
          {testimonial.full_text && (
            <div className="space-y-2">
              {!isExpanded && testimonial.full_text.length > 200 ? (
                <div className="flex items-start gap-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {testimonial.full_text}
                  </p>
                  <button
                    onClick={() => toggleExpanded(testimonial.id)}
                    className="text-xs font-medium text-primary hover:underline shrink-0 mt-0.5"
                  >
                    Read more
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {testimonial.full_text}
                  </p>
                  {isExpanded && testimonial.full_text.length > 200 && (
                    <button
                      onClick={() => toggleExpanded(testimonial.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Show less
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Practitioner response section */}
          <div className="pt-2 border-t space-y-2">
            {hasResponse ? (
              <div className="bg-blue-50 rounded p-3 space-y-1">
                <p className="text-xs font-medium text-blue-900">Your response</p>
                <p className="text-sm text-blue-800">{testimonial.practitioner_response}</p>
                {testimonial.responded_at && (
                  <p className="text-xs text-blue-700">
                    {new Date(testimonial.responded_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : null}

            {/* Response input (only show if not in edit mode for a different testimonial) */}
            {!isEditingResponse ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResponses((prev) => ({ ...prev, [testimonial.id]: "" }))}
                  className="flex-1"
                >
                  {hasResponse ? "Edit Response" : "Add Response"}
                </Button>
                {testimonial.invite_status === 'published' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(testimonial.id)}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Request Edit
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  placeholder="Share your appreciation or thoughts about this testimonial (max 200 chars)..."
                  value={responses[testimonial.id] || ""}
                  onChange={(e) =>
                    setResponses((prev) => ({
                      ...prev,
                      [testimonial.id]: e.target.value.slice(0, 200),
                    }))
                  }
                  className="min-h-[80px] text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {(responses[testimonial.id] || "").length} / 200
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setResponses((prev) => {
                          const next = { ...prev };
                          delete next[testimonial.id];
                          return next;
                        })
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddResponse(testimonial.id)}
                      disabled={respondToTestimonial.isPending}
                    >
                      Save Response
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flag button (only for pending/submitted) */}
          {showFlag && (
            <div className="flex justify-end pt-2 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Flag
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {FLAG_REASONS.map((reason) => (
                    <DropdownMenuItem
                      key={reason}
                      onClick={() => {
                        // TODO: Implement flag mutation
                        toast.success(`Flagged: ${reason}`);
                      }}
                    >
                      {reason}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!canInvite && !hasAny) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Client Testimonials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Collect verified testimonials from real clients to build trust on your profile.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/50" />
            <div className="max-w-sm">
              <p className="font-medium text-muted-foreground">Verified testimonials build trust</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Invite clients by email. They write in their own words through a private link — you can't edit their response, which is what makes it credible. Each testimonial displays a "Verified client" badge on your profile.
              </p>
              <p className="mt-2 text-sm text-muted-foreground/70">
                Available on Premium ({TIER_QUOTAS.premium}/mo) and Featured ({TIER_QUOTAS.featured}/mo) plans.
              </p>
            </div>
            <Button asChild>
              <a href="/dashboard/billing">View Plans</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Client Testimonials</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Collect verified testimonials from real clients. These carry a "Verified client" badge on your profile — more trusted than anonymous reviews.
        </p>
      </div>

      {/* How it works — process explainer */}
      {!hasAny && (
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50/50 to-cyan-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              How verified testimonials work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">1</div>
                <div>
                  <p className="text-sm font-medium">You invite a client</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter their email. We send a private link — only they can use it.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">2</div>
                <div>
                  <p className="text-sm font-medium">They write in their own words</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Guided prompts or freeform — their choice. You cannot edit what they write.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">3</div>
                <div>
                  <p className="text-sm font-medium">Published with a verified badge</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Their testimonial goes live on your profile with a "Verified client" badge. You can add a brief response.</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground border-t border-teal-200/50 pt-3">
              This process ensures every testimonial is written by a real client — not a bot and not the practitioner.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invite Section */}
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite a Client</CardTitle>
            <CardDescription>
              Enter your client's email and we'll send them a private link to share their experience. Their response is published directly — you won't be able to edit it, which is what makes it trusted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Client Email</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="client@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={sendInvite.isPending}
                />
                <Button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || sendInvite.isPending || !canInvite}
                  className="gap-2 shrink-0"
                >
                  <Mail className="h-4 w-4" />
                  Send Invite
                </Button>
              </div>
            </div>

            {/* Quota display */}
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm">
              <Check className="h-4 w-4 text-blue-600" />
              <p className="text-blue-900">
                <span className="font-medium">{remainingQuota}</span> of{" "}
                <span className="font-medium">{quota}</span> invites remaining this month
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pending Invites ({pending.length})</h2>
          {pending.map((testimonial) => (
            <Card key={testimonial.id} className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Waiting for client response</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {new Date(testimonial.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Awaiting response
                  </Badge>
                </div>
                {testimonial.expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(testimonial.expires_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submitted Testimonials (awaiting auto-publish) */}
      {submitted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Submitted ({submitted.length})</h2>
          {submitted.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} showFlag />
          ))}
        </div>
      )}

      {/* Published Testimonials */}
      {published.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Published ({published.length})</h2>
          {published.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasAny && canInvite && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No testimonials yet</p>
            <p className="mt-1 text-sm text-muted-foreground/70 max-w-xs">
              Send your first invite above. Most clients respond within a few days — a short, personal message letting them know to expect the email helps.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Request Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingTestimonialId(null);
      }}>
        <DialogContent className="sm:max-w-md">
          {editDialogMode === 'reason' ? (
            <>
              <DialogHeader>
                <DialogTitle>Request Testimonial Edit</DialogTitle>
                <DialogDescription>
                  We'll email your client a link to revise their testimonial. Their previous response will be pre-filled so they can make corrections.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-reason">What needs to be changed? (optional)</Label>
                  <Textarea
                    id="edit-reason"
                    placeholder='e.g., "Could you fix the spelling of my name?" or "The date mentioned is incorrect."'
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value.slice(0, 500))}
                    className="min-h-[80px] text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This note will be included in the email to your client.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRequestEdit}
                    disabled={requestEdit.isPending}
                    className="gap-1.5"
                  >
                    {requestEdit.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send Edit Request
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Edit Request Sent</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm">{editResultMessage}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  The testimonial has been temporarily unpublished while your client makes changes. It will go live again once they resubmit. The link expires in 14 days.
                </p>
                <Button className="w-full" onClick={() => {
                  setEditDialogOpen(false);
                  setEditingTestimonialId(null);
                }}>
                  Done
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

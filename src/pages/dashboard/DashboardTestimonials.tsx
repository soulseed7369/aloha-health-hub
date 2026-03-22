import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { useMyPractitioner } from "@/hooks/useMyPractitioner";
import { useMyBillingProfile } from "@/hooks/useStripe";
import {
  useMyTestimonialInvites,
  useSendTestimonialInvite,
  useRespondToTestimonial,
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

  // Form state for new invite
  const [inviteEmail, setInviteEmail] = useState("");

  // Form state for responses (testimonialId -> response text)
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResponses((prev) => ({ ...prev, [testimonial.id]: "" }))}
                className="w-full"
              >
                {hasResponse ? "Edit Response" : "Add Response"}
              </Button>
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
            Gather verified feedback from real clients.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-muted-foreground">Upgrade to invite clients</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Client testimonials are available on Premium ($39/mo) and Featured ($129/mo) plans.
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
          Invite clients to share their experience and respond to their feedback.
        </p>
      </div>

      {/* Invite Section */}
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite a Client</CardTitle>
            <CardDescription>
              We'll create a unique link for your client to share their experience. You won't be
              able to edit their response.
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
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No testimonials yet.</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Invite your first client to share their experience!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

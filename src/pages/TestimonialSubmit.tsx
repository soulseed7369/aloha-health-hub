import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTestimonialInvite } from '@/hooks/useVerifiedTestimonials';
import { supabase } from '@/lib/supabase';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type DisplayNameMode = 'first-name' | 'first-last-initial' | 'initials';
type SessionCount = '1' | '2-5' | '6-10' | '10+';

const ISLANDS = [
  { label: 'Big Island', value: 'big_island' },
  { label: 'Maui', value: 'maui' },
  { label: 'Oahu', value: 'oahu' },
  { label: 'Kauai', value: 'kauai' },
  { label: 'Prefer not to say', value: null },
];

export default function TestimonialSubmit() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useTestimonialInvite(token || null);
  usePageMeta('Share Your Experience', 'Share a verified testimonial with the wellness community.');

  // Form state
  const [displayNameMode, setDisplayNameMode] = useState<DisplayNameMode>('first-name');
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [initials, setInitials] = useState('');
  const [island, setIsland] = useState<string | null>(null);
  const [useGuidedPrompts, setUseGuidedPrompts] = useState(false);
  const [freeformText, setFreeformText] = useState('');
  const [promptWhatBrought, setPromptWhatBrought] = useState('');
  const [promptSessions, setPromptSessions] = useState<SessionCount | ''>('');
  const [promptWhatChanged, setPromptWhatChanged] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Determine which text field to use for word count
  const textContent = useGuidedPrompts ? promptWhatBrought + ' ' + promptWhatChanged : freeformText;
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  // Check if invite has already been submitted
  useEffect(() => {
    if (data?.testimonial && data.testimonial.invite_status !== 'pending') {
      // Invite was already submitted/published/etc.
      if (data.testimonial.invite_status === 'submitted' || data.testimonial.invite_status === 'published') {
        setSubmitted(true);
      }
    }
  }, [data]);

  // Pre-fill form when testimonial is being edited (status = 'pending' with existing content)
  useEffect(() => {
    if (!data?.testimonial) return;

    const testimonial = data.testimonial;

    // Check if this is an edit (status is 'pending' and has existing text content)
    const hasPromptContent = testimonial.prompt_what_brought || testimonial.prompt_sessions || testimonial.prompt_what_changed;
    const hasFreefromContent = testimonial.full_text;

    if (!hasPromptContent && !hasFreefromContent) return;

    setIsEditMode(true);

    // Pre-fill client display name and island
    if (testimonial.client_display_name) {
      setFirstName(testimonial.client_display_name);
      setDisplayNameMode('first-name');
    }

    if (testimonial.client_island) {
      setIsland(testimonial.client_island);
    }

    // Pre-fill guided mode if prompt fields exist
    if (hasPromptContent) {
      setUseGuidedPrompts(true);
      if (testimonial.prompt_what_brought) {
        setPromptWhatBrought(testimonial.prompt_what_brought);
      }
      if (testimonial.prompt_sessions) {
        setPromptSessions(testimonial.prompt_sessions as SessionCount);
      }
      if (testimonial.prompt_what_changed) {
        setPromptWhatChanged(testimonial.prompt_what_changed);
      }
    } else if (hasFreefromContent) {
      // Pre-fill freeform mode
      setUseGuidedPrompts(false);
      setFreeformText(testimonial.full_text);
    }
  }, [data]);

  // Calculate display name
  const getDisplayName = (): string => {
    if (displayNameMode === 'first-name') return firstName;
    if (displayNameMode === 'first-last-initial') return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
    return initials;
  };

  // Word count limits
  const FREEFORM_MAX_WORDS = 500;
  const freeformWordCount = freeformText.trim().split(/\s+/).filter(Boolean).length;
  const isOverWordLimit = !useGuidedPrompts && freeformWordCount > FREEFORM_MAX_WORDS;

  // Validate form
  const isFormValid = (): boolean => {
    const displayName = getDisplayName().trim();
    if (!displayName) return false;
    if (!consentChecked) return false;
    if (isOverWordLimit) return false;
    if (useGuidedPrompts) {
      return !!promptWhatBrought.trim() && !!promptSessions && !!promptWhatChanged.trim();
    }
    return !!freeformText.trim();
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !isFormValid()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const fullText = useGuidedPrompts
        ? `What brought you: ${promptWhatBrought}\n\nSessions: ${promptSessions}\n\nWhat changed: ${promptWhatChanged}`
        : freeformText;

      if (!supabase) throw new Error('Supabase not initialized');

      // Use supabase.functions.invoke — handles apikey header automatically.
      // No auth needed for submit (token-based), but invoke still needs the anon key.
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'submit-testimonial',
        {
          body: {
            inviteToken: token,
            clientDisplayName: getDisplayName(),
            clientIsland: island,
            mode: useGuidedPrompts ? 'guided' : 'freeform',
            freeformText: useGuidedPrompts ? undefined : fullText,
            promptWhatBrought: useGuidedPrompts ? promptWhatBrought : undefined,
            promptSessions: useGuidedPrompts ? promptSessions : undefined,
            promptWhatChanged: useGuidedPrompts ? promptWhatChanged : undefined,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to submit testimonial');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // ── Invalid/expired invite ──
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-destructive">Invitation Expired</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This testimonial invitation has expired or is no longer valid. Invitations are active for 60 days.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the practitioner directly to request a new invitation.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Already submitted / just submitted ──
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <CardTitle>Thank You!</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your testimonial has been submitted. Thank you for sharing your experience!
            </p>
            <p className="text-sm text-muted-foreground">
              Your testimonial is now visible on the practitioner's profile.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/profile/${data.practitioner.id}`)}
            >
              Visit Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with practitioner context */}
        <div className="text-center space-y-4">
          {data.practitioner.avatar_url && (
            <img
              src={data.practitioner.avatar_url}
              alt={data.practitioner.name}
              className="h-16 w-16 rounded-full object-cover mx-auto border-2 border-primary/20"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold">Share Your Experience</h1>
            <p className="text-lg text-muted-foreground">with {data.practitioner.name}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {data.practitioner.name} on Hawaiʻi Wellness has invited you to share your experience.
            </p>
          </div>
        </div>

        {/* Form card */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            {/* Edit mode banner */}
            {isEditMode && (
              <div className="mb-6 flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-primary">
                  Your previous response has been loaded. Make your changes and submit again.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display name options */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">How would you like to be credited?</Label>
                <div className="space-y-3">
                  {/* First name only */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-input hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setDisplayNameMode('first-name')}
                  >
                    <input
                      type="radio"
                      name="displayMode"
                      value="first-name"
                      checked={displayNameMode === 'first-name'}
                      onChange={(e) => setDisplayNameMode(e.target.value as DisplayNameMode)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label className="text-sm font-medium cursor-pointer">First name only</Label>
                      <Input
                        placeholder="e.g., Sarah"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* First name + last initial */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-input hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setDisplayNameMode('first-last-initial')}
                  >
                    <input
                      type="radio"
                      name="displayMode"
                      value="first-last-initial"
                      checked={displayNameMode === 'first-last-initial'}
                      onChange={(e) => setDisplayNameMode(e.target.value as DisplayNameMode)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm font-medium cursor-pointer">First name + last initial</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="text-sm flex-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Input
                          placeholder="Initial"
                          maxLength={1}
                          value={lastInitial}
                          onChange={(e) => setLastInitial(e.target.value.toUpperCase())}
                          className="text-sm w-16"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Initials only */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-input hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setDisplayNameMode('initials')}
                  >
                    <input
                      type="radio"
                      name="displayMode"
                      value="initials"
                      checked={displayNameMode === 'initials'}
                      onChange={(e) => setDisplayNameMode(e.target.value as DisplayNameMode)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <Label className="text-sm font-medium cursor-pointer">Initials only</Label>
                      <Input
                        placeholder="e.g., S.M."
                        value={initials}
                        onChange={(e) => setInitials(e.target.value.toUpperCase())}
                        maxLength={5}
                        className="text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Island select */}
              <div className="space-y-2">
                <Label htmlFor="island">Where are you located? (Optional)</Label>
                <Select value={island || 'none'} onValueChange={(val) => setIsland(val === 'none' ? null : val)}>
                  <SelectTrigger id="island">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Prefer not to say</SelectItem>
                    {ISLANDS.filter(i => i.value !== null).map(i => (
                      <SelectItem key={i.value} value={i.value!}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle for guided prompts */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-input hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setUseGuidedPrompts(!useGuidedPrompts)}
                >
                  <input
                    type="checkbox"
                    checked={useGuidedPrompts}
                    onChange={(e) => setUseGuidedPrompts(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <Label className="cursor-pointer text-sm font-medium">
                    I'd prefer guided prompts instead of writing freely
                  </Label>
                </div>
              </div>

              {/* Freeform text (default) */}
              {!useGuidedPrompts && (
                <div className="space-y-2">
                  <Label htmlFor="freeform" className="text-base font-semibold">Share your experience...</Label>
                  <Textarea
                    id="freeform"
                    placeholder="Tell us about your experience working with this practitioner. What brought you to them? How has your experience been? What has changed for you? (max 500 words)"
                    value={freeformText}
                    onChange={(e) => setFreeformText(e.target.value)}
                    className="min-h-48 resize-none"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{wordCount} words</span>
                    <span className={wordCount > 500 ? 'text-destructive' : ''}>
                      {wordCount > 500 ? 'Exceeds limit' : 'Up to 500 words'}
                    </span>
                  </div>
                </div>
              )}

              {/* Guided prompts */}
              {useGuidedPrompts && (
                <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="prompted1" className="font-medium">
                      What brought you to {data.practitioner.name}?
                    </Label>
                    <Textarea
                      id="prompted1"
                      placeholder="Describe what led you to seek out this practitioner..."
                      value={promptWhatBrought}
                      onChange={(e) => setPromptWhatBrought(e.target.value)}
                      className="min-h-28 resize-none"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {promptWhatBrought.trim().split(/\s+/).filter(Boolean).length} words (max 200)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessions" className="font-medium">
                      Roughly how many sessions have you had?
                    </Label>
                    <Select value={promptSessions} onValueChange={(val) => setPromptSessions(val as SessionCount)}>
                      <SelectTrigger id="sessions">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 session</SelectItem>
                        <SelectItem value="2-5">2–5 sessions</SelectItem>
                        <SelectItem value="6-10">6–10 sessions</SelectItem>
                        <SelectItem value="10+">10+ sessions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prompted2" className="font-medium">
                      What has changed for you?
                    </Label>
                    <Textarea
                      id="prompted2"
                      placeholder="Describe the shifts or improvements you've experienced..."
                      value={promptWhatChanged}
                      onChange={(e) => setPromptWhatChanged(e.target.value)}
                      className="min-h-28 resize-none"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {promptWhatChanged.trim().split(/\s+/).filter(Boolean).length} words (max 300)
                    </div>
                  </div>
                </div>
              )}

              {/* Consent */}
              <div className="border-t pt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={consentChecked}
                    onCheckedChange={(checked) => setConsentChecked(checked as boolean)}
                    className="mt-1"
                  />
                  <Label htmlFor="consent" className="text-sm cursor-pointer leading-relaxed">
                    I understand this testimonial will be displayed publicly on {data.practitioner.name}'s Hawaiʻi Wellness profile and may be used in promotional materials.
                  </Label>
                </div>
              </div>

              {/* Error message */}
              {submitError && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={!isFormValid() || isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSubmitting ? 'Submitting...' : 'Submit Testimonial'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Questions? Contact us at <a href="mailto:aloha@hawaiiwellness.net" className="text-primary hover:underline">aloha@hawaiiwellness.net</a></p>
          <p>
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
            {' '}&bull;{' '}
            <Link to="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

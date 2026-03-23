/**
 * submit-testimonial/index.ts
 * Supabase Edge Function — handles client testimonial submission.
 *
 * Called from the browser via supabase.functions.invoke('submit-testimonial', { body: { inviteToken, ... } })
 * No auth required — the invite_token serves as authentication.
 *
 * Deploy:
 *   supabase functions deploy submit-testimonial --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Call Anthropic Claude API to extract highlight ──────────────────────────
async function generateHighlight(fullText: string): Promise<string> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicKey) {
    console.warn('ANTHROPIC_API_KEY not set, falling back to first sentence');
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences[0]?.trim() || fullText;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Extract the single most impactful 1-2 sentence quote from this client testimonial. Choose the part that would most help a potential new client decide to book. Return ONLY the extracted quote, nothing else. If the testimonial is very short (under 2 sentences), return it as-is.

Testimonial:
${fullText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', { status: response.status, error });
      throw new Error(`Anthropic API returned ${response.status}`);
    }

    const result = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const text = result.content[0]?.text?.trim();
    if (!text) throw new Error('No content in response');

    return text;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to generate highlight, falling back:', { message });

    // Fallback: first sentence
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences[0]?.trim() || fullText;
  }
}

// ── Stitch full text from guided or freeform responses ───────────────────────
function stitchFullText(
  mode: 'freeform' | 'guided',
  freeformText?: string,
  promptWhatBrought?: string,
  promptSessions?: string,
  promptWhatChanged?: string
): string {
  if (mode === 'freeform') {
    return freeformText || '';
  }

  // Guided mode: stitch the three prompt responses
  const parts: string[] = [];

  if (promptWhatBrought) parts.push(promptWhatBrought);
  if (promptSessions) parts.push(promptSessions);
  if (promptWhatChanged) parts.push(promptWhatChanged);

  return parts.join('\n\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── Guard env vars ────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRole) {
      console.error('Missing Supabase configuration');
      return json({ error: 'Supabase configuration error' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

    // ── Validate request body ──────────────────────────────────────────
    const body = await req.json();
    const {
      inviteToken,
      clientDisplayName,
      clientIsland,
      mode,
      freeformText,
      promptWhatBrought,
      promptSessions,
      promptWhatChanged,
    } = body;

    if (!inviteToken) {
      return json({ error: 'Missing inviteToken' }, 400);
    }

    if (!clientDisplayName || typeof clientDisplayName !== 'string') {
      return json({ error: 'Missing or invalid clientDisplayName' }, 400);
    }

    if (!mode || (mode !== 'freeform' && mode !== 'guided')) {
      return json({ error: 'Invalid mode: must be freeform or guided' }, 400);
    }

    // ── Validate text content based on mode ─────────────────────────────
    if (mode === 'freeform') {
      if (!freeformText || typeof freeformText !== 'string') {
        return json({ error: 'Freeform mode requires freeformText' }, 400);
      }

      // Max 500 words
      const wordCount = freeformText.trim().split(/\s+/).length;
      if (wordCount > 500) {
        return json({ error: 'Testimonial exceeds 500 word limit' }, 400);
      }
    } else {
      // Guided mode
      if (!promptWhatBrought || typeof promptWhatBrought !== 'string') {
        return json({ error: 'Guided mode requires promptWhatBrought' }, 400);
      }
      if (!promptSessions || typeof promptSessions !== 'string') {
        return json({ error: 'Guided mode requires promptSessions' }, 400);
      }
      if (!promptWhatChanged || typeof promptWhatChanged !== 'string') {
        return json({ error: 'Guided mode requires promptWhatChanged' }, 400);
      }
    }

    // ── Validate token and check it's pending + not expired ──────────────
    const { data: invite, error: tokenErr } = await supabaseAdmin
      .from('verified_testimonials')
      .select('id, practitioner_id, invite_status, expires_at')
      .eq('invite_token', inviteToken)
      .single();

    if (tokenErr || !invite) {
      return json({ error: 'Invalid or expired invite token' }, 404);
    }

    if (invite.invite_status !== 'pending') {
      return json(
        {
          error: `This invitation has already been ${invite.invite_status}. You can only submit once.`,
        },
        409
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return json({ error: 'This invitation has expired' }, 410);
    }

    // ── Stitch full text ───────────────────────────────────────────────
    const fullText = stitchFullText(
      mode,
      freeformText,
      promptWhatBrought,
      promptSessions,
      promptWhatChanged
    );

    if (!fullText.trim()) {
      return json({ error: 'Testimonial content cannot be empty' }, 400);
    }

    // ── Use first sentence as immediate highlight, AI refines later ────
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const quickHighlight = sentences[0]?.trim() || fullText;

    // ── Update the row — instant, no waiting for AI ──────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('verified_testimonials')
      .update({
        client_display_name: clientDisplayName,
        client_island: clientIsland || null,
        prompt_what_brought: mode === 'guided' ? promptWhatBrought : null,
        prompt_sessions: mode === 'guided' ? promptSessions : null,
        prompt_what_changed: mode === 'guided' ? promptWhatChanged : null,
        full_text: fullText,
        highlight: quickHighlight,
        invite_status: 'published',
        submitted_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('invite_token', inviteToken);

    if (updateErr) {
      console.error('Update failed:', updateErr);
      return json({ error: 'Failed to submit testimonial' }, 500);
    }

    // ── Fire-and-forget: generate AI highlight in background ─────────
    // Don't await — client gets instant response, highlight updates async
    generateHighlight(fullText).then(async (aiHighlight) => {
      if (aiHighlight && aiHighlight !== quickHighlight) {
        const { error: hlErr } = await supabaseAdmin
          .from('verified_testimonials')
          .update({ highlight: aiHighlight, updated_at: new Date().toISOString() })
          .eq('invite_token', inviteToken);
        if (hlErr) {
          console.error('Background highlight update failed:', hlErr);
        } else {
          console.log('AI highlight updated successfully');
        }
      }
    }).catch((err) => {
      console.error('Background highlight generation failed:', err);
    });

    return json({
      success: true,
      message: 'Thank you! Your testimonial has been submitted.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('submit-testimonial error:', { message, stack });
    return json({ error: message || 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

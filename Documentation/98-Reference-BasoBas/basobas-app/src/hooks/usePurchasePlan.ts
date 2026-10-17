import { useState, useCallback } from 'react';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { useUserStore } from '@/src/store/userStore';

export type PlanId = '15day' | '30day';

export interface EsewaFormFields {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
  form_action_url: string;
}

interface PurchasePlanState {
  loading: boolean;
  error: string | null;
  formFields: EsewaFormFields | null;
}

/**
 * `usePurchasePlan` — initializes an eSewa payment for the given plan.
 *
 * Returns:
 *  - `loading`: true while the Edge Function call is in flight
 *  - `error`: a user-facing error message (or null)
 *  - `formFields`: the signed eSewa form fields (or null)
 *  - `purchasePlan(plan)`: call to initiate a purchase
 *  - `reset()`: clear state (for retries)
 */
export function usePurchasePlan() {
  const supabase = useClerkSupabase();
  const isPro = useUserStore((s) => s.profile.pro.active);

  const [state, setState] = useState<PurchasePlanState>({
    loading: false,
    error: null,
    formFields: null,
  });

  const purchasePlan = useCallback(
    async (plan: PlanId) => {
      // ── Guard: already Pro ────────────────────────────────────────
      if (isPro) {
        setState({ loading: false, error: 'You already have an active Pro plan.', formFields: null });
        return;
      }

      // ── Guard: prevent double-tap ────────────────────────────────
      if (state.loading) return;

      setState({ loading: true, error: null, formFields: null });

      try {
        const { data, error } = await supabase.functions.invoke(
          'create-esewa-order',
          { body: { plan } }
        );

        if (error) {
          console.error('create-esewa-order invocation error:', error);
          // FunctionsHttpError.context is the raw Response — read the body
          // to surface the Edge Function's actual reason.
          // (JSDoc in @supabase/functions-js FunctionsClient.js)
          let bodyMessage: string | null = null;
          try {
            const ctx = (error as any)?.context;
            if (ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              bodyMessage =
                (body && (body.error ?? body.message ?? body.msg)) ?? null;
              if (typeof bodyMessage !== 'string') bodyMessage = null;
            } else if (typeof ctx === 'string') {
              bodyMessage = ctx;
            }
          } catch {
            // Body wasn't JSON or already consumed — fall through to generic.
          }
          setState({
            loading: false,
            error: bodyMessage
              ? `Payment server error: ${bodyMessage}`
              : 'Could not reach the payment server. Please check your connection and try again.',
            formFields: null,
          });
          return;
        }

        // Edge Function returned an application-level error
        if ((data as any)?.error) {
          setState({
            loading: false,
            error: (data as any).error,
            formFields: null,
          });
          return;
        }

        // Success — return the form fields for the WebView
        setState({ loading: false, error: null, formFields: data as unknown as EsewaFormFields });
      } catch (err: any) {
        console.error('usePurchasePlan: unexpected error', err);
        setState({
          loading: false,
          error: err?.message ?? 'Something went wrong. Please try again.',
          formFields: null,
        });
      }
    },
    [supabase, isPro, state.loading]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, formFields: null });
  }, []);

  return { ...state, purchasePlan, reset };
}

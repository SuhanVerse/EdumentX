# src/hooks

Small, focused React hooks. One concern per hook — no god-hooks.

| Hook | Purpose |
|---|---|
| `useAiChat` | Zustand selector wrapper over the AI-chat store. |
| `useCameraBounds` | Zoom level → lat/lng viewport bounds math (map screens). |
| `useFieldScroll` | Scroll-to-first-invalid registry for long forms. |
| `useInAppNotifications` | Unread-filtered in-app notification queue with a seen-baseline. |
| `useSignedDocUrl` | Short-lived signed URL for private verification docs (`verification-doc-url` edge function). Public-bucket kinds resolve synchronously. Aug 24 audit. |
| `useTutorClustering` | Supercluster clustering of tutor listings for map markers. |
| `useUserLocation` | One-shot GPS fix with the Kathmandu default fallback. |

(An earlier version of this file documented eight aspirational hooks —
`useAuth`, `useRegistration`, `useForm`, `useDebounce`,
`useDebouncedValue`, `useKeyboard`, `useOtpCountdown`,
`useCountryPicker` — none of which ever existed, and OTP flows that were
removed with the Clerk revert. Deleted; this table matches reality.)

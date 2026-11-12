# Design notes

This explains the decisions behind BioPay, the trade-offs I made, and what I ran into while building it. For setup and the demo script, see the [README](./README.md).

## 1. How the code is structured

The screens in `src/app` are deliberately thin. They lay things out and handle navigation, and that's it. Everything else is split by what it does:

| Layer | Examples | What it's allowed to know about |
|---|---|---|
| Screens | `index.tsx`, `review.tsx` | feature hooks and components |
| Workflow hooks | `useSubmitTransfer`, `useTransactionAuth`, `useTransferForm` | stores and services |
| Stores (Zustand) | account, recipients, history, transfer draft | the API |
| Services | `api`, `biometricService`, `pinService` | platform APIs, never UI |
| Pure logic | money, identifiers, the zod schema, `groupByMonth` | nothing |

The bottom two layers have no React in them, so they're tested directly. That covers most of the 53 tests.

I used Expo with a development build rather than a bare React Native project. Config plugins write the native permission strings (Face ID, contacts) from `app.json`, so there's no hand-edited `ios/` or `android/` folder to drift. Expo Go was never an option, because Face ID isn't available inside it.

## 2. Security

This is a payments feature, so most of my decisions came from asking: who could misuse this, and how?

**Every transfer is approved on its own.** The biometric prompt runs when you tap Confirm, every single time, and it says what you're approving: "Send RM 250.00 to Aisyah Rahman". Unlocking the app once isn't enough to move money.

**The phone's passcode isn't accepted as a fallback.** I set `disableDeviceFallback: true`, because family members often know a phone's passcode. The fallback is a separate transaction PIN that belongs to the app:

- The PIN itself is never stored, only a salted SHA-256 hash. The hash lives in the Keychain/Keystore via `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, so it's never backed up or restored onto another phone.
- Obvious PINs like 111111 and 123456 are rejected.
- After 5 wrong attempts it locks for a minute. The attempt count is stored too, so killing the app doesn't reset it.
- The digits are entered on the app's own keypad, so no third-party keyboard, autofill or suggestion bar ever sees them.

**On Android, only strong (Class 3) biometrics count.** A lot of Android phones offer face unlock through the front camera, and a photo can fool it. If that's all a phone has, the app uses the PIN instead.

**Every biometric result has a planned outcome.** iOS and Android return 14 different error codes between them. I map all of them to 6 outcomes: success, cancelled, fallback, locked out, unavailable and failed. A lockout, or biometrics being removed halfway through, sends you to the PIN. Cancelling always means "nothing was sent", and the screen says so.

**The server has the final say.** The mock bank re-checks the amount, the limits and the balance. The checks in the app are there for a good experience, not for security. After a transfer, the new balance comes from the server's response; the app never works it out itself.

**Retries can't charge twice.** Each draft transfer gets an idempotency key, and the same key is reused on every retry. A new key is only created when the details change. If the bank takes the money but the response gets lost, retrying returns the original transaction instead of making a second one. RM 42.42 in the demo shows this.

**Payment details are kept out of sight.**

- The transfer details are held in memory (in a Zustand store), not in route params. That keeps them out of URLs, navigation state and deep links. The receipt URL carries only a transaction ID.
- Account numbers are masked everywhere except the review screen. That's the last chance to check every digit before paying, so screenshots and screen recording are blocked there.
- The receipt does allow screenshots, because people need proof of payment. That's why it only shows the masked number.
- Error messages never show internal details.

**Inputs are hard to abuse.** The amount field can only ever produce a whole number of sen. The note only accepts letters, numbers and basic punctuation, up to 60 characters.

**What a production version would add.** I left these out because they need a real backend or native work beyond this scope:

- Checking the PIN on the server. A 6-digit PIN only has a million combinations, so a local hash can be brute-forced if someone extracts it.
- Signing each transaction with a key held in the Secure Enclave or StrongBox and unlocked by biometrics, with the server verifying the signature. That ties the Face ID check to the exact payment, the way passkeys do.
- Certificate pinning, jailbreak/root detection, and app attestation (App Attest / Play Integrity).
- Blurring the app in the app switcher, session timeouts, device binding, and server-side fraud and velocity checks.

## 3. State and performance

**Each component subscribes only to what it shows.** I use narrow Zustand selectors, and `useShallow` where a component needs a few fields. Workflows such as submitting a transfer read the stores with `getState()`, so they don't subscribe at all.

**Derived data is calculated in memoised hooks, not in selectors.** "Recent recipients" is built from history inside `useMemo`. A selector that returns a new array every time would make every subscriber re-render on every store update.

**The form uses react-hook-form.** Typing in the note only re-renders the note field, not the balance card or the amount field. The zod schema depends on the balance, so it's rebuilt only when the balance changes.

**Long lists use FlashList.** That's 1,000 recipients and 400+ history rows. The rows are memoised and get stable callbacks, so recycling a row doesn't re-render the ones around it. History is a single flat list with header rows mixed in. `getItemType` keeps headers and rows recycling separately, and `stickyHeaderIndices` pins the month headers. A nested SectionList wouldn't recycle nearly as well.

**Search stays responsive.** The recipient search uses `useDeferredValue`, so the letters you type appear straight away and filtering the 1,000 rows catches up at a lower priority. I didn't use a debounce here because that's a fixed delay. A debounce is the right tool for the network call in the name enquiry, not for local filtering.

**Animations run on the UI thread.** That includes the button press, the shakes, the entrance transitions and the success badge. They use Reanimated's `get()`/`set()` API, which the React Compiler lint rules accept.

**Startup loads in parallel.** The account, recipients and history requests run at the same time. If several balance refreshes are triggered at once, they share one request.

## 4. Async work and errors

- **Requests are really cancelled.** Every request has a timeout and an `AbortController`, so a cancelled request actually stops instead of finishing and being ignored.
- **The name enquiry handles fast typing.** It's debounced, and it cancels the previous request whenever the number changes, so a slow, old response can never show the wrong person's name.
- **API errors are typed.** `ApiError` has a code and a `retryable` flag. All user-facing error copy lives in one table, which also makes translation easier later.
- **Submitting is a small state machine** with one phase at a time: idle, authenticating, processing, succeeded or failed. With separate booleans, the app could be "processing" and "failed" at once; with a single phase, that can't happen. A ref stops a fast double-tap, because React state updates too late to catch it.
- **You can't leave while money might be moving.** The back gesture, the Android back button and the "Edit details" button are all blocked, and a "please keep the app open" overlay covers the screen.
- **Each error has its own way forward.**
  - Retryable errors offer **Try again**, with the same idempotency key.
  - "Insufficient balance" refreshes the balance and offers **Change amount**.
  - A PIN lockout disables retrying.
- **A route-level error boundary catches anything that crashes while rendering.** It tells the user that no money has moved.

## 5. UX decisions

- **Review comes before biometrics.** You see exactly what you're sending, then approve it. If Face ID works, that's one tap.
- **The amount field works like a cash register.** Typing 1-2-5-0 gives RM 12.50. There's no decimal point to type, so comma-vs-dot keyboards and inputs like "1..2" can't happen. The quick amounts cover the usual RM 20–200, and "Balance after transfer" helps catch a slipped extra zero.
- **One search box does everything.** It takes a name, a mobile number or an account number. A new number triggers a name enquiry that shows who the bank says owns it, the same way DuitNow does. That catches typos and some scams before any money moves.
- **Contacts come from the system picker.** The app only sees the one contact you pick, never your whole address book, and it doesn't need contacts permission unless the platform insists. If the contact has more than one Malaysian mobile number, you choose which.
- **There are two ways to send again.** You can tap someone in the recent strip, or tap a past transfer in history and choose the same or a different amount. Either way it's treated as a new payment with a new idempotency key, and it still goes through review and biometrics.
- **Feedback isn't only visual.**
  - The phone vibrates on success and on errors.
  - The error banner shakes when its message changes, so you notice the same error twice.
  - The balance can be hidden if you're using your phone in public.
- **Accessibility.**
  - Every control has a role, a label and, where it helps, a hint.
  - Errors are announced as they appear.
  - Touch targets are at least 48 pt.
  - Failed transfers are marked with text and a strikethrough, not just colour.

## 6. Things that were harder than expected

**Expo SDK 58 has moved on from most tutorials.** `expo-contacts` is now class-based: you call `Contact.presentPicker()` and then `contact.getDetails(...)`. The `getContactsAsync` that most examples use is deprecated and throws at runtime. I stopped trusting examples and checked each API against the type definitions actually installed in `node_modules`.

**The React Compiler lint rules changed how I wrote some things.**

- Writing to `sharedValue.value` got flagged, so animations use `get()`/`set()`.
- Resetting state inside a `useEffect` got flagged too. Instead, the PIN sheet and the name enquiry are keyed by a request id or the number being checked, so React remounts them with fresh state.

**One `await` for two very different prompts.** Face ID is a native prompt that returns a promise. The PIN is my own React modal, which the user finishes whenever they're ready. I wanted screens to just write `await authorize(...)`. So `authorize()` returns a promise, and its resolver is stored in a ref and called from the modal's callbacks. If the screen unmounts mid-prompt, the promise resolves as "cancelled" rather than hanging forever.

**Navigating away at exactly the wrong moment.** The review screen blocks leaving while a transfer is in progress. Calling `router.replace` to the receipt straight after success got swallowed by that block, and the user was left on a spinner. The fix was to add a `succeeded` phase: the block lifts first, and an effect navigates on the next render.

**iOS and Android handle the fallback button differently.** iOS has a separate "Use PIN" button. Android doesn't, once device credentials are disabled. So on Android, the cancel button is labelled "Use PIN instead" and treated as a fallback rather than a cancel.

**Failures had to be repeatable.** Random errors are impossible to demo or test. The mock bank fails on specific amounts, and only once per idempotency key, which also proves that retrying is safe.

**File-name casing.** I created `pinPad.tsx` and imported it as `./PinPad`. It worked on my Mac, because macOS ignores case, but it would have broken on Linux, which is what CI and EAS builds run on. TypeScript caught it (`TS1261: file name differs only in casing`). A related lesson: the compiler can't warn about a misnamed or misplaced file that nothing imports yet. So after each file I also checked it was in the right place.

**Typed routes and building screen by screen.** Expo Router generates types for every route. The transfer screen links to History and Recipients, and those didn't exist yet, so `tsc` failed until they did. The generated types are git-ignored, so I cleared them until the last screen was in place.

**Tooling.**

- npm failed with `EACCES` because some files in `~/.npm` were owned by root, probably from an old `sudo npm`. Fixing the ownership solved it, without reaching for `sudo` again.
- I installed the test and lint packages with `npx expo install`, which picks versions that match the SDK, but they ended up in `dependencies`. I moved them to `devDependencies` so they don't look like part of the app.

## 7. If this were going further

- **A real backend.** I'd re-implement the five functions in `services/api/index.ts` with `fetch`; nothing above that layer would change. TanStack Query could then take over caching server data from the stores.
- **More payment types.** DuitNow QR, scheduled and recurring transfers could reuse `useTransactionAuth`, `useSubmitTransfer` and the draft store as they are.
- **Translation.** User-facing copy is already in a few central places (error table, schema messages), and money formatting lives in one module.
- **More tests.** Pure logic is covered. Next would be component tests with React Native Testing Library and end-to-end flows with Maestro; the simulator's Face ID can be scripted.
- **Monitoring.** I'd log events at each state-machine step (auth passed or failed, error codes) and never log names, account numbers or unmasked amounts.

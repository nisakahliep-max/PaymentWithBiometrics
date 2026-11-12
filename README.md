# BioPay

A small payment-transfer module for a Malaysian digital bank, built with Expo and TypeScript. You pick who to pay, enter an amount in ringgit, check the details, and approve the transfer with Face ID, Touch ID or a fingerprint. If biometrics aren't available, or you'd rather not use them, there's a 6-digit transaction PIN instead.

The bank is mocked inside the app, but it behaves like a real one: it has latency, it can time out, it can return server errors, and it handles retries safely.

**Demo video:** _coming soon_
**Why it's built this way:** [DESIGN.md](./DESIGN.md)

## What it does

- **Transfer form.** Shows the live balance (you can hide it), your recent recipients, an amount field that works like a cash register (type 1-2-5-0 and you get RM 12.50), quick amounts, and an optional note.
- **Validation.** Uses zod. A recipient is required, transfers must be between RM 1 and RM 10,000, you can't send more than your balance, and notes are limited to 60 plain characters. Errors appear next to the field and tell you how to fix them.
- **Review.** Every transfer gets its own biometric prompt on the review screen, and the prompt names the amount and the payee.
- **PIN fallback.** The PIN is used when biometrics are missing, not set up, too weak (on Android), locked out, or when you tap "Use PIN".
- **Failures.** Every failure I could think of has its own message and a way forward: no connection, a lost response, a timeout, a 503, insufficient funds, and recipient not found.
- **Receipt.** Shows a reference number, a masked account number and the new balance, and has a share button.
- **Recipient picker.** Searches 1,000 saved recipients and has a contacts button. For a number you haven't paid before, it does a DuitNow-style name enquiry.
- **History.** Over 400 past transfers grouped by month, with "send again".

## Stack

- Expo SDK 58, React Native 0.88, React 19, TypeScript in strict mode
- Expo Router for navigation, Zustand for state, react-hook-form with zod for the form
- FlashList 2 for long lists and Reanimated 4 for animation
- Expo modules for local authentication, secure storage, contacts, crypto, screen capture and haptics
- Jest with jest-expo for tests

## Running it

You'll need:

- Node 20 or newer (I used Node 24) and npm
- **For iOS:** Xcode 26 or newer and an iOS 18 simulator. Expo SDK 58's native modules need Swift 6.2, which only comes with Xcode 26.
- **For Android:** Android Studio with an emulator running API 30 or newer.

Expo Go won't work, because Face ID isn't available inside it. The app runs as a development build instead:

```bash
git clone https://github.com/nisakahliep-max/PaymentWithBiometrics.git
cd PaymentWithBiometrics
npm install

npm run ios        # the first build takes 5–10 minutes
npm run android
```

After the first build, `npx expo start` is all you need day to day.

If you only want to click through the screens, `npm run web` runs the app in a browser. The form, validation, lists, name enquiry and review screen all work there. Biometrics, the PIN (which lives in the Keychain), contacts and screenshot blocking don't, because they need native code.

To run the checks:

```bash
npm test           # 53 unit tests
npm run typecheck
npm run lint
```

## Trying the biometrics

On the iOS Simulator:

1. Choose **Features → Face ID → Enrolled**. If you skip this, the app goes straight to the PIN.
2. Start a transfer and tap **Confirm with Face ID** on the review screen.
3. When the prompt appears, choose **Features → Face ID → Matching Face** to approve it, or **Non-matching Face** to fail it. After a failed attempt, iOS offers **Use PIN**, which opens the app's own PIN sheet.
4. To try the path without biometrics, untick **Enrolled**. The first time, the app asks you to create a PIN; after that, it asks you to enter it.

To see the Touch ID version, use an iPhone SE simulator and **Features → Touch ID**.

On Android:

1. In the emulator's settings, set a screen lock and add a fingerprint.
2. When the prompt appears, run `adb -e emu finger touch 1`.
3. The **Use PIN instead** button opens the app's PIN sheet.

I've done most of my testing on iOS.

## Making things go wrong on purpose

Random failures make for a bad demo, so the mock bank fails on specific amounts. Each one fails only on the first attempt, so **Try again** succeeds. That also shows that retrying never charges you twice.

| Amount | What happens | What to look for |
|---|---|---|
| RM 13.13 | The connection drops before the request reaches the bank | Try again works, and the money only leaves once |
| RM 42.42 | The bank takes the money, but the response never arrives | Try again returns the **same** reference number, and the balance only drops once |
| RM 99.99 | The bank is too slow, and the app gives up after 6 seconds | A "taking longer than usual" message, then Try again works |
| RM 50.05 | The bank returns a 503 | "Service temporarily unavailable", then Try again works |
| RM 77.77 | The balance dropped somewhere else in the meantime | "Insufficient balance", the balance refreshes, and you get a **Change amount** link |
| Any number ending in `0000` | The name enquiry finds nobody | "Recipient not found" with a **Check again** button |

The client also checks amounts before anything is sent. Anything under RM 1, over RM 10,000 or over your balance shows an error next to the field, and you can't continue.

A few other things worth trying:

- Type `0123456789` in the recipient search to see a name enquiry.
- Tap the clock icon to open history, then tap a transfer to send it again.
- Hide the balance with the eye icon.
- Cancel the Face ID prompt, and check that the app tells you nothing was sent.

## How the code is organised

```
src/
├── app/                  # screens (Expo Router), kept thin
│   ├── _layout.tsx       # stack, startup loading, error boundary
│   ├── index.tsx         # transfer form
│   ├── recipients.tsx    # search, contacts, name enquiry (modal)
│   ├── review.tsx        # review + biometric confirmation
│   ├── success.tsx       # receipt
│   └── history.tsx       # past transfers
├── features/             # one folder per area: its UI, hooks and state
│   ├── account/
│   ├── auth/             # biometrics, PIN, the authorize() hook
│   ├── history/
│   ├── recipients/
│   └── transfer/         # schema, draft, form and submit hooks
├── services/api/         # API facade, mock bank, typed errors, timeouts
├── components/ui/        # Button, TextField, Card, …
├── theme/tokens.ts       # colours, spacing, type
└── utils/                # money, dates, ids
```

Screens only lay things out. The logic lives in `features/`, and anything that talks to the bank goes through `services/api`. [DESIGN.md](./DESIGN.md) explains why.

## Assumptions

- There's one account, in ringgit. Amounts are stored as whole sen, never as floating-point numbers.
- The bank is mocked inside the app, so everything resets when you restart it.
- The RM 1 to RM 10,000 limits are made up for the demo. A real bank would get them from its server.
- Without biometrics, the PIN is created the first time you need it. A real app would set it up during onboarding and check it on the server.
- There's no login. The module assumes the user is already signed in.
- The names, banks and transactions are generated from a fixed seed, so everyone sees the same data.

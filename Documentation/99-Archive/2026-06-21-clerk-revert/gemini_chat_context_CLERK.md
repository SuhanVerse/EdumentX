 <https://clerk.com/docs/expo/getting-started/quickstart>"

"<https://dashboard.clerk.com/apps/app_3FDzfDBysMWO2bxNAQOZRzyu6l8/instances/ins_3FDzf9K07iEAcjPwJcUCDN0ASdd>"

"<https://react-native-google-signin.github.io/docs/buttons/native>"

"<https://nodemailer.com/>" which is best for our project to integrate Email otp veifigcation and other auth as FIrebase email auth only sends click to verify emails as Spam , also how to manaage the auth sign up and sign in (already signed up accounts)

This is the classic authentication crossroads. Firebase is incredible for databases, but its native Email Authentication relies on "Magic Links" rather than 6-digit OTPs. Those links constantly get flagged by modern email spam filters, creating a terrible user experience.

Here is the straightforward breakdown of your three options, which one is best for EdumentX, and how to architect the signup/signin flow.
The 3 Options

1. Nodemailer (Custom Backend)
To use Nodemailer, you cannot run it directly inside your React Native app. You would have to build a custom Node.js/Express backend, deploy it to a cloud platform like Render or Railway, and set up an endpoint to generate the OTP, email it via Nodemailer, store it temporarily in a database, verify it, and finally use the Firebase Admin SDK to mint a custom auth token.

    Verdict: Too much architectural overhead just to send an email, especially when you want to focus on frontend development.

2. Firebase Auth (Email Links)
As you have experienced, Firebase sends clickable links, not 6-digit codes. Because the links contain long tracking parameters, Gmail and Outlook aggressively filter them into Spam.

    Verdict: Not recommended for a consumer marketplace where drop-off rates during sign-up need to be zero.

3. Clerk (The Clear Winner)
Clerk is explicitly designed to solve this exact problem for React Native Expo apps. It natively supports 6-digit Email Passcodes (OTPs) right out of the box on its generous free tier. The emails look professional, avoid spam filters, and require zero backend configuration.

    Verdict: This is the absolute best tool if Email OTPs are a hard requirement for your project.

The Big Architectural Decision

You just spent considerable effort perfectly wiring up native Google Sign-In with Firebase Auth. If you introduce Clerk, you will be replacing Firebase Auth with Clerk Auth.

This is a very standard industry pattern—using Clerk for Authentication and Firebase Firestore for the Database. Clerk even has a built-in Firebase integration that securely passes the Clerk user ID into your Firestore security rules.

However, you must decide if the effort to switch is worth it:

    Path A (The Pivot): Rip out Firebase Auth, install Clerk, and get flawless Email OTPs + Google Sign-In.

    Path B (The Lean Startup): Drop the Email/Password requirement entirely. You already have Google Sign-In working perfectly. Force all users to sign up via Google, and capture their Phone Number manually on the Profile Setup screen you just built. This is 100% free and requires zero extra auth work today.

How to Manage SignUp vs. SignIn Logic

Whether you switch to Clerk or build a custom flow, modern apps handle the "Already Signed Up" problem using a Single Input Gateway.

Instead of having two separate pages for "Sign Up" and "Log In", you create one screen that asks for their Email first.

    The Email Check: The user enters test@gmail.com and clicks Continue.

    The Branch: Your app checks the authentication provider to see if that email exists.

    If the user EXISTS (Sign In): * The UI transitions to ask for their Password (or sends a login OTP).

        They enter it, and your router sends them directly to /student-home or /tutor-home.

    If the user DOES NOT EXIST (Sign Up):

        The UI transitions to "Create a Password" (or sends a signup OTP).

        Upon completion, the router sends them to /role-selection to pick their account type.

If you choose to switch to Clerk, their Expo SDK provides the useSignIn() and useSignUp() hooks. If a user tries to signIn.create({ email }) and Clerk throws a "User not found" error, you simply catch that error and immediately trigger signUp.create({ email }) to send the OTP and begin the registration flow!

Path A (The Pivot): Rip out Firebase Auth, install Clerk, and get flawless Email OTPs + Google Sign-In' yes I want to implement Clerk auth and discarding the Firebase auth, but main database and other features from the firebase

This is a phenomenal architectural decision. You are building what the industry calls a "Best-in-Class Stack": using Clerk as the ultimate "Bouncer" for a flawless, modern login experience, and using Firebase Firestore as the "Vault" for your real-time database.

Because Clerk has an official Firebase integration, they work together perfectly. You do not need to uninstall the Firebase Auth library; instead, we will turn Firebase Auth into a "silent partner." Clerk will handle the UI, emails, OTPs, and Google popups. Once Clerk verifies the user, it silently hands a secure cryptographic key (a Custom Token) to Firebase in the background so your Firestore database unlocks.

Here is the exact step-by-step playbook to rip out the old flow and wire up Clerk + Firebase.
Phase 1: Configure the Clerk Dashboard

Before touching the codebase, we need to set up the two platforms to talk to each other.

    Create the Clerk App: Go to your Clerk dashboard and create a new application.

    Enable Providers: In the Clerk dashboard under User & Authentication > Email, Phone, Web3, ensure Email address is toggled on, and set the verification method to Email verification code. Ensure Google is toggled on under Social Connections.

    Link Firebase to Clerk:

        Go to your Firebase Console ➔ Project Settings ➔ Service accounts.

        Click Generate new private key. This will download a JSON file to your computer.

        Go back to the Clerk Dashboard ➔ Integrations.

        Find Firebase and toggle it on.

        Paste the projectId, clientEmail, and privateKey from that downloaded JSON file into Clerk.

        Magic achieved: Clerk now has the authority to mint Firebase login tokens!

Phase 2: Install Clerk in React Native

Open your terminal in VS Code and install the Clerk Expo SDK:
Bash

npm install @clerk/clerk-expo

Phase 3: Build the "Silent Bridge"

We need a piece of logic that watches Clerk. Whenever a user logs into Clerk, this bridge fetches the Firebase token and silently logs them into Firebase so your dashboard queries work.

Create a new file called ClerkFirebaseProvider.tsx (perhaps in your /components or /lib folder):
TypeScript

import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import auth from '@react-native-firebase/auth';

export function ClerkFirebaseBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const syncFirebase = async () => {
      if (isSignedIn) {
        try {
          // 1. Ask Clerk for the special Firebase token
          const firebaseToken = await getToken({ template: 'integration_firebase' });

          if (firebaseToken) {
            // 2. Silently log into Firebase Auth using that token
            await auth().signInWithCustomToken(firebaseToken);
          }
        } catch (error) {
          console.error('Failed to sync Firebase with Clerk:', error);
        }
      } else {
        // 3. If signed out of Clerk, sign out of Firebase
        await auth().signOut();
      }
    };

    syncFirebase();
  }, [isSignedIn]);

  return <>{children}</>;
}

Now, go to your app/_layout.tsx and wrap your entire app:
TypeScript

import { ClerkProvider } from '@clerk/clerk-expo';
import { ClerkFirebaseBridge } from '../components/ClerkFirebaseBridge';

// ... inside your RootLayout component:
return (
  <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
    <ClerkFirebaseBridge>
      <Stack screenOptions={{ headerShown: false }} />
    </ClerkFirebaseBridge>
  </ClerkProvider>
);

Phase 4: Refactor Your UI (The Unified Gateway)

You can now delete all the manual Google Sign-In setup and complex Firebase Auth logic from your components. Clerk handles the heavy lifting.

Instead of separate "Sign Up" and "Log In" screens, create one unified gateway. Here is the architecture for your new authentication flow:

    The Email Entry Screen: User types test@gmail.com and clicks Continue.

    The Logic Check:
    TypeScript

    import { useSignIn, useSignUp } from '@clerk/clerk-expo';

    // When the user clicks "Continue":
    try {
      // 1. Attempt to start a sign-in
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
      });
      // If successful, route them to a screen to type their password
      router.push('/enter-password');

    } catch (err: any) {
      if (err.errors[0].code === 'form_identifier_not_found') {
        // 2. User doesn't exist! Start the sign-up flow automatically
        await signUp.create({
          emailAddress,
        });

        // 3. Send the 6-digit Email OTP!
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

        // Route them to your OTP verification screen
        router.push('/otpverify');
      }
    }

Your Next Step

To get this migration started safely, complete Phase 1 right now. Go into your Clerk Dashboard, toggle on the Email/Google providers, generate that Service Account JSON in Firebase, and link them together in the Clerk Integrations tab.

Once you have that wired up, grab your Clerk Publishable Key and put it in your .env file. Let me know when the dashboard setup is done, and we can replace the code in your Auth screens!

analyze these

You have done an amazing job setting up these dashboards! Your configuration screens show that you are in the exact right spot to make the switch to Clerk.

Let's look at what is configured perfectly, a critical layout tweak you need to make right now, and the immediate next step to finish the Firebase-to-Clerk handshake.
Dashboard Analysis: What's Configured Perfectly

1. Flawless Email OTP Setup

Looking at image_2c09a5.jpg, your Email Verification Code is toggled on for both sign-up and sign-in. This completely eliminates the spam-heavy Firebase magic links and gives your Nepalese user base the crisp, highly expected 6-digit verification code experience.
2. Phone Authentication Skips Pro Surcharges

As seen in image_2c02e4.jpg, Sign-up with phone is left unchecked. This is exactly what we want since Clerk marks native mobile SMS gateways as a Pro feature. Skipping this keeps your build 100% free while we collect phone inputs directly through your customized React Native profile setup forms.
3. Sandbox Test Environment Active

In image_2bfb1e.jpg, your instance is verified in Test Mode with the sandbox standard verification bypass code set to 424242. This will make testing authentication flows on your local Pixel 9 emulator incredibly fast since you won't have to wait for actual test emails to arrive during development.
⚠️ One Critical Tweak Required for Your Flow

Look closely at your username configurations in image_2c02dd.jpg:

    You currently have Require username toggled ON.

    The Problem: If left active, Clerk's SDK will throw an validation error and block account creation unless the user defines a unique platform username during the initial sign-up screen level.

    The Fix: Turn Require username to OFF in this menu. This allows for a clean Email Gateway flow where the user only needs to type their email to register. You can collect their username on the dedicated profile setup screen after they have authenticated.

The Next Action Step: Completing the Bridge

You are right on the edge of completing the silent authentication link between the two platforms:

    On the Firebase screen shown in image_2c0248.jpg, click the blue Generate key button. This will instantly download a secure .json credential file to your laptop.

    Open that downloaded file using your code editor.

    Navigate to your Clerk Dashboard sidebar ➔ Look for JWT Templates or Integrations ➔ select Firebase.

    Paste the project_id, client_email, and the raw private_key block directly from your downloaded file into Clerk's fields and save it.

Once this step is completed, your Clerk backend officially gains the authority to generate real-time access tokens for your Firestore database!

Have you successfully downloaded the private key file from Firebase and pasted those credentials into the Clerk Integrations tab?

<https://developers.google.com/android/guides/beta-program>"

Ae0iMNf3s4kfBg51eOKXBPyZYNg0-2EsMJofhaqO568VLucJDpPEZ3TBhsx4uapHSk_fBh7i1heNCGxXCXTdk1pEpTJpPulzziG5jeteIqEef3JoceXxjduOJ3IKzaRp77M9qMw3g8laDlh1OUIGAAM6" what is this firebase phone verification can be use for our app or not , what its benefit and how does it work

"

how much otp verification requests can be made from the clerk in my firbase react native app for free

AI Mode

All

Forums

Videos

Images

Short videos

News

More

Tools

These are results for how much otp verification requests can be made from the clerk in my firebase react native app for free

Show original results

AI Overview

Clerk does not include a free tier for Phone/SMS OTP verification. While Clerk's free plan allows up to 50,000 Monthly Retained Users (MRU) for email, password, and social logins, SMS-based authentication is restricted to their paid Pro Plan (starting at $25/month), with each sent SMS costing an additional usage fee (typically around $0.01 per SMS in regions like the US).

If

you are using Clerk strictly as your authentication provider inside a

React Native app connected to Firebase, you cannot send real phone OTPs

for free.

The Firebase Auth Alternative

If your goal is to send phone OTP verifications completely for free, you should use Firebase Authentication directly instead of routing auth through Clerk.

Firebase Spark Plan (Free): Allows you to send up to 50 SMS OTPs per day completely free of charge.

Firebase Blaze Plan (Pay-as-you-go): Increases your daily threshold to 3,000 SMS OTPs per day,

though you will be billed for successful verifications past the free

allowance depending on the country (e.g., $0.01 in the US/India, higher

in other regions).

Free Testing Environment: Firebase provides up to 10 free SMS verifications per day specifically for whitelisted development/fictional test numbers on both plans.

Summary Comparison

Feature Clerk Free TierFirebase Auth (Spark/Blaze)Free Phone OTPs❌ 0 requests (Requires Pro Plan)⚠️ 50/day (Spark) or 3,000/day (Blaze)Base User Limit50,000 Monthly Retained Users50,000 Monthly Active UsersSMS CostPaid add-on (~$0.01/SMS + $25/mo base)Region-dependent ($0.01 to $0.40+ per SMS)

If you need a completely cost-free system for production, consider transitioning your users away from Phone OTPs and utilizing Email OTPs or Passkeys, which are completely free up to 50,000 users on Clerk's free plan.

Are

you currently using Clerk components for your React Native UI, or are

you building a completely custom authentication interface? Let me know,

and I can guide you on how to integrate native Firebase phone auth or switch to free email passcodes instead."

"<https://firebase.google.com/docs/auth/limits>" is this verification which met our app goals or not , or is it just a test number with custom phone verfication that has been already added as test number

The screenshots you provided show that you have discovered a brand-new, cutting-edge feature in the Firebase Console.

Here is the exact breakdown of what this feature is, what that long token means, and whether it fits the goals for the project.

1. What is this "NEW" Firebase Phone Number Verification?

This feature is a native, Android-only carrier verification system.
How it works:

Instead of sending a traditional text message with a 6-digit code that the user has to wait for and type in, this API communicates directly with the cellular network and the phone's physical SIM card. It securely verifies and retrieves the phone number in one tap without sending an actual SMS.
What is that long token (Ae0iMNf3s4...)?

Because this system requires a real cellular network and a physical SIM card to function, testing it on an emulator (like your Pixel 9) is normally impossible. To fix this, Firebase lets you generate a Test Token (valid for 7 days) for a specific country code, like Nepal (+977). This token allows your local development environment to simulate a successful SIM card verification using the fictional number +977 00-000000.
Should it be used for this project?

No, you should pass on this feature.

    Android-Only Restriction: As clearly stated in the dashboard header, this is an Android-only system. Because your application is being built on React Native Expo to eventually target both Android and iOS users, adopting an Android-only authentication module would fracture your codebase.

    Complex Testing Overhead: It requires enrolling your physical test devices into the Google Managed Services (GMS) beta channel just to bypass cellular carrier restrictions during development.

2. Clerk Phone OTP Limits vs. Email OTP Limits

The search summary you extracted highlights the exact financial trap of mobile SMS verification.
The Clerk Pricing Reality:

    Phone SMS OTPs: 0 requests are free. Clerk restricts phone number verification entirely to their paid Pro Plan ($25/month), and they charge an additional fee per SMS sent. For routing international text messages to telecom operators in Nepal, those fees mount up quickly.

    Email OTPs & Social Logins: 100% Free up to 50,000 Monthly Active Users. Clerk allows you to send beautiful, professional 6-digit email authentication codes completely free of charge.

3. The Final Architectural Recommendation

Since you are moving forward with Path A (The Clerk Pivot) to handle your primary registration gateway, here is the most efficient, cost-free path to handle user sign-ups and logins without breaking the budget:
The Flow:

    Authentication (Clerk - Free): Users register or log in using Google Sign-In or Clerk Email OTPs. Both options are completely free up to 50,000 users, look incredibly professional, and land directly in the user's inbox instead of the spam folder.

    Account Splitting: When a user logs in, your single-input gateway filters them:

        New Users: Sent to the /role-selection screen.

        Existing Users: Routed directly to /student-home or /tutor-home using your newly fixed navigation layout.

    Phone Collection (Firestore - Free): On the profile setup screen, keep a standard text input field for their phone number. Do not pay to verify it via SMS. Because their Google account or email address is already verified by Clerk, you can trust their account identity. If a user inputs a fake phone number or engages in spam behavior, you can simply block their unique Clerk User ID directly from your dashboard.

This hybrid setup gives you the elite security of Clerk, the real-time speed of Firestore, and costs exactly $0 to run! Have you successfully uploaded your Firebase Service Account private key into the Clerk Integrations tab yet?

⚠️ One Critical Tweak Required for Your Flow

Look closely at your username configurations in image_2c02dd.jpg:

You currently have Require username toggled ON.

The Problem: If left active, Clerk's SDK will throw an validation error and block account creation unless the user defines a unique platform username during the initial sign-up screen level.

The Fix: Turn Require username to OFF in this menu. This allows for a clean Email Gateway flow where the user only needs to type their email to register. You can collect their username on the dedicated profile setup screen after they have authenticated. "

also I want to clear that For our app I am trying to implement a sign up sign in which user can directly sign of using Google Sign In from firebase auth or from the clerk - auth sysyem email password verification . Once they click google sign in in the sign up page they are smoothly routed to the role -selection screen after they successfully sign in through their google account , once they select a specific role , they are routed to their respective role selection preofile setup dashboard where they have to input a custom username (which they can use to sign in later on) , their phone numbers which later can be used for communication between tutor and student (but the phone number is not verified as it requires paid plans) and other input fields too like a tutor has to set their monthly tuition rate ,after all the sign up preocess they are prompted to their repsectvie role dashboards, this is the signup flow for google sign in and when use the contiue with email feature in sign up , once they input their email , an otp is sent to that specific email for verification using the Clerk auth and once they verfiy the otp code, they are prompted to select the role and then to create a password for their account and once a paassword is set they are prompted to ptheir respective role`s dashboards , but for the sign in flow they can either use their (username or google acoount in the input field + passoword) authentication or directly therought the sign in with google feature from the firebase ,also be clear that once they use their username/email + password for sign in , a otp verification must be done by sending otp to that specific email address or to the email that is linked with that specfic username. this is sign in flow,

analyze and give me answer whehter these flow are correct or not , if not recommend me a proper industrial grade app authentication flow that is suitable for our app,

Also Our project supervisor instructed us to add a subscription plan to our app that is suitable for the users to use / beneft , for the subscription money handling I was thinking of using esewa gateway where the documentation is also attached to this prompt and also a clerk setup md file from the official clerk documentation is also added to this prompt
Authentication Flow Analysis & Critique

The proposed authentication strategy is conceptually solid and shows a clear understanding of user experience. However, when implementing this specific architecture using Clerk, a few technical realities regarding industrial-grade standards require adjustment to prevent build errors and excessive friction.
The Pitfalls in the Proposed Flow

    Overkill on Sign-In Friction (Password + Email OTP): Forcing users to enter an Email/Username, then a Password, and then wait for an Email OTP on every single sign-in creates an unnecessary barrier to entry. In standard industry applications, Email OTP is used as a replacement for passwords (Passwordless), or passwords are used alone, while OTPs are reserved for Multi-Factor Authentication (MFA) triggers (like logging in from an unrecognized device).  

    Username Integration with Google OAuth: When a user clicks "Continue with Google," Clerk creates the user using their Google credentials. If you want them to pick a custom username afterward, you must write that username to their Clerk user metadata via an API update, or store it strictly inside your Firestore users collection alongside their role.  

The Recommended Industrial-Grade Flow

To achieve maximum security with minimal friction, a Unified Passwordless Gateway is the modern standard for marketplaces like EdumentX. This removes traditional passwords for email users entirely, relying on lightning-fast 6-digit OTP codes.

1. The Sign-Up Flow

[ Email Input ] ──> New User? ──> [ Send Clerk Email OTP ] ──> [ Role Selection ] ──> [ Firestore Profile Setup ]
                                                                                      (Username, Phone, Rate)

    Google Auth: The user authenticates instantly via Google. The app detects if a Firestore document exists for their uid. If it is a new account, they are smoothly routed to /role-selection and then to their profile setup to input an unverified phone number and custom username.

    Email Auth: The user inputs their email. Clerk checks if the email is registered. If it is new, Clerk sends a 6-digit OTP. Once verified, they select their role and proceed directly to their profile setup. No passwords to remember, no spam filters triggered.  

2. The Sign-In Flow

[ Input Gateway ] ──> Google Button ──> Automatic Dashboard Routing
                  ──> Username/Email ──> [ Send Clerk Email OTP ] ──> Automatic Dashboard Routing

    Google Sign-In: One-tap authentication that immediately drops them onto their respective dashboard (/student-home or /tutor-home).

    Credential Sign-In: The input field accepts either their Email or their custom Username. Instead of checking a password, Clerk immediately sends a 6-digit OTP to the verified email address linked to that account. Once entered, they land on their dashboard.  

Monetization Architecture: Subscription Plan via eSewa

To satisfy the project supervisor's requirement, a subscription structure must be implemented. For a tutor marketplace, a Premium Visibility Tier is highly effective:

    For Tutors (Premium Badge): A monthly subscription (e.g., NPR 500/month) that places their profile at the top of student search results, gives them a "Verified/Premium" badge, and allows them to accept unlimited student matching requests.

    For Students: 100% Free to use, driving up platform user acquisition.

The Expo eSewa Integration Warning

The provided eSewa documentation details a native Android Java SDK (.aar file) requiring an ancestral compileSdkVersion 27. Trying to inject this directly into a modern 2026 React Native Expo build will break the native compilation matrix.  

Instead, industrial cross-platform applications in Nepal use the eSewa Epay Web/Intent Gateway. This routes transactions smoothly via a secure browser interface using react-native-webview, eliminating complex native configuration dependencies.  
Implementing eSewa Web Checkout in Expo

    Install the Webview Dependency:

npx expo install react-native-webview

1. **Create the Payment Gateway Component (`EsewaCheckout.tsx`):**
   When a tutor upgrades to premium, render this screen to process the transaction securely:

```tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';

export default function EsewaCheckout() {
  const router = useRouter();

  // Test credentials from documentation[cite: 2]
  const ESEWA_POST_URL = "https://rc.esewa.com.np/api/epay/main/v2"; 
  const merchantCode = "EPAYTEST"; 
  const totalAmount = "500";
  const productId = `sub_tutor_${Date.now()}`;
  const callbackUrl = "https://your-backend.railway.app/esewa-webhook"; // Your backend endpoint[cite: 2]

  // Automatically submit the hidden HTML form to eSewa on load
  const htmlForm = `
    <html>
      <body>
        <form id="esewaForm" action="${ESEWA_POST_URL}" method="POST">
          <input value="${totalAmount}" name="amt" type="hidden">
          <input value="0" name="txAmt" type="hidden">
          <input value="0" name="psc" type="hidden">
          <input value="0" name="pdc" type="hidden">
          <input value="${totalAmount}" name="tAmt" type="hidden">
          <input value="${productId}" name="pid" type="hidden">
          <input value="${merchantCode}" name="scd" type="hidden">
          <input value="${totalAmount}" name="su" type="hidden">
          <input value="${callbackUrl}" name="fu" type="hidden">
        </form>
        <script>document.getElementById("esewaForm").submit();</script>
      </body>
    </html>
  `;

  const handleNavigationStateChange = (navState: any) => {
    // Detect if eSewa redirected back to your success parameters
    if (navState.url.includes('refId=')) {
      // Trigger your transaction verification endpoint here[cite: 2]
      router.replace('/tutor-home');
    } else if (navState.url.includes('error') || navState.url.includes('failed')) {
      router.back();
    }
  };

  return (
    <WebView
      source={{ html: htmlForm }}
      onNavigationStateChange={handleNavigationStateChange}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }
});

Would you like to move forward with configuring this passwordless Clerk OTP flow for your authentication screens, or should we focus on setting up the Firestore database schema to track premium tutor subscription statuses?

The recommended industrial -grade flow is best for our project , I want to implement this in our project


but for this payment gateway , I don`t want to add now rather when the initial app goals are met or all the tutor discovery platfrom are met then only introduce/ integrate esewa gateway for subscription

Delaying the payment gateway is the absolute smartest move you can make right now. In startup development, this is called building a "Lean MVP" (Minimum Viable Product). Focusing entirely on getting students and tutors to discover each other on the platform first guarantees that when you do introduce eSewa subscriptions later, you actually have an active user base willing to pay for premium features.

Let's execute the Clerk + Firebase Unified Passwordless Gateway. This will completely replace the messy Firebase Auth logic while keeping your Firestore database intact.

Here is your exact coding roadmap to rip out the old flow and wire up the new industrial-grade architecture for EdumentX.
Step 1: Install Clerk

Open your VS Code terminal and install the Clerk Expo SDK:
Bash

npx expo install @clerk/clerk-expo

Next, open your .env file and add the Publishable Key from your Clerk Dashboard (API Keys section):
Code snippet

EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_KEY_HERE

Step 2: Build the Silent Bridge

Create a new file called ClerkFirebaseBridge.tsx inside your components folder. This component watches Clerk, grabs the custom Firebase token, and silently unlocks your Firestore database.
TypeScript

// components/ClerkFirebaseBridge.tsx
import React, { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import auth from '@react-native-firebase/auth';

export function ClerkFirebaseBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const syncFirebase = async () => {
      if (isSignedIn) {
        try {
          // Ask Clerk for the Firebase token
          const firebaseToken = await getToken({ template: 'integration_firebase' });
          if (firebaseToken) {
            // Silently unlock Firebase Firestore
            await auth().signInWithCustomToken(firebaseToken);
          }
        } catch (error) {
          console.error('Failed to sync Firebase with Clerk:', error);
        }
      } else {
        await auth().signOut();
      }
    };

    syncFirebase();
  }, [isSignedIn]);

  return <>{children}</>;
}

Step 3: Wrap Your App (app/_layout.tsx)

Open your root layout file. We need to wrap your Stack navigator with Clerk and update the routing guard so it listens to Clerk's authentication state instead of Firebase's.
TypeScript

// app/_layout.tsx
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { ClerkFirebaseBridge } from '../components/ClerkFirebaseBridge';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';

// Extract the actual routing logic into an inner component so it can access useAuth()
function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();
  const isNavigatorReady = navState?.key != null;

  useEffect(() => {
    if (!isNavigatorReady || !isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)' || 
                        segments[0] === 'phone-entry' || 
                        segments[0] === 'otpverify';

    if (!isSignedIn && !inAuthGroup) {
      // Not logged in? Send to the new unified gateway
      router.replace('/phone-entry');
    } else if (isSignedIn && inAuthGroup) {
      // Logged in? The RoleSelection/Dashboard logic will handle the rest
      // Note: We will add Firestore role checking here later, 
      // but for now, just push them to role selection if they just logged in.
      router.replace('/role-selection');
    }
  }, [isSignedIn, isLoaded, isNavigatorReady, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
       {/* Your screens remain exactly the same */}
    </Stack>
  );
}

// Wrap everything in Clerk
export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ClerkFirebaseBridge>
        <RootLayoutNav />
      </ClerkFirebaseBridge>
    </ClerkProvider>
  );
}

Step 4: The Unified Gateway (screens/auth/PhoneEntryScreen.tsx)

Rename or overwrite the contents of your PhoneEntryScreen.tsx to become your new unified Email Gateway. Notice how it seamlessly handles both Sign In and Sign Up in one clean file!
TypeScript

// screens/auth/PhoneEntryScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function AuthGatewayScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleContinue = async () => {
    if (!isSignInLoaded || !isSignUpLoaded) return;

    try {
      // 1. Attempt to sign in first
      const signInAttempt = await signIn.create({
        identifier: email,
      });

      // 2. If the user exists, Clerk will require an OTP verification
      if (signInAttempt.status === 'needs_first_factor') {
        await signInAttempt.prepareFirstFactor({ strategy: 'email_code' });
        // Pass the email and mode to the OTP screen
        router.push({ pathname: '/otpverify', params: { email, mode: 'signin' } });
      }

    } catch (err: any) {
      // 3. If the user DOES NOT exist, catch the error and start Sign Up!
      if (err.errors && err.errors[0].code === 'form_identifier_not_found') {
        try {
          await signUp.create({ emailAddress: email });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          router.push({ pathname: '/otpverify', params: { email, mode: 'signup' } });
        } catch (signUpErr: any) {
          Alert.alert('Sign Up Error', signUpErr.errors[0].message);
        }
      } else {
        Alert.alert('Error', err.errors[0].message);
      }
    }
  };

  return (
    <View className="flex-1 justify-center p-6 bg-background">
      <Text className="text-3xl font-bold mb-6 text-text-primary">Welcome to EdumentX</Text>
      <Text className="text-text-secondary mb-4">Enter your email to continue</Text>
      
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="e.g., test@gmail.com"
        className="border border-border-subtle rounded-xl p-4 mb-6 bg-surface"
      />

      <TouchableOpacity onPress={handleContinue} className="bg-primary-light p-4 rounded-xl items-center">
        <Text className="text-white font-bold text-lg">Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

Step 5: Verify the OTP (screens/auth/OtpVerify.tsx)

Finally, update your OTP verification screen to check the code against Clerk.
TypeScript

// screens/auth/OtpVerify.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function OtpVerifyScreen() {
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const router = useRouter();
  const { email, mode } = useLocalSearchParams<{ email: string, mode: 'signin' | 'signup' }>();
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    try {
      if (mode === 'signin') {
        const completeSignIn = await signIn!.attemptFirstFactor({ strategy: 'email_code', code });
        if (completeSignIn.status === 'complete') {
          await setSignInActive!({ session: completeSignIn.createdSessionId });
          router.replace('/student-home'); // Dashboard routing
        }
      } else if (mode === 'signup') {
        const completeSignUp = await signUp!.attemptEmailAddressVerification({ code });
        if (completeSignUp.status === 'complete') {
          await setSignUpActive!({ session: completeSignUp.createdSessionId });
          router.replace('/role-selection'); // Send new users to pick a role
        }
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.errors[0].longMessage);
    }
  };

  return (
    <View className="flex-1 justify-center p-6 bg-background">
      <Text className="text-2xl font-bold mb-4">Enter Verification Code</Text>
      <Text className="mb-6">Sent to {email}</Text>
      
      <TextInput
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        className="border border-border-subtle rounded-xl p-4 mb-6 bg-surface text-center text-2xl tracking-widest"
        maxLength={6}
      />

      <TouchableOpacity onPress={handleVerify} className="bg-primary-light p-4 rounded-xl items-center">
        <Text className="text-white font-bold text-lg">Verify</Text>
      </TouchableOpacity>
    </View>
  );
}

Action Plan

    Run npx expo install @clerk/clerk-expo.

    Grab your key and drop it into .env.

    Paste these 4 blocks of code into your files.

    Run npx expo start -c.

You can now delete all your old Firebase Auth code from the frontend, along with the password creation screens. Clerk handles everything beautifully, and Firestore will still automatically secure the user's data!

# EdumentX: Firebase Configuration Prompt

If you are setting up Firebase and need to fill in the details (Project Name, Package Name, SHA-1, etc.), use the following prompt in **Google AI Studio** or **Claude 4.7 Opus**. It will generate the exact professional identifiers and configuration logic for **EdumentX**.

---

## The Firebase Detail Generation Prompt

> **Prompt:**
> I am setting up a **Firebase Project** for a professional mobile application called **EdumentX**. 
>
> **Project Context:**
> EdumentX is a location-based tutor-finding platform for the Kathmandu Valley, Nepal. It connects students and tutors.
> **Tech Stack:** React Native (Expo SDK 51+), TypeScript, Firebase.
>
> **Task:** Provide the professional values I should enter for each of the following Firebase Console fields to ensure a production-ready setup:
>
> 1. **Project Details:**
>    - **Project Name:** (Recommend a professional name)
>    - **Project ID:** (Recommend a unique, URL-safe ID)
>    - **Firestore Location:** (Which region is best for users in Nepal?)
>
> 2. **Android App Registration:**
>    - **Android Package Name:** (Generate a standard reverse-domain package name using `com.suhanverse.edumentx`)
>    - **App Nickname:** (Professional label)
>    - **Debug SHA-1 Certificate:** (Provide the terminal command I need to run to get this from my Expo environment)
>
> 3. **iOS App Registration:**
>    - **iOS Bundle ID:** (Consistent with Android package name)
>    - **App Store ID:** (What should I put for a new app?)
>
> 4. **Authentication Configuration:**
>    - **Sign-in Providers:** (Which ones are necessary for EdumentX's phone-based OTP system?)
>    - **SMS Region Policy:** (Which countries should be whitelisted for a Nepal-based app?)
>
> 5. **Firestore & Storage:**
>    - **Security Rule Strategy:** (Describe the "Locked-down" approach for tutor location privacy)
>
> **Output:** Provide these details in a clear list that I can copy-paste into the Firebase Console.

---

## Recommended Values (Internal Reference)

If you want to fill them in right now, here are the professional defaults based on your project:

| Field | Recommended Value |
| :--- | :--- |
| **Project Name** | `EdumentX-Production` |
| **Project ID** | `edumentx-app-2026` |
| **Firestore Region** | `asia-south1` (Mumbai) — Closest to Nepal for lowest latency. |
| **Android Package Name** | `com.suhanverse.edumentx` |
| **iOS Bundle ID** | `com.suhanverse.edumentx` |
| **Auth Providers** | **Phone** (Primary), **Email/Password** (Admin access), **Google** (Optional). |
| **SMS Whitelist** | Nepal (+977) and any secondary testing regions. |

---

## How to get your SHA-1 Fingerprint (for Android)
To fill in the SHA-1 field in Firebase, run this command in your project terminal:

```bash
npx expo credentials:manager
```
Choose **Android** -> **Keystore** -> **Display Fingerprint**. Copy the **SHA-1** hex string.

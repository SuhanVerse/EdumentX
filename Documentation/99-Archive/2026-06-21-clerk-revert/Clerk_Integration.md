# Integrate Firebase with Clerk

**Example Repository**

- [Clerk, Firebase, and Next.js Demo Repo](https://github.com/clerk/clerk-firebase-nextjs)

**Before you start**

- [Set up a Clerk application](https://clerk.com/docs/getting-started/quickstart/setup-clerk.md?sdk=expo)
- [Set up a Firebase project with an app](https://support.google.com/firebase/answer/9326094?hl=en)
- [Integrate the appropriate Clerk SDK in your local project](https://clerk.com/docs/getting-started/quickstart/overview.md?sdk=expo)

> The Firebase integration is no longer supported and maintained. For new applications, you **cannot** enable the integration. However, existing applications with the integration previously enabled will continue to function and can still be configured, but once disabled, **it cannot be re-enabled**.
>
> Learn how to [migrate your Firebase users to Clerk](https://clerk.com/docs/guides/development/migrating/firebase.md?sdk=expo).

Integrating Firebase with Clerk gives you the benefits of using Firebase's features while leveraging Clerk's authentication, prebuilt components, and webhooks.

1. ## Configure the integration

   The Firebase integration enables you to use Clerk to generate a valid authentication token to send to Firebase Auth. This enables you to leverage Clerk's prebuilt components, auth provider options, and more, while accessing Firebase products like Firestore with a session validated by Firebase Auth.

   To get started, enable the integration:

   1. In the Clerk Dashboard, navigate to the [**Integrations**](https://dashboard.clerk.com/~/integrations) page.
   2. Toggle the **Firebase** integration on. The configuration modal will appear. Keep this open while you configure your Firebase project.

   Next, configure your integration.

   **Configure automatically (Recommended)**

   The recommended way to configure your integration is to use a service account key provided by Firebase in order to configure the integration _automatically_. To do so:

   1. In your Firebase project, visit [the Service Accounts settings](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk).
   2. Near the bottom of the page, select the **Generate new private key** button.
   3. In the modal that pops up, select the **Generate key** button to download the JSON file that contains your service account key.
   4. In the Clerk Dashboard, the Firebase configuration modal should still be open. Select the **Upload service account key** button and upload the JSON file you downloaded.
   5. The appropriate fields in the configuration modal will be filled in automatically. Select **Apply changes** to save your configuration.

   Select the **Configure manually** tab above these instructions if you do not want to use a service account key.

   **Configure manually**

   If you want to manually configure your Firebase integration, you must provide Clerk with the following information about your Firebase project:

   - **Service account email** – Find this in your Firebase project's [Google Cloud Console](https://console.cloud.google.com/projectselector2/iam-admin/serviceaccounts?consoleUI=FIREBASE&hl=fi&supportedpurview=project), or in the `client_email` field of your service account key JSON file.
   - **Firestore project ID** – Find this under **Project Settings** in the Firebase dashboard, or in the `project_id` field of your service account key JSON file.
   - **Private Key** – You can [generate this manually](https://firebase.google.com/docs/cloud-messaging/auth-server#:~:text=In%20the%20Firebase%20console%2C%20open,confirm%20by%20clicking%20Generate%20Key.), or find it in the `private_key` field of your service account key JSON file.
   - **Firebase database URL** _(Optional)_ – To find this:
     - In the Firebase dashboard, select **Realtime Database**
     - Select the **Data** tab, and select the copy button to add the database URL to your clipboard.

2. ## Enable authentication in Firebase

   To use Firebase auth, ensure authentication is enabled in your Firebase dashboard. To do so:

   1. Navigate to your Firebase dashboard.
   2. In the navigation sidenav, select the **Build** dropdown and select [**Authentication**](https://console.firebase.google.com/u/0/project/_/authentication).
   3. Select **Get started**.
   4. Enable any sign-in method you want, such as **Email/Password**.

3. ## Add a Security Rule to your Firestore database (optional)

   Adding the [Cloud Firestore](https://firebase.google.com/docs/firestore/quickstart) feature in your Firebase application is optional.

   To use Firestore with Clerk, ensure that you have defined [Security Rules](https://firebase.google.com/docs/firestore/security/get-started) that allow authenticated requests to access your database. For example:

   ```bash
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

4. ## Get your Firebase config object

   To connect to your Firebase app in your code, you need a config object from your Firebase project. To find it:

   1. Visit [your Firebase project settings](https://console.firebase.google.com/project/_/settings/general/).
   2. In the **Your apps** section, there should be a code snippet that includes the `firebaseConfig` object. Copy this object. It should look similar to the following:

      ```ts
      const firebaseConfig = {
        apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        authDomain: 'clerk-example-xxxxx.firebaseapp.com',
        databaseURL: 'https://clerk-example-xxxxx-default-xxxx.firebaseio.com',
        projectId: 'clerk-test-xxxx',
        storageBucket: 'clerk-test-xxxx.appspot.com',
        messagingSenderId: '012345678910',
        appId: '1:012345678:web:abcdef123456hijklm',
        measurementId: 'G-ABC123DEF',
      }
      ```

   3. Save this information somewhere secure. You'll need it to connect to your Firebase app.

   See [Google's Firebase documentation](https://support.google.com/firebase/answer/7015592) for more information on the config object.

5. ## Use Firebase with Clerk in your code

   Now that you have configured the integration, and you have retrieved your Firebase config object, it's time to use Firebase with Clerk in your code.

   The following example:

   - Expects the user to be signed into the app with Clerk.
   - Creates a button for signing into your Firebase app, which uses Clerk to generate an authentication token for Firebase's API.
   - Creates a button for fetching example data from your Firestore database.

   > Examples for this SDK aren't available yet. For now, try adapting the  available example to fit your SDK.

   filename: app/firebase/page.tsx

   ```tsx
   'use client'
   import { useAuth } from '@clerk/nextjs'
   import { initializeApp } from 'firebase/app'
   import { getAuth, signInWithCustomToken } from 'firebase/auth'
   import { getFirestore } from 'firebase/firestore'
   import { doc, getDoc } from 'firebase/firestore'

   // Add your Firebase config object
   const firebaseConfig = {
     apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
     authDomain: 'clerk-example-xxxxx.firebaseapp.com',
     databaseURL: 'https://clerk-example-xxxxx-default-xxxx.firebaseio.com',
     projectId: 'clerk-test-xxxx',
     storageBucket: 'clerk-test-xxxx.appspot.com',
     messagingSenderId: '012345678910',
     appId: '1:012345678:web:abcdef123456hijklm',
     measurementId: 'G-ABC123DEF',
   }

   // Connect to your Firebase app
   const app = initializeApp(firebaseConfig)
   // Connect to your Firestore database
   const db = getFirestore(app)
   // Connect to Firebase auth
   const auth = getAuth(app)

   // Remove this if you do not have Firestore set up
   // for your Firebase app
   const getFirestoreData = async () => {
     const docRef = doc(db, 'example', 'example-document')
     const docSnap = await getDoc(docRef)
     if (docSnap.exists()) {
       console.log('Document data:', docSnap.data())
     } else {
       // docSnap.data() will be undefined in this case
       console.log('No such document!')
     }
   }

   export default function FirebaseUI() {
     const { getToken, isSignedIn } = useAuth()

     // Handle if the user is not signed in
     // You could display content, or redirect them to a sign-in page
     if (!isSignedIn) {
       return <p>You need to sign in with Clerk to access this page.</p>
     }

     const signIntoFirebaseWithClerk = async () => {
       const token = await getToken({ template: 'integration_firebase' })

       const userCredentials = await signInWithCustomToken(auth, token || '')
       // The userCredentials.user object can call the methods of
       // the Firebase platform as an authenticated user.
       console.log('User:', userCredentials.user)
     }

     return (
       <main style={{ display: 'flex', flexDirection: 'column', rowGap: '1rem' }}>
         <button onClick={signIntoFirebaseWithClerk}>Sign in</button>

         {/* Remove this button if you do not have Firestore set up */}
         <button onClick={getFirestoreData}>Get document</button>
       </main>
     )
   }
   ```

## Next steps

- [Use webhooks to sync Firebase data with Clerk](https://clerk.com/docs/guides/development/webhooks/syncing.md?sdk=expo): Learn how to sync Firebase auth or Firestore data with Clerk data using webhooks.
- [Create a custom sign-in-or-up page in your Next.js app](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page.md): Learn how to add a custom sign-in-or-up page to your Next.js app with Clerk components.
- [Deploy to production](https://clerk.com/docs/guides/development/deployment/production.md?sdk=expo): Learn how to deploy your Clerk app to production.
- [Deploy to Vercel](https://clerk.com/docs/guides/development/deployment/vercel.md?sdk=expo): Learn how to deploy your Clerk app to production on Vercel.

---

## Sitemap

[Overview of all docs pages](https://clerk.com/docs/llms.txt)

---


# Testing

Testing is an important part of every application. Each framework may require a slightly different setup. If you're having trouble getting testing to work properly, [contact support](https://clerk.com/contact/support){{ target: '_blank' }}.

## Test with one time passcodes

To avoid sending an email or SMS message with a one-time password (OTP) during testing, you can use a fake email address or phone number that has a fixed code. Read the complete documentation [here](https://clerk.com/docs/guides/development/testing/test-emails-and-phones.md?sdk=expo).

## Get a valid session token

When writing tests using Clerk, if you need to get a valid session token, use the following flow:

1. If you have not already, [create a new user](https://clerk.com/docs/reference/backend-api/tag/users/POST/users){{ target: '_blank' }}.
2. [Create a new session](https://clerk.com/docs/reference/backend-api/tag/sessions/POST/sessions){{ target: '_blank' }} for the user.
3. [Create a session token](https://clerk.com/docs/reference/backend-api/tag/sessions/POST/sessions/%7Bsession_id%7D/tokens){{ target: '_blank' }} using the session ID returned in the previous step.
4. Pass the returned session token as the value of an Authorization header to any other requests you're making, as such: `Authorization: Bearer <session_token>`.

Note that Clerk's session tokens are short-lived and are valid only for 60 seconds. Read more [here](https://clerk.com/docs/guides/how-clerk-works/overview.md?sdk=expo).

If the session token expires, you will need to refresh it with the same [create session token endpoint](https://clerk.com/docs/reference/backend-api/tag/sessions/POST/sessions/%7Bsession_id%7D/tokens){{ target: '_blank' }}. The most common ways to do this are to either hit this endpoint before every test to ensure you have a valid session token, or to run an interval timer that refreshes the token before it expires.

For more information, feedback or issues, visit the [`@clerk/testing`](https://github.com/clerk/javascript/tree/main/packages/testing) package.

## Agent Tasks

Agent Tasks allow you to create authenticated sessions on behalf of users without going through the standard sign-in flow. This is useful for automated end-to-end testing and AI agent workflows. Read the complete [Agent Tasks guide](https://clerk.com/docs/guides/development/testing/agent-tasks.md?sdk=expo).

## Testing Tokens

Testing Tokens allow you to bypass bot detection mechanisms that protect Clerk applications from malicious bots, ensuring your test suites run smoothly. Without Testing Tokens, you may encounter "Bot traffic detected" errors in your requests.

> While you can manually implement the following logic in your test suite, Clerk provides [Playwright](https://clerk.com/docs/guides/development/testing/playwright/overview.md?sdk=expo) and [Cypress](https://clerk.com/docs/guides/development/testing/cypress/overview.md?sdk=expo) integrations that handle this automatically.

Obtained via the [Backend API](https://clerk.com/docs/reference/backend-api/tag/Testing-Tokens){{ target: '_blank' }}, Testing Tokens are short-lived and valid only for the specific instance for which they are issued.

Once retrieved, include the token value in the `__clerk_testing_token` query parameter in your Frontend API requests. For example, a sign-up request using a Testing Token would look like this:

```shell
POST https://happy-hippo-1.clerk.accounts.dev/v1/client/sign_ups?__clerk_testing_token=1713877200-c_2J2MvPu9PnXcuhbPZNao0LOXqK9A7YrnBn0HmIWxy
```

### Testing Tokens production limitations

Testing Tokens work in both development and production environments, but there are limitations to be aware of when trying to use Testing Tokens in production.

The testing helpers do not currently support **code-based** authentication methods in production environments. Authenticating a user must be done via email and password or by signing in via email address directly.

---

## Sitemap

[Overview of all docs pages](https://clerk.com/docs/llms.txt)

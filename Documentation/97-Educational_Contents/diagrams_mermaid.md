# EdumentX Workflow Diagrams (Mermaid format)

You can copy and paste the code blocks below into any Mermaid live editor (like https://mermaid.live/) to generate high-quality images. Once you download the images (e.g., as PNG files), you can place them in your `Images` folder and replace the placeholders in the report.

## 1. Authentication and Onboarding Workflow (Figure 3.1)

```mermaid
flowchart TD
    A[User to Firebase Auth UI to Firebase Issues Token] --> B[Firestore verifies Token on each request]
    B --> C[Security Rules enforce data access boundaries]
    C --> D[User Profiles and Roles tables are populated]
```

## 2. Architecture of Tutor Verification Process (Figure 3.2)

```mermaid
flowchart TD
    A[EdumentX Mobile App] -- Uploads Verification Document --> B[Supabase Storage]
    B --> C[AI Tutor Verification\nEdge Function/Groq LLM]
    C --> D{Confidence Score\n>= 0.90}
    D -- Yes --> E[Auto Approve / Auto Reject]
    D -- No --> F[Flag For review]
    F --> G[Admin Portal\nHuman Verification]
    E --> H[Update Verification Status]
    G --> H
    H --> I[Notify Tutor]
```

## 3. Enrollment Request Status Lifecycle (Figure 3.3)

```mermaid
flowchart TD
    PENDING -- Student cancels --> CANCELLED
    PENDING -- Tutor accepts --> ACCEPTED
    PENDING -- Declines --> DECLINED
    DECLINED -- New request --> PENDING
    ACCEPTED -- Classes completed --> COMPLETED
    ACCEPTED -- Reschedule --> RESCHEDULED
```

## 4. eSewa Payment Transaction Flow (Figure 3.4)

```mermaid
flowchart TD
    A[Client selects plan] --> B[App creates PENDING transaction record in Firestore]
    B --> C[App redirects user to eSewa payment page with signed payload]
    C --> D[eSewa processes payment and redirects to App callback URL]
    D --> E[Supabase Edge Function receives callback]
    E --> F[Edge Function verifies payment with eSewa server-to-server API]
    F --> G[SUCCESS:\nstatus: COMPLETE,\nuser_pass created]
    F --> H[FAILURE:\nstatus: FAILED\nor CANCELED]
    G --> I[Client polls / receives notification of outcome]
    H --> I
```

# EZCirkit E-Commerce Starter

This is a Next.js e-commerce application built with Firebase, ShadCN UI, and Tailwind CSS. It includes features like user authentication, product listings, a shopping cart, a checkout process, and an admin dashboard.

## Running the Project Locally

To run this project on your local machine, follow the steps below.

### 1. Prerequisites

- **Node.js**: Make sure you have Node.js version 20 or later installed. You can download it from [nodejs.org](https://nodejs.org/).
- **Git**: You will need Git to manage your code. You can download it from [git-scm.com](https://git-scm.com/).
- **Firebase Project**: You will need your own Firebase project to connect the application to. If you don't have one, you can create a new project for free at the [Firebase Console](https://console.firebase.google.com/).
- **Razorpay Account**: To process payments, you will need a Razorpay account. You can create one at [razorpay.com](https://razorpay.com/).

### 2. Download and Set Up the Project

1.  **Download the Code**: Look for a **"Download"** or **"Export"** button in the user interface of this development environment. This will typically save all the project files as a single `.zip` archive on your computer.

2.  **Unzip the Project**: Extract the contents of the `.zip` file to a folder on your machine where you want your project to live.

3.  **Open in VS Code**: Open the project folder in your local VS Code.

4.  **Install Dependencies**: Open the terminal in VS Code and run the following command to install all the necessary packages listed in `package.json`:
    ```bash
    npm install
    ```

5.  **(Optional) Initialize Git Repository**: To track your own changes, it's a good idea to initialize a new Git repository.
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
    You can also create a new repository on a service like GitHub and push your code there.

### 3. Configure Firebase

The application needs your personal Firebase project's configuration to connect to Firebase services like Authentication and Firestore.

1.  **Get Your Firebase Config**:
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Select your project.
    - In the project overview, click the Web icon (`</>`) to go to your Web App settings (or add a new web app if you haven't already).
    - Go to **Project Settings** > **General**.
    - Scroll down to the "Your apps" section and find the "Firebase SDK snippet".
    - Select the **Config** option. You will see a JavaScript object that looks like this:

      ```javascript
      const firebaseConfig = {
        apiKey: "AIza...",
        authDomain: "your-project-id.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project-id.appspot.com",
        messagingSenderId: "...",
        appId: "1:..."
      };
      ```

2.  **Update the Project Configuration**:
    - Open the file `src/firebase/config.ts` in your code editor.
    - Replace the entire `firebaseConfig` object in that file with the one you copied from your Firebase project.

### 4. Configure Razorpay

To enable payments, you need to add your Razorpay API Key to the project.

1.  **Get Your Razorpay Key ID**:
    - Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
    - Go to **Settings** > **API Keys**.
    - Generate a new key pair if you don't have one. You will get a **Key ID** and a **Key Secret**. For the client-side, you only need the **Key ID**.

2.  **Create an Environment File**:
    - In the root directory of your project, create a new file named `.env.local`.
    - Add your Razorpay Key ID to this file like so:
    ```
    NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id_here
    ```
    - Replace `your_razorpay_key_id_here` with the actual Key ID you got from the dashboard. Next.js will automatically load this variable into your application.

### 5. Set Up Firestore Security Rules

The project comes with a `firestore.rules` file that defines the security rules for your database. You need to deploy these rules to your Firebase project.

1.  **Install the Firebase CLI**: If you don't have it installed, run `npm install -g firebase-tools`.
2.  **Log in to Firebase**: Run `firebase login`.
3.  **Deploy the rules**: From your project's root directory, run the following command:

    ```bash
    firebase deploy --only firestore:rules
    ```

### 6. Run the Development Server

Once you've installed the dependencies and configured Firebase, you can start the local development server.

```bash
npm run dev
```

This will start the Next.js application in development mode. You can view your project by opening [http://localhost:3000](http://localhost:3000) in your browser.

## Next Steps: Setting Up Automated Order Emails

To automatically send order confirmation emails and invoices, you need to use a secure backend service. **Firebase Cloud Functions** are the perfect tool for this. This process cannot be done from the client-side (the user's browser) for security reasons.

Here is the roadmap to implement this feature after you have set up the project locally:

### 1. Set Up Firebase Cloud Functions

First, you need to initialize Firebase Functions in your project.

1.  **Initialize Functions**: In your project's root directory, run the following command:
    ```bash
    firebase init functions
    ```
2.  **Follow the Prompts**:
    - Choose **TypeScript** as the language.
    - Choose **Yes** to install dependencies with npm.
    This will create a new `functions` folder in your project.

### 2. Choose an Email Sending Service

You'll need a third-party service to handle email delivery. Popular choices include:

-   **SendGrid**
-   **Resend**
-   **Mailgun**

Sign up for one of these services and get your API key. You will need to store this key securely in your Firebase environment configuration.

### 3. Write the Cloud Function

You will write a function that "triggers" (runs automatically) whenever a new order is created in your Firestore database.

1.  **Open the Functions Code**: Navigate to `functions/src/index.ts`.
2.  **Write the Trigger**: Your code will look something like this. This example uses `resend`, but the logic is similar for other services.

    ```typescript
    import * as functions from "firebase-functions";
    import { Resend } from "resend";

    // Initialize Resend with your API key
    // It's best to store this as a secret: firebase functions:secrets:set RESEND_API_KEY
    const resend = new Resend(process.env.RESEND_API_KEY);

    // This function runs every time a new document is created in any 'orders' subcollection
    exports.sendOrderConfirmation = functions.firestore
      .document("/users/{userId}/orders/{orderId}")
      .onCreate(async (snap, context) => {
        const orderData = snap.data();
        const userId = context.params.userId;

        // Get the user's email from the 'users' collection
        const userDoc = await snap.ref.parent.parent!.parent.parent!.collection("users").doc(userId).get();
        const userEmail = userDoc.data()?.email;

        if (!userEmail) {
          console.log("No email found for user:", userId);
          return;
        }

        console.log("Sending confirmation for order", context.params.orderId, "to", userEmail);

        try {
          await resend.emails.send({
            from: "EZCirkit <onboarding@resend.dev>", // Your 'from' address
            to: [userEmail],
            subject: `Order Confirmation: #${context.params.orderId.substring(0, 7)}`,
            html: `<h1>Thank you for your order!</h1>
                   <p>Hi there,</p>
                   <p>We've received your order and are getting it ready. Here are the details:</p>
                   <p><strong>Order ID:</strong> ${context.params.orderId}</p>
                   <p><strong>Total:</strong> ₹${orderData.total.toLocaleString()}</p>
                   <p>Thank you for shopping with us!</p>`,
            // You can also generate and attach a PDF invoice here
          });
          console.log("Email sent successfully!");
        } catch (error) {
          console.error("Error sending email:", error);
        }
      });
    ```

### 4. Deploy the Function

Once your function is written, you need to deploy it to Firebase.

```bash
firebase deploy --only functions
```

That's it! Now, every time a customer successfully completes a checkout, this backend function will automatically trigger and send them a professional confirmation email.

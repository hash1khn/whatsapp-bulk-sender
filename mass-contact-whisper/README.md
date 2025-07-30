# WhatsApp Bulk Sender

A React-based application for sending bulk WhatsApp messages using the Wassender API.

## Project info

**URL**: https://lovable.dev/projects/1ad58d2e-9b36-401c-a4bb-36a6ecfabfb3

## Quick Start

### Prerequisites
- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Wassender API account and API key

### Installation & Setup

1. **Clone and install dependencies:**
   ```sh
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   npm install
   ```

2. **Start the development server:**
   ```sh
   npm run dev
   ```

3. **Access the application:**
   - Open your browser and navigate to `http://localhost:8080`
   - On first load, you'll be prompted to enter your Wassender API key
   - The API key will be stored securely in your browser's localStorage

### Using the Application

1. **Set up your API key:** Enter your Wassender API key when prompted
2. **Add contacts:** Use the contact table to add supplier information
3. **Filter contacts:** Use the filters panel to target specific contacts
4. **Compose message:** Write your message and optionally attach an image
5. **Send bulk messages:** Click "Send to Filtered" to send to all filtered contacts

### Features

- **Contact Management:** Add, edit, and delete contact information
- **Smart Filtering:** Filter contacts by part type and condition
- **Message Composer:** Send text messages with optional image attachments
- **Bulk Sending:** Send messages to multiple contacts with rate limiting
- **Progress Tracking:** Real-time progress updates during bulk sending
- **API Key Management:** Secure localStorage-based API key storage

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1ad58d2e-9b36-401c-a4bb-36a6ecfabfb3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1ad58d2e-9b36-401c-a4bb-36a6ecfabfb3) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

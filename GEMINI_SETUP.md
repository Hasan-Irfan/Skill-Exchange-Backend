# Gemini AI Integration Setup Guide

This guide explains how to set up and use the Google Gemini AI chatbot integration.

## Overview

The Gemini integration adds an AI assistant to your messaging system. Gemini behaves like a normal user in the system, responding only in 1-on-1 threads.

## Prerequisites

1. **Google AI API Key**
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Free tier available with generous limits

2. **Node.js Dependencies**
   - The `@google/generative-ai` package is already added to `package.json`
   - Run `npm install` to install it

## Step 1: Install Dependencies

```bash
cd Skill-Exchange-Backend
npm install
```

## Step 2: Create Gemini System User

Run the setup script to create the Gemini system user:

```bash
node scripts/createGeminiUser.js
```

**Important:** After running the script, copy the generated `GEMINI_USER_ID` and add it to your `.env` file.

Example output:
```
✅ Gemini system user created successfully!
   User ID: 507f1f77bcf86cd799439011
   Username: gemini
   Email: gemini@system.local

📝 Add this to your .env file:
   GEMINI_USER_ID=507f1f77bcf86cd799439011
```

## Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Google Gemini API Key
GOOGLE_AI_API_KEY=your_api_key_here

# Gemini System User ID (from Step 2)
GEMINI_USER_ID=507f1f77bcf86cd799439011
```

## Step 4: Restart Your Server

After adding the environment variables, restart your backend server:

```bash
npm run dev
```

## How It Works

### Architecture

1. **Gemini System User**: A special user account in MongoDB that represents Gemini
2. **Thread Creation**: When a user clicks "Chat with AI", a 1-on-1 thread is created
3. **Message Flow**: 
   - User sends message → Saved to database
   - Gemini trigger checks if thread is AI thread
   - If yes, Gemini generates response and saves it as a message
   - Response is emitted via Socket.IO

### Key Features

- ✅ Gemini only responds in 1-on-1 threads (not group chats)
- ✅ Gemini never replies to itself
- ✅ Context-aware (uses last 10 messages)
- ✅ Non-blocking (user messages are saved immediately)
- ✅ Graceful error handling (Gemini failures don't break user messages)

## API Endpoints

### Get or Create Gemini Thread

**GET** `/api/v1/threads/gemini`

Returns or creates a 1-on-1 thread between the authenticated user and Gemini.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "thread_id",
    "participants": ["user_id", "gemini_user_id"],
    "isAI": true,
    "lastMessageAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Frontend Integration

To integrate with the frontend:

1. **Create "Chat with AI" Button**
   - Call `GET /api/v1/threads/gemini` when clicked
   - Use the returned thread ID to open the chat

2. **Send Messages**
   - Use the existing message sending endpoint
   - Gemini will automatically respond if the thread is an AI thread

3. **Receive Gemini Messages**
   - Listen to Socket.IO `message:new` events
   - Gemini messages will have `sender._id === GEMINI_USER_ID`

## Testing Locally

1. **Create Gemini User:**
   ```bash
   node scripts/createGeminiUser.js
   ```

2. **Set Environment Variables:**
   ```env
   GOOGLE_AI_API_KEY=your_key
   GEMINI_USER_ID=generated_id
   ```

3. **Start Server:**
   ```bash
   npm run dev
   ```

4. **Test via API:**
   ```bash
   # Get Gemini thread (requires auth token)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:5000/api/v1/threads/gemini
   
   # Send message to Gemini thread
   curl -X POST \
        -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"text": "Hello, Gemini!"}' \
        http://localhost:5000/api/v1/threads/THREAD_ID/messages
   ```

5. **Check Response:**
   - Gemini should respond within 1-2 seconds
   - Check MongoDB `messages` collection for Gemini's response
   - Response will have `sender` field pointing to Gemini user ID

## Troubleshooting

### "GEMINI_USER_ID is not configured"
- Run the setup script: `node scripts/createGeminiUser.js`
- Add `GEMINI_USER_ID` to your `.env` file
- Restart the server

### "Gemini API not configured"
- Add `GOOGLE_AI_API_KEY` to your `.env` file
- Verify the API key is valid
- Restart the server

### Gemini Not Responding
- Check that the thread has `isAI: true`
- Verify thread has exactly 2 participants (user + Gemini)
- Check server logs for Gemini API errors
- Ensure API key has sufficient quota

### "No such user" Errors
- The Gemini user may have been deleted
- Re-run the setup script
- Update `GEMINI_USER_ID` in `.env`

## Safety Guards

The system includes multiple safety checks:

- ✅ Gemini never replies to itself
- ✅ Gemini never replies to empty messages
- ✅ Gemini only responds in 1-on-1 threads (not groups)
- ✅ Context limited to last 10 messages
- ✅ Errors are logged but don't break user messages
- ✅ Idempotent thread creation (won't create duplicates)

## File Structure

```
Skill-Exchange-Backend/
├── scripts/
│   └── createGeminiUser.js          # One-time setup script
├── src/
│   ├── services/
│   │   ├── geminiService.js          # Gemini API integration
│   │   ├── geminiThreadService.js    # Thread management
│   │   └── geminiTriggerService.js   # Response triggering logic
│   ├── controllers/
│   │   └── messageController.js      # Updated with Gemini endpoint
│   ├── routes/
│   │   └── messageRoutes.js          # Updated with Gemini route
│   └── model/
│       └── thread.model.js           # Updated with isAI field
```

## Notes

- The Gemini user is a **system user** and should never be deleted
- The `isAI` flag on threads helps identify AI conversations
- Gemini responses are saved as regular messages in the database
- Socket.IO is used for real-time message delivery
- All Gemini logic is separated from core messaging functionality


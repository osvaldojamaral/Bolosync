# BoloSync

BoloSync is a voice-first AI assistant for Indian users, built to help with government guidance, helplines, reminders, knowledge lookup, live conversation support, and real-time translation in Hindi, Punjabi, and English.

## Overview

The project combines a modern React frontend with an Express backend to provide a multilingual voice experience. Users can ask questions in natural language, trigger voice commands, open app sections with speech, confirm reminders by voice, and use live translation tools without manually switching contexts.

## Features

- Voice assistant for Hindi, Punjabi, and English
- Real-time speech recognition with live command handling
- Smart reminder flow that distinguishes between:
  - opening reminders
  - creating reminders from natural speech
  - yes/no reminder completion confirmation
- Emergency and helpline support with call confirmation flow
- 1800 IVR style simulator for guided support flows
- Knowledge explorer with curated local domain data
- Two-way live conversation bridge for bilingual voice interaction
- Real-time translator with source and target language selection
- Audio playback through browser speech synthesis or generated audio responses

## Main app sections

### Assistant
The main conversational chat interface where users can type or speak queries. Requests are processed through the backend pipeline, enriched with domain knowledge, and answered in the selected language.

### Live Mode
Live mode listens for short spoken commands such as:

- open reminder
- open my reminders
- open IVR
- go home
- switch language
- turn off live mode

The app uses a rule-based command flow to avoid false reminder creation when the user only wants to open the reminder panel.

### Reminder Dashboard
The reminder feature supports:

- creating reminders from natural language
- opening the reminder screen without treating it as reminder creation
- confirming reminder completion with yes/no voice answers
- scheduling reminder follow-up behavior based on user response

### Conversation Bridge
The two-way bridge enables a more fluid voice exchange between speakers and supports bilingual conversation assistance with translation playback.

### Real-time Translator
The translator lets users choose:

- source language to listen for
- target language to translate into

It is designed for near real-time spoken translation with continuous capture while the translator remains active.

### IVR Simulator
The IVR module mimics a simple phone-menu flow and helps users respond to guided prompts through voice or typed input.

### Knowledge Explorer
The knowledge explorer surfaces curated local data for:

- health
- government schemes
- education
- finance
- employment
- legal guidance
- farming
- civic information
- weather

## Architecture

```text
React + Vite frontend
        |
        v
Express backend API
        |
        +-- Browser speech recognition
        +-- Audio transcription
        +-- Navigation intent detection
        +-- Translation pipeline
        +-- Local knowledge retrieval and RAG responses
        +-- Reminder logic and confirmation flow
        +-- Text-to-speech/audio playback
```

## Project structure

```text
src/
  App.tsx
  components/
  services/
  types/
server/
  services/
  data/
  db.ts
server.ts
index.html
package.json
vite.config.ts
tsconfig.json
```

## Requirements

- Node.js 18+
- Modern browser with microphone access
- Internet access for AI and translation services
- Optional environment configuration for API-backed services

## Environment variables

You can create a .env file if your deployment uses external service keys.

```env
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=optional
ELEVENLABS_API_KEY=optional
PORT=3000
```

## Setup

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

The app will run through the Express + Vite bridge and serve the frontend on the local development port.

## Validation

```bash
npm run lint
npm run build
```

## Notes

- Open reminder commands are treated as navigation, not reminder creation.
- Actual reminder creation is triggered only when the spoken phrase clearly indicates a reminder task.
- Reminder yes/no confirmation logic is handled through voice input in the reminder flow.
- The live translator and two-way bridge are designed for rapid, continuous voice handling, but browser speech engine behavior can still vary by device and browser.
- This project is optimized for accessibility, multilingual support, and simple voice-driven user interactions.

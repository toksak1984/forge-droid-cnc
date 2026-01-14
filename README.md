# Forge Droid CNC

A professional CNC Vector Forge application for capturing and importing designs.

## Features
- **Capture Blueprint**: Capture designs directly from the interface.
- **Import Design**: Import existing CNC designs.
- **AI Integration**: Powered by Google Gemini.

## Local Development

**Prerequisites:** Node.js

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up API Key**:
   Create a `.env.local` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run the app**:
   ```bash
   npm run dev
   ```

## Deployment
This app is configured for automatic deployment to GitHub Pages via GitHub Actions.

# Webaverse Character Studio

An open, collaborative and evolving 3D avatar studio for the open metaverse.

## API Configuration

### OpenRouter API Key Setup

1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. Create a `.env` file in the project root
3. Add your key:

```env
REACT_APP_OPENROUTER_API_KEY=your_api_key_here
```

The app will:
- Use this key by default
- Allow override via UI
- Show clear errors if missing

## Quick Start

```bash
# Clone the repo and change directory into it
git clone https://github.com/webaverse-studios/CharacterCreator
cd CharacterCreator

# Install dependencies with legacy peer deps flag to ignore React errors
npm install --legacy-peer-deps
npm run dev

# Or use yarn
yarn install
yarn run dev
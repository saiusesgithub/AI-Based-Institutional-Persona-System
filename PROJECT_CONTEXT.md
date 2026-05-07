# AI Institutional Persona System

## Vision

We are building an AI-powered institutional persona assistant for college, demo, and kiosk environments.

The system should simulate a real institutional representative such as:
- HOD
- Chairman
- Faculty member
- Reception assistant

The user should be able to:
- ask questions using voice or text
- receive AI-generated spoken responses
- interact with a realistic digital avatar

The long-term goal is:
- realtime conversational AI persona
- multiple personas
- kiosk deployment
- interactive campus assistant

## Final Technical Direction

We decided not to use:
- SadTalker
- Wav2Lip
- MuseTalk
- full AI-generated video per response

Main reason:
- too much latency
- unstable dependencies
- poor realtime experience
- difficult hardware requirements

Instead, we are building a 3D realtime avatar system:

User input -> STT/text -> FastAPI backend -> Gemini response -> Edge TTS audio -> Rhubarb lip sync -> browser 3D avatar blendshapes

## Avatar System

We already have:
- a 3D avatar model
- FBX/GLB assets
- ARKit-style blendshape facial controls

Verified blendshapes include:
- mouthFunnel
- mouthPucker
- mouthSmile
- mouthStretch
- mouthRoll
- mouthShrug
- jawOpen
- brow controls
- facial expression controls

This means:
- realtime facial animation is possible
- lip sync is possible without generated talking-head video

## Preferred Stack

Frontend:
- React
- Vite
- Three.js / React Three Fiber
- Tailwind CSS

Backend:
- FastAPI
- Gemini API for persona-aware responses
- Edge TTS for generated audio files
- Rhubarb Lip Sync for phoneme timing

## Voice And Lip Sync

Current voice pipeline:
- backend generates MP3 audio with edge-tts
- frontend plays returned audio URL
- frontend converts the MP3 to WAV for Rhubarb processing
- backend returns Rhubarb mouth cues
- frontend animates avatar blendshapes from phoneme timings

Future voice pipeline:
- streaming TTS
- streaming viseme events
- tighter avatar expression control

## Development Philosophy

We are building this step by step. Realtime responsiveness is more important than photorealistic generated video.

## Folder Structure

```text
frontend/
backend/
docs/
```

## Long-Term Features

Planned future features:
- multiple personas
- improved voice provider support
- realtime streaming speech
- kiosk mode
- push-to-talk
- multilingual support
- animated gestures
- cloud deployment
- institutional knowledge integration

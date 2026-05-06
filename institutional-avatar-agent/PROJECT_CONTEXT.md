# AI Institutional Persona System

## Vision

We are building an AI-powered institutional persona assistant for college/demo/kiosk environments.

The system should simulate a real institutional representative such as:
- HOD
- Chairman
- Faculty member
- Reception assistant

The user should be able to:
- ask questions using voice/text
- receive AI-generated spoken responses
- interact with a realistic digital avatar

The long-term goal is:
- realtime conversational AI persona
- multiple personas
- kiosk deployment
- interactive campus assistant

---

# Final Technical Direction

We decided NOT to use:
- SadTalker
- Wav2Lip
- MuseTalk
- full AI-generated video per response

Main reason:
- too much latency
- unstable
- dependency hell
- poor realtime experience
- difficult hardware requirements

Instead, we are building:

# 3D Realtime Avatar System

Architecture:

User
→ Speech/Text Input
→ LLM Backend
→ ElevenLabs Voice
→ Browser-based 3D Avatar
→ Realtime Lip Sync using Blendshapes

---

# Avatar System

We already have:
- a 3D avatar model
- FBX format
- ARKit/blendshape facial controls

Verified blendshapes include:
- mouthFunnel
- mouthPucker
- mouthSmile
- mouthStretch
- mouthRoll
- mouthShrug
- brow controls
- facial expression controls

This means:
- realtime facial animation is possible
- realtime lip sync is possible
- no need for generated talking videos

---

# Preferred Stack

## Frontend
- React
- Vite
- Three.js / React Three Fiber
- Tailwind CSS

Purpose:
- render avatar
- persona selection
- mic/chat UI
- realtime avatar animation

---

## Backend
- FastAPI

Purpose:
- LLM orchestration
- ElevenLabs integration
- persona management
- future RAG/data integration

---

## Voice
- ElevenLabs
- streaming audio preferred in future

---

## Lip Sync

Initial version:
- audio amplitude-based mouth movement

Future version:
- viseme-based realtime facial animation

---

# Development Philosophy

We are building this step by step.

Current priority:
- setup proper codebase
- load 3D avatar in browser
- test blendshape control
- animate mouth manually

NOT building full AI system immediately.

---

# Current Development Goal

FIRST MILESTONE:

Load avatar into browser and control blendshapes manually.

If this works:
- realtime talking avatar becomes achievable
- AI + voice integration becomes easy later

---

# Folder Structure Goal

institutional-avatar-agent/

frontend/
backend/
docs/

---

# Important Notes

This project is NOT a cinematic AI video generator.

This is an:
- interactive realtime AI digital human system

Realtime responsiveness is more important than photorealistic generated videos.

---

# Long-Term Features

Planned future features:
- multiple personas
- voice cloning
- realtime streaming speech
- kiosk mode
- push-to-talk
- multilingual support
- animated gestures
- cloud deployment
- institutional knowledge integration
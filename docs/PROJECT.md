# Project scope

The user selected Node-RED, has previous JavaScript/Node.js experience, and has strongest experience in C/C++. They want practical home automation and a friendly local AI named vader that can learn through memory and internet access without paid usage credits.

## Academic track

Use a real Node-RED fork for application source changes. Inspect a bounded existing core node or runtime subsystem; establish current behavior with tests; perform behavior-preserving refactoring. Potential topics include message handling, timer cleanup, and errors, but no concrete defect or test gap has been established yet. Match work to the actual Projects 1–3 rubrics once supplied. Project 1 currently contains only the provided repository-selection requirements and a draft rationale. Personal GUI evaluation remains required.

## Household/companion track

This repository supplies a reproducible Node-RED runtime configuration and vader's source. vader uses Ollama local inference, persistent local memory, recent conversation history, editable personality, flow summary inspection, Wikipedia search, and public HTTPS page reading. It has no vendor credentials, real device connections, or hardware control tools. It runs when started; it is not an installed always-on service or background self-training process.

These companion features are supplementary work, not a replacement for testing/refactoring the mature upstream application. AI recommendations may be wrong. The prototype's model and personality can be changed locally.

## Repository identity

The user initially called this a CSCI 630 course repo, then explicitly supplied https://github.com/saangrisani/CSCI-650. Use the supplied repository; confirm the course number before adding formal course labels or submitting work.

## Sources

- https://github.com/node-red/node-red
- https://nodered.org/docs/getting-started/
- https://docs.ollama.com/api/chat
- https://docs.ollama.com/capabilities/tool-calling
- https://docs.ollama.com/faq
- https://ollama.com/library/qwen2.5:3b

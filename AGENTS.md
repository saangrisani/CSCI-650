# Working context

- Use Node-RED as the first-choice course application. The owner supplied this repository URL despite initially describing the class as CSCI 630; do not silently change the destination or invent the course number.
- GitHub URLs must be canonical and contain no tracking parameters.
- Keep Project 1 text and verification records truthful. Personal GUI review and complete assignment rubrics remain outstanding.
- Course source work must improve testing/design in a real Node-RED fork; companion features and flow configuration are supplementary.
- The AI companion is named vader. It should run locally with no paid API credits or cloud-model fallback. Support editable personality, local memory, and optional internet retrieval. Memory is not weight training.
- Preserve existing user work. Keep runtime data, memories, credentials, and model files out of Git.
- The laptop is for development; the intended always-on household host is the Jetson, whose actual specifications still need inspection.
- Run `node --test tests/*.test.mjs` for agent changes. Describe mocked tests separately from live model/device checks.
- Vader now has CLI and Electron desktop interfaces. Optional training scripts create separate candidate adapters; do not describe dataset export as actual weight training. Full training/import and Jetson execution remain unverified.

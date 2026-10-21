# vader

I'm building a local AI companion named **vader** and connecting it to my home automation setup through Node-RED. I want something I can talk to, learn with, and keep improving over time without paying for API usage credits.

Most of my programming experience is in C and C++. I've also worked with JavaScript and Node.js, so this gives me a reason to use those skills on something I'll actually use at home.

## My setup

My Windows laptop is where I'm developing and testing the project. It has an RTX 4060 Laptop GPU with 8 GB of VRAM and about 15 GB of usable system RAM. The current local model is `qwen2.5:3b`, running through Ollama.

I can use vader through a desktop chat app or the command line. My plan is to make the Jetson the always-on host so my laptop stays available for schoolwork. I still need to check the Jetson's exact hardware and software before moving the runtime there.

The home systems I want to start with are Eufy cameras, Alexa speakers, and my Tesla. Those integrations aren't connected yet.

## Running it locally

From this repository folder, with Ollama running locally:

```sh
# Desktop app from source
pnpm vader:app

# Command-line chat
node vader/cli.mjs --chat

# Node-RED
pnpm start

# Tests
pnpm test
```

The portable Windows app launches with `Vader.exe`. I need to keep its whole application folder together. Node-RED normally opens at http://127.0.0.1:1889; the separate test instance used port 1892.

For a fresh checkout, I use `pnpm install --frozen-lockfile`. If Electron's binary is missing, I run `node node_modules/electron/install.js`. The local model needs to be downloaded separately with `ollama pull qwen2.5:3b`.

## What I want vader to learn

I want vader to remember useful details and preferences so conversations can carry over. That memory is stored locally. I can also review and correct answers in the desktop app's Learning studio and export approved examples for a future training run.

Memory and retraining are different parts of the project. The optional LoRA/QLoRA scripts create a separate candidate model adapter; I haven't completed a full training run or tested an imported trained model yet.

I've also added a [background learning worker](docs/BACKGROUND-LEARNING.md) to find compatible public datasets, collect examples, and run candidate-training jobs on my local GPU when resources are available. It keeps those datasets separate from my private conversations. The worker runs independently of the chat window; candidate activation is still a separate step.

## Moving it and keeping my information private

I can export an encrypted companion file from Settings and restore it on another machine. That carries the memories, conversations, settings, personality, and approved examples. The model and runtime files move separately. A restored copy starts with internet lookup off.

My conversations and memories stay out of this repository. Inference runs locally, but internet lookup sends search terms or requested URLs to outside websites. For private conversations, I turn lookup off or use `--offline` in the CLI.

## Course work

I'm using [Node-RED](https://github.com/node-red/node-red) as my first-choice application for Projects 1–3. I want the class work to focus on testing and improving the design of existing code, with the home setup giving me a practical reason to understand it.

This repository holds my project notes, local setup, and vader code. I still need a separate upstream Node-RED fork for the application changes. Building the companion and configuring flows are additional work, rather than the source refactoring required for class.

- [Project 1 selection](project-1/selection.md)
- [Ranked repository URLs](project-1/submission.txt)
- [Test and verification notes](docs/VERIFICATION.md)
- [Local retraining workflow](docs/RETRAINING.md)
- [Moving vader and privacy details](docs/PORTABILITY-PRIVACY.md)

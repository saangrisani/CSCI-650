# Project 1: Repository Selection

## Selections in order of preference

1. https://github.com/node-red/node-red
2. https://github.com/home-assistant/core
3. https://github.com/domoticz/domoticz

## Preferred application: Node-RED

I selected Node-RED as my preferred application because it combines my interest in home automation with an opportunity to study and improve an established software application. Node-RED provides a graphical, browser-based editor for connecting nodes into event-driven flows. I am interested in using it to coordinate household automation while studying the design and testing of its existing implementation.

Node-RED is a mature, public GitHub project that permits forking and uses the Apache 2.0 license. It uses JavaScript and Node.js, which I have worked with before, although most of my programming experience is in C and C++. This gives me a familiar starting point with a manageable learning curve. The application runs on well-known platforms, including Windows and Linux, and its editor is accessed through a web browser.

For the semester, I would focus on a bounded part of the existing application, such as a core node's message handling, timer behavior, or cleanup logic. After inspecting the implementation and existing tests, I would identify a specific design-improvement opportunity, add regression tests, and refactor the code while preserving its external behavior. Configuring household flows would provide practical context, but the academic work would involve the application's source code and tests rather than only creating flows or adding new features.

## Preliminary execution check

An assistant-assisted local evaluation started Node-RED 5.0.8 on Windows using Node.js 24.19.0. The graphical editor loaded and displayed a test flow connecting an HTTP input node to a function node and an HTTP response node. A request with input 21 returned the result 42. This demonstrates successful startup and execution of a simple flow; it does not establish that every feature or physical device integration works.

I still need to personally try the interfaces of all three candidates and confirm my preferences before final submission, as required by the assignment. Home Assistant and Domoticz passed basic startup/API smoke checks during the evaluation, but their interactive feature reviews remain incomplete.

## Alternatives

Home Assistant Core is my second choice because of its home automation focus and Python implementation. Its large codebase would require a tightly scoped project, and its frontend is maintained in a separate repository.

Domoticz is my third choice because its C++ implementation matches my strongest programming background and it provides a graphical home automation application. Its native build dependencies and frontend would require additional familiarization.

## Official references

- Node-RED repository: https://github.com/node-red/node-red
- Node-RED getting started: https://nodered.org/docs/getting-started/
- Node-RED source development: https://nodered.org/docs/getting-started/development
- Home Assistant repository: https://github.com/home-assistant/core
- Domoticz repository: https://github.com/domoticz/domoticz

# Home automation course candidates

Prepared October 20, 2026. Ranking considers the user's home automation interest, strongest experience in C/C++, and previous JavaScript/Node.js experience. Prior handoff also records Python coursework.

## Ranked URLs

1. https://github.com/node-red/node-red
2. https://github.com/home-assistant/core
3. https://github.com/domoticz/domoticz

GitHub API checks in this session returned private=false, archived=false, allow_forking=true for all three. Licenses: Apache-2.0, GPL-3.0, Apache-2.0 respectively.

## Fit and tradeoffs

Home Assistant: Python home automation application with a browser GUI. Best match to the intended household hub. Core and frontend are separate upstream repositories; Core runs with the packaged frontend. Keep semester changes in a bounded Python subsystem and confirm the instructor accepts this repository split. Its size and asynchronous architecture are significant learning costs.

Domoticz: C++ home automation application with a browser GUI in the repository. Strongest language match. Existing device, scheduling, and event-handling code offer possible testing/refactoring scopes. Native dependencies and its JavaScript/AngularJS frontend add learning/build costs. Device compatibility must be checked independently.

Node-RED: JavaScript/Node.js application with a graphical flow editor. Useful for home automation and event processing; previous JavaScript/Node.js experience is confirmed. A bounded core-node/runtime refactor with regression tests is plausible. Merely making flows would not satisfy a source-code design-improvement project.

## Fresh test evidence and limits

Home Assistant 2026.10.2: Windows Python 3.12 dependency check rejected this release. Installed in an isolated WSL Linux environment with Python 3.14.8 instead. Started successfully, and GET /api/onboarding returned the four onboarding steps with done=false. No owner account was created, no dashboard feature walkthrough was completed, and no physical device was connected. Test process stopped.

Domoticz 2026.4: Downloaded official Windows package, which contained an installer. Used the official Linux binary under WSL for an isolated startup attempt instead. Initially missing libusb-0.1 and libmosquitto; downloaded Ubuntu packages and extracted libraries locally without a system installation. Server started and GET /json.htm?type=command&param=getversion returned status OK. No authenticated device/scheduler feature or interactive GUI walkthrough was completed. Test process stopped.

Node-RED 5.0.8 on Node.js 24.19.0: Installed under work/candidate-evaluation. Started on port 1889. Browser editor loaded and displayed the evaluation flow. Deployed HTTP input -> function -> HTTP response. GET /course-eval?value=21 returned {"result":42}. An initial malformed wiring payload was corrected before the passing check. This validates a simple flow, not household integrations or the whole application. Test process may remain active for user review.

These are startup/smoke checks, not complete acceptance testing. The student must personally try all three interfaces and judge whether they like them before final submission. No fork, course submission, Jetson installation, or vendor authorization was performed in this session.

## Earlier Home Assistant proposal (superseded by Node-RED selection)

Reliable home automation event handling in Home Assistant: inspect an existing bounded subsystem, establish behavior with regression tests, then refactor duplicated validation or event-processing logic while preserving externally visible behavior. Candidate test scenarios include repeated events, unavailable entities, errors, and cancellation, subject to source inspection finding a suitable scope.

Potential household uses after integration compatibility is verified: camera-event announcements, charging-completion announcements, and light/sensor routines. Class deliverables should be tests, design analysis, and behavior-preserving source refactoring; installing integrations and configuring automations alone are not sufficient.

Projects 1-3 rubrics have not been supplied beyond selection requirements. A possible progression is baseline/analysis, characterization tests, then refactoring plus regression evidence; this must be reconciled with the actual rubrics.

Use simulated entities and disposable test data for development. Keep the household deployment configuration separate from the upstream application fork and validate changes before deploying to the house.

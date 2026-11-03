CURSORBUILD — MASTER DEVELOPMENT AND RELEASE PLAN

ROLE

Act as a senior TypeScript library engineer, frontend animation specialist, software architect, and QA engineer.

You are responsible for completing the existing CursorBuild project into a polished, reusable, production-ready website-construction animation library.

Do not treat this as a new project. Continue from the existing repository, architecture, implementation, and completed milestones.

Repository:
https://github.com/suleiman2799-svg/cursorbuild

---

PART 1 — NON-NEGOTIABLE PROJECT RULES

1. Inspect the existing repository, source code, README, architecture documentation, roadmap, tests, branches, and open pull requests before making changes.
2. Preserve all existing working functionality.
3. Do not rebuild existing features from scratch.
4. Do not remove working APIs simply to simplify implementation.
5. Do not introduce unnecessary dependencies.
6. Keep the core library framework-independent.
7. React integration must remain optional.
8. Prioritise performance, accessibility, maintainability, and mobile responsiveness.
9. Every feature must include appropriate automated tests and documentation.
10. Never claim a feature works unless it has been implemented and verified.
11. Do not silently weaken or delete failing tests to make CI pass.
12. Do not merge pull requests without my explicit approval.
13. Work incrementally. Do not combine every future milestone into one enormous pull request.
14. Push changes to GitHub and allow CI to validate them.
15. Update the README, architecture documentation, and roadmap whenever the implementation changes.

Git and pull-request rules

- Preserve the existing "main" branch.
- Finish the current PR #6 on its existing branch.
- For future milestones, create a separate feature branch and a separate PR.
- Do not create duplicate PRs for existing work.
- Do not merge anything without explicit approval.
- Do not overwrite or discard previous commits.
- Ensure every PR is based on the latest appropriate "main" branch.

---

PART 2 — EXISTING IMPLEMENTATION

The following milestones have already been implemented and merged:

1. Foundation and core architecture.
2. Multiple cursor rendering engine.
3. Natural cursor movement engine.
4. Richer click feedback.
5. Drag-and-drop simulation.
6. Text insertion simulation.

Existing capabilities include:

- Multiple independently controlled cursors.
- Configurable cursor names and colours.
- Natural Bézier cursor movement.
- Movement sequences and pauses.
- Click animations and ripple feedback.
- Drag-and-drop simulation.
- Text insertion into supported elements.
- Cursor identity management.
- Responsive cursor visibility limits.
- Reduced-motion support.
- Lifecycle and cleanup handling.

Preserve these capabilities and their public APIs.

Current resizing milestone

PR #6:

Title: feat: add cursor element resizing simulation

Existing branch:

"feature/element-resizing-simulation"

Existing APIs:

- "renderer.resize()"
- "renderer.isResizing()"
- "renderer.stopResize()"

The feature supports eight resize handles, selection frames, animated resizing, target locking, cancellation, and cleanup.

PR #6 must be completed before moving to the next milestone.

---

PART 3 — COMPLETE THE CURRENT PR #6

Step 5B: Element Resizing Simulation

First, inspect PR #6 and its latest commits.

Do not create another PR.

Continue on:

"feature/element-resizing-simulation"

A. Fix eight-handle anchor resizing

All eight handles must resize around the correct fixed opposite edge or corner.

Expected behaviour:

Handle| Fixed anchor
Top-left| Bottom-right
Top| Bottom edge
Top-right| Bottom-left
Right| Left edge
Bottom-right| Top-left
Bottom| Top edge
Bottom-left| Top-right
Left| Right edge

The fixed anchor must remain stationary throughout the animation, not merely at the beginning or end.

B. Investigate the current CI failure

The latest workflow run reports:

- 62 total tests.
- 61 passing.
- 1 failing.

Failing test:

"keeps the opposite edge or corner stationary throughout all eight resize directions"

Location:

"packages/core/src/cursor/cursor-renderer.test.ts:520"

Failure:

Expected right edge: 122
Actual right edge: 132

The failing assertion occurs during top/bottom resizing.

Investigate whether the implementation, test geometry, or positioning calculation is responsible.

Do not weaken the assertion or remove the test.

C. Preserve existing behaviour

Verify:

- Existing CSS transforms remain intact.
- Existing positioning is not accidentally overwritten.
- Existing translate values are handled correctly.
- Cancellation restores original inline styles.
- Target locking works.
- Multiple cursors can resize different targets independently.
- Cursor removal cleans up active resizing.
- Target removal cleans up active resizing.
- Renderer destruction cleans up everything.
- Reduced-motion behaviour works.
- Dragging and typing interactions remain compatible.
- Existing movement sequences continue to work.

D. Testing

Add or correct tests for:

- All eight resize handles.
- Opposite-edge and opposite-corner stability throughout resizing.
- Different element positioning modes.
- Existing transforms and translate values.
- Cancellation and restoration.
- Target locking.
- Cursor removal.
- Target removal.
- Renderer destruction.
- Reduced-motion behaviour.
- Interaction with dragging, typing, and movement.

Run:

"npm test"

"npm run typecheck"

"npm run build"

All must pass.

Push the correction to the existing branch.

Update PR #6 automatically through the existing branch.

Do not merge PR #6.

---

PART 4 — REMAINING DEVELOPMENT MILESTONES

After PR #6 is complete and independently validated, continue through the following milestones in order.

Each milestone must have its own feature branch, implementation, tests, documentation, and pull request.

STEP 6 — CINEMATIC ANIMATION ENGINE

Create a reusable cinematic animation system.

This is the visual foundation that makes CursorBuild distinctive.

Support:

1. Text reveal animations.
2. Image reveal animations.
3. Mask-based reveals.
4. Section entrance animations.
5. Parallax effects.
6. Smooth transitions.
7. Element assembly animations.
8. Staggered animation sequences.
9. Configurable animation duration.
10. Configurable easing.
11. Configurable delays.
12. Reversible animations where appropriate.

Allow developers to configure animations for individual elements.

The system must not force developers to use one particular website design.

Create a flexible API that supports different website styles.

Keep cinematic animations independent from cursor simulation so developers can use either system separately or together.

Add tests, examples, and documentation.

---

STEP 7 — SCROLL-DRIVEN CONSTRUCTION ENGINE

Make website construction respond to the visitor's scrolling.

The library should allow developers to define construction sequences that play as the visitor scrolls through a page.

Support:

1. Scroll-triggered construction.
2. Section-based timelines.
3. Sequential construction.
4. Simultaneous construction.
5. Scroll progress tracking.
6. Configurable start and end points.
7. Pause and resume behaviour.
8. Reverse playback when scrolling backwards, where configured.
9. Multiple construction scenes on one page.
10. Proper cleanup when scenes are destroyed.

A developer should be able to define a section and specify what happens inside it.

For example:

- Cursor A creates the heading.
- Cursor B inserts supporting text.
- Cursor C positions an image.
- Another cursor resizes a card.
- The entire section transitions into its completed state.

The developer must control the sequence and timing.

Do not hardcode the example above into the library.

Make it configurable.

---

STEP 8 — MULTI-CURSOR COORDINATION ENGINE

Create a system that coordinates multiple cursors.

Support:

1. Independent cursor timelines.
2. Simultaneous actions.
3. Sequential actions.
4. Shared action groups.
5. Cursor-to-cursor coordination.
6. Configurable delays between collaborators.
7. Multiple cursors working on different elements.
8. Action dependencies.
9. Cancellation of individual actions.
10. Cancellation of complete groups.

Developers should be able to define which cursor performs each action.

The coordination engine must integrate with:

- Movement.
- Clicking.
- Dragging.
- Text insertion.
- Resizing.
- Cinematic animations.
- Scroll-driven construction.

Avoid unnecessary coupling between modules.

---

STEP 9 — ADVANCED VISUAL EFFECTS

Add optional visual enhancements.

Potential features:

1. Selection boxes.
2. Alignment guides.
3. Measurement indicators.
4. Grid overlays.
5. Blueprint mode.
6. Cursor trails.
7. Focus indicators.
8. Construction progress indicators.
9. Completion animations.
10. Element highlighting.
11. Snap-to-guide visual effects.
12. Optional design-tool-inspired interface elements.

All effects must be configurable.

Do not force every effect on every website.

Developers should be able to enable only the effects they need.

Ensure visual effects do not interfere with the actual website's layout or interaction.

---

STEP 10 — RESPONSIVE AND PERFORMANCE OPTIMISATION

Mobile responsiveness must be treated as a core requirement.

Test and optimise for:

- Desktop.
- Tablet.
- Mobile phones.
- Touch devices.
- Different viewport sizes.
- Reduced-motion preferences.
- Low-powered devices.

The existing renderer has responsive cursor visibility limits.

Preserve and improve this behaviour.

Consider:

- Reducing cursor counts on small screens.
- Simplifying expensive visual effects.
- Reducing unnecessary animation calculations.
- Avoiding layout thrashing.
- Avoiding memory leaks.
- Cleaning up event listeners and timelines.
- Handling browser resizing.
- Handling orientation changes.
- Respecting device performance.

Do not assume that a desktop animation will automatically work well on mobile.

Add appropriate responsive tests and manual testing guidance.

---

STEP 11 — REUSABLE COMPONENT AND PRESET LIBRARY

Create reusable presets and helper components.

Developers should not need to manually configure every animation from scratch.

Provide configurable presets for common construction patterns.

Examples:

- Hero section construction.
- Landing page construction.
- Text and image reveal.
- Product card assembly.
- Product gallery construction.
- Portfolio section construction.
- Dashboard construction.
- SaaS landing page construction.
- Business website construction.

Where appropriate, provide React helpers or components without making React a requirement for the core library.

All presets must remain customisable.

Do not create a collection of hardcoded website templates that limits the library.

The purpose is to provide reusable animation building blocks.

---

STEP 12 — DOCUMENTATION AND DEVELOPER EXPERIENCE

Create complete documentation for the library.

Include:

1. Installation.
2. Quick start.
3. Core API reference.
4. Cursor configuration.
5. Movement API.
6. Click API.
7. Drag API.
8. Text insertion API.
9. Resize API.
10. Cinematic animation API.
11. Scroll construction API.
12. Multi-cursor coordination API.
13. Visual effects API.
14. Responsive configuration.
15. React integration.
16. Vanilla TypeScript integration.
17. Lifecycle management.
18. Cleanup.
19. Reduced-motion support.
20. Troubleshooting.
21. Complete examples.

Provide realistic code examples.

Every documented API must correspond to an actual implemented API.

Do not document imaginary features.

---

STEP 13 — DEMO WEBSITE AND PLAYGROUND

Build a polished demonstration website for CursorBuild.

The demo should show what the library can actually do.

Include separate demonstrations for:

1. Multiple cursors.
2. Natural movement.
3. Click feedback.
4. Drag-and-drop.
5. Text insertion.
6. Element resizing.
7. Cinematic animations.
8. Scroll-driven construction.
9. Multi-cursor coordination.
10. Advanced visual effects.
11. Responsive behaviour.

Create a playground where developers can experiment with available configuration options.

Where practical, allow users to:

- Change cursor names.
- Change cursor colours.
- Change cursor count.
- Adjust animation speed.
- Change easing.
- Enable or disable effects.
- Select animation presets.
- Replay construction sequences.

The demo must be responsive and usable on mobile.

Do not show controls for features that have not actually been implemented.

---

STEP 14 — EXAMPLES AND INTEGRATION

Create separate examples demonstrating how developers can use CursorBuild in different projects.

Include:

- Personal portfolio.
- Ecommerce website.
- Business website.
- SaaS landing page.
- Creative agency website.
- Dashboard.
- Photography website.

Provide both vanilla TypeScript and React examples where appropriate.

Keep examples independent of the core library implementation.

---

STEP 15 — PACKAGE AND RELEASE READINESS

Prepare CursorBuild for public release.

Inspect the entire repository.

Verify:

1. Package names.
2. Package exports.
3. TypeScript declarations.
4. Build output.
5. ESM compatibility.
6. CommonJS compatibility if supported.
7. React integration packaging.
8. Dependency declarations.
9. Peer dependencies.
10. Package versioning.
11. README installation instructions.
12. Licence.
13. Changelog.
14. GitHub Actions.
15. Test coverage.
16. Build reproducibility.
17. Browser compatibility.
18. Error handling.
19. API consistency.
20. Lifecycle cleanup.

Do not publish a package or create a public release without my explicit approval.

Prepare the project so it is ready for its first stable release.

---

PART 5 — QUALITY REQUIREMENTS FOR EVERY MILESTONE

Every milestone must satisfy these requirements.

Code quality

- TypeScript must be used consistently.
- Avoid unnecessary "any".
- Keep modules focused.
- Avoid duplicated logic.
- Preserve public API compatibility where possible.
- Handle invalid inputs safely.
- Handle destroyed instances safely.
- Prevent memory leaks.
- Clean up animations and event listeners.

Testing

Add tests for:

- Normal behaviour.
- Edge cases.
- Invalid inputs.
- Cancellation.
- Cleanup.
- Multiple cursors.
- Concurrent actions.
- Reduced motion.
- Responsive behaviour where applicable.
- Integration with existing features.

Do not remove previous tests.

Validation

Before completing each milestone, run:

"npm test"

"npm run typecheck"

"npm run build"

Fix all failures.

Do not report successful validation unless the commands actually pass.

Documentation

Update:

- README.md
- docs/architecture.md
- docs/roadmap.md

Add specific documentation for new APIs.

GitHub

For every future milestone:

1. Create a feature branch.
2. Implement the milestone.
3. Add tests.
4. Update documentation.
5. Run validation.
6. Push the branch.
7. Open a separate PR against main.
8. Provide a clear summary.
9. Report test results.
10. Wait for my approval before merging.

---

PART 6 — FINAL ACCEPTANCE CRITERIA

CursorBuild is ready for its first stable release when:

- All planned milestones are implemented.
- Existing features still work.
- The core library remains framework-independent.
- React integration works independently.
- Multiple cursors can coordinate construction.
- Movement, clicking, dragging, typing, and resizing work together.
- All eight resize handles preserve their opposite anchors.
- Cinematic animations work independently and with cursor simulation.
- Construction can be controlled by scrolling.
- Advanced visual effects are configurable.
- Mobile responsiveness is properly implemented.
- Reduced-motion preferences are respected.
- Documentation is complete.
- The demo and playground work.
- Examples are available.
- Tests pass.
- TypeScript checks pass.
- Production builds pass.
- Package exports are correct.
- No unresolved critical bugs remain.

---

PART 7 — EXECUTION INSTRUCTIONS

Start by inspecting the repository and current PR #6.

Do not jump directly into future milestones.

First, complete the existing resizing milestone and resolve the currently failing anchor-resizing test.

Then proceed sequentially through Steps 6–15.

Do not stop after producing a plan. Actually implement each milestone, validate it, document it, and push the work to GitHub.

If a milestone reveals an architectural problem, investigate and fix it without breaking existing functionality.

If a requirement is ambiguous, inspect the existing architecture and choose the most maintainable solution. Document important decisions.

If you cannot complete a milestone, clearly explain what remains rather than pretending it is finished.

Maintain a progress report showing:

- Completed milestones.
- Current milestone.
- Open pull requests.
- Merged pull requests.
- Tests passing and failing.
- Known limitations.
- Next action.

IMPORTANT:

Do not merge PR #6 or any future PR without my explicit approval.

Do not publish CursorBuild without my explicit approval.

Your immediate task is to fix PR #6 on its existing branch and make its CI pass.

# EduDojo - preliminary game design

**Status:** v0.1, based on the Game Team whiteboard sketch
**Owner:** Game Team
**Platform:** browser-based, turn-based learning RPG built as a game layer over OpenMAIC

## 1. Product shape

- One **Dojo** represents one topic selected by the learner.
- Each **floor** represents one subtopic and its learning objectives.
- The learner studies one lesson inside the Dojo, then climbs to that lesson's floor and fights an enemy using the same objectives.
- Winning the battle returns the learner to the Dojo for the next lesson; it does not jump directly into another battle.
- After every normal floor, the learner's own **Sensei transforms into the Final Boss** on the top floor.
- The Final Boss combines objectives from every part of the user's input and tests the complete topic.
- The result is reported as demonstrated mastery by objective, including what the learner should review.

## 2. Core loop

1. Select a topic or source material.
2. OpenMAIC creates the lesson content and challenge pool.
3. Learn the current subtopic with the Sensei inside the Dojo.
4. Climb to that floor and fight a turn-based battle using the lesson knowledge.
5. Receive immediate explanations and a floor result.
6. Return to the Dojo, earn XP, and begin the next lesson.
7. Repeat the lesson-to-battle loop until all normal floors are cleared.
8. Face the transformed Sensei and defeat the Final Boss to complete the Dojo.

## 3. Battle turn

Combat uses a **reactive turn-based** structure: players can take time to choose commands, while attack rhythms and enemy telegraphs require real-time input. Each round has two halves:

1. **Player turn:** choose one of three attack techniques, answer its knowledge challenge, and resolve the technique according to the answer score.
2. **Enemy turn:** the enemy telegraphs an attack; choose Block, Parry/Counter, or Dodge, answer the associated challenge, then react inside the technique's timing window.

Defense timing has an explicit risk/reward curve:

- **Block** has the widest window and reduces incoming damage to 20%.
- **Dodge** has a medium window and avoids all damage.
- **Parry/Counter** has the tightest window, avoids damage, and returns damage to the enemy.

Knowledge and execution are separate inputs during defense. The knowledge answer prepares the technique; the timing input executes it. Missing either part weakens or fails the response. Enemy animations must communicate the impact moment clearly enough that the timing can be learned rather than guessed.

The battle ends when either the player or enemy reaches zero HP. Challenge results must be deterministic inputs to the pure TypeScript battle reducer so Frontend and Backend resolve the same state.

## 4. Player attack techniques

| Technique | Learning interaction | Preliminary resolution |
| --- | --- | --- |
| **Heavy Attack / Schwerer Hieb** | One typed answer | A correct answer creates one large sword slash for 34 damage; a miss deals no damage. |
| **Three-Hit Combo / Dreier-Kombo** | Three multiple-choice questions | Every correct answer lands exactly one animated hit, for zero to three hits total. |
| **Quiz Technique / Wissensstrahl** | Five mixed quiz questions | The player charges an energy blast. Three correct answers activate it, four or five increase damage, and fewer than three cause 16 backlash damage to the player. |

Every result shows a short explanation before the next turn. The player should understand why an attack landed or missed.

After an attack resolves, that technique enters a visible cooldown. The player must use other techniques while its countdown reaches zero: Heavy Attack takes two other attack turns, Three-Hit Combo takes one, and Quiz Technique takes three. The enemy's sword slash plays in slow motion while the player chooses Block, Parry/Counter, or Dodge; the chosen defense then has its own real-time execution window.

The demo dojo ships with a handwritten English question bank in `teams/game/content/demo-question-bank.ts`, keyed by objective. Battles read it only through the demo `DojoSource`, so answer keys never reach the battle screen. It exists only for offline playtesting. Backend owns generated questions and authoritative grading for live sessions.

## 5. Enemy attack responses

| Response | Learning interaction | Successful result | Failed result |
| --- | --- | --- | --- |
| **Block** | One multiple-choice question | Player receives only 20% of the incoming damage. | Player receives full damage. |
| **Counter** | Short quiz | Incoming damage is cancelled and the enemy receives counter damage. | Player receives full damage. |
| **Dodge** | One typed-answer question | Player receives zero damage. | Player receives full damage. |

The enemy attack must be telegraphed before the player chooses a response. Later playtests may add enemy types that make one response more suitable, but the MVP uses the same three choices in every battle.

## 6. Floors and learning objectives

- A floor tests only objectives introduced on that floor, plus limited review from earlier floors.
- Each floor has at least one lesson scene, one practice interaction, and one battle.
- Questions must reference objective IDs so mastery can be updated after every answer.
- A learner may replay a completed floor to improve mastery or XP.
- Unlocking the next floor requires victory and completion of the current floor's required objectives.

## 7. Final Boss

- The Final Boss unlocks after all normal floors are cleared.
- The Final Boss is the same Sensei who taught the learner, transformed into a combat form for the final examination.
- Its challenge pool covers every learning objective extracted from the user's original input, including objectives from every floor.
- The fight has multiple phases; each phase represents one or more floors.
- Later phases mix objectives instead of testing them separately.
- Weak objectives receive extra weight so the Boss tests understanding rather than memorized question order.
- Victory requires reducing Boss HP to zero and meeting the configured mastery threshold.
- After defeat, the learner receives a review list and can retry without repeating mastered material.

The first MVP Boss should use three phases:

1. **Recall:** core facts and definitions.
2. **Application:** use knowledge in examples or small problems.
3. **Synthesis:** combine objectives from multiple floors.

## 8. Progression

- Battles award XP based on victory, answer quality, combo performance, and remaining HP.
- Floor completion unlocks the next floor.
- Achievements reward learning behavior such as a perfect combo, successful comeback, or mastery improvement.
- Rewards must not encourage random guessing or repeated easy-question farming.
- Exact HP, damage, XP, timer, and mastery values live in `teams/game/balance/balance.ts` after playtesting.

## 9. Character roles

- **Sensei:** teaches, explains mistakes, and offers limited hints.
- **Rival:** challenges the learner and introduces friendly competition.
- **Classmate:** supports collaborative practice and discussion.
- **Boss:** tests the learner, changes phases, and targets weak objectives.

Game Team defines personality and allowed behavior. Backend Team implements the agents; Frontend Team renders them.

## 10. Frontend handoff

The battle screen needs:

- Player and enemy HP bars.
- Current floor, round, and learning objective.
- Enemy attack telegraph.
- Three attack choices on the player turn.
- Block, Counter, and Dodge on the enemy turn.
- Question panel, feedback, damage numbers, and combo animation.
- Final Boss phase indicator and post-battle mastery report.

Frontend owns visual implementation. Game Team supplies action IDs, state transitions, effect names, and balance values.

## 11. Backend handoff

Backend needs to provide:

- Challenge prompts without answer keys.
- Typed-answer, quiz, and multiple-choice grading results.
- Objective IDs and mastery updates.
- Battle session persistence and rewards.
- Final Boss challenge selection across all floors.

Game Team consumes grading results; it does not call models or databases directly.

## 12. MVP scope

- One Dojo with three floors.
- One normal enemy per floor.
- Heavy Attack, Three-Hit Combo, and Quiz Technique.
- Block, Counter, and Dodge.
- One three-phase Final Boss.
- XP, floor unlocking, and mastery report.

## 13. Open balance decisions

- Starting player and enemy HP.
- Base damage for each attack and defense failure.
- Partial-credit thresholds for typed answers.
- Counter damage and Quiz Technique scaling.
- Whether questions have timers.
- Required mastery threshold for Final Boss victory.
- Retry cost and anti-farming rules.

These values remain open until the first playable battle is available for playtesting.

## 14. Current combat sandbox (`/dojo`)

This page is a temporary **1v1 Game Team test**, not the finished Frontend design. It uses handwritten German questions while Backend prepares live generation and grading.

- Fixed 2D side view: apprentice on the left and opponent on the right. There is no orbit camera, perspective transform, 3D scene, or model-loading requirement.
- Heavy: one forward lunge and one broad slash; impact at 460 ms.
- Combo: one visible cut and recoil per correct answer, starting at 360 ms, 180 ms apart. Damage is committed after the last hit.
- Quiz: a simple charge and beam; below 3/5 causes 16 self-damage. Impact at 1400 ms.
- Defense: a slow enemy windup while choosing/answering, then a timed Block, Counter or Dodge. The timing check uses elapsed time; repeated presses cannot resolve twice.
- Menus stay locked during an action. Restart cancels pending animation outcomes.
- Motion uses 2D CSS translate/rotate/scale with SVG ribbon trails. Both fighters have guard/feint loops and close-range face-offs. Slash contact adds a short hold, directional recoil and a 2 px arena shake. **Full motion** explicitly enables animation for testing.
- **Dev Set** switches the handwritten prototype questions between German and English and restarts the current duel.

Frontend owns final UI, character art/animation, roster and production effects. The simple capsule fighters only demonstrate positioning, attack direction and timing. Backend owns live question generation and grading; the exposed sample answers must not be used for a scored production session.

Validation: the game suites pass (9 tests, 3 TODOs). Browser checks cover heavy damage, a 2-hit combo, parry, block, early defense failure, quiz backlash, restart during an attack, both slash directions, auto-lock timing and the fixed 2D stage. Full-device performance profiling and mobile art tuning remain Frontend work.

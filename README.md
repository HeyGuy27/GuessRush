# 🎮 GuessRush

An interactive number guessing game that challenges your intuition and quick thinking! Play across multiple game modes, unlock tiered achievements, and track your stats in a modern, responsive UI.

---
## 🚀 Recent UI & Logic Improvements 
- **Personal Stats Overhaul:** Stats modal now features tabs (General, Personal Bests, Mode Stats, Daily Challenge) for a cleaner, more organized layout.
- **Personal Bests Cards:** Modern, compact cards with icons, gradients, and hover effects. Missing values handled gracefully.
- **Player Rank Display:** Rank ("Apprentice" , e.g) is now highly visible, with XP progress and next rank info.
- **Robust Stats Logic:** Handles missing/null stats, always shows default values instead of errors, and saves best score/time correctly.
- **Input Validation:** Guesses outside the allowed range are blocked and show a clear error message (no more accidental Game Over).
- **Debug Logs:** All debug logs removed for a clean console.
- **Stat Cards:** Brighter background for better readability and accessibility.

---

## 👉 [🎮 Play Now on GitHub Pages](https://heyguy27.github.io/GuessRush/)

## 🚀 Recent Fixes & Improvements
- **Double Chaos:** Game Over is now shown only when attempts run out, not on timer or invalid input.
- **Invalid Input:** Entering a number out of range no longer ends the game, only shows an error message.
- **Guess History:** Guess history is now always accurate, even in timer/range-changing modes.
- **Debug Logs:** All debug console logs have been removed for a clean console.
- **State Management:** `guessHistory` is now managed as part of the global state, not as a global variable.
- **End-of-Game Summary:** The summary modal is shown only for real wins/losses, not for invalid input.
- **Error Handling:** Error messages are clear and user-friendly; no more Game Over for invalid input.
- **Code Cleanup:** All debug logs removed, improved code maintainability and readability.

---

## 📖 Table of Contents
- About
- Game Modes
- Difficulty Levels
- Features
- Achievements
- Scoring System
- Getting Started
- Technical Details
- Keyboard Shortcuts
- Screenshots
- License

## ℹ️ About
GuessRush is a modern number guessing game with innovative features: mathematical hints, dynamic difficulty, and a robust achievement system. Great for casual players and puzzle fans alike.

## 🏁 Game Modes
- **Classic**: Guess the number in a fixed range.
- **Chaos**: The target number changes every 15 seconds—timer starts after your first guess.
- **Math Training**: Get mathematical hints to help you guess.
- **Daily Challenge**: A new challenge every day for all players.
- **Streak**: Guess correctly 12 times in a row, with the range increasing and attempts decreasing each round.
- **Reverse**: Hot/Cold hints are reversed.
- **Blitz**: Only 30 seconds to guess the number. Timer starts after your first guess. Win fast for special achievements!
- **Sudden Death**: Only one attempt—range changes by difficulty.
- **Break the Bot**: Take turns with the bot. The bot never guesses out of range or repeats guesses. If the bot finds the number first, you lose.
- **Double Chaos**: Every 15 seconds, both the number and range change randomly—timer starts after your first guess. Special achievements for each difficulty.
- **Practice**: Unlimited attempts, no timer, range by difficulty.

## 🎚️ Difficulty Levels
- **Easy**: 1-100, 12 attempts
- **Medium**: 1-250, 10 attempts
- **Hard**: 1-500, 8 attempts
- **Chaos**: 1-1000, 5 attempts

All game modes (except Streak, Sudden Death, Double Chaos) support difficulty selection.

## 🏆 Achievements
- **Tiered Achievements**: Bronze, Silver, Gold, Platinum for many challenges. Always awards the highest tier you qualify for.
- **Total Wins**: Bronze (1 win), Silver (10 wins), Gold (25 wins), Platinum (50 wins) — for total games won.
- **Lucky Guess**: Win on your first guess.
- **Speed Demon**: Win extremely fast (special time-based achievement).
- **Perfect Score, Range Master, Help Seeker**: Improved logic and thresholds.
- **Secret Achievement**: "Game Master"—unlock all other achievements to reveal it!
- **Double Chaos Achievements**: Unique achievement for each difficulty (Into the Storm, Chaos Handler, Master of Mayhem, Lord of the Double Chaos).
- **Blitz Champion**: Win Blitz mode fast for special tiers.
- **Break the Bot**: Win against the bot in Break the Bot mode.
- **Per-Round Display**: See only the achievements you earned in the current round, until you earn new ones
- **Achievements Panel**: View all achievements, their status, icons, and descriptions in a dedicated modal
- **Pop-up notifications**: Achievements now unlock and display correctly, including pop-ups.
- **Animated achievement popups and modal highlights for new achievements.**
 **Note:** Achievements cannot be earned in Practice mode.

## 🌐 Features
- Theme selector: Light, Dark, Neon, Pastel
- Modern, responsive UI with smooth transitions
- Info box explaining scoring, achievements, and HOT/COLD feedback
- Keyboard shortcuts and ARIA accessibility
- Personal stats modal and daily challenge stats
- Visual feedback for range changes and HOT/COLD guesses
- Confetti and animations for wins and achievements
- Local storage for persistent progress
- Social sharing for daily results
- Error handling and validation
- All explanations/tooltips in English
- Static background (no longer changes per mode)
- **New:** End-of-game summary modal for both wins and losses, with score breakdown, achievements, and Play Again/Close buttons.
- **New:** Animated circular timer for Blitz, Chaos, and Double Chaos modes, with color transitions and accessibility.
- **New:** Mini player profile card with initials avatar, tier badge, and favorite mode.
- **New:** Streak progress bar in Streak mode.
- **New:** Robust UI/UX for timer and modal resets, including after losses.
- **New:** Timer in Chaos/Double Chaos/Blitz starts after first guess (Option B).
- **New:** Consistent modal-based loss handling for all timed modes.
- **New:** Accessibility and keyboard navigation improvements for modals and game controls.
- **New:** Robust state-driven timer logic for reliability.
- **New:** Bug fixes for timer, modal, and UI reset logic.

## 💯 Scoring System
- Each win starts with a base score of **1000 points**.
- -50 points for every guess beyond the first.
- -2 points for every second it takes to win.
- -100 points if you use a hint.
- Your score is then multiplied by a difficulty bonus:
  - **Easy**: ×1
  - **Medium**: ×1.2
  - **Hard**: ×1.4
  - **Chaos**: ×1.6
- Score never goes below 0.
- Try to win on your first guess, without hints, and as fast as possible for the highest score!

## ⌨️ Keyboard Shortcuts
- **Enter**: Submit guess
- **Escape**: Clear input/focus, close modals
- **Ctrl + R**: Reset statistics
- **Ctrl + A**: Reset achievements

## 🚀 Getting Started
1. Download or clone the repository
2. Open `index.html` in your browser
3. **First-time users** will see a welcome flow:
   - Enter your player name
   - Read game info and tips
   - Complete a quick tutorial
4. Choose your game mode and difficulty
5. Start playing!

## 🎯 Welcome Flow (New!)
For first-time players, GuessRush now includes a comprehensive welcome experience:
- **Player Name Setup**: Enter your name to personalize your gaming experience
- **Game Info & Tips**: Learn about scoring, achievements, and HOT/COLD feedback
- **Interactive Tutorial**: Practice with a simple 1-10 number guessing game
- **Skip Option**: Experienced players can skip the tutorial
- **Testing**: Use the "Reset Welcome" button in the stats section to test the flow again

## 🛠️ Technical Details
- HTML5, CSS3 (with variables), JavaScript (ES6+)
- LocalStorage for data persistence
- Confetti.js for animations
- Modular, clean code
- **Robust state-driven timer and modal logic for reliability.**

## 📋 Project Structure
- `index.html` — Main game interface
- `main.js` — Game initialization
- `gameLogic.js` — Game logic and state
- `achievements.js` — Achievements logic
- `state.js` — State management
- `ui.js` — UI logic and rendering
- `config.js`, `difficulty.js`, `storage.js`, `welcome.js` — Supporting modules
- `style.css` — Styling and themes
- `TODO.md` — Roadmap and features

## 🚀 Main Features
- 13 Game Modes, all with difficulty selection
- Secret "Game Master" achievement
- Achievements Panel modal
- Persistent per-round achievements display
- Modern, accessible, responsive UI
- Info box and keyboard shortcuts
- Daily Challenge info block
- Visual feedback and animations
- Improved achievement logic: always awards highest tier, new achievements added, bug fixes

## 📝 How to Use & Test
1. Open `index.html`
2. Switch game modes and difficulty
3. Timer in Chaos/Double Chaos starts after first guess
4. Daily mode shows info block
5. Click "Achievements Panel" to view all achievements
6. Use keyboard shortcuts

## 🏆 Achievements
- Tiered system (Bronze, Silver, Gold, Platinum)
- Lucky Guess, Speed Demon, Blitz Champion, Double Chaos, Break the Bot, and other special achievements
- Secret achievement
- All achievements shown in a dedicated panel

## 🤩 Code Quality & Comments
- The codebase is kept clean and readable, with only helpful or clarifying comments.
- All unnecessary or redundant comments have been removed for maintainability.
- Please keep future comments concise and only for non-obvious logic or important warnings.

## 🎯 Welcome Flow & Feedback System
- The onboarding experience includes a player name prompt, game info, and an interactive tutorial.
- Tutorial feedback now matches the main game, including HOT/COLD/WARM and higher/lower hints.
- The UI and code are designed for clarity and ease of contribution.

## 🛠️ Development
- 100% JavaScript, HTML, CSS
- Responsive and accessible

## 🤝 Contributions
- Suggestions welcome! See `TODO.md` for ideas

## 📸 Screenshots
*Coming soon!*
Now includes animated timer, end-of-game modal, and player profile card.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Made with ❤️ by Guy Grinberg




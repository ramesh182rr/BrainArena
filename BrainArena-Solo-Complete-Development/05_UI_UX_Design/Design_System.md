# BrainArena Solo Design System

## Visual principles
- Colourful, playful and legible; avoid visual noise during puzzle solving.
- Each world has its own accent identity while sharing layout, typography and interaction rules.
- Use 2D assets for UI/game boards; reserve 3D for selected world environments, rewards and effects.
- Puzzle readability takes priority over decoration.
- Avoid visual mimicry of reference games.

## Brand palette (starting tokens)
- Ink / deep navy: `#17233F`
- Surface: `#F7F8FC`
- Night surface: `#202A4A`
- Coral: `#FF786B`
- Sun: `#FFC857`
- Aqua: `#55C9C2`
- Violet: `#8B75E8`
- Leaf: `#68C98C`
- Sky: `#69A8F5`
- Text primary: `#17233F`
- Text secondary: `#65718B`

## World accents
- Trickster's Lab: coral + amber
- Logic Kingdom: aqua + leaf
- Spatial Dimension: sky + indigo
- Pattern Universe: violet + pink
- Memory Vault: midnight blue + gold
- Creative Chaos: orange + turquoise

## Typography
Use a highly legible rounded sans-serif for headings and a neutral sans-serif for instructions/body. Bundle only fonts with an appropriate licence. Keep instructions concise and test on small screens.

## Components
- Primary/secondary buttons with large touch targets.
- World cards with icon, title and short description.
- Game cards with difficulty, play state and offline badge.
- Puzzle board with clear focus/selection states.
- Hint drawer with progressive hint levels.
- Level-complete summary with replay/next/exit.
- Daily Arena session card.
- Progress chart with text labels and accessible values.

## Motion
- Short transitions, clear success/failure cues.
- Reduced-motion mode disables parallax, screen shake and non-essential motion.
- Avoid constant animated backgrounds during puzzle play.

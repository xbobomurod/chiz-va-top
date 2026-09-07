# Chizma & Top

Build a full-stack real-time multiplayer online drawing and guessing game inspired by the gameplay concept of skribbl.io, but with a completely original design and Uzbek-focused gameplay.

IMPORTANT:
This must be a REAL WORKING multiplayer game, not a static UI prototype.

I will provide the Uzbek word dataset as a .json file separately.

DO NOT generate your own large word dataset.
DO NOT invent additional words unless explicitly asked.
Use the JSON file I provide as the source of truth for the game's word system.

TECH STACK

Use:

React

TypeScript

Tailwind CSS

shadcn/ui

Supabase

Supabase Realtime

Use realtime functionality for:

players

rooms

drawing

chat

game state

turns

scores

round transitions

Game-critical logic must be server-authoritative.

Do not trust the client for:

correct answers

score calculation

drawer permissions

turn ownership

timers

game state

WORD DATASET

I will provide a JSON file containing the complete Uzbek word dataset.

Import the provided JSON dataset into the project and use it as the application's word database.

The dataset will contain difficulty levels such as:

easy

medium

difficult

It may also contain categories.

The application should be designed so that the JSON structure can be easily adapted if the exact field names differ.

Before implementing the word-selection logic:

Read and understand the provided JSON file.

Detect its structure.

Map the JSON fields into the application's word model.

Preserve all Uzbek characters correctly, including:

o‘

g‘

q

x

sh

ch

Do not modify, translate, or normalize the original words unnecessarily.

Do not remove duplicate-looking words unless explicitly required.

Keep the dataset easy to replace with a newer JSON file later.

The game should be able to select words according to:

difficulty

category if available

random selection

Example conceptual structure:

{
"easy": [...],
"medium": [...],
"difficult": [...]
}

However, DO NOT assume this exact structure before reading my file.

APPLICATION FLOW

1. HOME PAGE

Create a polished and playful home page in Uzbek.

Include:

game logo/name

nickname input

"Xona yaratish"

"Xonaga qo‘shilish"

short explanation

Use an original visual identity.

Possible name:
"Chiz & Top"

Do not copy skribbl.io branding or interface.

2. CREATE ROOM

Allow a player to create a room.

Settings:

room code

maximum players: 10

minimum players: 2

number of rounds

round duration

difficulty

category if available

After creation, send the host to the lobby.

3. JOIN ROOM

Allow players to enter:

nickname

room code

Validate:

room exists

room is not full

nickname is unique inside the room

4. LOBBY

Display:

room code

copy button

player list

host

ready state

Host can start the game.

Do not start until the minimum player requirement is satisfied.

5. GAME SCREEN

Create a responsive multiplayer game interface.

Desktop:

left: players and scores

center: drawing canvas

right: guessing chat

Top:

round number

timer

game state

turn information

For the drawer:

display 3 random words from the provided JSON dataset

drawer chooses one

chosen word remains secret from other players

For other players:

display hints

provide guessing input/chat

6. WORD SELECTION

The system must select words ONLY from the imported JSON dataset.

Selection logic:

Determine selected difficulty.

Filter the dataset.

Filter category when a category is selected.

Randomly choose 3 valid words.

Send the choices only to the drawer.

Once the drawer selects a word, keep the answer hidden from all other clients.

Never expose the selected secret word to non-drawer players through client state, HTML, browser storage, or realtime payloads.

7. DRAWING CANVAS

Implement a real collaborative drawing canvas.

Features:

pencil

eraser

colors

brush size

clear canvas

undo if practical

Drawing must be synchronized in real time.

Prefer sending drawing strokes/events instead of repeatedly transmitting full canvas screenshots.

When reconnecting, a player should be able to recover the current drawing state.

Only the current drawer can draw.

8. GUESSING CHAT

Players can send guesses in real time.

Correct answer detection must happen securely.

When a player guesses correctly:

mark them as correct

calculate score

prevent duplicate scoring

do not publicly reveal the answer immediately

Incorrect guesses continue to appear normally.

Normalize case and common apostrophe variations where appropriate, while preserving Uzbek word semantics.

Examples of apostrophe variations that may need to be treated consistently:
'
‘
ʼ

9. SCORING

Create a speed-based scoring system.

Players who guess faster receive more points.

The drawer should also receive points when players correctly guess the word.

All score calculations must be server-authoritative.

10. ROUND SYSTEM

Implement:

round_start
word_selection
drawing
guessing
round_end
answer_reveal
score_update
next_turn
next_round

Each player should become the drawer in sequence.

After the configured number of rounds:

finish the game

show final leaderboard

show winner

show scores

11. DISCONNECT / RECONNECT

Handle:

player disconnect

player reconnect

drawer disconnect

host disconnect

If the drawer disconnects:

safely handle the current round

prevent the room from getting stuck

continue the game

Do not allow disconnected clients to corrupt the game state.

12. SECURITY / ANTI-CHEAT

Implement basic game security.

Important:

secret answer must never be sent to non-drawers

only drawer can draw

only server can award points

only drawer can choose the secret word

verify room membership

validate realtime actions

rate-limit chat where practical

13. DATABASE

Use Supabase/PostgreSQL.

Create a clean architecture for:

rooms

players

games

rounds

words or imported word data

scores

chat messages

drawing state/events

Choose the most appropriate way to store the imported JSON dataset.

The JSON dataset should be easy to update later without requiring a complete rewrite of the application.

14. MOBILE

Make everything responsive.

On mobile:

canvas must support touch drawing

player list should collapse into a compact component

chat should remain usable

controls should be touch-friendly

layout should reorganize rather than simply shrink

15. UI LANGUAGE

All visible interface text should be Uzbek.

Examples:

"Xona yaratish"
"Xonaga qo‘shilish"
"Ismingizni kiriting"
"O‘yin boshlandi"
"So‘zni tanlang"
"Siz chizyapsiz"
"Topdingiz!"
"Vaqt tugadi!"
"To‘g‘ri javob"
"G‘olib"

16. CODE ARCHITECTURE

Use clean modular TypeScript architecture.

Separate:

UI

game logic

realtime logic

database services

word service

scoring

room management

Do not place the entire application in one component.

Use reusable hooks and components.

17. PERFORMANCE

Optimize realtime drawing.

Do not make unnecessary database writes for every mouse movement.

Use realtime events for transient drawing activity where appropriate.

Persist only the data that actually needs persistence.

18. IMPLEMENTATION ORDER

Build in this order:

Read and integrate my JSON dataset

Database architecture

Room creation

Room joining

Lobby

Realtime player synchronization

Game state machine

Word selection from JSON

Drawing canvas

Realtime drawing

Guessing/chat

Correct answer detection

Scoring

Round transitions

Final leaderboard

Reconnect handling

Mobile optimization

UI polish

At every stage, keep the existing application functional.

VERY IMPORTANT

Do NOT create mock multiplayer functionality.

Do NOT use fake/static player data.

Do NOT generate a replacement word dataset.

Use the JSON file I attach as the actual word source.

The final result should be a real playable Uzbek multiplayer drawing game that can be tested by opening the game from multiple browsers/devices and joining the same room.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://chiz-va-top.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/943d63d4-e36f-4f07-99bb-bb5aa28d3048).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

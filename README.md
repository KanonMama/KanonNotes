# KanonNotes

**KanonNotes** is a small SillyTavern utility extension with two local tools:

- a private local notepad;
- a character dossier viewer.

It does not parse messages, does not inject prompts, does not send notes to the model, and does not touch chat output.

Just two draggable buttons. Click, write, read, collapse. Done.

---

## Features

- Floating draggable UI.
- Local per-chat notes.
- Character dossier viewer from the current character description.
- Collapsed mode with two small buttons.
- Neutral semi-transparent style.
- No prompt injection.
- No token usage from notes.
- No XML.
- No message rendering.

---

## Installation

Download or clone this repository into your SillyTavern third-party extensions folder:

`SillyTavern/public/scripts/extensions/third-party/KanonNotes`

Then:

1. Restart SillyTavern or reload the page.
2. Open **Extensions**.
3. Enable **KanonNotes**.
4. Use the floating buttons.

---

## Notes

The Notes panel is local-only.
Notes are stored in browser `localStorage` per chat.
They are not sent to the model and do not consume tokens.

---

## Dossier

The Dossier panel displays the current character description from SillyTavern.
If no character description is found, the panel shows an empty-state message.

---

## Storage

KanonNotes stores:

- enabled/disabled state;
- current panel mode;
- panel position;
- notes per chat.

Clearing browser storage may remove saved notes.


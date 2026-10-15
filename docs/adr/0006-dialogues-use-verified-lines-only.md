# 0006: Role-play dialogues only use verified lines

- Status: accepted
- Date: 2026-10-15

## Context
Role-plays teach whole conversations, so a wrong or foreign-dialect line would be learned as a unit. The sources only give question and answer pairs for a few situations (greetings, name, speaking Pulaar, where you are going).

## Decision
Dialogues are content files whose turns reference existing item ids. The validator requires every line to exist and be `verified`, requires distractors on the learner's turns, and rejects a distractor equal to the answer. Dialogues only cover situations the sources support.

## Consequences
- No market or host-meal role-plays yet; they need more verified material.
- A dialogue can't reference an item before it is confirmed, so review work unblocks new dialogues.
- Distractors are chosen by hand to be clearly wrong replies.

# 0004: Local Leitner-style spaced review

- Status: accepted
- Date: 2026-10-14

## Context
There are about six weeks before the trip. The learner wants flashcards with spaced repetition, lessons and quizzes, with no backend.

## Decision
Use six Leitner boxes with fixed gaps (0, 1, 2, 4, 7, 14 days), stored per item in `localStorage`. A wrong answer drops the card to box 0, due today. Quiz answers grade cards too.

## Consequences
- Simple and predictable; no scheduling service needed.
- Less adaptive than SM-2-style algorithms; revisit if the intervals feel wrong.

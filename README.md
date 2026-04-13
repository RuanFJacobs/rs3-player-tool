# RS3 Player Tool

A RuneScape 3 player dashboard built with JavaScript and Express.

This app lets users search for a player and view useful account information such as skill stats, activity, quests, player comparisons, training planning, and rankings.

## Features

- Player summary view
  - Search for a RuneScape 3 player
  - View overall stats and skill data
  - Sort skills in different ways

- Compare players
  - Compare two players side by side
  - Compare total level, total XP, combat level, and overall rank

- Training planner
  - View training-related skill milestone information
  - Plan progression based on selected skills

- Recent activity
  - View recent activity from the Adventurer's Log

- Quests
  - View quest-related player data

- Player rankings
  - Rankings tab is included in the app
  - In the deployed version, the live rankings endpoint may be unavailable because the upstream RuneScape rankings page can block server-hosted requests
  - Rankings can still work when running the app locally

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js
- Express

## Project Structure

```text
.
├── public/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── milestones.js
│   └── icons/
├── server.js
├── package.json
├── package-lock.json
└── README.md
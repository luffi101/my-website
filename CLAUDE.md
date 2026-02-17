# Historical Figures Timeline - Project Guide

## Project Overview
A visual historical timeline for teaching history, with Firebase backend.
Live at: https://luffi101.github.io/my-website/timeline.html
Admin: https://luffi101.github.io/my-website/admin.html

## Naming Conventions
- Western names: Firstname Lastname (e.g. William Shakespeare)
- East Asian names: Lastname Firstname (Characters)
  (e.g. Tokugawa Ieyasu (徳川家康))
- Arabic names: Common name (Arabic script)
  (e.g. Saladin (صلاح الدين))
- Single names kept as-is (e.g. Fibonacci, Voltaire, Raphael)
- Epithets kept when commonly known that way
  (e.g. Ivan IV the Terrible, Richard I the Lionheart)

## Categories (with colors)
- Politics & Military → #EF4444 (red)
- Science → #3B82F6 (blue)
- Economy → #10B981 (green)
- Visual Arts → #EC4899 (pink)
- Music → #F97316 (orange)
- Literature → #FBBF24 (yellow)
- Philosophy → #8B5CF6 (purple)
- Religion → #F59E0B (amber)
- Exploration & Discovery → #14B8A6 (teal)

## Regions
Europe, East Asia, Middle East, North America, South America,
Africa, South Asia, Central Asia, Australia

## CSV Data Format
name, dateOfBirth, dateOfDeath, nationality, description, region, groups, imageURL

- dateOfBirth / dateOfDeath: YYYY-MM-DD format
- Use YYYY-01-01 when only year is known
- dateOfDeath can be empty for living figures
- groups = category name (single category per figure)
- imageURL = empty for now

## Data Management Workflow
1. Master data file: /data/historical_figures_master.csv
2. When adding new figures:
   - Check master CSV to avoid duplicates
   - Add new entries to a separate import-only CSV
   - Import to Firebase via admin.html
   - Append new entries to master CSV
   - Git commit both files
3. NEVER open CSV files in Excel (corrupts Asian characters)
   Always use VS Code or Notepad

## Key Files
- timeline.html → Main timeline viewer
- admin.html → Data management interface
- timeline-enhanced.js → Core timeline logic
- styles.css → Design system
- old_timeline.html → Original version backup
- data/historical_figures_master.csv → Master data file

## Design System
- Background: #faf9f6 (warm cream)
- Primary: #3B82F6
- Font sizes: 16px buttons, 14px labels
- Min button height: 34px
- Max viewport span: 800 years
- Min viewport span: 150 years

## Git Workflow
- Main branch: main (or master)
- Always commit after significant changes
- Commit message format: "Feature: description" or "Fix: description"

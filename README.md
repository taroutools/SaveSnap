# SaveSnap

SaveSnap is an After Effects ScriptUI tool that saves the current composition frame as a PNG. It can run as a floating palette or as a dockable panel.

## Installation

1. Copy SaveSnap.jsx to the After Effects ScriptUI Panels folder.  
   Example: C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\Scripts\ScriptUI Panels
2. Restart After Effects.
3. Open the panel from Window > SaveSnap.

## Usage

1. Open the composition and move to the frame you want to export.
2. Configure the panel:
   - **Resolution** – Choose the export resolution (Full, Half, etc.).
   - **Naming** – Select a filename template. The custom template accepts ${compName}, ${frame}, and ${tc}.
   - **Export to** – Choose the output folder (use the folder button to browse).
   - **Auto-close after export** – Close the palette automatically after a successful export (panel mode hides instead of closing).
3. Press **Export** to save the PNG. Use **Cancel** to close (or hide) the UI.

## Notes

- Preferences (resolution, naming, path, auto-close) are stored via pp.settings and persist between sessions.
- Each export is wrapped in an Undo group; you can revert with Ctrl/Cmd + Z.
- Controls expand when you resize the palette or docked panel.

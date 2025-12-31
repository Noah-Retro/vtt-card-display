# VTT Card Display

Obsidian plugin to display game cards and project them to a second monitor for tabletop RPG sessions.

## Features

- **Note-based cards** — Store cards as markdown notes with embedded images (`![[image.png]]`)
- **Player/DM sections** — Notes can have `# Player Infos` and `# DM Info` sections
- **Selective display** — DM Info is never shown; Player Infos can be toggled on/off
- **Image projection** — Direct image file support (PNG, JPG, SVG, etc.)
- **Map projection** — Project map images or rendered markdown notes
- **Statblock projection** — Render and project statblocks from notes
- **Rotation** — Rotate images 90°/180°/270° with automatic centering
- **Multi-monitor support** — Move the popout window to a second monitor for player display

## Quick Start

1. **Create note-based cards** with embedded images and optional Player/DM sections
2. **Register notes** in settings (from any folder in your vault)
3. Open the command palette and run **Open Cards Popout**
4. Use **Project registered item...** to project cards

## Note Structure

Cards and maps can be stored as markdown notes with this structure:

```markdown
![[card-image.png]]

# Player Infos
Information visible to players (when enabled in settings)

# DM Info
Secret information - never shown in popout
```

### Sections

- **Main content** (before any header): Always shown - typically the card image
- **Close Popout:** Schließt das Popout.
**VTT Card Display — Benutzerhandbuch (kurz)**

Zweck: Bilder, Karten und Videos aus deiner Obsidian-Vault auf einen zweiten Bildschirm oder in ein Popout-Fenster projizieren. Unterstützt Grid, Fog-of-War, Video-Playback, Thumbnails und einfache Bedienung.

Kurzanleitung
- Lege Karten/Bilder/Videos in einem Ordner (z. B. `Cards/`) ab.
- Öffne das Plugin via Ribbon-Icon oder Command Palette: `Open Cards Popout`.
- Im Popout kannst du Zoomen, Pannen, Rotieren, Grid und Fog verwenden.

Wichtige Funktionen
- Projektieren von Bildern, Karten, Videos und gerendertem Markdown-Content.
- Grid-Overlay mit konfigurierbarer Größe und Opazität.
- Fog-of-War mit Pinsel zum Freilegen (Freilegungen werden in Bild-Koordinaten behandelt, sodass sie beim Verschieben/Zoomen/Rotieren am Bild haften).
- Video-Thumbnails: Thumbnails werden für Videos erzeugt und im Vault-Root unter `_vtt_thumbnails/` gecached.
- Blob-URL-Unterstützung: Dateien werden vor dem Senden an externe Popouts in `blob:`-URLs oder Data-URLs umgewandelt, um Ladeprobleme (z. B. Adblocker) zu vermeiden.

Wichtige Commands (übersicht)
- `Open Cards Popout` — Popout öffnen/fokussieren
- `Close Popout` — Popout schließen
- `Project registered item...` — Aus Registrierten Items wählen und projizieren
- `Project current file (rendered)` — Aktuelle gerenderte Datei projizieren
- `Project first image in current file` — Erstes Bild aus aktueller Datei projizieren
- `Next Card` / `Previous Card` — Durch Items navigieren

Popout-Steuerung (Kurz)
- Zoom: Mausrad oder + / -
- Pan: Ziehen mit Maus
- Rotation: 90°-Schritte oder Reset
- Grid: Ein-/Aus, Größe & Farbe einstellbar
- Fog: Pinselgröße einstellen, Reset/Reveal All

Thumbnails & Aufräumen
- Video-Thumbnails werden unter `_vtt_thumbnails/` gespeichert.
- Wenn du ein Video löschst, versucht das Plugin, das zugehörige Thumbnail zu entfernen.

Fehlerbehebung
- `ERR_BLOCKED_BY_CLIENT` in Popout-Konsole → oft Adblocker/Extension: whiteliste oder deaktiviere die Erweiterung.
- Schwarzer Bildschirm / nichts sichtbar → Plugin neu laden und Popout neu öffnen; Popout-Konsole prüfen.
- Thumbnails fehlen → Prüfe `_vtt_thumbnails/` und Schreibrechte in der Vault.

Developer / Build
- Im Plugin-Ordner:
```bash
npm install
npm run build
```
- `src/main.ts` enthält die Plugin-Logik (Popout-Kommunikation, Datei-Konvertierung, Thumbnail-Logik).
- `src/popout-html.ts` erstellt das Popout-HTML (Rendering, Grid, Fog-Logik).

Weiteres
- Feature-Ideen: Playlist/Queue, Remote-Control, Persistente Fog-States, Hotkeys.
- Fehler/Feature-Requests: Issue mit Popout-Logs (Developer Console) und kurzer Beschreibung anhängen.

------

Wenn du willst, kann ich jetzt noch:
- die README ins Englische übersetzen, oder
- gezielt die `Commands`-Liste anhand der tatsächlichen `src/main.ts`-Commands abgleichen und anschließend nur existierende Commands auflisten.
Sag kurz, was du bevorzugst.
- **Map** — Select from the Maps folder

- **Statblock** — Path to a note containing a statblock

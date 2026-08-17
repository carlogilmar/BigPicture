# Sprint 66 — Voice notes per todo list

An audio note recorded per todo list, on-demand — "voice memos for your day",
the audio sibling of the Sprint 42 camera check-ins. The whole thing is a
near-1:1 reuse of the check-in architecture.

## Why it was cheap

The check-in scaffolding maps piece-for-piece onto audio, and audio is actually
simpler: `MediaRecorder` hands back a finished, compressed blob, so there's no
encoding library (the GIFs needed `gifenc`).

| Check-in (GIF) | Voice note (audio) |
|---|---|
| `getUserMedia({ video })` → canvas → `gifenc` | `getUserMedia({ audio })` → `MediaRecorder` blob |
| `save_image(bytes, "gif")` | `save_image(bytes, "m4a")` (same command — it just writes bytes) |
| `checkins(id, list_id, path, created_at)` | `voice_notes(… + duration_ms)` |
| `<img src={checkinSrc}>` | `<audio controls src={voiceNoteSrc}>` |

## Capture — `src/lib/voicenote.ts`

`startVoiceRecording()` opens the mic and returns a `VoiceRecorder`
(`{ label, stop(), cancel() }`):

- **Container feature-detection.** WKWebView produces `audio/mp4` (AAC), Chromium
  `webm/opus` — `MediaRecorder.isTypeSupported` picks the first supported of
  `audio/mp4` (→ `m4a`), `audio/webm;codecs=opus`, `audio/webm`,
  `audio/ogg;codecs=opus`; empty mime lets the browser choose. The chosen `ext`
  is what the file is saved as.
- `stop()` resolves `{ bytes, ext, durationMs }` from the recorded chunks (via
  `blob.arrayBuffer()`); `durationMs` is wall-clock from `start` to `stop`.
- `label` is the active track's device name (`getAudioTracks()[0].label`) — note
  browsers **hide device labels until mic permission is granted**, so it's empty
  on the very first prompt and populated thereafter.
- Both `stop()` and `cancel()` release the mic (`track.stop()`).

## Backend

- Migration `0029_voice_notes.sql` — `voice_notes(id, list_id → lists ON DELETE
  SET NULL, path, duration_ms, created_at)`. `list_id` NULLs on list deletion
  (the note survives); the audio file is removed from disk on row delete.
- `commands/voice_notes.rs` — `add_voice_note(path, list_id, duration_ms)` /
  `list_voice_notes()` / `delete_voice_note(id)` (mirrors `checkins.rs`; delete
  also `remove_file`s). 2 tests (roundtrip + survives-list-deletion).
- `models.rs` `VoiceNote` (camelCase serde). Registered in `lib.rs`. Bytes saved
  through the existing `save_image` command (files land in the images dir).

## Store — `app.svelte.ts`

`voiceNotes` state (loaded in `init`), plus recording state:
`recordingListId` (null = idle; drives the UI), `recordingMicLabel`,
`recordingStartedAt` (epoch ms for the elapsed timer), and a private
`voiceRecorder` handle. Actions: `startVoiceNote(listId)` (awaits the mic, then
flips `recordingListId`), `stopVoiceNote()` (stops → `save_image` →
`add_voice_note` → prepend), `cancelVoiceNote()`, `deleteVoiceNote(id)`. One
recording at a time. **No opt-in toggle** — recording is explicit consent
(unlike the camera's ambient auto-capture), and **multiple notes per list** are
allowed (each recording appends).

## UI — `ListView.svelte`

- Header: a **mic button** (next to the camera button). While recording *this*
  list it becomes a red **Stop 0:05** button (live timer); the mic is disabled
  while another list is recording.
- A **recording banner** under the header: pulse dot + live `m:ss` timer +
  `Recording · <mic label>` (falls back to "default mic") + "press Stop to save".
  The timer is a local `$effect` interval (250ms) counting from
  `app.recordingStartedAt`, self-cleaning on stop.
- A **player list** of the list's notes: native `<audio controls>` + duration +
  a delete button. Newest first. Hidden for the Backlog.

## Permission

`NSMicrophoneUsageDescription` added to `src-tauri/Info.plist` (alongside the
camera one) — macOS shows it on the first mic request.

## Not in v1 (possible follow-ups)

Waveform/scrubber beyond the native player; a max-duration cap; a "Voice notes"
gallery tab in ActivityView (v1 keeps them contextual to the list); transcription
(on-device whisper.cpp would keep the offline ethos but is a real project).

## Status

svelte-check 0/0, cargo check ✓, 2 new tests pass, build ✓. **Needs a live
`pnpm tauri dev` run** to verify the real WKWebView path: `MediaRecorder`
capture, the chosen container/extension, `<audio>` playback of the asset URL,
the mic-label population, and the macOS mic prompt — the same "untested without a
real device run" caveat the camera check-ins carry.

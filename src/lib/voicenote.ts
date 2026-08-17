// Voice note capture (Sprint 66). Records microphone audio via the webview's
// MediaRecorder and returns the encoded bytes on stop. Unlike the check-in GIF
// (which needs canvas frames + gifenc), MediaRecorder hands us a finished,
// compressed blob — no encoding library. The caller persists the bytes via
// save_image (it just writes bytes) and records a voice_notes row.
//
// WKWebView (Tauri's macOS webview) typically produces audio/mp4 (AAC) rather
// than Chrome's webm/opus, so we feature-detect the supported container and pick
// the matching extension.

export interface VoiceRecording {
  bytes: Uint8Array;
  ext: string;
  durationMs: number;
}

export interface VoiceRecorder {
  // The active microphone's device label (empty if the platform hides it).
  label: string;
  // Stop and resolve the encoded audio. Rejects if nothing was captured.
  stop(): Promise<VoiceRecording>;
  // Abort without producing a recording (releases the mic).
  cancel(): void;
}

// Container candidates in preference order. WKWebView → audio/mp4; Chromium →
// webm/opus. An empty `mime` lets the browser choose its default.
const CANDIDATES: { mime: string; ext: string }[] = [
  { mime: "audio/mp4", ext: "m4a" },
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
];

function pickContainer(): { mime: string; ext: string } {
  const supported =
    typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.isTypeSupported === "function";
  if (supported) {
    for (const c of CANDIDATES) {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    }
  }
  return { mime: "", ext: "webm" };
}

export async function startVoiceRecording(): Promise<VoiceRecorder> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone not available in this environment");
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Recording not supported in this environment");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const { mime, ext } = pickContainer();
  const rec = mime
    ? new MediaRecorder(stream, { mimeType: mime })
    : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  const startedAt = Date.now();
  const label = stream.getAudioTracks()[0]?.label ?? "";
  const release = () => stream.getTracks().forEach((t) => t.stop());
  rec.start();

  return {
    label,
    stop() {
      return new Promise<VoiceRecording>((resolve, reject) => {
        rec.onstop = async () => {
          try {
            const blob = new Blob(chunks, {
              type: rec.mimeType || mime || "audio/webm",
            });
            const bytes = new Uint8Array(await blob.arrayBuffer());
            release();
            resolve({ bytes, ext, durationMs: Math.max(0, Date.now() - startedAt) });
          } catch (err) {
            release();
            reject(err);
          }
        };
        try {
          rec.stop();
        } catch (err) {
          release();
          reject(err);
        }
      });
    },
    cancel() {
      try {
        rec.onstop = null;
        rec.stop();
      } catch {
        /* ignore */
      }
      release();
    },
  };
}

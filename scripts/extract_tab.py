#!/usr/bin/env python3
"""
Extract guitar tab from audio.

Modes:
  vocal  (default) — Demucs vocal separation → pYIN pitch tracking
                     Best for full song recordings; isolates the melody from the mix.
  guitar           — pYIN directly on the raw audio (no separation)
                     Best for clean guitar recordings with no heavy accompaniment.

Usage:
  python3 extract_tab.py <audio_path> [--mode vocal|guitar] [--bpm 120] [--no-quantize]
"""

import sys
import json
import argparse
import contextlib
from typing import Optional, Tuple, List, Dict, Any
import numpy as np

try:
    import librosa
except ImportError:
    sys.exit("librosa not installed — run: pip3 install librosa")

try:
    import torch
    import torchaudio
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
except ImportError:
    sys.exit("demucs not installed — run: pip3 install demucs")

try:
    import noisereduce as nr
    _NR_AVAILABLE = True
except ImportError:
    _NR_AVAILABLE = False

# ── Constants ────────────────────────────────────────────────────────────────

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

OPEN_HZ = {
    1: librosa.note_to_hz('E4'),   # 329.6
    2: librosa.note_to_hz('B3'),   # 246.9
    3: librosa.note_to_hz('G3'),   # 196.0
    4: librosa.note_to_hz('D3'),   # 146.8
    5: librosa.note_to_hz('A2'),   # 110.0
    6: librosa.note_to_hz('E2'),   #  82.4
}

RANGE_PREFS = [
    (300,  900, [1, 2, 3]),
    (180,  400, [2, 3, 4]),
    ( 95,  250, [5, 4, 3]),
    (  0,  120, [6, 5]),
]

HOP_LENGTH   = 256
FRAME_LENGTH = 2048
FMIN         = 80.0
FMAX         = 1100.0

PITCH_JUMP_ST   = 0.6
MIN_NOTE_FRAMES = 6
MIN_GAP_S       = 0.07


# ── Helpers ──────────────────────────────────────────────────────────────────

def freq_to_midi(freq: float) -> int:
    return round(12 * np.log2(freq / 440.0) + 69)


def midi_to_note_name(midi: int) -> str:
    return f"{NOTE_NAMES[midi % 12]}{midi // 12 - 1}"


def freq_to_guitar_pos(freq: float, max_fret: int = 12) -> Optional[Tuple[int, int]]:
    for lo, hi, strings in RANGE_PREFS:
        if lo <= freq < hi:
            for s in strings:
                fret = round(12 * np.log2(freq / OPEN_HZ[s]))
                if 0 <= fret <= max_fret:
                    return s, fret
    best, best_fret = None, max_fret + 1
    for s in range(1, 7):
        fret = round(12 * np.log2(freq / OPEN_HZ[s]))
        if 0 <= fret <= max_fret and fret < best_fret:
            best_fret = fret
            best = (s, fret)
    return best


def quantize_time(t: float, bpm: float, subdivisions: int = 16) -> float:
    grid = (60.0 / bpm) / (subdivisions / 4)
    return round(t / grid) * grid


def segment_pitch_contour(
    f0: np.ndarray,
    voiced: np.ndarray,
    times: np.ndarray,
) -> List[Dict[str, Any]]:
    segments = []
    i, n = 0, len(f0)
    while i < n:
        if not voiced[i] or np.isnan(f0[i]):
            i += 1
            continue
        start_i = i
        freqs = [f0[i]]
        i += 1
        while i < n and voiced[i] and not np.isnan(f0[i]):
            ref = float(np.median(freqs[-8:]))
            if ref > 0 and abs(12 * np.log2(f0[i] / ref)) > PITCH_JUMP_ST:
                break
            freqs.append(f0[i])
            i += 1
        if len(freqs) < MIN_NOTE_FRAMES:
            continue
        freq     = float(np.median(freqs))
        t_start  = float(times[start_i])
        t_end    = float(times[min(i, n - 1)])
        duration = t_end - t_start
        if duration < MIN_GAP_S:
            continue
        segments.append({'freq': freq, 'time': t_start, 'duration': duration})
    return segments


# ── Audio loading ─────────────────────────────────────────────────────────────

def load_vocal_stem(audio_path: str) -> np.ndarray:
    """Separate vocals with Demucs and return mono vocal at 22050 Hz."""
    print("Loading Demucs model…", file=sys.stderr)
    # htdemucs_6s explicitly separates guitar + piano, leaving a cleaner vocal stem
    with contextlib.redirect_stdout(sys.stderr):
        try:
            model = get_model('htdemucs_6s')
        except Exception:
            model = get_model('htdemucs')
    model.eval()

    wav, sr = torchaudio.load(str(audio_path))
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)
    elif wav.shape[0] > 2:
        wav = wav[:2]

    if sr != model.samplerate:
        wav = torchaudio.functional.resample(wav, sr, model.samplerate)

    ref = wav.mean(0)
    wav = (wav - ref.mean()) / (ref.std() + 1e-8)

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Separating vocals ({device})…", file=sys.stderr)
    with torch.no_grad():
        with contextlib.redirect_stdout(sys.stderr):
            sources = apply_model(model, wav.unsqueeze(0), device=device)[0]

    vocals_idx  = list(model.sources).index('vocals')
    vocals_mono = sources[vocals_idx].mean(0).numpy()

    if model.samplerate != 22050:
        vocals_mono = librosa.resample(vocals_mono, orig_sr=model.samplerate, target_sr=22050)

    # Spectral noise gate — reduces instrumental bleed from Demucs
    if _NR_AVAILABLE:
        print("Reducing noise in vocal stem…", file=sys.stderr)
        vocals_mono = nr.reduce_noise(
            y=vocals_mono,
            sr=22050,
            stationary=False,
            prop_decrease=0.92,
        )

    return vocals_mono


def load_guitar_audio(audio_path: str) -> np.ndarray:
    """Load raw audio at 22050 Hz for direct pitch tracking."""
    print(f"Loading {audio_path}…", file=sys.stderr)
    y, _ = librosa.load(audio_path, sr=22050, mono=True)
    return y


# ── Main extraction ──────────────────────────────────────────────────────────

def extract_tab(
    audio_path: str,
    mode: str = 'vocal',
    bpm: Optional[float] = None,
    quantize: bool = True,
    max_fret: int = 12,
    vocal_output: Optional[str] = None,
) -> List[Dict[str, Any]]:

    # ── 1. BPM from full mix ─────────────────────────────────────────────────
    y_full, sr_full = librosa.load(audio_path, sr=22050, mono=True)
    if bpm is None:
        tempo, _ = librosa.beat.beat_track(y=y_full, sr=sr_full)
        bpm = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
        print(f"Auto-detected BPM: {bpm:.1f}", file=sys.stderr)
    else:
        print(f"Using BPM: {bpm}", file=sys.stderr)

    # ── 2. Get the audio to pitch-track ──────────────────────────────────────
    if mode == 'vocal-stem':
        # Input is already a clean vocal stem — skip Demucs, run pYIN directly
        print(f"Loading pre-separated vocal stem {audio_path}…", file=sys.stderr)
        audio = load_guitar_audio(audio_path)
        fmin, fmax = 100.0, 900.0
    elif mode == 'vocal':
        audio = load_vocal_stem(audio_path)
        fmin, fmax = 100.0, 900.0
        if vocal_output:
            try:
                import soundfile as sf
                sf.write(vocal_output, audio, 22050)
                print(f"Saved vocal stem → {vocal_output}", file=sys.stderr)
            except Exception as e:
                print(f"Warning: could not save vocal stem: {e}", file=sys.stderr)
    else:
        audio = load_guitar_audio(audio_path)
        fmin, fmax = FMIN, FMAX

    # ── 3. pYIN pitch tracking ────────────────────────────────────────────────
    print(f"pYIN pitch tracking (mode={mode})…", file=sys.stderr)
    f0, voiced_flag, _ = librosa.pyin(
        audio,
        fmin=fmin,
        fmax=fmax,
        sr=22050,
        hop_length=HOP_LENGTH,
        frame_length=FRAME_LENGTH,
    )
    frame_times = librosa.times_like(f0, sr=22050, hop_length=HOP_LENGTH)
    print(f"Voiced frames: {voiced_flag.sum()} / {len(f0)}", file=sys.stderr)

    # ── 4. Note segmentation ─────────────────────────────────────────────────
    segments = segment_pitch_contour(f0, voiced_flag, frame_times)
    print(f"Segments: {len(segments)}", file=sys.stderr)

    # ── 5. Map to guitar string/fret ─────────────────────────────────────────
    notes: List[Dict[str, Any]] = []
    for seg in segments:
        pos = freq_to_guitar_pos(seg['freq'], max_fret=max_fret)
        if not pos:
            continue
        string_num, fret = pos
        midi  = freq_to_midi(seg['freq'])
        onset = seg['time']
        if quantize and bpm:
            onset = quantize_time(onset, bpm)
        notes.append({
            'time':     round(onset, 3),
            'string':   string_num,
            'fret':     fret,
            'note':     midi_to_note_name(midi),
            'midi':     midi,
            'duration': round(min(max(seg['duration'], 0.1), 2.0), 3),
        })

    # ── 6. Deduplicate, sort ─────────────────────────────────────────────────
    seen: set = set()
    unique = []
    for n in notes:
        if n['time'] not in seen:
            seen.add(n['time'])
            unique.append(n)
    unique.sort(key=lambda n: n['time'])
    print(f"Extracted {len(unique)} notes", file=sys.stderr)
    return unique


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('audio_path')
    parser.add_argument('--mode',         choices=['vocal', 'guitar', 'vocal-stem'], default='vocal')
    parser.add_argument('--bpm',          type=float, help='Override auto-detected BPM')
    parser.add_argument('--no-quantize',  action='store_true')
    parser.add_argument('--max-fret',     type=int,   default=12)
    parser.add_argument('--vocal-output', help='Save Demucs vocal stem WAV to this path')
    parser.add_argument('--output',       help='Write JSON to file instead of stdout')
    args = parser.parse_args()

    result = extract_tab(
        args.audio_path,
        mode=args.mode,
        bpm=args.bpm,
        quantize=not args.no_quantize,
        max_fret=args.max_fret,
        vocal_output=args.vocal_output,
    )

    out = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, 'w') as f:
            f.write(out)
        print(f"Wrote {len(result)} notes to {args.output}", file=sys.stderr)
    else:
        print(out)

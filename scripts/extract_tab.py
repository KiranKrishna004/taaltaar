#!/usr/bin/env python3
"""
Extract guitar tab timing from an audio file using librosa.

Pipeline:
  1. Load EQ-filtered guitar audio (cached from /api/guitar-audio)
  2. Onset detection  — finds when each note starts
  3. YIN pitch detection — finds the fundamental frequency per note
  4. Map frequency → guitar string + fret (standard tuning, frets 0-12)
  5. BPM quantization — snap onset times to the nearest 16th-note grid
  6. Output JSON array of {time, string, fret, note, duration}

Usage:
  python3 extract_tab.py <audio_path> [--bpm 80] [--output out.json] [--no-quantize]
"""

import sys
import json
import argparse
from typing import Optional, Tuple, List, Dict, Any
import numpy as np

try:
    import librosa
except ImportError:
    sys.exit("librosa not installed — run: pip3 install librosa")

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Standard tuning open-string frequencies (Hz), string 1 = high e, 6 = low E
OPEN_HZ = {
    1: librosa.note_to_hz('E4'),   # 329.6
    2: librosa.note_to_hz('B3'),   # 246.9
    3: librosa.note_to_hz('G3'),   # 196.0
    4: librosa.note_to_hz('D3'),   # 146.8
    5: librosa.note_to_hz('A2'),   # 110.0
    6: librosa.note_to_hz('E2'),   #  82.4
}

# For each pitch range, which string to prefer (keeps melody on one string).
# Ranges chosen so mid-register melodies land on string 5 (A), bass on string 6.
RANGE_PREFS = [
    (300,  900, [1, 2, 3]),   # high → strings 1-2-3
    (180,  400, [2, 3, 4]),   # mid-high → strings 2-3-4
    ( 95,  250, [5, 4, 3]),   # mid (typical melody range) → string 5 first
    (  0,  120, [6, 5]),      # bass → string 6
]


def hz_to_note_name(freq: float) -> Optional[Tuple[str, int]]:
    """Return (note_name, midi_num) for a given frequency, or None if out of range."""
    if freq <= 0:
        return None
    midi = round(12 * np.log2(freq / 440.0) + 69)
    if not (0 <= midi <= 127):
        return None
    name = NOTE_NAMES[midi % 12]
    octave = midi // 12 - 1
    return f"{name}{octave}", midi


def freq_to_guitar_pos(freq: float, max_fret: int = 12) -> Optional[Tuple[int, int]]:
    """
    Return (string_num, fret) for freq using standard tuning.
    Chooses the string based on RANGE_PREFS, then picks the lowest valid fret.
    Returns None if no valid position found.
    """
    for lo, hi, strings in RANGE_PREFS:
        if lo <= freq < hi:
            for s in strings:
                semitones = 12 * np.log2(freq / OPEN_HZ[s])
                fret = round(semitones)
                if 0 <= fret <= max_fret:
                    return s, fret
    # Fallback: try all strings
    best = None
    best_fret = max_fret + 1
    for s in range(1, 7):
        semitones = 12 * np.log2(freq / OPEN_HZ[s])
        fret = round(semitones)
        if 0 <= fret <= max_fret and fret < best_fret:
            best_fret = fret
            best = (s, fret)
    return best


def quantize_time(t: float, bpm: float, subdivisions: int = 16) -> float:
    """Snap t to the nearest grid point at bpm / subdivisions."""
    grid = (60.0 / bpm) / (subdivisions / 4)   # e.g. 16th-note grid
    return round(t / grid) * grid


def extract_tab(
    audio_path: str,
    bpm: Optional[float] = None,
    quantize: bool = True,
    min_gap: float = 0.07,
    max_fret: int = 12,
) -> List[Dict[str, Any]]:
    """
    Main entry point. Returns list of tab note dicts sorted by time.
    """
    print(f"Loading {audio_path} …", file=sys.stderr)
    y, sr = librosa.load(audio_path, sr=22050, mono=True)

    # ── Onset detection ──────────────────────────────────────────────────────
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=onset_env,
        sr=sr,
        hop_length=256,
        units='frames',
        backtrack=True,      # pull onset back to energy start
        pre_max=3,
        post_max=3,
        pre_avg=5,
        post_avg=5,
        delta=0.25,
        wait=int(sr * min_gap / 256),  # minimum gap in frames
    )
    raw_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=256)
    print(f"Raw onsets: {len(raw_times)}", file=sys.stderr)

    # Filter onsets that are too close together
    times: list[float] = []
    for t in raw_times:
        if not times or t - times[-1] >= min_gap:
            times.append(float(t))

    print(f"Filtered onsets: {len(times)}", file=sys.stderr)

    # ── Pitch detection per onset ─────────────────────────────────────────────
    notes: list[dict] = []

    for i, t in enumerate(times):
        next_t = times[i + 1] if i + 1 < len(times) else t + 0.6
        window = min(next_t - t, 0.35)   # look at up to 350ms of audio

        s0 = int(t * sr)
        s1 = min(int((t + window) * sr), len(y))
        if s1 - s0 < 512:
            continue

        segment = y[s0:s1]

        # YIN pitch detection
        f0 = librosa.yin(
            segment,
            fmin=float(OPEN_HZ[6]) * 0.9,   # ~74 Hz lower bound
            fmax=float(OPEN_HZ[1]) * 2.0,    # ~660 Hz upper bound
            sr=sr,
            frame_length=min(2048, len(segment)),
        )

        # Use the median of the voiced portion (ignore zeros / unvoiced)
        voiced = f0[(f0 > 60) & (f0 < 700)]
        if len(voiced) == 0:
            continue

        freq = float(np.median(voiced))
        result = hz_to_note_name(freq)
        if not result:
            continue
        note_name, _ = result

        pos = freq_to_guitar_pos(freq, max_fret=max_fret)
        if not pos:
            continue
        string_num, fret = pos

        onset_time = float(t)
        if quantize and bpm:
            onset_time = quantize_time(onset_time, bpm)

        duration = round(float(next_t - t), 3)
        duration = min(max(duration, 0.1), 2.0)

        notes.append({
            'time':     round(onset_time, 3),
            'string':   string_num,
            'fret':     fret,
            'note':     note_name,
            'duration': duration,
        })

    # Deduplicate consecutive notes at the same quantized time
    seen: set[float] = set()
    unique: list[dict] = []
    for n in notes:
        if n['time'] not in seen:
            seen.add(n['time'])
            unique.append(n)

    unique.sort(key=lambda n: n['time'])
    print(f"Extracted {len(unique)} notes", file=sys.stderr)
    return unique


# ── CLI entry point ───────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Extract guitar tab timing from audio')
    parser.add_argument('audio_path', help='Path to MP3/WAV audio file')
    parser.add_argument('--bpm',          type=float, help='Song BPM for beat quantization')
    parser.add_argument('--no-quantize',  action='store_true', help='Disable beat quantization')
    parser.add_argument('--min-gap',      type=float, default=0.07, help='Min seconds between notes')
    parser.add_argument('--max-fret',     type=int,   default=12,   help='Max fret to use (default 12)')
    parser.add_argument('--output',       help='Write JSON to this file instead of stdout')
    args = parser.parse_args()

    result = extract_tab(
        args.audio_path,
        bpm=args.bpm,
        quantize=not args.no_quantize,
        min_gap=args.min_gap,
        max_fret=args.max_fret,
    )

    out = json.dumps(result, indent=2)
    if args.output:
        with open(args.output, 'w') as f:
            f.write(out)
        print(f"Wrote {len(result)} notes to {args.output}", file=sys.stderr)
    else:
        print(out)

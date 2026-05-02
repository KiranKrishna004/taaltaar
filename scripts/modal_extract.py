"""
Modal worker for TaalTaar melody extraction.

Deploy:
  modal deploy scripts/modal_extract.py

After first deploy, copy the printed webhook URL to .env.local:
  MODAL_WEBHOOK_URL=https://...modal.run

Create the Modal secret once:
  modal secret create taaltaar \
    SUPABASE_URL=... \
    SUPABASE_SERVICE_ROLE_KEY=... \
    MODAL_WEBHOOK_SECRET=<random string>

Add the same MODAL_WEBHOOK_SECRET to .env.local.
"""

import os
from pathlib import Path
from typing import Optional
import modal

app = modal.App("taaltaar-extract")

# Persistent volume — Demucs model weights download once, stay cached forever
model_cache = modal.Volume.from_name("taaltaar-demucs-cache", create_if_missing=True)

_scripts_dir = Path(__file__).parent

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(["libsndfile1", "ffmpeg"])
    .pip_install(
        ["torch", "torchaudio"],
        extra_index_url="https://download.pytorch.org/whl/cu118",
    )
    .pip_install(["demucs", "librosa", "noisereduce", "soundfile", "supabase", "httpx"])
    # Bake extract_tab.py into the image at build time
    .add_local_file(str(_scripts_dir / "extract_tab.py"), "/app/extract_tab.py")
)


@app.function(
    image=image,
    gpu="T4",
    volumes={"/root/.cache": model_cache},
    timeout=300,
    secrets=[modal.Secret.from_name("taaltaar")],
)
def run_extraction(submission_id: str, audio_url: str, vocal_url: Optional[str], mode: str) -> None:
    import sys
    import tempfile
    import httpx
    from supabase import create_client

    sys.path.insert(0, "/app")
    from extract_tab import extract_tab  # type: ignore

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    def set_status(status: str, error: Optional[str] = None) -> None:
        update: dict = {"extraction_status": status}
        if error is not None:
            update["extraction_error"] = error
        sb.table("audio_submissions").update(update).eq("id", submission_id).execute()

    try:
        # Choose source + mode
        if mode == "vocal" and vocal_url:
            src_url     = vocal_url
            actual_mode = "vocal-stem"
        else:
            src_url     = audio_url
            actual_mode = mode

        ext = src_url.split(".")[-1].split("?")[0] or "mp3"

        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = f"{tmpdir}/audio.{ext}"
            vocal_out  = f"{tmpdir}/vocal.wav" if (mode == "vocal" and not vocal_url) else None

            print(f"Downloading {src_url} …", flush=True)
            with httpx.stream("GET", src_url, follow_redirects=True, timeout=60) as r:
                r.raise_for_status()
                with open(audio_path, "wb") as f:
                    for chunk in r.iter_bytes(65536):
                        f.write(chunk)

            tab_data = extract_tab(audio_path, mode=actual_mode, vocal_output=vocal_out)

            new_vocal_url = vocal_url
            if vocal_out:
                vocal_key = f"{submission_id}.wav"
                with open(vocal_out, "rb") as vf:
                    sb.storage.from_("vocals").upload(
                        vocal_key, vf.read(),
                        {"contentType": "audio/wav", "upsert": "true"},
                    )
                new_vocal_url = sb.storage.from_("vocals").get_public_url(vocal_key)

        sb.table("audio_submissions").update({
            "tab_data":          tab_data,
            "note_count":        len(tab_data),
            "extraction_mode":   mode,
            "vocal_url":         new_vocal_url,
            "extraction_status": "done",
            "extraction_error":  None,
        }).eq("id", submission_id).execute()

        print(f"Done — {len(tab_data)} notes", flush=True)

    except Exception as e:
        print(f"Extraction failed: {e}", flush=True)
        set_status("error", str(e)[:500])
        raise


@app.function(
    image=modal.Image.debian_slim(python_version="3.11").pip_install(["fastapi"]),
    secrets=[modal.Secret.from_name("taaltaar")],
)
@modal.fastapi_endpoint(method="POST")
def trigger(body: dict) -> dict:
    from fastapi import HTTPException

    expected = os.environ.get("MODAL_WEBHOOK_SECRET", "")
    if not expected or body.get("secret") != expected:
        raise HTTPException(status_code=401, detail="unauthorized")

    run_extraction.spawn(
        body["submission_id"],
        body["audio_url"],
        body.get("vocal_url"),
        body.get("mode", "vocal"),
    )
    return {"ok": True}

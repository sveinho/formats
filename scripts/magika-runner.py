import os
import json
import subprocess
from datetime import datetime

def run_magika_on_folder():
    raw_dir = "raw"
    output_log_path = "wiki/computations/text_check.md"
    
    if not os.path.exists(raw_dir) or not os.listdir(raw_dir):
        print("Ingen filer funnet i raw/-mappen.")
        return

    # Kjører Magika CLI i JSON-modus for maksimal detaljrikdom
    files = [os.path.join(raw_dir, f) for f in os.listdir(raw_dir) if os.path.isfile(os.path.join(raw_dir, f))]
    if not files:
        return
        
    cmd = ["magika", "--json"] + files
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("Feil under kjøring av Magika:", result.stderr)
        return

    magika_output = json.loads(result.stdout)
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Vi bygger et OKF v0.2 Attested Computation dokument som logg
    okf_content = f"""---
type: Attested Computation
title: Magika Batch File Identification
description: Chronological receipt of plain text structures verified by Google Magika.
runtime: python/magika
generated: {{ by: process:github-actions, at: {timestamp} }}
---
# Siste Kjøringsresultater (Receipt)

Følgende filer i `raw/` har blitt analysert mekanisk av Magika-modellen:

| Filnavn | Detektert Type | Konfidensscore | Gruppe |
| :--- | :--- | :--- | :--- |
"""

    for entry in magika_output:
        filename = os.path.basename(entry["path"])
        output = entry["output"]
        label = output["ct_label"]
        score = round(float(output["score"]), 4)
        group = output["group"]
        
        okf_content += f"| `{filename}` | **{label}** | {score} | {group} |\n"

    os.makedirs(os.path.dirname(output_log_path), exist_ok=True)
    with open(output_log_path, "w", encoding="utf-8") as f:
        f.write(okf_content)
    print("OKF-attesteringslogg oppdatert.")

if __name__ == "__main__":
    run_magika_on_folder()

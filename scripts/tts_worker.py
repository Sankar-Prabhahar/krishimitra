import argparse
import os
import subprocess
import sys

# CONFIGURATION - Update these paths to where your models are stored
# By default looks for a 'models/indic-tts' folder in the project root
MODELS_BASE_PATH = os.environ.get("INDIC_TTS_MODELS", os.path.join(os.path.dirname(__file__), "..", "models", "indic-tts"))

def synthesize(text, lang, out_path):
    lang_path = os.path.join(MODELS_BASE_PATH, lang)
    
    # Define paths according to AI4Bharat structure
    model_path = os.path.join(lang_path, "fastpitch", "best_model.pth")
    config_path = os.path.join(lang_path, "config.json")
    vocoder_path = os.path.join(lang_path, "hifigan", "best_model.pth")
    vocoder_config_path = os.path.join(lang_path, "hifigan", "config.json")

    # Check if model exists
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}", file=sys.stderr)
        return False

    # Build CLI Command for AI4Bharat Indic-TTS
    # python3 -m TTS.bin.synthesize --text <TEXT> \
    # --model_path <LANG>/fastpitch/best_model.pth \
    # --config_path <LANG>/config.json \
    # --vocoder_path <LANG>/hifigan/best_model.pth \
    # --vocoder_config_path <LANG>/hifigan/config.json \
    # --out_path <OUT_PATH>
    
    cmd = [
        sys.executable, "-m", "TTS.bin.synthesize",
        "--text", text,
        "--model_path", model_path,
        "--config_path", config_path,
        "--vocoder_path", vocoder_path,
        "--vocoder_config_path", vocoder_config_path,
        "--out_path", out_path
    ]

    try:
        # Run synthesis CLI
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Synthesis Error: {e.stderr}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Unexpected Error: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Indic-TTS Synthesis Worker")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--lang", required=True, help="Language model folder name")
    parser.add_argument("--out", required=True, help="Output wav file path")
    
    args = parser.parse_args()

    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    if synthesize(args.text, args.lang, args.out):
        sys.exit(0)
    else:
        sys.exit(1)

"""Run explicitly during processor setup; inference never downloads models."""
import argparse
import os
from pathlib import Path
from faster_whisper.utils import download_model

parser = argparse.ArgumentParser()
parser.add_argument('--model', default='small', choices=['tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en', 'medium', 'large-v3', 'turbo'])
parser.add_argument('--output', default=os.environ.get('WHISPER_MODEL_PATH'))
args = parser.parse_args()
if not args.output:
    parser.error('Supply --output or WHISPER_MODEL_PATH')
Path(args.output).mkdir(parents=True, exist_ok=True)
download_model(args.model, output_dir=args.output)
print('Whisper model installed. Run Save & test in your studio before generating lyrics.')

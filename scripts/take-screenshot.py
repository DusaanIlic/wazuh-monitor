#!/usr/bin/env python3
import argparse
import base64
import os
import shutil
import subprocess
import sys
import time

import requests


def capture_screenshot(output_path):
    if shutil.which('scrot'):
        cmd = ['scrot', '--overwrite', output_path]
    elif shutil.which('gnome-screenshot'):
        cmd = ['gnome-screenshot', '-f', output_path]
    else:
        print('Greška: nije pronađen ni scrot ni gnome-screenshot', file=sys.stderr)
        sys.exit(1)

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.exists(output_path):
        print(f'Greška pri pravljenju screenshot-a: {result.stderr}', file=sys.stderr)
        sys.exit(1)


def send_screenshot(backend_url, agent_id, image_path, timestamp):
    with open(image_path, 'rb') as f:
        image_b64 = base64.b64encode(f.read()).decode('utf-8')

    url = f'{backend_url.rstrip("/")}/api/screenshots/upload/{agent_id}'
    payload = {
        'agentId': agent_id,
        'image': image_b64,
        'timestamp': timestamp,
    }

    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    print(f'Screenshot uspešno poslat za agenta {agent_id}: {response.json()}')


def main():
    parser = argparse.ArgumentParser(description='Napravi screenshot i pošalji ga na wazuh-monitor backend')
    parser.add_argument('agent_id', help='ID agenta')
    parser.add_argument('backend_url', help='URL backend servera (npr. http://147.91.204.137:3001)')
    args = parser.parse_args()

    timestamp = int(time.time() * 1000)
    screenshot_path = f'/tmp/wazuh_screenshot_{timestamp}.png'

    try:
        capture_screenshot(screenshot_path)
        send_screenshot(args.backend_url, args.agent_id, screenshot_path, timestamp)
    except requests.RequestException as err:
        print(f'Greška pri slanju screenshot-a: {err}', file=sys.stderr)
        sys.exit(1)
    finally:
        if os.path.exists(screenshot_path):
            os.remove(screenshot_path)


if __name__ == '__main__':
    main()

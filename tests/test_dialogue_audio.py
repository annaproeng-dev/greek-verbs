"""Ensure recorded dialogue audio matches the text shipped with the app."""
import ast
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DialogueAudioTests(unittest.TestCase):
    def test_recordings_match_text_and_exist(self):
        data = (ROOT / 'data.js').read_text(encoding='utf-8')
        block = data.split('const SITUATIONS = [', 1)[1].split('\n];', 1)[0]
        dialogues = re.findall(r"\{cat:'([^']+)'[\s\S]*?full:(\[[^\]]+\])", block)
        code = (ROOT / 'app.js').read_text(encoding='utf-8')
        fingerprints = json.loads(re.search(r'const dialogueRecordings=(\{[^;]+\});', code).group(1))
        self.assertEqual(set(fingerprints), {cat for cat, _ in dialogues})
        for category, raw_lines in dialogues:
            fingerprint = 2166136261
            for char in '\n'.join(ast.literal_eval(raw_lines)):
                fingerprint = ((fingerprint ^ ord(char)) * 16777619) & 0xffffffff
            self.assertEqual(fingerprints[category], fingerprint, category)
            audio = ROOT / 'assets' / 'dialogues' / (category + '.mp3')
            self.assertGreater(audio.stat().st_size, 1024, category)
            with audio.open('rb') as stream:
                header = stream.read(3)
            self.assertTrue(header == b'ID3' or header[:1] == b'\xff', category)


if __name__ == '__main__':
    unittest.main()

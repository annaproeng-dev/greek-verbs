"""Check that every illustrated dialogue has a recording and explicit speaker roles."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def data_constant(name):
    source = (ROOT / 'data.js').read_text(encoding='utf-8')
    return json.JSONDecoder().raw_decode(source.split('const ' + name + ' = ', 1)[1])[0]


class DialogueAudioTests(unittest.TestCase):
    def test_all_dialogues_have_recordings_and_roles(self):
        speakers = data_constant('SITUATION_SPEAKERS')
        recordings = data_constant('SITUATION_RECORDINGS')
        self.assertEqual(len(recordings), 30)
        self.assertEqual(set(recordings), set(speakers))
        for dialogue_id, recording in recordings.items():
            with self.subTest(dialogue=dialogue_id):
                audio = ROOT / recording['src']
                self.assertGreater(audio.stat().st_size, 1024)
                with audio.open('rb') as stream:
                    header = stream.read(3)
                self.assertTrue(header == b'ID3' or header[:1] == b'\xff')
                roles = speakers[dialogue_id]
                self.assertEqual(len(roles['speakers']), 2)
                self.assertTrue(all(turn in (0, 1) for turn in roles['lineSpeakers']))

    def test_roles_match_illustrations_and_consecutive_turns(self):
        speakers = data_constant('SITUATION_SPEAKERS')
        expected = {'food': ['male', 'female'], 'travel': ['male', 'female'],
                    'shopping': ['female', 'male'], 'doctor': ['male', 'female'],
                    'hotel': ['female', 'female'], 'lost': ['male', 'male'],
                    'work': ['female', 'male'], 'social': ['male', 'female'],
                    'daily': ['male', 'male'], 'visa': ['female', 'female']}
        for category, genders in expected.items():
            for number in range(1, 4):
                roles = speakers[f'{category}-{number}']
                self.assertEqual([role['gender'] for role in roles['speakers']], genders)
        # A greeting and the following request belong to the same person.
        self.assertEqual(speakers['hotel-1']['lineSpeakers'], [0, 0, 1])
        self.assertEqual(speakers['work-1']['lineSpeakers'], [0, 0, 1])


if __name__ == '__main__':
    unittest.main()

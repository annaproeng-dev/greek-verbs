import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('legal_builder',ROOT/'scripts/build_legal.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)

class LegalBuildTests(unittest.TestCase):
    def test_generated_documents_and_manifest_are_current(self):
        _,output=builder.build()
        for name,content in output.items():self.assertEqual((ROOT/name).read_text(),content,name)

    def test_content_change_requires_new_version(self):
        with tempfile.TemporaryDirectory() as directory:
            temporary=Path(directory)
            shutil.copytree(ROOT/'legal',temporary/'legal')
            shutil.copy2(ROOT/'legal-manifest.json',temporary/'legal-manifest.json')
            source=temporary/'legal/terms.en.html';source.write_text(source.read_text()+'<p>Changed terms</p>')
            with patch.object(builder,'ROOT',temporary):
                with self.assertRaisesRegex(ValueError,'increment'):builder.build()
                config=temporary/'legal/config.json';data=json.loads(config.read_text());data['version']='new-version';config.write_text(json.dumps(data))
                _,output=builder.build()
                self.assertIn('Changed terms',output['terms.en.html'])

    def test_public_documents_hide_internal_release_work(self):
        for path in ['privacy.html','privacy.en.html','terms.html','terms.en.html']:
            text=(ROOT/path).read_text()
            for private in ['TODO','await confirmation','ожидают подтверждения','SSOT','sha256','{{']:
                self.assertNotIn(private,text,path)

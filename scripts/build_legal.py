# coding: utf-8
"""Build public legal documents and shared metadata from reviewed sources.

Run --check in CI; --release additionally rejects unconfirmed operator/providers.
Only the source documents/config are edited; generated public files are committed.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def build():
    config = json.loads((ROOT / 'legal/config.json').read_text())
    output = {}
    documents = {}
    for language in ('ru', 'en'):
        operator = config['operator']
        escape = lambda value: html.escape(str(value), quote=True)
        name = operator['name'] if language == 'ru' else operator['nameEn']
        identity = f"{escape(name)} · {'ИНН' if language == 'ru' else 'Tax ID'} {escape(operator['taxId'])}. <a href=\"mailto:{escape(operator['email'])}\">{escape(operator['email'])}</a>"
        location = [operator.get('country'), operator.get('city'), operator.get('postalAddress')]
        identity += ' · ' + escape(', '.join(filter(None, location)))
        providers = '; '.join(f"{escape(key)}: {escape(value['provider'] or ('не подтверждён' if language == 'ru' else 'unconfirmed'))}, {escape(value['country'] or ('страна не подтверждена' if language == 'ru' else 'country unconfirmed'))}" for key,value in config['services'].items())
        values = {'operator': identity, 'providers': providers, 'site':escape(config['site']['name']+' · '+config['site']['origin']), 'version':escape(config['effectiveDate']), **config['retention'], **config['registration']}
        for kind in ('privacy', 'terms'):
            source = (ROOT / f'legal/{kind}.{language}.html').read_text()
            for key,value in values.items():
                source = source.replace('{{'+key+'}}',str(value))
            if '{{' in source:
                raise ValueError('Unresolved legal template value')
            title = {'ru':{'privacy':'Конфиденциальность','terms':'Условия использования'},'en':{'privacy':'Privacy','terms':'Terms of use'}}[language][kind]
            other = f'{kind}{".en" if language == "ru" else ""}.html'
            document = f'<!doctype html>\n<html lang="{language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} — Greekmaster</title><link rel="stylesheet" href="legal.css"><script src="legal.js" defer></script></head><body><main class="legal-document"><a href="index.html">← Greekmaster</a> · <a href="{other}" lang="{"en" if language == "ru" else "ru"}">{"English" if language == "ru" else "Русский"}</a>{source}</main></body></html>\n'
            path = f'{kind}{".en" if language == "en" else ""}.html'
            output[path] = document
            documents[f'{kind}.{language}'] = {'path':path,'sha256':hashlib.sha256(document.encode()).hexdigest()}
    metadata = {'version':config['version'],'minimumAge':config['registration']['minimumAge'],'noticeDays':config['retention']['noticeDays'],'sessionDays':config['retention']['sessionDays'],'resetMinutes':config['retention']['resetMinutes'],'documents':documents,'optionalTracking':config['optionalTracking']}
    previous_path=ROOT/'legal-manifest.json'
    if previous_path.exists():
        previous=json.loads(previous_path.read_text())
        if previous['version']==metadata['version'] and previous['documents']!=metadata['documents']:
            raise ValueError('Legal document content changed: increment legal/config.json version before rebuilding')
    output['legal-manifest.json'] = json.dumps(metadata, ensure_ascii=False,indent=2)+'\n'
    return config, output

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check',action='store_true')
    parser.add_argument('--release',action='store_true')
    args=parser.parse_args()
    config, output = build()
    if args.release:
        missing=[]
        for field in config['releaseBlockers']:
            value=config
            for key in field.split('.'):
                value=value[key]
            if not value: missing.append(field)
        if missing: parser.exit(1,'Unconfirmed legal release fields: '+', '.join(missing)+'\n')
    stale=[]
    for path,content in output.items():
        target=ROOT/path
        if args.check:
            if not target.exists() or target.read_text()!=content: stale.append(path)
        else: target.write_text(content)
    if stale: parser.exit(1,'Stale generated legal files: '+', '.join(stale)+'\n')
    print('Legal documents: '+('verified' if args.check else 'generated'))
if __name__=='__main__': main()

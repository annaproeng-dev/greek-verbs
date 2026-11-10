import os
import tempfile
import unittest
from unittest.mock import patch
from api.auth import database, learning_request


class Request:
    headers = {}
    def session_token(self):
        return ''


class LearningTests(unittest.TestCase):
    def test_guest_persistence_conflict_and_isolation(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'AUTH_DB_PATH': directory + '/test.sqlite3', 'DATABASE_URL': ''}):
            first = Request()
            with database() as execute:
                status, result, cookie = learning_request(first, execute, {}, 100)
                self.assertEqual(status, 200)
                first.headers = {'Cookie': cookie.split(';')[0]}
                data = {'progress': {'correct': 5}, 'difficult': ['a']}
                saved = learning_request(first, execute, {'operation': 'save', 'owner': 'guest', 'revision': result['revision'], 'generation': result['generation'], 'data': data}, 100)
                self.assertEqual(saved[0], 200)
                stale = learning_request(first, execute, {'operation': 'save', 'owner': 'guest', 'revision': 0, 'generation': result['generation'], 'data': data}, 100)
                self.assertEqual(stale[0], 409)
            with database() as execute:
                self.assertEqual(learning_request(first, execute, {}, 100)[1]['data'], data)
                self.assertEqual(learning_request(Request(), execute, {}, 100)[1]['data']['progress'], {})
                self.assertEqual(learning_request(first, execute, {'operation': 'save', 'owner': 'user:other', 'revision': 1, 'generation': result['generation'], 'data': data}, 100)[0], 409)

    def test_reset_generation_and_migration_do_not_resurrect_erased_data(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'AUTH_DB_PATH': directory + '/test.sqlite3', 'DATABASE_URL': ''}):
            req=Request()
            with database() as execute:
                _,initial,cookie=learning_request(req,execute,{},100)
                req.headers={'Cookie':cookie.split(';')[0]}
                data={'progress':{'correct':12},'difficult':['a']}
                save={'operation':'import','owner':'guest','generation':initial['generation'],'revision':initial['revision'],'source':'a'*64,'data':data}
                _,imported,_=learning_request(req,execute,save,101)
                self.assertEqual(imported['data'],data)
                self.assertEqual(imported['imports'],['a'*64])
                save['revision']=imported['revision']
                duplicate=learning_request(req,execute,save,102)
                self.assertEqual(duplicate[1]['revision'],imported['revision'])
                reset={'operation':'reset','owner':'guest','generation':imported['generation'],'revision':imported['revision']}
                _,erased,_=learning_request(req,execute,reset,103)
                self.assertNotEqual(erased['generation'],imported['generation'])
                self.assertEqual(erased['data']['progress'],{})
                stale={**save,'operation':'save','revision':erased['revision']}
                self.assertEqual(learning_request(req,execute,stale,104)[1]['error'],'storage_reset')
                reimport={**save,'generation':erased['generation'],'revision':erased['revision'],'source':'b'*64}
                self.assertEqual(learning_request(req,execute,reimport,105)[1]['data']['progress'],{})

    def test_invalid_data_and_expired_authentication(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {'AUTH_DB_PATH': directory + '/test.sqlite3', 'DATABASE_URL': ''}):
            req=Request()
            with database() as execute:
                _,initial,cookie=learning_request(req,execute,{},100)
                req.headers={'Cookie':cookie.split(';')[0]}
                payload={'operation':'save','owner':'guest','generation':initial['generation'],'revision':initial['revision'],'data':{'progress':{},'difficult':[],'extra':'unreviewed'}}
                self.assertEqual(learning_request(req,execute,payload,101)[0],400)
                req.session_token=lambda:'revoked-token'
                req.cookie=lambda:'greek_session=; Max-Age=0'
                self.assertEqual(learning_request(req,execute,{},101)[0],401)


if __name__ == '__main__':
    unittest.main()

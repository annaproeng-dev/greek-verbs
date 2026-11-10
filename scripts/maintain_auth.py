"""Remove expired security records without touching active users or learning data."""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.auth import database
from api.legal import cleanup_expired

def main():
    with database() as execute:
        cleanup_expired(execute, int(time.time()))
    print('Expired authentication records removed')
if __name__ == '__main__': main()

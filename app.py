import sys
import os

root_dir = os.path.abspath(os.path.dirname(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from api.index import app

if __name__ == '__main__':
    app.run(debug=True, port=5000)

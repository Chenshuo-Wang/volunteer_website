import sys
import os

# 将项目根目录添加到 Python 路径
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from backend.app import app, db

    # Vercel Serverless 环境下自动建表（若失败仅记录日志，不阻断 app）
    try:
        with app.app_context():
            db.create_all()
    except Exception as db_err:
        print(f"[WARNING] db.create_all() failed: {db_err}")

except Exception as e:
    import traceback
    from flask import Flask, jsonify
    app = Flask(__name__)
    error_message = str(e)
    error_traceback = traceback.format_exc()

    @app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    @app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    def catch_all(path):
        return jsonify({
            "error": "Backend initialization failed",
            "detail": error_message,
            "traceback": error_traceback,
            "python_version": sys.version,
            "cwd": os.getcwd(),
            "api_dir": os.path.dirname(__file__),
            "parent_dir_contents": os.listdir(os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))),
            "backend_exists": os.path.isdir(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
        }), 500


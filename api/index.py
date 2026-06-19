import sys
import os

# 将项目根目录添加到 Python 路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from backend.app import app, db

    # Vercel Serverless 环境下自动建表
    with app.app_context():
        db.create_all()
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

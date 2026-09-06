import sys
import os

# 将项目根目录添加到 Python 路径
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

try:
    from backend.app import app, db
    try:
        from backend.init_db import init_data
    except Exception as e:
        print(f"[WARNING] Could not import init_data: {e}")
        init_data = None

    # Vercel Serverless 环境下自动建表与初始化默认数据（管理员账号、周常岗位等）
    try:
        with app.app_context():
            db.create_all()
            if init_data:
                init_data()
    except Exception as db_err:
        print(f"[WARNING] Database initialization failed: {db_err}")

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


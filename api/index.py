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
    # 如果导入或建表失败，创建一个最小的 fallback app 返回错误信息
    # 这样至少能在浏览器中看到具体错误，方便调试
    from flask import Flask, jsonify
    app = Flask(__name__)
    error_message = str(e)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        return jsonify({
            "error": "Backend initialization failed",
            "detail": error_message,
            "python_version": sys.version
        }), 500

# Vercel 需要导出名为 `app` 的 WSGI 应用

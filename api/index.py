import sys
import os

# 将项目根目录添加到 Python 路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import app, db

# Vercel Serverless 环境下自动建表
try:
    with app.app_context():
        db.create_all()
except Exception as e:
    print(f"[WARNING] db.create_all() failed: {e}")

# Vercel 需要导出名为 `app` 的 WSGI 应用
# Flask app 已经通过 from backend.app import app 导入，变量名为 app
# Vercel 会自动识别这个变量

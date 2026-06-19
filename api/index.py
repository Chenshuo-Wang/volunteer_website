import sys
import os

# 将根目录加载到 Python, 帮助识别 backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# 静态导入 backend 下的 flask app
from backend.app import app, db

# Serverless 环境下自动建表（替代 Flask-Migrate）
with app.app_context():
    db.create_all()

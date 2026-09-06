import sys
import os

# 将项目根目录添加到 Python 路径，确保 backend 包可正常导入
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())

try:
    from backend.app import app, db
    try:
        from backend.init_db import init_data
    except Exception as e:
        print(f"[WARNING] Could not import init_data: {e}")
        init_data = None

    # WSGI 路径自适应中间件：
    # 确保无论 Vercel 传递的 PATH_INFO 是包含 /api、被剥离为无前缀还是 /api/index，
    # 都能精准自适应匹配 Flask 路由
    class VercelPathMiddleware:
        def __init__(self, wsgi_app):
            self.wsgi_app = wsgi_app

        def __call__(self, environ, start_response):
            path = environ.get('PATH_INFO', '')
            if path in ('/api/index', '/api/index.py'):
                environ['PATH_INFO'] = '/api'
            elif path.startswith('/api/index/'):
                environ['PATH_INFO'] = '/api/' + path[len('/api/index/'):]
            elif not path.startswith('/api') and path != '/':
                environ['PATH_INFO'] = '/api' + path
            return self.wsgi_app(environ, start_response)

    app.wsgi_app = VercelPathMiddleware(app.wsgi_app)

    # 延迟初始化数据库（避免在模块加载阶段阻塞 Serverless 函数冷启动）
    _db_initialized = False

    @app.before_request
    def lazy_init_db():
        global _db_initialized
        if not _db_initialized:
            _db_initialized = True
            try:
                db.create_all()
                if init_data:
                    init_data()
            except Exception as db_err:
                print(f"[WARNING] Lazy database initialization failed: {db_err}")

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


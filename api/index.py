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
    # 确保无论 Vercel 传递的 PATH_INFO 是包含 /api、被重写为 /api/index.py、还是通过 header/query 传递，
    # 都能精准自适应还原并匹配 Flask 路由
    class VercelPathMiddleware:
        def __init__(self, wsgi_app):
            self.wsgi_app = wsgi_app

        def __call__(self, environ, start_response):
            # 1. 优先检查 Vercel 注入的原始请求路径 (HTTP_X_MATCHED_PATH)
            matched_path = environ.get('HTTP_X_MATCHED_PATH')
            if matched_path and matched_path.startswith('/api') and matched_path not in ('/api/index', '/api/index.py'):
                environ['PATH_INFO'] = matched_path
            else:
                # 2. 检查 REQUEST_URI / RAW_URI
                req_uri = environ.get('REQUEST_URI') or environ.get('RAW_URI', '')
                if req_uri:
                    clean_uri = req_uri.split('?')[0]
                    if clean_uri.startswith('/api') and clean_uri not in ('/api/index', '/api/index.py'):
                        environ['PATH_INFO'] = clean_uri

                # 3. 检查 query string 中的 __route__ 或 match
                qs = environ.get('QUERY_STRING', '')
                if qs:
                    try:
                        import urllib.parse
                        params = urllib.parse.parse_qs(qs)
                        if '__route__' in params and params['__route__'][0].startswith('/api'):
                            environ['PATH_INFO'] = params['__route__'][0]
                        elif 'match' in params and params['match'][0]:
                            m = params['match'][0]
                            environ['PATH_INFO'] = '/api/' + m.lstrip('/')
                    except Exception:
                        pass

                # 4. 回退处理
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)


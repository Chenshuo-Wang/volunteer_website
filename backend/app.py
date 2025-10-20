# backend/app.py

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_migrate import Migrate

# --- 1. 基本配置 ---
app = Flask(__name__)
CORS(app)

# --- 2. 数据库配置 ---
# 获取当前文件所在的目录
basedir = os.path.abspath(os.path.dirname(__file__))
# 配置数据库URI，我们将在项目根目录下创建一个名为 'volunteer.db' 的SQLite数据库文件
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'volunteer.db')
# 关闭不必要的追踪，以节省资源
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库 ORM (Object-Relational Mapper)
db = SQLAlchemy(app)

# 【【【【【 这是您遗漏的关键一行 】】】】】
# 初始化 Migrate，将迁移引擎与 app 和 db 绑定
migrate = Migrate(app, db)


# --- 3. 定义数据库模型 (Database Model) ---
# 这个 Event 类对应数据库中的一张 'event' 表
class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    required_volunteers = db.Column(db.Integer, nullable=False)
    current_volunteers = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='招募中')
    leader_name = db.Column(db.String(100))
    leader_contact = db.Column(db.String(100))
    registration_deadline = db.Column(db.DateTime, nullable=False)
    image_url = db.Column(db.String(300))

    # 定义一个方法，将模型对象转换为字典，方便序列化为 JSON
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            # 将 datetime 对象转换为 ISO 8601 格式的字符串，与前端期望的一致
            "startTime": self.start_time.isoformat(),
            "endTime": self.end_time.isoformat(),
            "location": self.location,
            "requiredVolunteers": self.required_volunteers,
            "currentVolunteers": self.current_volunteers,
            "status": self.status,
            "leaderName": self.leader_name,
            "leaderContact": self.leader_contact,
            "registrationDeadline": self.registration_deadline.isoformat(),
            "imageUrl": self.image_url
        }

# --- 4. 重构 API 路由 ---
# 这个路由现在会从数据库查询数据
@app.route('/api/events/<int:event_id>')
def get_event_detail(event_id):
    # 使用 SQLAlchemy 的 get_or_404 方法
    # 它会尝试根据主键(id)获取对象，如果找不到，会自动返回 404 Not Found 错误
    event = Event.query.get_or_404(event_id)
    # 调用我们定义的 to_dict() 方法，然后返回 JSON
    return jsonify(event.to_dict())

# --- 5. 启动服务器 ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
# backend/app.py

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_migrate import Migrate

# --- 1. 基本配置 ---
app = Flask(__name__)
CORS(app)

# --- 2. 数据库配置 ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'volunteer.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)


# --- 3. 数据库模型定义 ---
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
    volunteers = db.relationship('Volunteer', backref='event', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "description": self.description,
            "startTime": self.start_time.isoformat(), "endTime": self.end_time.isoformat(),
            "location": self.location, "requiredVolunteers": self.required_volunteers,
            "currentVolunteers": self.current_volunteers, "status": self.status,
            "leaderName": self.leader_name, "leaderContact": self.leader_contact,
            "registrationDeadline": self.registration_deadline.isoformat(), "imageUrl": self.image_url
        }

# 【【【 模型已更新 】】】
class Volunteer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False, index=True) # 使用手机号作为主要联系方式
    # 使用 class_name 而不是 class，因为 class 是 Python 的关键字
    class_name = db.Column(db.String(100), nullable=False) 
    qq = db.Column(db.String(50), nullable=True) # QQ 号，可选
    wechat = db.Column(db.String(100), nullable=True) # 微信号，可选

    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)

    # 同一个活动下，手机号必须是唯一的
    __table_args__ = (db.UniqueConstraint('phone', 'event_id', name='_phone_event_uc'),)


# --- 4. API 路由 ---

@app.route('/api/events', methods=['POST'])
def create_event():
    data = request.get_json()
    if not data:
        return jsonify({"message": "请求数据为空"}), 400

    # 从 JSON 数据中提取所有必需字段
    try:
        new_event = Event(
            title=data['title'],
            description=data['description'],
            # 将前端传来的 ISO 格式字符串转换为 Python 的 datetime 对象
            start_time=datetime.fromisoformat(data['startTime']),
            end_time=datetime.fromisoformat(data['endTime']),
            location=data['location'],
            required_volunteers=int(data['requiredVolunteers']),
            leader_name=data.get('leaderName'), # .get() 允许字段为空
            leader_contact=data.get('leaderContact'),
            registration_deadline=datetime.fromisoformat(data['registrationDeadline']),
            image_url=data.get('imageUrl')
        )
        db.session.add(new_event)
        db.session.commit()
        # 返回新创建的活动数据和 201 Created 状态码
        return jsonify(new_event.to_dict()), 201
    except KeyError as e:
        # 如果缺少了某个必需字段
        return jsonify({"message": f"缺少必填字段: {e}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"服务器内部错误: {str(e)}"}), 500
    
@app.route('/api/events', methods=['GET'])
def get_events():
    events = Event.query.order_by(Event.start_time.desc()).all()
    return jsonify([event.to_dict() for event in events])

@app.route('/api/events/<int:event_id>')
def get_event_detail(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())

# 【【【 报名 API 已更新 】】】
@app.route('/api/events/<int:event_id>/register', methods=['POST'])
def register_for_event(event_id):
    event = Event.query.get_or_404(event_id)

    if event.status != '招募中':
        return jsonify({"message": "抱歉，该活动已停止招募"}), 400
    if event.current_volunteers >= event.required_volunteers:
        return jsonify({"message": "抱歉，该活动报名人数已满"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"message": "请求数据为空"}), 400

    name = data.get('name')
    phone = data.get('phone')
    class_name = data.get('className') # 注意前端传来的驼峰命名
    qq = data.get('qq')
    wechat = data.get('wechat')

    if not all([name, phone, class_name]):
        return jsonify({"message": "姓名、手机号和年级班级不能为空"}), 400
    
    # 【新验证逻辑】QQ 和 微信 至少填一个
    if not qq and not wechat:
        return jsonify({"message": "QQ号和微信号必须至少填写一个"}), 400

    # 使用手机号检查是否重复报名
    if Volunteer.query.filter_by(event_id=event_id, phone=phone).first():
        return jsonify({"message": "该手机号已报名此活动，请勿重复提交"}), 409

    try:
        new_volunteer = Volunteer(
            name=name, phone=phone, class_name=class_name,
            qq=qq, wechat=wechat, event_id=event_id
        )
        event.current_volunteers += 1
        db.session.add(new_volunteer)
        db.session.commit()
        return jsonify({"message": "报名成功！"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"服务器内部错误: {str(e)}"}), 500

# --- 5. 启动服务器 ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
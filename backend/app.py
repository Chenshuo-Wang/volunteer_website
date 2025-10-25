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
# 【【【 模型已更新：移除了 image_url 】】】
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
    volunteers = db.relationship('Volunteer', backref='event', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "description": self.description,
            "startTime": self.start_time.isoformat(), "endTime": self.end_time.isoformat(),
            "location": self.location, "requiredVolunteers": self.required_volunteers,
            "currentVolunteers": self.current_volunteers, "status": self.status,
            "leaderName": self.leader_name, "leaderContact": self.leader_contact,
            "registrationDeadline": self.registration_deadline.isoformat()
        }

class Volunteer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, index=True) # 为姓名增加索引，方便查找
    phone = db.Column(db.String(20), nullable=False)
    class_name = db.Column(db.String(100), nullable=False) 
    qq = db.Column(db.String(50), nullable=True)
    wechat = db.Column(db.String(100), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    __table_args__ = (db.UniqueConstraint('phone', 'event_id', name='_phone_event_uc'),)
    
    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "phone": self.phone,
            "className": self.class_name, "qq": self.qq, "wechat": self.wechat,
            "eventId": self.event_id
        }

# --- 4. API 路由 ---
# (创建和获取活动列表的路由保持不变，但 create_event 内部不再处理 imageUrl)
@app.route('/api/volunteers/<int:volunteer_id>', methods=['DELETE'])
def delete_volunteer(volunteer_id):
    # 1. 根据 ID 查找报名记录，如果不存在则返回 404
    volunteer = Volunteer.query.get_or_404(volunteer_id)

    # 2. 找到关联的活动，以便更新人数
    event = Event.query.get(volunteer.event_id)

    try:
        # 3. 从数据库会话中删除该报名记录
        db.session.delete(volunteer)

        # 4. 对应活动的报名人数减 1
        if event and event.current_volunteers > 0:
            event.current_volunteers -= 1

        # 5. 提交所有更改
        db.session.commit()

        return jsonify({"message": "报名记录已成功删除"}), 200 # 200 OK

    except Exception as e:
        db.session.rollback() # 出错时回滚
        return jsonify({"message": f"删除失败: {str(e)}"}), 500

@app.route('/api/events', methods=['POST'])
def create_event():
    data = request.get_json()
    try:
        new_event = Event(
            title=data['title'], description=data['description'],
            start_time=datetime.fromisoformat(data['startTime']),
            end_time=datetime.fromisoformat(data['endTime']),
            location=data['location'],
            required_volunteers=int(data['requiredVolunteers']),
            leader_name=data.get('leaderName'),
            leader_contact=data.get('leaderContact'),
            registration_deadline=datetime.fromisoformat(data['registrationDeadline'])
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify(new_event.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"创建失败: {str(e)}"}), 500

@app.route('/api/events', methods=['GET'])
def get_events():
    events = Event.query.order_by(Event.start_time.desc()).all()
    return jsonify([event.to_dict() for event in events])

@app.route('/api/events/<int:event_id>')
def get_event_detail(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())

@app.route('/api/events/<int:event_id>/register', methods=['POST'])
def register_for_event(event_id):
    # (此函数逻辑保持不变)
    event = Event.query.get_or_404(event_id)
    if event.status != '招募中': return jsonify({"message": "抱歉，该活动已停止招募"}), 400
    if event.current_volunteers >= event.required_volunteers: return jsonify({"message": "抱歉，该活动报名人数已满"}), 400
    data = request.get_json()
    name = data.get('name')
    phone = data.get('phone')
    class_name = data.get('className')
    qq = data.get('qq')
    wechat = data.get('wechat')
    if not all([name, phone, class_name]): return jsonify({"message": "姓名、手机号和年级班级不能为空"}), 400
    if not qq and not wechat: return jsonify({"message": "QQ号和微信号必须至少填写一个"}), 400
    if Volunteer.query.filter_by(event_id=event_id, phone=phone).first(): return jsonify({"message": "该手机号已报名此活动，请勿重复提交"}), 409
    try:
        new_volunteer = Volunteer(name=name, phone=phone, class_name=class_name, qq=qq, wechat=wechat, event_id=event_id)
        event.current_volunteers += 1
        db.session.add(new_volunteer)
        db.session.commit()
        return jsonify({"message": "报名成功！"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"服务器内部错误: {str(e)}"}), 500

# 【【【【【 新增 API：获取活动报名列表 】】】】】
@app.route('/api/events/<int:event_id>/volunteers', methods=['GET'])
def get_event_volunteers(event_id):
    event = Event.query.get_or_404(event_id)
    volunteers = event.volunteers # 利用关系直接获取所有报名者
    return jsonify([v.to_dict() for v in volunteers])

# 【【【【【 新增 API：根据姓名查找信息 】】】】】
@app.route('/api/volunteers/lookup', methods=['GET'])
def lookup_volunteer():
    name = request.args.get('name')
    if not name:
        return jsonify({"message": "需要提供姓名"}), 400
    
    # 查找该姓名最近一次的报名记录
    volunteer = Volunteer.query.filter_by(name=name).order_by(Volunteer.id.desc()).first()
    
    if volunteer:
        # 只返回需要自动填充的信息
        return jsonify({
            "phone": volunteer.phone,
            "className": volunteer.class_name,
            "qq": volunteer.qq,
            "wechat": volunteer.wechat
        })
    else:
        # 如果找不到，返回一个空对象
        return jsonify({})

# --- 5. 启动服务器 ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
# backend/app.py

import os
import re # 引入正则表达式模块用于格式验证
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_migrate import Migrate
from sqlalchemy import case

# --- 1. 基本配置 ---
app = Flask(__name__)
CORS(app)

# --- 2. 数据库配置 ---
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'volunteer.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)


# --- 3. 数据库模型重构 ---

# 【【【 新增模型：学生个人信息表 】】】
# 这张表存储学生独一无二、可复用的信息。
class StudentProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    # 手机号是学生的唯一标识
    phone = db.Column(db.String(20), nullable=False, unique=True, index=True)
    class_name = db.Column(db.String(100), nullable=False) 
    qq = db.Column(db.String(50), nullable=True)
    wechat = db.Column(db.String(100), nullable=True)
    # 定义关系：一个学生信息可以有多条报名记录
    registrations = db.relationship('Volunteer', backref='student_profile', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "phone": self.phone, "className": self.class_name, "qq": self.qq, "wechat": self.wechat}

# 【【【 改造模型：报名记录表 】】】
# 这张表现在只作为 Event 和 StudentProfile 之间的关联。
class Volunteer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # 外键，关联到 event 表的 id 字段
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    # 外键，关联到 student_profile 表的 id 字段
    student_profile_id = db.Column(db.Integer, db.ForeignKey('student_profile.id'), nullable=False)
    
    # 唯一性约束：同一个学生不能重复报名同一个活动
    __table_args__ = (db.UniqueConstraint('student_profile_id', 'event_id', name='_student_event_uc'),)

# 【【【 改造模型：活动表 】】】
class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    required_volunteers = db.Column(db.Integer, nullable=False)
    current_volunteers = db.Column(db.Integer, default=0)
    leader_name = db.Column(db.String(100))
    leader_contact = db.Column(db.String(100))
    registration_deadline = db.Column(db.DateTime, nullable=False)
    # 新增字段：年级限制，以逗号分隔，如 "G1,G2"
    grade_restriction = db.Column(db.String(100), nullable=True)
    # 关系不变
    volunteers = db.relationship('Volunteer', backref='event', lazy=True, cascade="all, delete-orphan")
    # 删除了 status 字段

    # 【【【 核心改动：动态计算 status 】】】
    @property
    def status(self):
        now = datetime.now()
        # 最终状态，优先级最高
        if now > self.end_time:
            return "已结束"
        # 正在进行中
        elif now > self.start_time:
            return "进行中"
        # 检查是否满员，这个状态比截止日期更重要
        elif self.current_volunteers >= self.required_volunteers:
            return "报名已满"
        # 检查报名是否已截止
        elif now > self.registration_deadline:
            return "报名已截止"
        # 如果以上都不是，那就是正在招募中
        else:
            return "招募中"
    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "description": self.description,
            "startTime": self.start_time.isoformat(), "endTime": self.end_time.isoformat(),
            "location": self.location, "requiredVolunteers": self.required_volunteers,
            "currentVolunteers": self.current_volunteers,
            "status": self.status, # 直接调用上面的动态计算属性
            "leaderName": self.leader_name, "leaderContact": self.leader_contact,
            "registrationDeadline": self.registration_deadline.isoformat(),
            "gradeRestriction": self.grade_restriction
        }


# --- 4. API 路由全面升级 ---

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
            registration_deadline=datetime.fromisoformat(data['registrationDeadline']),
            # 新增：接收年级限制
            grade_restriction=data.get('gradeRestriction')
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify(new_event.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"创建失败: {str(e)}"}), 500

@app.route('/api/events/<int:event_id>/register', methods=['POST'])
def register_for_event(event_id):
    event = Event.query.get_or_404(event_id)
    data = request.get_json()

    # 1. 验证活动状态
    if event.status not in ["招募中", "报名已满"]: # 允许在满员时尝试报名，以便返回更具体的提示
        return jsonify({"message": f"抱歉，该活动状态为“{event.status}”，无法报名"}), 400
    if event.current_volunteers >= event.required_volunteers:
        return jsonify({"message": "抱歉，该活动报名人数已满"}), 400

    # 2. 验证输入数据
    name, phone, class_name = data.get('name'), data.get('phone'), data.get('className')
    qq, wechat = data.get('qq'), data.get('wechat')
    if not all([name, phone, class_name]): return jsonify({"message": "姓名、手机号和年级班级不能为空"}), 400
    if not qq and not wechat: return jsonify({"message": "QQ号和微信号必须至少填写一个"}), 400
    
    # 3. 【新增】验证年级格式 (G+数字+C+数字)
    if not re.match(r'^G\d+C\d+$', class_name):
        return jsonify({"message": "年级格式不正确，请严格按照 'G年级号C班级号' 格式填写，例如 G1C1"}), 400
        
    # 4. 【新增】验证年级是否符合限制
    if event.grade_restriction:
        allowed_grades = event.grade_restriction.split(',')
        student_grade = f"G{re.search(r'G(\d+)', class_name).group(1)}"
        if student_grade not in allowed_grades:
            return jsonify({"message": f"抱歉，此活动仅限 {event.grade_restriction} 年级报名"}), 403 # 403 Forbidden

    # 5. 查找或创建学生个人信息
    student = StudentProfile.query.filter_by(phone=phone).first()
    if student:
        # 如果学生存在，更新其信息
        student.name = name
        student.class_name = class_name
        student.qq = qq
        student.wechat = wechat
    else:
        # 如果不存在，创建新学生
        student = StudentProfile(name=name, phone=phone, class_name=class_name, qq=qq, wechat=wechat)
        db.session.add(student)

    # 6. 检查是否已报名
    existing_registration = Volunteer.query.filter_by(event_id=event_id, student_profile=student).first()
    if existing_registration:
        return jsonify({"message": "您已报名该活动，请勿重复提交"}), 409

    # 7. 创建报名记录
    try:
        new_registration = Volunteer(event_id=event_id, student_profile=student)
        event.current_volunteers += 1
        db.session.add(new_registration)
        db.session.commit()
        return jsonify({"message": "报名成功！"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"服务器内部错误: {str(e)}"}), 500

@app.route('/api/volunteers/lookup', methods=['GET'])
def lookup_volunteer():
    phone = request.args.get('phone') # 改为使用手机号查找，更唯一
    if not phone: return jsonify({"message": "需要提供手机号"}), 400
    
    student = StudentProfile.query.filter_by(phone=phone).first()
    
    if student:
        return jsonify(student.to_dict())
    else:
        return jsonify({})

@app.route('/api/events/<int:event_id>/volunteers', methods=['GET'])
def get_event_volunteers(event_id):
    # 【改动】现在需要JOIN查询来获取报名者的详细信息
    registrations = db.session.query(Volunteer, StudentProfile).join(StudentProfile).filter(Volunteer.event_id == event_id).all()
    
    volunteer_list = []
    for reg, profile in registrations:
        volunteer_list.append({
            "registrationId": reg.id, # 这是 Volunteer 表的 ID，用于删除
            "name": profile.name,
            "phone": profile.phone,
            "className": profile.class_name,
            "qq": profile.qq,
            "wechat": profile.wechat
        })
    return jsonify(volunteer_list)

@app.route('/api/volunteers/<int:volunteer_id>', methods=['DELETE'])
def delete_volunteer(volunteer_id):
    # 这个 volunteer_id 现在是 Volunteer 表 (报名记录) 的 id
    registration = Volunteer.query.get_or_404(volunteer_id)
    event = Event.query.get(registration.event_id)
    try:
        db.session.delete(registration)
        if event and event.current_volunteers > 0:
            event.current_volunteers -= 1
        db.session.commit()
        return jsonify({"message": "报名记录已成功删除"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"删除失败: {str(e)}"}), 500

# get_events 和 get_event_detail 路由无需改动，因为 to_dict() 已经处理了 status
@app.route('/api/events', methods=['GET'])
def get_events():
    # 【【【 修复：实现自定义排序 】】】
    now = datetime.utcnow()

    # 1. 创建一个 CASE 语句，为不同的状态分配一个数字优先级 (数字越小，越靠前)
    #    这个逻辑必须和 Event.status 属性的逻辑保持一致
    status_priority = case(
        (Event.end_time < now, 5), # 已结束 -> 优先级 5 (最低)
        (Event.start_time < now, 4), # 进行中 -> 优先级 4
        (Event.current_volunteers >= Event.required_volunteers, 2), # 报名已满 -> 优先级 2
        (Event.registration_deadline < now, 3), # 报名已截止 -> 优先级 3
        else_=1 # 招募中 -> 优先级 1 (最高)
    )

    # 2. 查询时，首先根据我们自定义的优先级排序，
    #    然后在优先级相同的情况下，按活动开始时间升序排列 (越早开始的越靠前)
    events = Event.query.order_by(status_priority, Event.start_time.asc()).all()
    
    return jsonify([event.to_dict() for event in events])

@app.route('/api/events/<int:event_id>')
def get_event_detail(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())


# --- 5. 启动服务器 ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
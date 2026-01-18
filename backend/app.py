import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime, date
from sqlalchemy import func, case

# --- 1. 基本配置 ---
app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'volunteer.db')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# ==========================================
# 模块一：用户系统 (Student)
# ==========================================

class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    
    # 入学年份和班级号
    enrollment_year = db.Column(db.Integer, nullable=False) 
    class_number = db.Column(db.Integer, nullable=False)
    
    qq = db.Column(db.String(50))
    wechat = db.Column(db.String(50))

    # 关联关系
    event_signups = db.relationship('EventSignup', backref='student', lazy='dynamic')
    shift_signups = db.relationship('ShiftSignup', backref='student', lazy='dynamic')

    @property
    def total_hours(self):
        # 1. 普通活动时长 (仅计算已结束的)
        event_hours = db.session.query(func.sum(Event.hours_value))\
            .join(EventSignup)\
            .filter(EventSignup.student_id == self.id)\
            .filter(Event.end_time < datetime.now())\
            .scalar() or 0.0
        
        # 2. 周常岗位时长 (仅计算日期早于今天的)
        shift_hours = db.session.query(func.sum(RecurringShift.hours_value))\
            .join(ShiftSignup)\
            .filter(ShiftSignup.student_id == self.id)\
            .filter(ShiftSignup.date < date.today())\
            .scalar() or 0.0
            
        return round(float(event_hours) + float(shift_hours), 1)

    @property
    def full_class_name(self):
        return f"{self.enrollment_year}级{self.class_number}班"

    # 【新增功能】获取该学生的所有活动历史
    def get_history(self):
        history_list = []
        
        # A. 获取普通活动记录
        # 我们遍历该学生报名的所有 ordinary events
        for signup in self.event_signups:
            event_obj = signup.event
            history_list.append({
                "type": "event",                  # 标记类型，前端据此判断跳往哪个详情页
                "id": event_obj.id,               # 活动ID，用于跳转链接 /event/:id
                "title": event_obj.title,         # 左侧：显示名称
                "hours": event_obj.hours_value,   # 右侧：显示时长
                "date": event_obj.start_time.isoformat(), # 用于排序
                "status": event_obj.status        # 状态 (已结束/进行中)
            })

        # B. 获取周常值日记录
        for signup in self.shift_signups:
            shift_obj = RecurringShift.query.get(signup.shift_id)
            history_list.append({
                "type": "shift",                  # 标记类型
                "id": shift_obj.id,               # 值日岗ID (虽然值日岗通常没有详情页，但以防万一)
                "title": f"{shift_obj.name} (周{shift_obj.day_of_week})", # 名称拼接星期
                "hours": shift_obj.hours_value,
                "date": signup.date.isoformat(),
                "status": "已完成" if signup.date < date.today() else "待参加"
            })
        
        # C. 按日期倒序排列 (最新的在最上面)
        history_list.sort(key=lambda x: x['date'], reverse=True)
        return history_list

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "enrollmentYear": self.enrollment_year,
            "classNumber": self.class_number,
            "fullClassName": self.full_class_name,
            "qq": self.qq,
            "wechat": self.wechat,
            "totalHours": self.total_hours,
            "history": self.get_history() # 【核心】前端现在可以直接读到这个列表
        }

# ==========================================
# 模块二：普通活动
# ==========================================

class Event(db.Model):
    __tablename__ = 'events'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    registration_deadline = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(100))
    leader_name = db.Column(db.String(50))
    leader_contact = db.Column(db.String(50))
    required_volunteers = db.Column(db.Integer, nullable=False)
    grade_limit = db.Column(db.String(100), default="ALL") 
    hours_value = db.Column(db.Float, nullable=False, default=1.0)
    signups = db.relationship('EventSignup', backref='event', lazy='dynamic')

    @property
    def current_volunteers_count(self):
        return self.signups.count()

    @property
    def status(self):
        now = datetime.now()
        if now > self.end_time: return "已结束"
        if now > self.start_time: return "进行中"
        if self.signups.count() >= self.required_volunteers: return "已满员"
        if now > self.registration_deadline: return "报名截止"
        return "招募中"
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "startTime": self.start_time.isoformat(),
            "endTime": self.end_time.isoformat(),
            "location": self.location,
            "requiredVolunteers": self.required_volunteers,
            "currentVolunteers": self.current_volunteers_count,
            "status": self.status,
            "leaderName": self.leader_name,
            "leaderContact": self.leader_contact,
            "registrationDeadline": self.registration_deadline.isoformat(),
            "gradeLimit": self.grade_limit,
            "hoursValue": self.hours_value
        }

class EventSignup(db.Model):
    __tablename__ = 'event_signups'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False)
    signup_time = db.Column(db.DateTime, default=datetime.now)
    __table_args__ = (db.UniqueConstraint('student_id', 'event_id'),)

# ==========================================
# 模块三：周常任务
# ==========================================

class RecurringShift(db.Model):
    __tablename__ = 'recurring_shifts'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False) 
    start_time_str = db.Column(db.String(10), nullable=False)
    end_time_str = db.Column(db.String(10), nullable=False)
    capacity = db.Column(db.Integer, default=1)
    hours_value = db.Column(db.Float, default=0.5)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "dayOfWeek": self.day_of_week,
            "timeRange": f"{self.start_time_str} - {self.end_time_str}",
            "capacity": self.capacity,
            "hoursValue": self.hours_value
        }

class WeeklyRotation(db.Model):
    __tablename__ = 'weekly_rotations'
    id = db.Column(db.Integer, primary_key=True)
    week_start_date = db.Column(db.Date, unique=True, nullable=False) 
    assigned_class_str = db.Column(db.String(50), nullable=False)

class ShiftSignup(db.Model):
    __tablename__ = 'shift_signups'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'))
    shift_id = db.Column(db.Integer, db.ForeignKey('recurring_shifts.id'))
    date = db.Column(db.Date, nullable=False) 
    __table_args__ = (db.UniqueConstraint('shift_id', 'date', 'student_id'),)
  
# ==========================================
# API 模块一：学生系统 (Student APIs)
# ==========================================

@app.route('/api/students/login', methods=['POST'])
def login_or_register():
    """
    学生登录/注册接口。
    逻辑：根据手机号判断。
    - 如果手机号存在 -> 更新信息 (姓名、班级等) -> 返回学生信息
    - 如果手机号不存在 -> 创建新学生 -> 返回学生信息
    """
    data = request.get_json()
    
    # 必填字段检查
    required_fields = ['name', 'phone', 'enrollmentYear', 'classNumber']
    if not all(field in data for field in required_fields):
        return jsonify({"message": "缺少必填信息 (姓名, 手机, 入学年份, 班级)"}), 400

    phone = data['phone']
    
    # 查找学生是否存在
    student = Student.query.filter_by(phone=phone).first()
    
    try:
        if student:
            # --- 更新现有学生信息 ---
            student.name = data['name']
            student.enrollment_year = int(data['enrollmentYear'])
            student.class_number = int(data['classNumber'])
            # 选填信息
            if 'qq' in data: student.qq = data['qq']
            if 'wechat' in data: student.wechat = data['wechat']
            msg = "欢迎回来！信息已更新。"
        else:
            # --- 注册新学生 ---
            student = Student(
                name=data['name'],
                phone=phone,
                enrollment_year=int(data['enrollmentYear']),
                class_number=int(data['classNumber']),
                qq=data.get('qq'),
                wechat=data.get('wechat')
            )
            db.session.add(student)
            msg = "注册成功！"
        
        db.session.commit()
        return jsonify({"message": msg, "student": student.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"操作失败: {str(e)}"}), 500

@app.route('/api/students/profile', methods=['GET'])
def get_student_profile():
    """
    获取学生档案 (包含总时长和历史记录)
    用法: /api/students/profile?phone=13800000000
    """
    phone = request.args.get('phone')
    if not phone:
        return jsonify({"message": "请提供手机号"}), 400
    
    student = Student.query.filter_by(phone=phone).first()
    if not student:
        return jsonify({"message": "未找到该学生"}), 404
        
    return jsonify(student.to_dict())


# ==========================================
# API 模块二：普通活动系统 (Event APIs)
# ==========================================

@app.route('/api/events', methods=['GET'])
def get_events():
    """
    获取活动列表。
    排序逻辑：
    1. 招募中 (最优先)
    2. 已满员
    3. 报名截止
    4. 进行中
    5. 已结束 (最不重要)
    同级状态下，按开始时间排序。
    """
    now = datetime.now()
    
    # 自定义排序优先级 (SQL Case 语句)
    status_priority = case(
        (Event.end_time < now, 5),                                  # 已结束
        (Event.start_time < now, 4),                                # 进行中
        (Event.registration_deadline < now, 3),                     # 截止
        (Event.signups.any(), 2), # 简化处理：满员逻辑较复杂，暂时放在后面判断，或在前端处理
        else_=1                                                     # 招募中
    )
    
    # 获取所有活动，按开始时间倒序（新的在前面）
    # 注意：为了性能，这里只是简单按时间排序，复杂的状态排序建议在前端做，或者数据库层面需要更复杂的SQL
    events = Event.query.order_by(Event.start_time.desc()).all()
    
    # 转换成字典
    event_list = [e.to_dict() for e in events]
    
    # 再次在 Python 层面进行一次精准排序 (因为数据库层面的 status 是动态属性，无法直接 order_by)
    # 定义状态权重
    priority_map = {
        "招募中": 0,
        "已满员": 1,
        "报名截止": 2,
        "进行中": 3,
        "已结束": 4
    }
    event_list.sort(key=lambda x: priority_map.get(x['status'], 5))
    
    return jsonify(event_list)

@app.route('/api/events/<int:event_id>', methods=['GET'])
def get_event_detail(event_id):
    """获取单个活动详情"""
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict())

@app.route('/api/events/<int:event_id>/signup', methods=['POST'])
def signup_event(event_id):
    """
    报名普通活动
    需要 JSON: { "studentId": 123 }
    """
    data = request.get_json()
    student_id = data.get('studentId')
    
    event = Event.query.get_or_404(event_id)
    student = Student.query.get(student_id)
    
    if not student:
        return jsonify({"message": "学生不存在"}), 404

    # --- 1. 基础状态检查 ---
    if event.status != "招募中":
        return jsonify({"message": f"无法报名，当前状态：{event.status}"}), 400
    
    # --- 2. 年级限制检查 (关键功能) ---
    # event.grade_limit 格式如 "2023,2024" 或 "ALL"
    if event.grade_limit and event.grade_limit != "ALL":
        allowed_years = event.grade_limit.split(',') # ['2023', '2024']
        if str(student.enrollment_year) not in allowed_years:
            return jsonify({
                "message": f"抱歉，该活动仅限 {event.grade_limit} 级学生报名"
            }), 403

    # --- 3. 重复报名检查 ---
    existing = EventSignup.query.filter_by(student_id=student.id, event_id=event.id).first()
    if existing:
        return jsonify({"message": "您已经报名过该活动了"}), 409

    # --- 4. 执行报名 ---
    try:
        new_signup = EventSignup(student_id=student.id, event_id=event.id)
        db.session.add(new_signup)
        db.session.commit()
        return jsonify({"message": "报名成功！"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "报名失败，请稍后重试"}), 500

# 这是一个临时的管理员接口，用于发布活动测试
@app.route('/api/admin/events', methods=['POST'])
def admin_create_event():
    data = request.get_json()
    try:
        new_event = Event(
            title=data['title'],
            description=data.get('description', ''),
            start_time=datetime.fromisoformat(data['startTime']),
            end_time=datetime.fromisoformat(data['endTime']),
            registration_deadline=datetime.fromisoformat(data['registrationDeadline']),
            location=data['location'],
            required_volunteers=int(data['requiredVolunteers']),
            hours_value=float(data.get('hoursValue', 1.0)),
            grade_limit=data.get('gradeLimit', 'ALL'), # 默认为 ALL
            leader_name=data.get('leaderName'),
            leader_contact=data.get('leaderContact')
        )
        db.session.add(new_event)
        db.session.commit()
        return jsonify(new_event.to_dict()), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)
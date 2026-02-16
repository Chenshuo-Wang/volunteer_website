import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from datetime import datetime, date, timedelta
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
    
    # 密码字段 (明文存储，方便管理员重置)
    password = db.Column(db.String(100), nullable=True)
    
    # [NEW] 管理员标识
    is_admin = db.Column(db.Boolean, default=False)

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
            "isAdmin": self.is_admin, # [NEW] 返回管理员状态
            "history": self.get_history() 
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
    """周常岗位模板 - 定义每周重复的固定岗位"""
    __tablename__ = 'recurring_shifts'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # 岗位名称：食堂志愿/文明礼仪站岗
    day_of_week = db.Column(db.Integer, nullable=False)  # 1-5 (周一到周五)
    start_time = db.Column(db.Time, nullable=False)  # 开始时间
    end_time = db.Column(db.Time, nullable=False)  # 结束时间
    capacity = db.Column(db.Integer, default=2)  # 容量（每个岗位统一2人）
    hours_value = db.Column(db.Float, default=0.5)  # 志愿时长（小时）
    description = db.Column(db.String(200))  # 岗位描述（可选）
    
    # 关系
    signups = db.relationship('ShiftSignup', backref='shift', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        """转换为字典格式，供API返回"""
        return {
            "id": self.id,
            "name": self.name,
            "dayOfWeek": self.day_of_week,
            "startTime": self.start_time.strftime("%H:%M") if self.start_time else "",
            "endTime": self.end_time.strftime("%H:%M") if self.end_time else "",
            "timeRange": f"{self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}" if self.start_time and self.end_time else "",
            "capacity": self.capacity,
            "hoursValue": self.hours_value,
            "description": self.description or ""
        }

class WeeklyRotation(db.Model):
    __tablename__ = 'weekly_rotations'
    id = db.Column(db.Integer, primary_key=True)
    week_start_date = db.Column(db.Date, unique=True, nullable=False) 
    assigned_class_str = db.Column(db.String(50), nullable=False)

class ShiftSignup(db.Model):
    """学生周常任务报名记录 - 记录具体日期的报名"""
    __tablename__ = 'shift_signups'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    shift_id = db.Column(db.Integer, db.ForeignKey('recurring_shifts.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)  # 具体日期
    status = db.Column(db.String(20), default='pending')  # pending/completed/cancelled
    created_at = db.Column(db.DateTime, default=datetime.now)  # 报名时间
    
    # 唯一约束：同一个岗位同一天同一个学生只能报名一次
    __table_args__ = (
        db.UniqueConstraint('shift_id', 'date', 'student_id', name='unique_shift_signup'),
    )
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "id": self.id,
            "studentId": self.student_id,
            "shiftId": self.shift_id,
            "date": self.date.isoformat() if self.date else "",
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else ""
        }
  
# ==========================================
# API 模块一：学生系统 (Student APIs)
# ==========================================

@app.route('/api/students/register', methods=['POST'])
def register_student():
    """
    学生注册接口
    必填字段：name, phone, password, enrollmentYear, classNumber
    """
    data = request.get_json()
    
    # 必填字段检查
    required_fields = ['name', 'phone', 'password', 'enrollmentYear', 'classNumber']
    if not all(field in data for field in required_fields):
        return jsonify({"message": "缺少必填信息"}), 400
    
    phone = data['phone']
    
    # 检查手机号是否已存在
    existing = Student.query.filter_by(phone=phone).first()
    if existing:
        return jsonify({"message": "该手机号已被注册"}), 409
    
    try:
        # 创建新学生账号
        student = Student(
            name=data['name'],
            phone=phone,
            password=data['password'],  # 直接存储密码
            enrollment_year=int(data['enrollmentYear']),
            class_number=int(data['classNumber']),
            qq=data.get('qq'),
            wechat=data.get('wechat'),
            is_admin=False  # 普通学生默认非管理员
        )
        db.session.add(student)
        db.session.commit()
        
        return jsonify({
            "message": "注册成功！",
            "student": student.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"注册失败: {str(e)}"}), 500

@app.route('/api/students/login', methods=['POST'])
def login_or_register():
    """
    学生登录接口（密码验证）
    必填字段：phone, password
    """
    data = request.get_json()
    
    phone = data.get('phone')
    password = data.get('password')
    
    if not phone or not password:
        return jsonify({"message": "请输入手机号和密码"}), 400
    
    # 查找学生
    student = Student.query.filter_by(phone=phone).first()
    
    if not student:
        return jsonify({"message": "手机号未注册"}), 404
    
    # 验证密码
    if student.password != password:
        return jsonify({"message": "密码错误，如忘记密码请联系管理员"}), 401
    
    return jsonify({
        "message": "登录成功",
        "student": student.to_dict()
    }), 200

@app.route('/api/students/profile', methods=['GET', 'PUT'])
def get_student_profile():
    """
    GET: 获取学生档案 (包含总时长和历史记录)
    PUT: 更新学生信息（包括密码）
    用法: /api/students/profile?phone=13800000000
    """
    phone = request.args.get('phone')
    if not phone:
        return jsonify({"message": "请提供手机号"}), 400
    
    student = Student.query.filter_by(phone=phone).first()
    if not student:
        return jsonify({"message": "未找到该学生"}), 404
    
    if request.method == 'GET':
        return jsonify(student.to_dict())
    
    elif request.method == 'PUT':
        # 更新学生信息（主要用于修改密码）
        data = request.get_json()
        
        # 如果要修改密码，需要验证旧密码
        if 'oldPassword' in data and 'newPassword' in data:
            if student.password != data['oldPassword']:
                return jsonify({"message": "旧密码错误"}), 401
            
            student.password = data['newPassword']
            db.session.commit()
            return jsonify({"message": "密码修改成功"}), 200
        
        # 其他信息更新（如需要）
        if 'qq' in data:
            student.qq = data['qq']
        if 'wechat' in data:
            student.wechat = data['wechat']
            
        db.session.commit()
        return jsonify({"message": "信息更新成功", "student": student.to_dict()}), 200


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

# ==========================================
# 模块四：管理员系统 (Admin APIs) - 已合并至 Student
# ==========================================

from functools import wraps

# --- Admin Auth Decorator ---
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 检查请求头中的 X-Admin-Token (即手机号)
        token = request.headers.get('X-Admin-Token')
        if not token:
            return jsonify({"message": "未授权访问"}), 401
        
        # 查找该手机号对应的学生，并检查是否为管理员
        admin_student = Student.query.filter_by(phone=token).first()
        if not admin_student or not admin_student.is_admin:
             return jsonify({"message": "无效的管理权限"}), 403
             
        return f(*args, **kwargs)
    return decorated_function

# 注意：移除了单独的 /api/admin/login，统一使用 /api/students/login
    
@app.route('/api/admin/rotations', methods=['GET', 'POST'])
@admin_required
def manage_rotations():
    """管理周常任务的班级轮换"""
    if request.method == 'GET':
        rotations = WeeklyRotation.query.order_by(WeeklyRotation.week_start_date.desc()).all()
        return jsonify([{
            "id": r.id,
            "weekStartDate": r.week_start_date.isoformat(),
            "assignedClass": r.assigned_class_str
        } for r in rotations])
        
    if request.method == 'POST':
        data = request.get_json()
        try:
            date_obj = datetime.strptime(data['weekStartDate'], "%Y-%m-%d").date()
            # 确保是周一
            if date_obj.weekday() != 0:
                return jsonify({"message": "必须选择周一作为开始日期"}), 400
                
            # 检查是否存在
            existing = WeeklyRotation.query.filter_by(week_start_date=date_obj).first()
            if existing:
                existing.assigned_class_str = data['assignedClass']
                msg = "轮换已更新"
            else:
                new_rotation = WeeklyRotation(
                    week_start_date=date_obj,
                    assigned_class_str=data['assignedClass']
                )
                db.session.add(new_rotation)
                msg = "轮换已创建"
                
            db.session.commit()
            return jsonify({"message": msg}), 201
        except Exception as e:
            return jsonify({"message": str(e)}), 500

@app.route('/api/admin/students', methods=['GET'])
@admin_required
def get_all_students_stats():
    """获取所有学生的统计数据"""
    students = Student.query.all()
    # 按照总时长倒序排序
    student_list = [s.to_dict() for s in students]
    student_list.sort(key=lambda x: x['totalHours'], reverse=True)
    return jsonify(student_list)

@app.route('/api/admin/events', methods=['POST'])
@admin_required
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

# ==========================================
# API 模块四：周常任务系统 (Shift APIs)
# ==========================================

@app.route('/api/shifts/rotation', methods=['GET'])
def get_current_rotation():
    """公开接口：获取当前/指定周的轮值班级信息"""
    date_str = request.args.get('date')
    if date_str:
        try:
            target = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            target = date.today()
    else:
        target = date.today()
    
    # 计算该周周一
    week_start = target - timedelta(days=target.weekday())
    rotation = WeeklyRotation.query.filter_by(week_start_date=week_start).first()
    
    if rotation:
        return jsonify({
            "weekStartDate": rotation.week_start_date.isoformat(),
            "assignedClass": rotation.assigned_class_str
        })
    else:
        return jsonify({"weekStartDate": week_start.isoformat(), "assignedClass": None})

@app.route('/api/shifts', methods=['GET'])
def get_shifts():
    """
    获取所有周常岗位（按星期和时间排序）
    返回格式：按周一到周五分组的岗位列表
    """
    shifts = RecurringShift.query.order_by(
        RecurringShift.day_of_week, 
        RecurringShift.start_time
    ).all()
    return jsonify([s.to_dict() for s in shifts])

@app.route('/api/shifts/<int:shift_id>', methods=['GET'])
def get_shift_detail(shift_id):
    """获取单个岗位详情"""
    shift = RecurringShift.query.get_or_404(shift_id)
    return jsonify(shift.to_dict())

@app.route('/api/shifts/<int:shift_id>/signup', methods=['POST'])
def signup_shift(shift_id):
    """
    学生报名周常任务
    请求体: { studentId: int, date: "2026-02-17" }
    """
    data = request.get_json()
    
    # 验证必填字段
    if 'studentId' not in data or 'date' not in data:
        return jsonify({"message": "缺少必填信息"}), 400
    
    # 验证岗位存在
    shift = RecurringShift.query.get(shift_id)
    if not shift:
        return jsonify({"message": "岗位不存在"}), 404
    
    # 验证学生存在
    student = Student.query.get(data['studentId'])
    if not student:
        return jsonify({"message": "学生不存在"}), 404
    
    # 解析日期
    try:
        signup_date = datetime.strptime(data['date'], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "日期格式错误，应为YYYY-MM-DD"}), 400
    
    # 验证日期是未来的日期
    if signup_date < datetime.now().date():
        return jsonify({"message": "不能报名过去的日期"}), 400
    
    # 验证日期的星期与岗位匹配（周一=1, 周二=2, ..., 周五=5）
    # Python的weekday(): 周一=0, 周日=6，所以需要+1转换
    weekday = signup_date.weekday() + 1
    if weekday > 5:  # 周六周日
        return jsonify({"message": "周常任务仅限工作日（周一到周五）"}), 400
    
    if weekday != shift.day_of_week:
        day_names = {1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五"}
        return jsonify({
            "message": f"日期错误：该岗位是{day_names[shift.day_of_week]}的岗位，您选择的日期是{day_names[weekday]}"
        }), 400
    
    # 检查是否已经报名
    existing = ShiftSignup.query.filter_by(
        shift_id=shift_id,
        student_id=data['studentId'],
        date=signup_date
    ).first()
    
    if existing:
        return jsonify({"message": "您已经报名过该岗位了"}), 400
    
    # 检查容量限制
    signup_count = ShiftSignup.query.filter_by(
        shift_id=shift_id,
        date=signup_date
    ).filter(ShiftSignup.status != 'cancelled').count()
    
    if signup_count >= shift.capacity:
        return jsonify({"message": f"该岗位已满员（容量{shift.capacity}人）"}), 400
    
    # 计算该周的周一日期
    week_start = signup_date - timedelta(days=signup_date.weekday())  # 该周周一
    week_end = week_start + timedelta(days=4)  # 该周周五
    
    # 检查班级轮换限定：只有本周轮值班级的学生才能报名
    rotation = WeeklyRotation.query.filter_by(week_start_date=week_start).first()
    if not rotation:
        return jsonify({"message": "该周尚未设置轮值班级，请联系管理员"}), 400
    
    student_class = f"{student.enrollment_year}-{student.class_number}"
    if student_class != rotation.assigned_class_str:
        return jsonify({
            "message": f"本周轮值班级为 {rotation.assigned_class_str}，您的班级({student_class})不在轮值范围内"
        }), 403
    
    # 检查每周报名次数限制（每人每周最多2个）
    weekly_count = ShiftSignup.query.filter(
        ShiftSignup.student_id == student.id,
        ShiftSignup.date >= week_start,
        ShiftSignup.date <= week_end,
        ShiftSignup.status != 'cancelled'
    ).count()
    
    if weekly_count >= 2:
        return jsonify({"message": "每人每周最多报名2个周常项目"}), 400
    
    # 创建报名记录
    signup = ShiftSignup(
        student_id=data['studentId'],
        shift_id=shift_id,
        date=signup_date,
        status='pending'
    )
    
    db.session.add(signup)
    db.session.commit()
    
    return jsonify({
        "message": "报名成功！",
        "signup": signup.to_dict()
    }), 201

@app.route('/api/shifts/my-signups', methods=['GET'])
def get_my_shift_signups():
    """
    获取我的周常任务报名记录
    参数: phone (query parameter)
    """
    phone = request.args.get('phone')
    if not phone:
        return jsonify({"message": "缺少手机号参数"}), 400
    
    student = Student.query.filter_by(phone=phone).first()
    if not student:
        return jsonify({"message": "学生不存在"}), 404
    
    # 获取该学生的所有报名记录
    signups = ShiftSignup.query.filter_by(student_id=student.id).order_by(ShiftSignup.date.desc()).all()
    
    result = []
    for signup in signups:
        shift = RecurringShift.query.get(signup.shift_id)
        result.append({
            **signup.to_dict(),
            "shiftName": shift.name if shift else "",
            "shiftTime": shift.to_dict()['timeRange'] if shift else ""
        })
    
    return jsonify(result)

# ==========================================
# 管理员API：周常岗位管理
# ==========================================

@app.route('/api/admin/shifts', methods=['GET', 'POST', 'PUT', 'DELETE'])
@admin_required
def admin_manage_shifts():
    """
    管理员管理周常岗位
    GET: 获取所有岗位
    POST: 创建新岗位
    PUT: 更新岗位
    DELETE: 删除岗位
    """
    if request.method == 'GET':
        shifts = RecurringShift.query.order_by(
            RecurringShift.day_of_week,
            RecurringShift.start_time
        ).all()
        return jsonify([s.to_dict() for s in shifts])
    
    elif request.method == 'POST':
        # 创建新岗位
        data = request.get_json()
        try:
            start_time = datetime.strptime(data['startTime'], "%H:%M").time()
            end_time = datetime.strptime(data['endTime'], "%H:%M").time()
            
            shift = RecurringShift(
                name=data['name'],
                day_of_week=int(data['dayOfWeek']),
                start_time=start_time,
                end_time=end_time,
                capacity=int(data.get('capacity', 2)),
                hours_value=float(data.get('hoursValue', 0.5)),
                description=data.get('description', '')
            )
            
            db.session.add(shift)
            db.session.commit()
            
            return jsonify({"message": "岗位创建成功", "shift": shift.to_dict()}), 201
        except Exception as e:
            return jsonify({"message": f"创建失败: {str(e)}"}), 500
    
    elif request.method == 'PUT':
        # 更新岗位
        data = request.get_json()
        shift_id = data.get('id')
        if not shift_id:
            return jsonify({"message": "缺少岗位ID"}), 400
        
        shift = RecurringShift.query.get(shift_id)
        if not shift:
            return jsonify({"message": "岗位不存在"}), 404
        
        try:
            if 'name' in data:
                shift.name = data['name']
            if 'dayOfWeek' in data:
                shift.day_of_week = int(data['dayOfWeek'])
            if 'startTime' in data:
                shift.start_time = datetime.strptime(data['startTime'], "%H:%M").time()
            if 'endTime' in data:
                shift.end_time = datetime.strptime(data['endTime'], "%H:%M").time()
            if 'capacity' in data:
                shift.capacity = int(data['capacity'])
            if 'hoursValue' in data:
                shift.hours_value = float(data['hoursValue'])
            if 'description' in data:
                shift.description = data['description']
            
            db.session.commit()
            return jsonify({"message": "岗位更新成功", "shift": shift.to_dict()})
        except Exception as e:
            return jsonify({"message": f"更新失败: {str(e)}"}), 500
    
    elif request.method == 'DELETE':
        # 删除岗位
        shift_id = request.args.get('id')
        if not shift_id:
            return jsonify({"message": "缺少岗位ID"}), 400
        
        shift = RecurringShift.query.get(shift_id)
        if not shift:
            return jsonify({"message": "岗位不存在"}), 404
        
        db.session.delete(shift)
        db.session.commit()
        
        return jsonify({"message": "岗位删除成功"})

@app.route('/api/admin/shifts/signups', methods=['GET'])
@admin_required
def admin_get_shift_signups():
    """
    管理员查看报名情况 - 返回二维矩阵数据
    参数: 
      - week_start: 周一日期（必填，YYYY-MM-DD）
      - class_name: 班级名称（可选筛选）
    返回: { columns: [...岗位], rows: [...学生及其报名状态] }
    """
    week_start_str = request.args.get('week_start')
    class_filter = request.args.get('class_name', '')
    
    if not week_start_str:
        return jsonify({"message": "请提供week_start参数（周一日期）"}), 400
    
    try:
        week_start = datetime.strptime(week_start_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "日期格式错误"}), 400
    
    week_end = week_start + timedelta(days=4)  # 周五
    
    # 获取该周所有岗位（按星期和时间排序）
    shifts = RecurringShift.query.order_by(
        RecurringShift.day_of_week, RecurringShift.start_time
    ).all()
    
    day_names = {1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五"}
    
    # 构建列：每个岗位一列
    columns = []
    for s in shifts:
        columns.append({
            "id": s.id,
            "label": f"{s.name} {s.start_time.strftime('%H:%M')}({day_names[s.day_of_week]})"
        })
    
    # 获取该周所有报名记录
    signups = ShiftSignup.query.filter(
        ShiftSignup.date >= week_start,
        ShiftSignup.date <= week_end,
        ShiftSignup.status != 'cancelled'
    ).all()
    
    # 按学生聚合
    student_signup_map = {}  # {student_id: {shift_id: status}}
    for signup in signups:
        if signup.student_id not in student_signup_map:
            student_signup_map[signup.student_id] = {}
        student_signup_map[signup.student_id][signup.shift_id] = signup.status
    
    # 获取所有相关学生信息
    student_ids = list(student_signup_map.keys())
    
    # 如果指定了班级筛选，加载该班级所有学生（含未报名的）
    if class_filter:
        parts = class_filter.split('-')
        if len(parts) == 2:
            try:
                year = int(parts[0])
                cls = int(parts[1])
                all_students_in_class = Student.query.filter_by(
                    enrollment_year=year, class_number=cls, is_admin=False
                ).all()
                # 合并：已报名 + 未报名的该班级学生
                for stu in all_students_in_class:
                    if stu.id not in student_signup_map:
                        student_signup_map[stu.id] = {}
                student_ids = list(student_signup_map.keys())
            except ValueError:
                pass
    
    students = Student.query.filter(Student.id.in_(student_ids)).all() if student_ids else []
    student_info = {s.id: s for s in students}
    
    # 如果有班级筛选，只保留该班级的学生
    if class_filter:
        filtered_ids = [
            sid for sid in student_ids 
            if sid in student_info and student_info[sid].full_class_name == class_filter
        ]
    else:
        filtered_ids = student_ids
    
    # 构建行
    rows = []
    for sid in filtered_ids:
        stu = student_info.get(sid)
        if not stu:
            continue
        signup_data = student_signup_map.get(sid, {})
        rows.append({
            "studentId": sid,
            "name": stu.name,
            "class": stu.full_class_name,
            "signups": {str(s.id): signup_data.get(s.id) for s in shifts}
        })
    
    # 按名字排序
    rows.sort(key=lambda r: r['name'])
    
    # 获取所有班级列表（供前端下拉框用）
    all_classes = db.session.query(
        Student.enrollment_year, Student.class_number
    ).filter(Student.is_admin == False).distinct().all()
    class_list = sorted([f"{y}-{c}" for y, c in all_classes])
    
    return jsonify({
        "columns": columns,
        "rows": rows,
        "classList": class_list,
        "weekStart": week_start_str
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
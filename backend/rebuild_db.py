#!/usr/bin/env python3
"""强制重建数据库脚本"""
import os
import sys

# 删除旧数据库
db_path = "instance/volunteer.db"
if os.path.exists(db_path):
    os.remove(db_path)
    print(f"已删除旧数据库: {db_path}")

# 导入应用
from app import app, db, Student, RecurringShift
from datetime import datetime

# 创建应用上下文
with app.app_context():
    # 删除所有表
    db.drop_all()
    print("已删除所有旧表")
    
    # 重新创建所有表
    db.create_all()
    print("数据库表结构创建成功。")
    
    # 1. 创建默认管理员
    admin_exists = Student.query.filter_by(phone="admin").first()
    if not admin_exists:
        admin_student = Student(
            name="Admin",
            phone="admin",
            password="admin123",  # 管理员默认密码
            enrollment_year=2020,
            class_number=0,
            is_admin=True
        )
        db.session.add(admin_student)
        db.session.commit()
        print("默认管理员创建成功: admin / admin123")
    
    # 2. 创建周常岗位数据
    if RecurringShift.query.first():
        print("周常岗位数据已存在，跳过初始化。")
    else:
        shifts_data = []
        
        # 周二到周五：早上文明礼仪站岗 (7:35-7:55)
        for day in [2, 3, 4, 5]:
            shifts_data.append({
                "name": "文明礼仪站岗",
                "day": day,
                "start": "07:35",
                "end": "07:55",
                "capacity": 2,
                "hours": 0.5,
                "desc": "校门口文明礼仪站岗"
            })
        
        # 周一到周五：中午食堂志愿 (11:40-12:00)
        for day in [1, 2, 3, 4, 5]:
            shifts_data.append({
                "name": "食堂志愿",
                "day": day,
                "start": "11:40",
                "end": "12:00",
                "capacity": 2,
                "hours": 0.5,
                "desc": "食堂午餐时段志愿服务"
            })
        
        # 周二到周四：下午文明礼仪站岗 (16:45-17:05，即4:45-5:05)
        for day in [2, 3, 4]:
            shifts_data.append({
                "name": "文明礼仪站岗",
                "day": day,
                "start": "16:45",
                "end": "17:05",
                "capacity": 2,
                "hours": 0.5,
                "desc": "校门口文明礼仪站岗"
            })
        
        # 周五：下午文明礼仪站岗（提前30分钟：16:15-16:35，即4:15-4:35）
        shifts_data.append({
            "name": "文明礼仪站岗",
            "day": 5,
            "start": "16:15",
            "end": "16:35",
            "capacity": 2,
            "hours": 0.5,
            "desc": "校门口文明礼仪站岗（周五提前）"
        })
        
        # 周一到周四：下午食堂志愿 (17:10-17:20，即5:10-5:20)
        for day in [1, 2, 3, 4]:
            shifts_data.append({
                "name": "食堂志愿",
                "day": day,
                "start": "17:10",
                "end": "17:20",
                "capacity": 2,
                "hours": 0.5,
                "desc": "食堂晚餐时段志愿服务"
            })
        
        # 周五：下午食堂志愿（提前30分钟：16:40-16:50，即4:40-4:50）
        shifts_data.append({
            "name": "食堂志愿",
            "day": 5,
            "start": "16:40",
            "end": "16:50",
            "capacity": 2,
            "hours": 0.5,
            "desc": "食堂晚餐时段志愿服务（周五提前）"
        })
        
        # 创建所有岗位
        shifts = []
        for data in shifts_data:
            shift = RecurringShift(
                name=data["name"],
                day_of_week=data["day"],
                start_time=datetime.strptime(data["start"], "%H:%M").time(),
                end_time=datetime.strptime(data["end"], "%H:%M").time(),
                capacity=data["capacity"],
                hours_value=data["hours"],
                description=data["desc"]
            )
            shifts.append(shift)
        
        db.session.add_all(shifts)
        db.session.commit()
        print(f"周常岗位数据初始化完成！共创建{len(shifts)}个岗位。")
        print("时间安排说明：")
        print("  - 周一：无文明礼仪站岗，只有食堂志愿")
        print("  - 周二到周四：正常时间")
        print("  - 周五：下午活动提前30分钟")
        print("  - 所有岗位容量：2人")

print("\\n数据库初始化完成！")

# backend/init_db.py

# 【修改点】因为文件就在 backend 目录下，直接从 app 导入即可
from app import app, db, RecurringShift 

def init_data():
    with app.app_context():
        # 1. 创建所有表
        db.create_all()
        print("数据库表结构创建成功。")

        # 2. 检查是否已经有数据
        if RecurringShift.query.first():
            print("数据已存在，跳过初始化。")
            return

        # 3. 写入周常岗位数据
        shifts = []
        # 创建周一到周五 (1-5) 的固定岗位
        for day in range(1, 6): 
            # 食堂午餐 (11:40 - 12:00)
            shifts.append(RecurringShift(
                name="食堂志愿", day_of_week=day, 
                start_time_str="11:40", end_time_str="12:00", 
                capacity=2, hours_value=0.5
            ))
            # 食堂晚餐 (17:10 - 17:20)
            shifts.append(RecurringShift(
                name="食堂志愿", day_of_week=day, 
                start_time_str="17:10", end_time_str="17:20", 
                capacity=2, hours_value=0.5
            ))
            # 文明礼仪 (07:35 - 07:55)
            shifts.append(RecurringShift(
                name="文明礼仪站岗", day_of_week=day, 
                start_time_str="07:35", end_time_str="07:55", 
                capacity=4, hours_value=0.5
            ))
        
        db.session.add_all(shifts)
        db.session.commit()
        print("周常岗位数据初始化完成！")

if __name__ == "__main__":
    init_data()
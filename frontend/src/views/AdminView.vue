<template>
  <div class="container">
    <div class="glass-panel admin-container">
      <header class="admin-header">
        <div class="flex-between">
          <h2>管理员后台</h2>
        </div>
        <div class="tabs">
          <button 
            v-for="tab in ['活动管理', '工时审核', '学生数据', '周常管理']" 
            :key="tab"
            class="tab-btn"
            :class="{ active: currentTab === tab }"
            @click="currentTab = tab"
          >
            {{ tab }}
            <span v-if="tab === '工时审核' && attendanceSummary.totalPending > 0" class="badge-pending-count">
              {{ attendanceSummary.totalPending }}
            </span>
          </button>
        </div>
      </header>

      <!-- Tab 1: 活动管理 -->
      <div v-if="currentTab === '活动管理'" class="tab-content">
        <div class="events-management-header">
          <div>
            <h3>校园活动管理</h3>
            <p class="section-desc">
              在此管理所有校园活动。支持修改活动时间、招募名额、工时分值、地点等参数，亦可发布新活动或删除活动。
            </p>
          </div>
          <div class="header-btn-group">
            <button @click="loadAdminEvents" class="btn-sm btn-secondary" :disabled="loadingEvents">
              {{ loadingEvents ? '加载中...' : '🔄 刷新列表' }}
            </button>
            <button @click="openCreateEventModal" class="btn-sm btn-primary">
              ➕ 发布新活动
            </button>
          </div>
        </div>

        <div v-if="loadingEvents" class="loading-state">
          <p>正在加载活动列表...</p>
        </div>

        <div v-else-if="adminEvents.length === 0" class="empty-state-card">
          <p>当前暂无校园活动，点击上方「发布新活动」开始创建吧！</p>
          <button @click="openCreateEventModal" class="btn-primary" style="margin-top: 12px;">
            立即发布活动
          </button>
        </div>

        <div v-else class="admin-events-grid">
          <div v-for="ev in adminEvents" :key="ev.id" class="admin-event-card">
            <div class="admin-event-card-top">
              <div class="event-title-badge-group">
                <span class="status-badge" :class="getEventStatusClass(ev.status)">
                  {{ ev.status }}
                </span>
                <h4 class="event-card-title">{{ ev.title }}</h4>
              </div>
              <span class="hours-tag">⏱️ {{ ev.hoursValue }} 小时</span>
            </div>

            <p v-if="ev.description" class="event-card-desc">{{ ev.description }}</p>

            <div class="event-card-details">
              <div class="detail-line">
                <span class="detail-label">📍 地点：</span><strong>{{ ev.location || '未填写' }}</strong>
              </div>
              <div class="detail-line">
                <span class="detail-label">🕒 活动时间：</span><span>{{ formatFullTime(ev.startTime) }} 至 {{ formatFullTime(ev.endTime) }}</span>
              </div>
              <div class="detail-line">
                <span class="detail-label">⏰ 报名截止：</span><span>{{ formatFullTime(ev.registrationDeadline) }}</span>
              </div>
              <div class="detail-line">
                <span class="detail-label">👥 招募名额：</span><strong>{{ ev.currentVolunteers }} / {{ ev.requiredVolunteers }} 人</strong>
                <span v-if="ev.gradeLimit && ev.gradeLimit !== 'ALL'" class="grade-limit-tag">
                  (限 {{ ev.gradeLimit }} 级)
                </span>
              </div>
              <div v-if="ev.leaderName" class="detail-line">
                <span class="detail-label">👤 负责人：</span><span>{{ ev.leaderName }} {{ ev.leaderContact ? `(${ev.leaderContact})` : '' }}</span>
              </div>
            </div>

            <div class="admin-event-actions">
              <router-link :to="`/events/${ev.id}`" class="btn-sm btn-secondary" target="_blank">
                👁️ 查看前台
              </router-link>
              <button @click="openEditEventModal(ev)" class="btn-sm btn-edit-event">
                ✏️ 修改活动
              </button>
              <button @click="handleDeleteEvent(ev)" class="btn-sm btn-delete-event">
                🗑️ 删除活动
              </button>
            </div>
          </div>
        </div>

        <!-- 活动编辑/发布 模态弹窗 -->
        <div v-if="isEventModalOpen" class="modal-backdrop" @click.self="closeEventModal">
          <div class="glass-panel modal-card">
            <div class="modal-header">
              <h3>{{ isEditingEvent ? '✏️ 修改活动详情' : '➕ 发布新校园活动' }}</h3>
              <button @click="closeEventModal" class="btn-close-modal" aria-label="关闭">&times;</button>
            </div>

            <form @submit.prevent="handleSaveEvent" class="modal-body">
              <div class="form-group">
                <label>活动标题 <span class="required-star">*</span></label>
                <input v-model="eventForm.title" placeholder="例如：图书馆志愿整理服务" required />
              </div>

              <div class="form-group">
                <label>活动详细描述</label>
                <textarea v-model="eventForm.description" rows="3" placeholder="填写活动注意事项、岗位要求等"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>活动地点 <span class="required-star">*</span></label>
                  <input v-model="eventForm.location" placeholder="例如：校图书馆三楼" required />
                </div>
                <div class="form-group">
                  <label>志愿工时 (小时) <span class="required-star">*</span></label>
                  <input v-model="eventForm.hoursValue" type="number" step="0.1" min="0.1" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>开始时间 <span class="required-star">*</span></label>
                  <input v-model="eventForm.startTime" type="datetime-local" required />
                </div>
                <div class="form-group">
                  <label>结束时间 <span class="required-star">*</span></label>
                  <input v-model="eventForm.endTime" type="datetime-local" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>报名截止时间 <span class="required-star">*</span></label>
                  <input v-model="eventForm.registrationDeadline" type="datetime-local" required />
                </div>
                <div class="form-group">
                  <label>招募名额 (人) <span class="required-star">*</span></label>
                  <input v-model="eventForm.requiredVolunteers" type="number" min="1" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>年级限制</label>
                  <input v-model="eventForm.gradeLimit" placeholder="ALL 或如 2023,2024" />
                  <small class="hint">填写 ALL 表示面向全校，多个年级用逗号分隔</small>
                </div>
                <div class="form-group">
                  <label>负责人姓名</label>
                  <input v-model="eventForm.leaderName" placeholder="例如：李老师 / 张同学" />
                </div>
                <div class="form-group">
                  <label>负责人联系方式</label>
                  <input v-model="eventForm.leaderContact" placeholder="手机号或微信" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" @click="closeEventModal" class="btn-sm btn-secondary">
                  取消
                </button>
                <button type="submit" class="btn-primary" :disabled="loading">
                  {{ loading ? '保存中...' : (isEditingEvent ? '保存修改' : '立即发布') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Tab: 工时审核 -->
      <div v-if="currentTab === '工时审核'" class="tab-content">
        <div class="attendance-header-section">
          <div>
            <h3>项目考勤与工时审核</h3>
            <p class="section-desc">
              当活动或周常值日结束时，参与者将自动归为待确认状态。仅当管理员确认【已完成】后，系统才会累计服务工时。
            </p>
          </div>
          <button @click="loadAttendance" class="btn-sm btn-secondary" :disabled="attendanceLoading">
            {{ attendanceLoading ? '刷新中...' : '🔄 刷新考勤数据' }}
          </button>
        </div>

        <!-- 汇总指标卡片 -->
        <div class="summary-metric-cards">
          <div class="metric-card metric-pending">
            <div class="metric-num">{{ attendanceSummary.totalPending }}</div>
            <div class="metric-label">待审核确认 (人次)</div>
          </div>
          <div class="metric-card metric-completed">
            <div class="metric-num">{{ attendanceSummary.totalCompleted }}</div>
            <div class="metric-label">已确认完成 (人次)</div>
          </div>
          <div class="metric-card metric-uncompleted">
            <div class="metric-num">{{ attendanceSummary.totalUncompleted }}</div>
            <div class="metric-label">标记未完成 (人次)</div>
          </div>
        </div>

        <!-- 分类切换与筛选工具栏 -->
        <div class="attendance-filter-bar">
          <div class="category-tabs">
            <button 
              class="cat-tab-btn" 
              :class="{ active: projectCategory === 'all' }"
              @click="projectCategory = 'all'"
            >
              全部项目 ({{ attendanceEvents.length + attendanceShifts.length }})
            </button>
            <button 
              class="cat-tab-btn" 
              :class="{ active: projectCategory === 'events' }"
              @click="projectCategory = 'events'"
            >
              校园活动 ({{ attendanceEvents.length }})
            </button>
            <button 
              class="cat-tab-btn" 
              :class="{ active: projectCategory === 'shifts' }"
              @click="projectCategory = 'shifts'"
            >
              周常岗位 ({{ attendanceShifts.length }})
            </button>
          </div>

          <div class="status-toggle-box">
            <label class="checkbox-label">
              <input type="checkbox" v-model="filterOnlyPending" />
              <span>仅看待确认名单</span>
            </label>
          </div>
        </div>

        <div v-if="attendanceLoading" class="loading-state">
          <p>正在加载考勤与工时审核数据...</p>
        </div>

        <div v-else class="attendance-project-list">
          <!-- 1. 校园活动分类展示 -->
          <div v-if="projectCategory === 'all' || projectCategory === 'events'" class="project-category-block">
            <h4 class="category-block-title">
              <span>📅 校园活动分类 ({{ filteredEvents.length }} 项)</span>
            </h4>

            <div v-if="filteredEvents.length === 0" class="empty-block">
              暂无需要审核的校园活动记录
            </div>

            <div v-for="ev in filteredEvents" :key="ev.id" class="attendance-card">
              <div class="attendance-card-header">
                <div class="card-title-group">
                  <span class="project-type-tag tag-event">活动</span>
                  <h4 class="project-title">{{ ev.title }}</h4>
                  <span class="status-tag" :class="ev.isEnded ? 'tag-ended' : 'tag-active'">
                    {{ ev.isEnded ? '已结束（待审核）' : '进行中' }}
                  </span>
                  <span class="hours-chip">+{{ ev.hoursValue }} 小时/人</span>
                </div>

                <div class="card-action-group">
                  <span class="pending-badge" v-if="ev.pendingCount > 0">
                    {{ ev.pendingCount }} 人待确认
                  </span>
                  <button 
                    @click="batchConfirmEvent(ev.id, 'completed')" 
                    class="btn-sm btn-batch"
                    :disabled="ev.pendingCount === 0"
                    title="将本活动所有待审核学生一键确认为已完成"
                  >
                    ✓ 一键全员完成
                  </button>
                </div>
              </div>

              <div class="project-meta-info">
                <span>📍 地点: {{ ev.location || '未设定' }}</span>
                <span>🕒 时间: {{ formatDateTime(ev.startTime) }} - {{ formatDateTime(ev.endTime) }}</span>
                <span>👥 报名人数: {{ ev.totalParticipants }} / {{ ev.requiredVolunteers }} 人</span>
              </div>

              <div class="attendance-table-wrapper">
                <table v-if="ev.participants.length > 0">
                  <thead>
                    <tr>
                      <th>学生姓名</th>
                      <th>班级</th>
                      <th>手机号</th>
                      <th>报名时间</th>
                      <th>考勤审核状态</th>
                      <th>审核操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="p in getDisplayParticipants(ev.participants)" 
                      :key="p.signupId"
                      :class="{ 'row-pending': p.status === 'pending' }"
                    >
                      <td class="font-bold">{{ p.name }}</td>
                      <td>{{ p.className }}</td>
                      <td>{{ p.phone }}</td>
                      <td>{{ formatDateTime(p.signupTime) }}</td>
                      <td>
                        <span class="state-pill" :class="'state-' + p.status">
                          {{ getAttendanceStatusText(p.status) }}
                        </span>
                      </td>
                      <td class="action-cell">
                        <button 
                          @click="changeEventStatus(p.signupId, 'completed')"
                          class="btn-act btn-pass"
                          :disabled="p.status === 'completed'"
                          title="确认完成，发放工时"
                        >
                          确认完成
                        </button>
                        <button 
                          @click="changeEventStatus(p.signupId, 'uncompleted')"
                          class="btn-act btn-fail"
                          :disabled="p.status === 'uncompleted'"
                          title="标记未完成，不计工时"
                        >
                          未完成
                        </button>
                        <button 
                          v-if="p.status === 'completed' || p.status === 'uncompleted'"
                          @click="changeEventStatus(p.signupId, 'pending')"
                          class="btn-act btn-reset"
                          title="撤销并重置为待审核"
                        >
                          重置
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-subtext">暂无学生报名</div>
              </div>
            </div>
          </div>

          <!-- 2. 周常岗位分类展示 -->
          <div v-if="projectCategory === 'all' || projectCategory === 'shifts'" class="project-category-block">
            <h4 class="category-block-title">
              <span>🗓️ 周常岗位值日分类 ({{ filteredShifts.length }} 组)</span>
            </h4>

            <div v-if="filteredShifts.length === 0" class="empty-block">
              暂无周常岗位值日考勤记录
            </div>

            <div v-for="sh in filteredShifts" :key="sh.key" class="attendance-card">
              <div class="attendance-card-header">
                <div class="card-title-group">
                  <span class="project-type-tag tag-shift">周常</span>
                  <h4 class="project-title">{{ sh.shiftName }} · {{ sh.date }} ({{ sh.dayName }})</h4>
                  <span class="status-tag" :class="sh.isEnded ? 'tag-ended' : 'tag-active'">
                    {{ sh.isEnded ? '值日结束（待审核）' : '待值日' }}
                  </span>
                  <span class="hours-chip">+{{ sh.hoursValue }} 小时/人</span>
                </div>

                <div class="card-action-group">
                  <span class="pending-badge" v-if="sh.pendingCount > 0">
                    {{ sh.pendingCount }} 人待确认
                  </span>
                  <button 
                    @click="batchConfirmShift(sh.shiftId, sh.date, 'completed')" 
                    class="btn-sm btn-batch"
                    :disabled="sh.pendingCount === 0"
                    title="将本日该岗位所有待审核学生一键确认为已完成"
                  >
                    ✓ 一键全员完成
                  </button>
                </div>
              </div>

              <div class="project-meta-info">
                <span>🕒 时段: {{ sh.timeRange }}</span>
                <span>📅 日期: {{ sh.date }} ({{ sh.dayName }})</span>
                <span>👥 参与学生: {{ sh.participants.length }} 人</span>
              </div>

              <div class="attendance-table-wrapper">
                <table v-if="sh.participants.length > 0">
                  <thead>
                    <tr>
                      <th>学生姓名</th>
                      <th>班级</th>
                      <th>手机号</th>
                      <th>报名时间</th>
                      <th>考勤审核状态</th>
                      <th>审核操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="p in getDisplayParticipants(sh.participants)" 
                      :key="p.signupId"
                      :class="{ 'row-pending': p.status === 'pending' }"
                    >
                      <td class="font-bold">{{ p.name }}</td>
                      <td>{{ p.className }}</td>
                      <td>{{ p.phone }}</td>
                      <td>{{ formatDateTime(p.signupTime) }}</td>
                      <td>
                        <span class="state-pill" :class="'state-' + p.status">
                          {{ getAttendanceStatusText(p.status) }}
                        </span>
                      </td>
                      <td class="action-cell">
                        <button 
                          @click="changeShiftStatus(p.signupId, 'completed')"
                          class="btn-act btn-pass"
                          :disabled="p.status === 'completed'"
                          title="确认完成，发放工时"
                        >
                          确认完成
                        </button>
                        <button 
                          @click="changeShiftStatus(p.signupId, 'uncompleted')"
                          class="btn-act btn-fail"
                          :disabled="p.status === 'uncompleted'"
                          title="标记未完成，不计工时"
                        >
                          未完成
                        </button>
                        <button 
                          v-if="p.status === 'completed' || p.status === 'uncompleted'"
                          @click="changeShiftStatus(p.signupId, 'pending')"
                          class="btn-act btn-reset"
                          title="撤销并重置为待审核"
                        >
                          重置
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="empty-subtext">暂无学生报名</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: 学生数据 -->
      <div v-if="currentTab === '学生数据'" class="tab-content">
        <h3>学生时长统计</h3>
        
        <div class="filter-row">
          <div class="search-box">
            <label>搜索姓名:</label>
            <input v-model="searchName" type="text" placeholder="输入学生姓名" />
          </div>
          
          <div class="search-box">
            <label>筛选班级:</label>
            <select v-model="selectedClass">
              <option value="">全部班级</option>
              <option v-for="cls in uniqueClasses" :key="cls" :value="cls">
                {{ cls }}
              </option>
            </select>
          </div>
          
          <button @click="loadStudents" class="btn-sm btn-secondary">刷新数据</button>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>班级</th>
                <th>总时长</th>
                <th>手机号</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in filteredStudents" :key="student.id">
                <td>{{ student.name }}</td>
                <td>{{ student.fullClassName }}</td>
                <td class="font-bold text-primary">{{ student.totalHours }}h</td>
                <td>{{ student.phone }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: 周常管理（合并了班级轮换和周常岗位管理） -->
      <div v-if="currentTab === '周常管理'" class="tab-content">
        
        <!-- 区域1: 班级轮换设置 -->
        <div class="section-block">
          <h3>班级轮换设置</h3>
          <div class="rotation-form">
            <div class="form-row">
              <div class="form-group">
                <label>周一日期（一周开始）</label>
                <input v-model="rotationForm.weekStartDate" type="date" required />
                <small class="hint">必须选择周一的日期</small>
              </div>
              <div class="form-group">
                <label>轮值班级（格式: 入学年份-班级号）</label>
                <input v-model="rotationForm.assignedClass" placeholder="例如: 2023-1" required />
              </div>
              <div class="form-group" style="display: flex; align-items: flex-end;">
                <button @click="handleSetRotation" class="btn-primary" :disabled="loading">保存设置</button>
              </div>
            </div>
          </div>

          <div v-if="rotations.length > 0" class="rotation-list">
            <div v-for="rot in rotations" :key="rot.id" class="rotation-item">
              <span class="rot-date">{{ rot.weekStartDate }}</span>
              <span class="arrow">➡️</span>
              <span class="rot-class">{{ rot.assignedClass }}</span>
            </div>
          </div>
          <p v-else class="empty-text">暂无轮换记录</p>
        </div>

        <hr style="margin: 24px 0; border-color: rgba(69, 196, 176, 0.3);" />

        <!-- 区域2: 报名统计查询（二维表格） -->
        <div class="section-block">
          <h3>报名统计查询</h3>
          <div class="form-row">
            <div class="form-group">
              <label>选择周一日期</label>
              <input type="date" v-model="matrixWeekStart" />
            </div>
            <div class="form-group">
              <label>选择班级</label>
              <select v-model="matrixClassFilter">
                <option value="">-- 请选择班级 --</option>
                <option v-for="cls in matrixClassList" :key="cls" :value="cls">{{ cls }}</option>
              </select>
            </div>
            <div class="form-group" style="display: flex; align-items: flex-end;">
              <button @click="loadMatrixData" class="btn-sm btn-primary">查询</button>
            </div>
          </div>

          <div v-if="matrixColumns.length > 0 && matrixClassFilter" class="matrix-section">
            <p class="matrix-info">
              班级 <strong>{{ matrixClassFilter }}</strong> · 周 {{ matrixWeekStart }} · {{ matrixRows.length }} 名学生
            </p>
            <div class="table-container matrix-table-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th class="sticky-col">姓名</th>
                    <th v-for="col in matrixColumns" :key="col.id" class="matrix-header">
                      {{ col.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in matrixRows" :key="row.studentId">
                    <td class="sticky-col student-name">{{ row.name }}</td>
                    <td v-for="col in matrixColumns" :key="col.id" class="matrix-cell">
                      <span v-if="row.signups[String(col.id)]" class="check-mark">✅</span>
                      <span v-else class="empty-cell">—</span>
                    </td>
                  </tr>
                  <tr v-if="matrixRows.length === 0">
                    <td :colspan="matrixColumns.length + 1" style="text-align: center; color: var(--text-muted); padding: 20px;">
                      该班级暂无报名记录
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div v-else-if="matrixWeekStart && !matrixClassFilter" class="empty-text">
            请选择班级查看报名情况
          </div>
        </div>


      </div>

    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { store } from '../store';
import apiClient from '../services/api';

const router = useRouter();
const route = useRoute();
const currentTab = ref('活动管理');
const loading = ref(false);

// 活动管理状态
const adminEvents = ref([]);
const loadingEvents = ref(false);
const isEventModalOpen = ref(false);
const isEditingEvent = ref(false);
const editingEventId = ref(null);

// 工时审核状态
const attendanceLoading = ref(false);
const attendanceSummary = ref({ totalPending: 0, totalCompleted: 0, totalUncompleted: 0 });
const attendanceEvents = ref([]);
const attendanceShifts = ref([]);
const projectCategory = ref('all'); // 'all' | 'events' | 'shifts'
const filterOnlyPending = ref(false);

const eventForm = reactive({
  title: '', description: '', startTime: '', endTime: '', 
  registrationDeadline: '', location: '', requiredVolunteers: 10, 
  hoursValue: 2.0, gradeLimit: 'ALL', leaderName: '', leaderContact: ''
});

const rotationForm = reactive({
  weekStartDate: '',
  assignedClass: ''
});

const rotations = ref([]);
const students = ref([]);

// 周常管理
const allShifts = ref([]);
const loadingShifts = ref(false);

// 二维表格
const matrixWeekStart = ref('');
const matrixClassFilter = ref('');
const matrixColumns = ref([]);
const matrixRows = ref([]);
const matrixClassList = ref([]);

// 学生数据筛选
const searchName = ref('');
const selectedClass = ref('');

const uniqueClasses = computed(() => {
  if (!students.value || students.value.length === 0) return [];
  const classes = students.value.map(s => s.fullClassName).filter(Boolean);
  return [...new Set(classes)].sort();
});

const filteredStudents = computed(() => {
  return students.value.filter(student => {
    const nameMatch = !searchName.value || student.name.includes(searchName.value);
    const classMatch = !selectedClass.value || student.fullClassName === selectedClass.value;
    return nameMatch && classMatch;
  });
});

// 活动管理相关方法
const toDatetimeLocal = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
};

const formatFullTime = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getEventStatusClass = (status) => {
  if (status === '招募中') return 'status-recruiting';
  if (status === '进行中') return 'status-ongoing';
  if (status === '已满员') return 'status-full';
  if (status === '已结束') return 'status-ended';
  return 'status-closed';
};

const loadAdminEvents = async () => {
  loadingEvents.value = true;
  try {
    const res = await apiClient.get('/admin/events');
    adminEvents.value = res.data;
  } catch (err) {
    console.error('加载活动列表失败:', err);
  } finally {
    loadingEvents.value = false;
  }
};

const openCreateEventModal = () => {
  isEditingEvent.value = false;
  editingEventId.value = null;
  Object.keys(eventForm).forEach((k) => (eventForm[k] = ''));
  eventForm.requiredVolunteers = 10;
  eventForm.hoursValue = 2.0;
  eventForm.gradeLimit = 'ALL';
  isEventModalOpen.value = true;
};

const openEditEventModal = (ev) => {
  isEditingEvent.value = true;
  editingEventId.value = ev.id;
  eventForm.title = ev.title || '';
  eventForm.description = ev.description || '';
  eventForm.location = ev.location || '';
  eventForm.startTime = toDatetimeLocal(ev.startTime);
  eventForm.endTime = toDatetimeLocal(ev.endTime);
  eventForm.registrationDeadline = toDatetimeLocal(ev.registrationDeadline);
  eventForm.requiredVolunteers = ev.requiredVolunteers || 10;
  eventForm.hoursValue = ev.hoursValue !== undefined ? ev.hoursValue : 2.0;
  eventForm.gradeLimit = ev.gradeLimit || 'ALL';
  eventForm.leaderName = ev.leaderName || '';
  eventForm.leaderContact = ev.leaderContact || '';
  isEventModalOpen.value = true;
};

const closeEventModal = () => {
  isEventModalOpen.value = false;
  isEditingEvent.value = false;
  editingEventId.value = null;
};

const handleSaveEvent = async () => {
  loading.value = true;
  try {
    if (isEditingEvent.value && editingEventId.value) {
      await apiClient.put(`/admin/events/${editingEventId.value}`, eventForm);
      alert('活动修改成功！');
    } else {
      await apiClient.post('/admin/events', eventForm);
      alert('活动发布成功！');
    }
    closeEventModal();
    await loadAdminEvents();
    await loadAttendance();
  } catch (error) {
    alert(
      (isEditingEvent.value ? '修改失败: ' : '发布失败: ') +
        (error.response?.data?.message || error.message)
    );
  } finally {
    loading.value = false;
  }
};

const handleDeleteEvent = async (ev) => {
  if (!confirm(`确定要删除活动「${ev.title}」吗？删除后该活动及相关数据将被彻底清除。`)) return;
  try {
    await apiClient.delete(`/admin/events/${ev.id}`);
    alert('活动删除成功！');
    await loadAdminEvents();
    await loadAttendance();
  } catch (err) {
    alert('删除失败: ' + (err.response?.data?.message || err.message));
  }
};

const loadRotations = async () => {
  try {
    const res = await apiClient.get('/admin/rotations');
    rotations.value = res.data;
  } catch (e) {
    console.error(e);
  }
};

const handleSetRotation = async () => {
  if (!rotationForm.weekStartDate || !rotationForm.assignedClass) return alert('请填写完整');
  loading.value = true;
  try {
    await apiClient.post('/admin/rotations', rotationForm);
    alert('设置成功');
    loadRotations();
  } catch (e) {
    alert(e.response?.data?.message || '设置失败');
  } finally {
    loading.value = false;
  }
};

const loadStudents = async () => {
  try {
    const res = await apiClient.get('/admin/students');
    students.value = res.data;
  } catch (e) {
    console.error(e);
  }
};

// 周常管理方法
const loadAllShifts = async () => {
  loadingShifts.value = true;
  try {
    const res = await apiClient.get('/admin/shifts');
    allShifts.value = res.data;
  } catch (e) {
    console.error('加载岗位失败:', e);
  } finally {
    loadingShifts.value = false;
  }
};

// 二维表格加载
const loadMatrixData = async () => {
  if (!matrixWeekStart.value) {
    alert('请先选择周一日期');
    return;
  }
  
  try {
    const params = { week_start: matrixWeekStart.value };
    if (matrixClassFilter.value) {
      params.class_name = matrixClassFilter.value;
    }
    const res = await apiClient.get('/admin/shifts/signups', { params });
    matrixColumns.value = res.data.columns;
    matrixRows.value = res.data.rows;
    matrixClassList.value = res.data.classList;
  } catch (e) {
    console.error('加载报名矩阵失败:', e);
    alert('加载失败: ' + (e.response?.data?.message || e.message));
  }
};

// 先加载班级列表（不需要class_name参数）
const loadClassList = async () => {
  if (!matrixWeekStart.value) return;
  try {
    const res = await apiClient.get('/admin/shifts/signups', { 
      params: { week_start: matrixWeekStart.value } 
    });
    matrixClassList.value = res.data.classList;
  } catch (e) {
    console.error('加载班级列表失败:', e);
  }
};

const getDayName = (day) => {
  const dayNames = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五' };
  return dayNames[day] || '';
};

// 考勤与工时审核相关计算属性与方法
const filteredEvents = computed(() => {
  if (!filterOnlyPending.value) return attendanceEvents.value;
  return attendanceEvents.value.filter((e) => e.pendingCount > 0);
});

const filteredShifts = computed(() => {
  if (!filterOnlyPending.value) return attendanceShifts.value;
  return attendanceShifts.value.filter((s) => s.pendingCount > 0);
});

const getDisplayParticipants = (list) => {
  if (!filterOnlyPending.value) return list;
  return list.filter((p) => p.status === 'pending');
};

const getAttendanceStatusText = (status) => {
  const map = {
    pending: '⏳ 待审核确认',
    completed: '✅ 已完成 (工时已发)',
    uncompleted: '❌ 未完成 (0工时)',
    signed_up: '📝 已报名 (未结束)',
  };
  return map[status] || status;
};

const formatDateTime = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const loadAttendance = async () => {
  attendanceLoading.value = true;
  try {
    const res = await apiClient.get('/admin/attendance');
    attendanceSummary.value = res.data.summary || { totalPending: 0, totalCompleted: 0, totalUncompleted: 0 };
    attendanceEvents.value = res.data.events || [];
    attendanceShifts.value = res.data.shifts || [];
  } catch (err) {
    console.error('加载考勤审核数据失败:', err);
  } finally {
    attendanceLoading.value = false;
  }
};

const changeEventStatus = async (signupId, status) => {
  try {
    await apiClient.put('/admin/attendance/event-signup', { signupId, status });
    await loadAttendance();
  } catch (err) {
    alert('操作失败: ' + (err.response?.data?.message || err.message));
  }
};

const changeShiftStatus = async (signupId, status) => {
  try {
    await apiClient.put('/admin/attendance/shift-signup', { signupId, status });
    await loadAttendance();
  } catch (err) {
    alert('操作失败: ' + (err.response?.data?.message || err.message));
  }
};

const batchConfirmEvent = async (eventId, status) => {
  if (!confirm('确认将该活动所有待审核学生批量标记为【已完成】并核发工时吗？')) return;
  try {
    await apiClient.post('/admin/attendance/batch', { type: 'event', id: eventId, status });
    await loadAttendance();
  } catch (err) {
    alert('批量操作失败: ' + (err.response?.data?.message || err.message));
  }
};

const batchConfirmShift = async (shiftId, date, status) => {
  if (!confirm(`确认将该岗位在 ${date} 的所有待审核学生批量标记为【已完成】并核发工时吗？`)) return;
  try {
    await apiClient.post('/admin/attendance/batch', { type: 'shift', id: shiftId, date, status });
    await loadAttendance();
  } catch (err) {
    alert('批量操作失败: ' + (err.response?.data?.message || err.message));
  }
};

// 生命周期
onMounted(async () => {
  if (route.query.tab) {
    currentTab.value = route.query.tab;
  }
  await Promise.all([loadAdminEvents(), loadAttendance()]);
  if (route.query.editId) {
    const target = adminEvents.value.find((e) => e.id === Number(route.query.editId));
    if (target) {
      openEditEventModal(target);
    }
  }
});

watch(currentTab, (newTab) => {
  if (newTab === '活动管理') loadAdminEvents();
  if (newTab === '工时审核') loadAttendance();
  if (newTab === '学生数据') loadStudents();
  if (newTab === '周常管理') {
    loadRotations();
    loadAllShifts();
  }
});

// 当周一日期改变时，自动加载班级列表
watch(matrixWeekStart, () => {
  matrixClassFilter.value = '';
  matrixColumns.value = [];
  matrixRows.value = [];
  loadClassList();
});
</script>

<style scoped>
.admin-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 30px;
}

.admin-header {
  margin-bottom: 30px;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 10px 24px;
  border: 2px solid #012030;
  background: #ffffff;
  cursor: pointer;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: #13678A;
  border-radius: 2px;
  box-shadow: 2px 2px 0px #012030;
  transition: all 0.15s;
}

.tab-btn:hover {
  background: #DAFDBA;
  color: #012030;
}

.tab-btn.active {
  border-color: #012030;
  color: #012030;
  background: #45C4B0;
  box-shadow: 4px 4px 0px #012030;
  transform: translate(-1px, -1px);
}

.tab-content {
  padding-top: 20px;
}

.form-group {
  margin-bottom: 16px;
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: #012030;
}

.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #012030;
  border-radius: 2px;
  color: #012030;
  font-weight: 600;
  background: #ffffff;
  box-sizing: border-box;
}

.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: #012030;
  box-shadow: 3px 3px 0px #45C4B0;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-logout {
  background: #DAFDBA;
  color: #012030;
  border: 2px solid #012030;
  padding: 6px 16px;
  border-radius: 2px;
  font-weight: 800;
  letter-spacing: 0.03em;
  box-shadow: 2px 2px 0px #012030;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-logout:hover {
  background: #45C4B0;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #012030;
}

.btn-logout:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px #012030;
}

.table-container {
  overflow-x: auto;
  margin-top: 16px;
  border: 2px solid #012030;
  box-shadow: 4px 4px 0px #012030;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 14px;
  border: 1px solid #012030;
  text-align: left;
}

th {
  background: #DAFDBA;
  color: #012030;
  font-weight: 800;
  border-bottom: 2px solid #012030;
}

td {
  color: #012030;
  font-weight: 600;
  background: #ffffff;
}

.rotation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.rotation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #ffffff;
  border: 2px solid #012030;
  border-left: 6px solid #13678A;
  border-radius: 2px;
  box-shadow: 3px 3px 0px #012030;
}

.rot-date { font-weight: 700; color: #13678A; }
.rot-class { font-weight: 800; color: #012030; }

.empty-text {
  text-align: center;
  color: #13678A;
  font-weight: 600;
  padding: 16px;
}

/* 筛选框样式 */
.filter-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
}

.search-box label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  color: #012030;
}

.search-box input,
.search-box select {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #012030;
  border-radius: 2px;
  font-weight: 600;
  color: #012030;
  box-sizing: border-box;
}

.hint { font-size: 0.8rem; color: #13678A; font-weight: 600; display: block; margin-top: 4px; }
.mb-4 { margin-bottom: 16px; }
.font-bold { font-weight: 800; }
.text-primary { color: #13678A; }

/* 周常管理样式 */
.section-block {
  margin-bottom: 8px;
}

.shifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.shift-admin-card {
  padding: 16px;
  transition: transform 0.15s, box-shadow 0.15s;
  background: #ffffff;
  border: 2px solid #012030;
  border-left: 6px solid #45C4B0;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
}

.shift-admin-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0px #012030;
}

.shift-admin-card .shift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #012030;
}

.shift-admin-card .shift-name {
  font-weight: 800;
  color: #012030;
  font-size: 1.05rem;
}

.shift-day-badge {
  background: #13678A;
  color: white;
  padding: 4px 10px;
  border: 1px solid #012030;
  border-radius: 2px;
  font-size: 0.85rem;
  font-weight: 700;
}

.shift-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #13678A;
}

.detail-row .icon { font-size: 1rem; }
.detail-row .description { font-size: 0.85rem; font-style: italic; color: #012030; }

/* 二维矩阵表格样式 */
.matrix-section {
  margin-top: 20px;
}

.matrix-info {
  margin-bottom: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #13678A;
}

.matrix-table-container {
  max-height: 500px;
  overflow: auto;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
}

.matrix-table {
  border-collapse: separate;
  border-spacing: 0;
  width: auto;
  min-width: 100%;
}

.matrix-table th, .matrix-table td {
  padding: 10px 12px;
  white-space: nowrap;
  border: 1px solid #012030;
}

.matrix-header {
  font-size: 0.85rem;
  font-weight: 800;
  text-align: center;
  background: #DAFDBA;
  color: #012030;
  min-width: 100px;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: #ffffff;
  z-index: 1;
  border-right: 2px solid #012030;
  min-width: 80px;
}

thead .sticky-col {
  background: #DAFDBA;
  color: #012030;
  font-weight: 800;
  z-index: 2;
  border-right: 2px solid #012030;
}

.student-name {
  font-weight: 700;
  color: #012030;
}

.matrix-cell {
  text-align: center;
}

.check-mark {
  font-size: 1.1rem;
}

.empty-cell {
  color: #13678A;
  opacity: 0.4;
}

@media (max-width: 768px) {
  .shifts-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    flex-direction: column;
  }
}

/* 工时审核模块专属样式 */
.badge-pending-count {
  display: inline-block;
  background: #ff5252;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 10px;
  margin-left: 6px;
  border: 1px solid #012030;
  vertical-align: middle;
}

.attendance-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.section-desc {
  margin-top: 6px;
  color: #13678A;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5;
  max-width: 750px;
}

/* 汇总指标卡片 */
.summary-metric-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  padding: 16px 20px;
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 3px 3px 0px #012030;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-pending {
  border-left: 6px solid #e17055;
  background: #fff9f6;
}

.metric-completed {
  border-left: 6px solid #45C4B0;
  background: #f4fbf9;
}

.metric-uncompleted {
  border-left: 6px solid #636e72;
  background: #fdfdfd;
}

.metric-num {
  font-size: 2rem;
  font-weight: 900;
  color: #012030;
  line-height: 1;
}

.metric-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #13678A;
}

/* 筛选工具栏 */
.attendance-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 12px 16px;
  border: 2px solid #012030;
  box-shadow: 3px 3px 0px #012030;
  border-radius: 2px;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cat-tab-btn {
  padding: 6px 16px;
  background: #f8f9fa;
  border: 2px solid #012030;
  border-radius: 2px;
  font-weight: 800;
  font-size: 0.9rem;
  color: #13678A;
  cursor: pointer;
  box-shadow: 2px 2px 0px #012030;
  transition: all 0.15s;
}

.cat-tab-btn:hover {
  background: #DAFDBA;
  color: #012030;
}

.cat-tab-btn.active {
  background: #45C4B0;
  color: #012030;
  box-shadow: 3px 3px 0px #012030;
  transform: translate(-1px, -1px);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #012030;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* 项目分类展示块 */
.project-category-block {
  margin-bottom: 32px;
}

.category-block-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #012030;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #012030;
}

.attendance-card {
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
  margin-bottom: 20px;
  padding: 20px;
}

.attendance-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.project-type-tag {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px 8px;
  border: 1px solid #012030;
  border-radius: 2px;
}

.tag-event { background: #45C4B0; color: #012030; }
.tag-shift { background: #9AEBA3; color: #012030; }

.project-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #012030;
  margin: 0;
}

.status-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 8px;
  border: 1px solid #012030;
  border-radius: 2px;
}

.tag-ended {
  background: #ffe3e3;
  color: #d63031;
}

.tag-active {
  background: #DAFDBA;
  color: #012030;
}

.hours-chip {
  font-size: 0.8rem;
  font-weight: 800;
  background: #012030;
  color: #DAFDBA;
  padding: 3px 8px;
  border-radius: 2px;
}

.card-action-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pending-badge {
  font-size: 0.8rem;
  font-weight: 800;
  background: #ffeaa7;
  color: #d63031;
  border: 1px solid #012030;
  padding: 4px 8px;
  border-radius: 2px;
}

.btn-batch {
  background: #45C4B0;
  color: #012030;
  border: 2px solid #012030;
  font-weight: 800;
  box-shadow: 2px 2px 0px #012030;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 2px;
  transition: all 0.15s;
}

.btn-batch:hover:not(:disabled) {
  background: #9AEBA3;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #012030;
}

.btn-batch:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.project-meta-info {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #13678A;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.attendance-table-wrapper {
  overflow-x: auto;
  border: 2px solid #012030;
}

.row-pending {
  background: #fffdf5;
}

.state-pill {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 2px;
  border: 1.5px solid #012030;
}

.state-pending {
  background: #ffeaa7;
  color: #6c5ce7;
  box-shadow: 1.5px 1.5px 0px #012030;
}

.state-completed {
  background: #DAFDBA;
  color: #012030;
  box-shadow: 1.5px 1.5px 0px #012030;
}

.state-uncompleted {
  background: #ffe3e3;
  color: #d63031;
  box-shadow: 1.5px 1.5px 0px #012030;
}

.state-signed_up {
  background: #e8f4f8;
  color: #13678A;
  box-shadow: 1.5px 1.5px 0px #012030;
}

.action-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-act {
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: 800;
  border: 1.5px solid #012030;
  border-radius: 2px;
  cursor: pointer;
  box-shadow: 1.5px 1.5px 0px #012030;
  transition: all 0.15s;
}

.btn-pass {
  background: #45C4B0;
  color: #012030;
}

.btn-pass:hover:not(:disabled) {
  background: #9AEBA3;
  transform: translate(-1px, -1px);
}

.btn-fail {
  background: #ffffff;
  color: #d63031;
}

.btn-fail:hover:not(:disabled) {
  background: #ffe3e3;
  transform: translate(-1px, -1px);
}

.btn-reset {
  background: #dfe6e9;
  color: #012030;
}

.btn-act:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.empty-block {
  text-align: center;
  padding: 24px;
  background: #ffffff;
  border: 2px solid #012030;
  color: #13678A;
  font-weight: 600;
  border-radius: 2px;
}

.empty-subtext {
  padding: 16px;
  text-align: center;
  color: #13678A;
  font-weight: 600;
}

/* 活动管理专属样式 */
.events-management-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-btn-group {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.empty-state-card {
  padding: 48px 24px;
  text-align: center;
  background: #ffffff;
  border: 2px solid #012030;
  box-shadow: 4px 4px 0px #012030;
  border-radius: 2px;
  color: #13678A;
  font-weight: 700;
}

.admin-events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.admin-event-card {
  background: #ffffff;
  border: 2px solid #012030;
  border-radius: 2px;
  box-shadow: 4px 4px 0px #012030;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.15s, box-shadow 0.15s;
}

.admin-event-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0px #012030;
}

.admin-event-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.event-title-badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.event-card-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #012030;
  margin: 0;
}

.event-card-desc {
  font-size: 0.9rem;
  color: #13678A;
  margin-bottom: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-card-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: #012030;
  margin-bottom: 18px;
  background: #f8fbfb;
  padding: 10px 12px;
  border: 1.5px solid #012030;
  border-radius: 2px;
}

.detail-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.detail-label {
  color: #13678A;
  font-weight: 600;
}

.grade-limit-tag {
  font-size: 0.8rem;
  color: #e17055;
  font-weight: 700;
}

.admin-event-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 12px;
  border-top: 1.5px solid rgba(1, 32, 48, 0.15);
}

.btn-edit-event {
  background: #DAFDBA;
  color: #012030;
  border: 2px solid #012030;
  font-weight: 800;
  padding: 6px 12px;
  border-radius: 2px;
  box-shadow: 2px 2px 0px #012030;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-edit-event:hover {
  background: #45C4B0;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #012030;
}

.btn-delete-event {
  background: #ffffff;
  color: #d63031;
  border: 2px solid #012030;
  font-weight: 800;
  padding: 6px 12px;
  border-radius: 2px;
  box-shadow: 2px 2px 0px #012030;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-delete-event:hover {
  background: #ffe3e3;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #012030;
}

/* 模态弹窗样式 */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(1, 32, 48, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 680px;
  max-height: 90vh;
  overflow-y: auto;
  background: #ffffff;
  border: 2px solid #012030;
  box-shadow: 6px 6px 0px #012030;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #012030;
  padding-bottom: 12px;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  color: #012030;
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #012030;
  cursor: pointer;
  padding: 0 4px;
}

.btn-close-modal:hover {
  color: #d63031;
}

.required-star {
  color: #d63031;
  font-weight: 900;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid #012030;
}

/* 活动状态标签 */
.status-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 3px 8px;
  border: 1.5px solid #012030;
  border-radius: 2px;
}

.status-recruiting {
  background: #45C4B0;
  color: #012030;
}

.status-ongoing {
  background: #ffeaa7;
  color: #012030;
}

.status-full {
  background: #fdcb6e;
  color: #012030;
}

.status-ended {
  background: #dfe6e9;
  color: #636e72;
}

.status-closed {
  background: #ff7675;
  color: #ffffff;
}
</style>
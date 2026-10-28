<template>
  <div class="container">
    <header class="editorial-header">
      <div class="header-main">
        <div class="editorial-kicker">INDEX // 04 — SYSTEM CONSOLE</div>
        <h1 class="editorial-title">管理员系统后台<span class="editorial-dot">.</span></h1>
        <p class="editorial-subtitle">统筹活动编排、考勤工时核发、台账补录与班级轮值管理。</p>
      </div>
    </header>

    <div class="glass-panel admin-container">
      <header class="admin-header">
        <div class="tabs">
          <button 
            v-for="(tab, idx) in ['活动管理', '工时审核', '工时补录', '学生数据', '周常管理']" 
            :key="tab"
            class="tab-btn"
            :class="{ active: currentTab === tab }"
            @click="currentTab = tab"
          >
            <span class="tab-idx">0{{ idx + 1 }}</span>
            <span>{{ tab }}</span>
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
              <RefreshCw :size="15" :stroke-width="2.4" class="icon-inline" /> {{ loadingEvents ? '加载中...' : '刷新列表' }}
            </button>
            <button @click="openCreateEventModal" class="btn-sm btn-primary">
              <Plus :size="16" :stroke-width="2.6" class="icon-inline" /> 发布新活动
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
              <span class="hours-tag"><Clock :size="14" :stroke-width="2.4" class="icon-inline" /> {{ ev.hoursValue }} 小时</span>
            </div>

            <p v-if="ev.description" class="event-card-desc">{{ ev.description }}</p>

            <div class="event-card-details">
              <div class="detail-line">
                <span class="detail-label"><MapPin :size="14" :stroke-width="2.3" class="icon-inline" /> 地点：</span><strong>{{ ev.location || '未填写' }}</strong>
              </div>
              <div class="detail-line">
                <span class="detail-label"><Clock :size="14" :stroke-width="2.3" class="icon-inline" /> 活动时间：</span><span>{{ formatFullTime(ev.startTime) }} 至 {{ formatFullTime(ev.endTime) }}</span>
              </div>
              <div class="detail-line">
                <span class="detail-label"><Hourglass :size="14" :stroke-width="2.3" class="icon-inline" /> 报名截止：</span><span>{{ formatFullTime(ev.registrationDeadline) }}</span>
              </div>
              <div class="detail-line">
                <span class="detail-label"><Users :size="14" :stroke-width="2.3" class="icon-inline" /> 招募名额：</span><strong>{{ ev.currentVolunteers }} / {{ ev.requiredVolunteers }} 人</strong>
                <span v-if="ev.gradeLimit && ev.gradeLimit !== 'ALL'" class="grade-limit-tag">
                  (限 {{ ev.gradeLimit }} 级)
                </span>
              </div>
              <div v-if="ev.leaderName" class="detail-line">
                <span class="detail-label"><User :size="14" :stroke-width="2.3" class="icon-inline" /> 负责人：</span><span>{{ ev.leaderName }} {{ ev.leaderContact ? `(${ev.leaderContact})` : '' }}</span>
              </div>
            </div>

            <div class="admin-event-actions">
              <router-link :to="`/events/${ev.id}`" class="btn-sm btn-secondary" target="_blank">
                <Eye :size="14" :stroke-width="2.3" class="icon-inline" /> 查看前台
              </router-link>
              <button @click="openEditEventModal(ev)" class="btn-sm btn-edit-event">
                <Pencil :size="14" :stroke-width="2.3" class="icon-inline" /> 修改活动
              </button>
              <button @click="handleDeleteEvent(ev)" class="btn-sm btn-delete-event">
                <Trash2 :size="14" :stroke-width="2.3" class="icon-inline" /> 删除活动
              </button>
            </div>
          </div>
        </div>

        <!-- 活动编辑/发布 模态弹窗 -->
        <div v-if="isEventModalOpen" class="modal-backdrop" @click.self="closeEventModal">
          <div class="glass-panel modal-card">
            <div class="modal-header">
              <h3>
                <Pencil v-if="isEditingEvent" :size="18" :stroke-width="2.4" class="icon-inline" />
                <Plus v-else :size="18" :stroke-width="2.6" class="icon-inline" />
                {{ isEditingEvent ? '修改活动详情' : '发布新校园活动' }}
              </h3>
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
            <RefreshCw :size="15" :stroke-width="2.4" class="icon-inline" /> {{ attendanceLoading ? '刷新中...' : '刷新考勤数据' }}
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
              <span><Calendar :size="18" :stroke-width="2.4" class="icon-inline" /> 校园活动分类 ({{ filteredEvents.length }} 项)</span>
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
                    <Check :size="15" :stroke-width="2.6" class="icon-inline" /> 一键全员完成
                  </button>
                </div>
              </div>

              <div class="project-meta-info">
                <span><MapPin :size="14" :stroke-width="2.3" class="icon-inline" /> 地点: {{ ev.location || '未设定' }}</span>
                <span><Clock :size="14" :stroke-width="2.3" class="icon-inline" /> 时间: {{ formatDateTime(ev.startTime) }} - {{ formatDateTime(ev.endTime) }}</span>
                <span><Users :size="14" :stroke-width="2.3" class="icon-inline" /> 报名人数: {{ ev.totalParticipants }} / {{ ev.requiredVolunteers }} 人</span>
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
              <span><CalendarClock :size="18" :stroke-width="2.4" class="icon-inline" /> 周常岗位值日分类 ({{ filteredShifts.length }} 组)</span>
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
                    <Check :size="15" :stroke-width="2.6" class="icon-inline" /> 一键全员完成
                  </button>
                </div>
              </div>

              <div class="project-meta-info">
                <span><Clock :size="14" :stroke-width="2.3" class="icon-inline" /> 时段: {{ sh.timeRange }}</span>
                <span><Calendar :size="14" :stroke-width="2.3" class="icon-inline" /> 日期: {{ sh.date }} ({{ sh.dayName }})</span>
                <span><Users :size="14" :stroke-width="2.3" class="icon-inline" /> 参与学生: {{ sh.participants.length }} 人</span>
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

      <!-- Tab 3: 工时补录 -->
      <div v-if="currentTab === '工时补录'" class="tab-content">
        <div class="events-management-header">
          <div>
            <h3>志愿工时补录中心</h3>
            <p class="section-desc">
              用于补录历史活动、线下临时调配或单个学生的志愿服务时长。补录后直接计入学生总时长并在其个人主页展示为<strong>[补录]</strong>记录，不会污染活动大厅。
            </p>
          </div>
          <div class="category-tabs">
            <button
              class="cat-tab-btn"
              :class="{ active: makeupMode === 'event' }"
              @click="makeupMode = 'event'"
            >
              <ClipboardList :size="16" :stroke-width="2.4" class="icon-inline" /> 1. 按活动批量补录
            </button>
            <button
              class="cat-tab-btn"
              :class="{ active: makeupMode === 'student' }"
              @click="makeupMode = 'student'"
            >
              <UserPlus :size="16" :stroke-width="2.4" class="icon-inline" /> 2. 按单个学生补录
            </button>
          </div>
        </div>

        <!-- 模式 1：按活动批量补录 -->
        <div v-if="makeupMode === 'event'" class="makeup-panel">
          <div class="makeup-step-card">
            <div class="step-badge-header">
              <span class="step-num">STEP 1</span>
              <h4>设定补录活动信息</h4>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>快速关联已有活动（可选，也可直接手动填写下方信息）</label>
                <select v-model="batchMakeupForm.selectedEventId" @change="handleSelectExistingEvent">
                  <option value="">-- 自定义填写新补录活动（不绑定现有活动） --</option>
                  <option v-for="ev in adminEvents" :key="ev.id" :value="ev.id">
                    {{ ev.title }} （{{ ev.hoursValue }}h · {{ formatFullTime(ev.startTime) }}）
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label>活动名称 / 补录事由 *</label>
                <input v-model="batchMakeupForm.title" placeholder="例如：2026秋季迎新志愿服务 / 图书馆突击整理" />
              </div>
              <div class="form-group">
                <label>服务日期 *</label>
                <input v-model="batchMakeupForm.date" type="date" />
              </div>
              <div class="form-group">
                <label>每人补录工时 (小时) *</label>
                <input v-model="batchMakeupForm.hoursValue" type="number" step="0.5" min="0.5" />
              </div>
            </div>

            <div class="form-group">
              <label>补录备注说明（选填）</label>
              <input v-model="batchMakeupForm.description" placeholder="例如：线下纸质签到表补录、临时增援志愿者等" />
            </div>
          </div>

          <div class="makeup-step-card">
            <div class="step-badge-header">
              <span class="step-num">STEP 2</span>
              <h4>批量勾选参与学生（已选 {{ batchMakeupForm.studentIds.length }} 人）</h4>
            </div>

            <div class="filter-row makeup-filter-row">
              <div class="search-box">
                <label>按班级筛选:</label>
                <select v-model="batchFilterClass">
                  <option value="">全部班级</option>
                  <option v-for="cls in uniqueClasses" :key="cls" :value="cls">{{ cls }}</option>
                </select>
              </div>
              <div class="search-box">
                <label>搜索姓名/手机:</label>
                <input v-model="batchSearchQuery" type="text" placeholder="输入姓名或手机号过滤..." />
              </div>
              <div class="batch-select-actions">
                <button type="button" @click="selectAllFilteredBatchStudents" class="btn-sm btn-secondary">
                  全选当前筛选 ({{ batchFilteredStudents.length }})
                </button>
                <button type="button" @click="clearBatchSelectedStudents" class="btn-sm btn-reset">
                  清空已选
                </button>
              </div>
            </div>

            <!-- 已选学生标签预览 -->
            <div v-if="selectedBatchStudentObjects.length > 0" class="selected-pills-box">
              <span class="pills-label">已选名单：</span>
              <span v-for="stu in selectedBatchStudentObjects" :key="stu.id" class="stu-pill">
                {{ stu.name }} ({{ stu.fullClassName }})
                <button type="button" class="pill-remove" @click="toggleBatchStudent(stu.id)">×</button>
              </span>
            </div>

            <div class="student-checkbox-grid">
              <label
                v-for="stu in batchFilteredStudents"
                :key="stu.id"
                class="student-check-card"
                :class="{ checked: batchMakeupForm.studentIds.includes(stu.id) }"
              >
                <input
                  type="checkbox"
                  :value="stu.id"
                  v-model="batchMakeupForm.studentIds"
                />
                <div class="stu-card-info">
                  <span class="stu-card-name">{{ stu.name }}</span>
                  <span class="stu-card-meta">{{ stu.fullClassName }} · 现有 {{ stu.totalHours }}h</span>
                </div>
              </label>
              <div v-if="batchFilteredStudents.length === 0" class="empty-subtext" style="grid-column: 1 / -1;">
                未找到匹配的学生
              </div>
            </div>

            <div class="makeup-submit-bar">
              <div class="submit-summary">
                将为 <strong>{{ batchMakeupForm.studentIds.length }}</strong> 名学生每人补录
                <strong>{{ batchMakeupForm.hoursValue || 0 }}</strong> 小时工时
              </div>
              <button
                type="button"
                @click="handleSubmitBatchMakeup"
                class="btn-primary"
                :disabled="makeupSubmitting"
              >
                <Check v-if="!makeupSubmitting" :size="16" :stroke-width="2.6" class="icon-inline" />
                {{ makeupSubmitting ? '正在提交补录...' : '确认批量补录工时' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 模式 2：按单个学生进行补录 -->
        <div v-if="makeupMode === 'student'" class="makeup-panel">
          <div class="makeup-two-col">
            <!-- 左侧：查找并选择学生 -->
            <div class="makeup-step-card">
              <div class="step-badge-header">
                <span class="step-num">STEP 1</span>
                <h4>选择目标学生</h4>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>筛选班级</label>
                  <select v-model="singleFilterClass">
                    <option value="">全部班级</option>
                    <option v-for="cls in uniqueClasses" :key="cls" :value="cls">{{ cls }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>搜索姓名或手机号</label>
                  <input v-model="singleSearchQuery" type="text" placeholder="输入姓名或手机号..." />
                </div>
              </div>

              <div class="single-student-list">
                <div
                  v-for="stu in singleFilteredStudents"
                  :key="stu.id"
                  class="single-stu-item"
                  :class="{ active: singleMakeupForm.studentId === stu.id }"
                  @click="selectSingleStudent(stu)"
                >
                  <div>
                    <span class="stu-item-name">{{ stu.name }}</span>
                    <span class="stu-item-class">{{ stu.fullClassName }}</span>
                  </div>
                  <div class="stu-item-right">
                    <span class="stu-item-phone">{{ stu.phone }}</span>
                    <span class="stu-item-hours">当前 {{ stu.totalHours }}h</span>
                  </div>
                </div>
                <div v-if="singleFilteredStudents.length === 0" class="empty-subtext">
                  无匹配学生
                </div>
              </div>
            </div>

            <!-- 右侧：填写补录详情 -->
            <div class="makeup-step-card">
              <div class="step-badge-header">
                <span class="step-num">STEP 2</span>
                <h4>填写补录项目详情</h4>
              </div>

              <div v-if="selectedSingleStudentObj" class="selected-target-banner">
                <div>
                  当前选中：<strong>{{ selectedSingleStudentObj.name }}</strong>
                  （{{ selectedSingleStudentObj.fullClassName }} · {{ selectedSingleStudentObj.phone }}）
                </div>
                <span class="hours-chip">当前累计：{{ selectedSingleStudentObj.totalHours }} 小时</span>
              </div>
              <div v-else class="unselected-target-banner">
                <ArrowLeft :size="16" :stroke-width="2.5" class="icon-inline" /> 请先在左侧列表中点击选择一名要补录的学生
              </div>

              <div class="form-group">
                <label>补录项目名称 / 事由 *</label>
                <input v-model="singleMakeupForm.title" placeholder="例如：校运会后勤保障补录 / 独立志愿任务" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>服务日期 *</label>
                  <input v-model="singleMakeupForm.date" type="date" />
                </div>
                <div class="form-group">
                  <label>补录工时 (小时) *</label>
                  <input v-model="singleMakeupForm.hoursValue" type="number" step="0.5" min="0.5" />
                </div>
              </div>

              <div class="form-group">
                <label>备注说明（选填）</label>
                <textarea v-model="singleMakeupForm.description" rows="2" placeholder="填写补录原因或证明人信息..."></textarea>
              </div>

              <button
                type="button"
                @click="handleSubmitSingleMakeup"
                class="btn-primary"
                style="width: 100%; margin-top: 8px;"
                :disabled="makeupSubmitting || !singleMakeupForm.studentId"
              >
                <Check v-if="!makeupSubmitting" :size="16" :stroke-width="2.6" class="icon-inline" />
                {{ makeupSubmitting ? '提交中...' : '确认给该学生补录工时' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 底部：近期工时补录台账记录 -->
        <div class="makeup-history-section">
          <div class="flex-between" style="margin-bottom: 12px;">
            <h4 class="category-block-title" style="margin-bottom: 0;">
              <span><History :size="18" :stroke-width="2.4" class="icon-inline" /> 近期工时补录记录台账 ({{ makeupRecords.length }} 条)</span>
            </h4>
            <button @click="loadMakeupRecords" class="btn-sm btn-secondary">
              <RefreshCw :size="14" :stroke-width="2.4" class="icon-inline" /> 刷新记录
            </button>
          </div>

          <div class="table-container" v-if="makeupRecords.length > 0">
            <table>
              <thead>
                <tr>
                  <th>学生姓名</th>
                  <th>班级</th>
                  <th>补录项目 / 事由</th>
                  <th>服务日期</th>
                  <th>补录工时</th>
                  <th>备注说明</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rec in makeupRecords" :key="rec.id">
                  <td class="font-bold">{{ rec.studentName }}</td>
                  <td>{{ rec.className }}</td>
                  <td>{{ rec.title }}</td>
                  <td>{{ rec.date }}</td>
                  <td class="font-bold text-primary">+{{ rec.hoursValue }}h</td>
                  <td>{{ rec.description || '—' }}</td>
                  <td>
                    <button
                      @click="handleDeleteMakeupRecord(rec)"
                      class="btn-act btn-fail"
                      title="撤销此条补录并扣减对应工时"
                    >
                      撤销补录
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-block">
            暂无工时补录记录
          </div>
        </div>
      </div>

      <!-- Tab 4: 学生数据 -->
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
              <span class="arrow"><ArrowRight :size="16" :stroke-width="2.5" class="icon-inline" /></span>
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
                      <span v-if="row.signups[String(col.id)]" class="check-mark"><CheckCircle2 :size="17" :stroke-width="2.5" class="icon-inline" /></span>
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
import {
  Plus,
  RefreshCw,
  MapPin,
  Clock,
  User,
  Users,
  Pencil,
  Trash2,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Hourglass,
  ClipboardList,
  UserPlus,
  History,
  ArrowRight,
  ArrowLeft,
  Eye,
} from '../components/icons';

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

// 工时补录状态与方法
const makeupMode = ref('event'); // 'event' | 'student'
const makeupRecords = ref([]);
const makeupSubmitting = ref(false);

const todayDateStr = new Date().toISOString().split('T')[0];

const batchMakeupForm = reactive({
  selectedEventId: '',
  title: '',
  date: todayDateStr,
  hoursValue: 2.0,
  description: '',
  studentIds: []
});
const batchFilterClass = ref('');
const batchSearchQuery = ref('');

const singleMakeupForm = reactive({
  studentId: null,
  title: '',
  date: todayDateStr,
  hoursValue: 1.0,
  description: ''
});
const singleFilterClass = ref('');
const singleSearchQuery = ref('');

const batchFilteredStudents = computed(() => {
  return students.value.filter((stu) => {
    const classOk = !batchFilterClass.value || stu.fullClassName === batchFilterClass.value;
    const q = batchSearchQuery.value.trim();
    const queryOk = !q || stu.name.includes(q) || (stu.phone && stu.phone.includes(q));
    return classOk && queryOk;
  });
});

const selectedBatchStudentObjects = computed(() => {
  const idSet = new Set(batchMakeupForm.studentIds);
  return students.value.filter((s) => idSet.has(s.id));
});

const singleFilteredStudents = computed(() => {
  return students.value.filter((stu) => {
    const classOk = !singleFilterClass.value || stu.fullClassName === singleFilterClass.value;
    const q = singleSearchQuery.value.trim();
    const queryOk = !q || stu.name.includes(q) || (stu.phone && stu.phone.includes(q));
    return classOk && queryOk;
  });
});

const selectedSingleStudentObj = computed(() => {
  if (!singleMakeupForm.studentId) return null;
  return students.value.find((s) => s.id === singleMakeupForm.studentId) || null;
});

const handleSelectExistingEvent = () => {
  if (!batchMakeupForm.selectedEventId) return;
  const ev = adminEvents.value.find((e) => e.id === Number(batchMakeupForm.selectedEventId));
  if (ev) {
    batchMakeupForm.title = ev.title;
    batchMakeupForm.hoursValue = ev.hoursValue;
    if (ev.startTime) {
      batchMakeupForm.date = new Date(ev.startTime).toISOString().split('T')[0];
    }
  }
};

const selectAllFilteredBatchStudents = () => {
  const currentSet = new Set(batchMakeupForm.studentIds);
  batchFilteredStudents.value.forEach((stu) => currentSet.add(stu.id));
  batchMakeupForm.studentIds = Array.from(currentSet);
};

const clearBatchSelectedStudents = () => {
  batchMakeupForm.studentIds = [];
};

const toggleBatchStudent = (id) => {
  const idx = batchMakeupForm.studentIds.indexOf(id);
  if (idx >= 0) {
    batchMakeupForm.studentIds.splice(idx, 1);
  } else {
    batchMakeupForm.studentIds.push(id);
  }
};

const selectSingleStudent = (stu) => {
  singleMakeupForm.studentId = stu.id;
};

const loadMakeupRecords = async () => {
  try {
    const res = await apiClient.get('/admin/makeup');
    makeupRecords.value = res.data || [];
  } catch (err) {
    console.error('加载补录记录失败:', err);
  }
};

const handleSubmitBatchMakeup = async () => {
  if (!batchMakeupForm.title.trim()) {
    return alert('请填写活动名称或补录事由');
  }
  if (!batchMakeupForm.hoursValue || Number(batchMakeupForm.hoursValue) <= 0) {
    return alert('请输入大于 0 的补录工时');
  }
  if (batchMakeupForm.studentIds.length === 0) {
    return alert('请至少勾选一名参与学生');
  }

  makeupSubmitting.value = true;
  try {
    const res = await apiClient.post('/admin/makeup/event', {
      title: batchMakeupForm.title.trim(),
      date: batchMakeupForm.date,
      hoursValue: Number(batchMakeupForm.hoursValue),
      description: batchMakeupForm.description.trim(),
      eventId: batchMakeupForm.selectedEventId ? Number(batchMakeupForm.selectedEventId) : null,
      studentIds: batchMakeupForm.studentIds
    });
    alert(res.data?.message || '批量补录成功！');
    batchMakeupForm.studentIds = [];
    batchMakeupForm.selectedEventId = '';
    batchMakeupForm.title = '';
    batchMakeupForm.description = '';
    await Promise.all([loadMakeupRecords(), loadStudents()]);
  } catch (err) {
    alert('批量补录失败: ' + (err.response?.data?.message || err.message));
  } finally {
    makeupSubmitting.value = false;
  }
};

const handleSubmitSingleMakeup = async () => {
  if (!singleMakeupForm.studentId) {
    return alert('请先在左侧选择一名目标学生');
  }
  if (!singleMakeupForm.title.trim()) {
    return alert('请填写补录项目名称或事由');
  }
  if (!singleMakeupForm.hoursValue || Number(singleMakeupForm.hoursValue) <= 0) {
    return alert('请输入大于 0 的补录工时');
  }

  makeupSubmitting.value = true;
  try {
    const res = await apiClient.post('/admin/makeup/student', {
      studentId: singleMakeupForm.studentId,
      title: singleMakeupForm.title.trim(),
      date: singleMakeupForm.date,
      hoursValue: Number(singleMakeupForm.hoursValue),
      description: singleMakeupForm.description.trim()
    });
    alert(res.data?.message || '学生工时补录成功！');
    singleMakeupForm.title = '';
    singleMakeupForm.description = '';
    await Promise.all([loadMakeupRecords(), loadStudents()]);
  } catch (err) {
    alert('补录失败: ' + (err.response?.data?.message || err.message));
  } finally {
    makeupSubmitting.value = false;
  }
};

const handleDeleteMakeupRecord = async (rec) => {
  if (!confirm(`确定要撤销给「${rec.studentName}」补录的「${rec.title} (+${rec.hoursValue}h)」吗？撤销后该工时将从学生总时长中扣除。`)) {
    return;
  }
  try {
    await apiClient.delete(`/admin/makeup/${rec.id}`);
    await Promise.all([loadMakeupRecords(), loadStudents()]);
  } catch (err) {
    alert('撤销失败: ' + (err.response?.data?.message || err.message));
  }
};

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
    pending: '待审核确认',
    completed: '已完成 (工时已发)',
    uncompleted: '未完成 (0工时)',
    signed_up: '已报名 (未结束)',
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
  if (newTab === '工时补录') {
    loadStudents();
    loadAdminEvents();
    loadMakeupRecords();
  }
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
  max-width: 1180px;
  margin: 0 auto;
  padding: 0;
  background: var(--surface-white);
  border-top: var(--rule-heavy);
  border-left: var(--hairline);
  border-right: var(--hairline);
  border-bottom: var(--hairline);
}

.admin-header {
  border-bottom: var(--hairline);
  background: var(--bg-color);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 26px;
  border: none;
  border-right: var(--hairline);
  background: transparent;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted);
  position: relative;
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.tab-idx {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-subtle);
}

.tab-btn:hover {
  background: var(--surface-white);
  color: var(--c-dark);
}

.tab-btn.active {
  color: var(--c-dark);
  font-weight: 800;
  background: var(--surface-white);
}

.tab-btn.active .tab-idx {
  color: var(--c-teal);
  font-weight: 700;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--c-teal);
}

.tab-content {
  padding: 32px;
}

.form-group {
  margin-bottom: 16px;
  flex: 1;
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

.table-container {
  overflow-x: auto;
  margin-top: 16px;
  border: var(--hairline);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 16px;
  border-bottom: var(--hairline);
  border-right: var(--hairline);
  text-align: left;
  font-size: 0.88rem;
}

th:last-child, td:last-child {
  border-right: none;
}

th {
  background: var(--bg-color);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: var(--rule-heavy);
}

td {
  color: var(--c-dark);
  font-weight: 500;
  background: var(--surface-white);
}

.rotation-list {
  display: flex;
  flex-direction: column;
  border-top: var(--hairline);
  margin-top: 16px;
}

.rotation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface-white);
  border-bottom: var(--hairline);
  border-left: 3px solid var(--c-teal);
}

.rot-date { font-family: var(--font-mono); font-weight: 600; color: var(--text-muted); font-size: 0.85rem; }
.rot-class { font-weight: 800; color: var(--c-dark); }

.empty-text {
  text-align: center;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  padding: 24px;
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

.hint { font-size: 0.76rem; color: var(--text-subtle); display: block; margin-top: 4px; }
.mb-4 { margin-bottom: 16px; }
.font-bold { font-weight: 800; }
.text-primary { color: var(--c-dark); font-family: var(--font-mono); }

/* 周常管理样式 */
.section-block {
  margin-bottom: 8px;
}

.shifts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1px;
  background: rgba(1, 32, 48, 0.12);
  border: var(--hairline);
  margin-top: 16px;
}

.shift-admin-card {
  padding: 20px;
  background: var(--surface-white);
}

.shift-admin-card .shift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: var(--hairline);
}

.shift-admin-card .shift-name {
  font-weight: 800;
  color: var(--c-dark);
  font-size: 1rem;
}

.shift-day-badge {
  background: var(--surface-subtle);
  color: var(--c-dark);
  padding: 3px 8px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
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
  font-size: 0.86rem;
  color: var(--text-muted);
}

/* 二维矩阵表格样式 */
.matrix-section {
  margin-top: 20px;
}

.matrix-info {
  margin-bottom: 12px;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.matrix-table-container {
  max-height: 500px;
  overflow: auto;
  border: var(--hairline);
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
  border-bottom: var(--hairline);
  border-right: var(--hairline);
}

.matrix-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  background: var(--bg-color);
  color: var(--c-dark);
  min-width: 100px;
}

.sticky-col {
  position: sticky;
  left: 0;
  background: var(--surface-white);
  z-index: 1;
  border-right: var(--rule-heavy);
  min-width: 80px;
}

thead .sticky-col {
  background: var(--bg-color);
  color: var(--c-dark);
  font-weight: 800;
  z-index: 2;
}

.student-name {
  font-weight: 700;
  color: var(--c-dark);
}

.matrix-cell {
  text-align: center;
}

.check-mark {
  color: var(--c-teal);
}

.empty-cell {
  color: var(--text-subtle);
}

@media (max-width: 768px) {
  .tab-content {
    padding: 20px 16px;
  }
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
  background: var(--c-teal);
  color: var(--c-dark);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 800;
  padding: 1px 6px;
}

.attendance-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.section-desc {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  max-width: 720px;
}

/* 汇总指标卡片 */
.summary-metric-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1px;
  background: rgba(1, 32, 48, 0.12);
  border: var(--hairline);
  margin-bottom: 24px;
}

.metric-card {
  padding: 20px 24px;
  background: var(--surface-white);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-pending {
  border-top: 2px solid #D97706;
}

.metric-completed {
  border-top: 2px solid var(--c-teal);
}

.metric-uncompleted {
  border-top: 2px solid var(--text-subtle);
}

.metric-num {
  font-size: 2.2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--c-dark);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.metric-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

/* 筛选工具栏 */
.attendance-filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-color);
  padding: 12px 16px;
  border: var(--hairline);
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
  padding: 7px 16px;
  background: var(--surface-white);
  border: var(--hairline-strong);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.cat-tab-btn:hover {
  color: var(--c-dark);
  border-color: var(--c-dark);
}

.cat-tab-btn.active {
  background: var(--c-dark);
  color: #FFFFFF;
  border-color: var(--c-dark);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--c-dark);
  cursor: pointer;
  user-select: none;
  margin: 0;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 项目分类展示块 */
.project-category-block {
  margin-bottom: 32px;
}

.category-block-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--c-dark);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: var(--rule-heavy);
}

.attendance-card {
  background: var(--surface-white);
  border: var(--hairline);
  margin-bottom: 20px;
  padding: 24px;
}

.attendance-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.card-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.project-type-tag {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border: var(--hairline);
}

.tag-event { background: var(--c-dark); color: #FFFFFF; }
.tag-shift { background: var(--surface-subtle); color: var(--c-dark); }

.project-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--c-dark);
  margin: 0;
}

.status-tag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border: var(--hairline);
}

.tag-ended {
  background: #FEF2F2;
  color: #991B1B;
  border-color: rgba(153, 27, 27, 0.2);
}

.tag-active {
  background: rgba(69, 196, 176, 0.12);
  color: var(--c-dark);
  border-color: rgba(69, 196, 176, 0.45);
}

.hours-chip {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--surface-subtle);
  color: var(--c-dark);
  padding: 2px 8px;
}

.card-action-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pending-badge {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 700;
  background: #FFFBEB;
  color: #B45309;
  border: 1px solid rgba(180, 83, 9, 0.25);
  padding: 4px 8px;
}

.btn-batch {
  background: var(--c-dark);
  color: #FFFFFF;
  border: 1px solid var(--c-dark);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  padding: 7px 14px;
  transition: all var(--transition-fast);
}

.btn-batch:hover:not(:disabled) {
  background: var(--c-teal);
  color: var(--c-dark);
  border-color: var(--c-teal);
}

.btn-batch:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.project-meta-info {
  display: flex;
  gap: 18px;
  font-size: 0.84rem;
  color: var(--text-muted);
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.attendance-table-wrapper {
  overflow-x: auto;
  border: var(--hairline);
}

.row-pending {
  background: #FFFDF7;
}

.state-pill {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 9px;
  border: var(--hairline);
}

.state-pending {
  background: #FFFBEB;
  color: #B45309;
}

.state-completed {
  background: rgba(69, 196, 176, 0.12);
  color: var(--c-dark);
  border-color: rgba(69, 196, 176, 0.5);
}

.state-uncompleted {
  background: #FEF2F2;
  color: #991B1B;
}

.state-signed_up {
  background: var(--surface-subtle);
  color: var(--text-muted);
}

.action-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-act {
  padding: 5px 10px;
  font-size: 0.76rem;
  font-weight: 700;
  border: var(--hairline-strong);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-pass {
  background: var(--c-dark);
  color: #FFFFFF;
  border-color: var(--c-dark);
}

.btn-pass:hover:not(:disabled) {
  background: var(--c-teal);
  color: var(--c-dark);
  border-color: var(--c-teal);
}

.btn-fail {
  background: var(--surface-white);
  color: #991B1B;
  border-color: rgba(153, 27, 27, 0.3);
}

.btn-fail:hover:not(:disabled) {
  background: #991B1B;
  color: #FFFFFF;
}

.btn-reset {
  background: var(--surface-subtle);
  color: var(--text-muted);
}

.btn-act:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.empty-block {
  text-align: center;
  padding: 36px 24px;
  background: var(--surface-white);
  border: var(--hairline);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.empty-subtext {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
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
  padding: 56px 24px;
  text-align: center;
  background: var(--surface-white);
  border: var(--hairline);
  color: var(--text-muted);
}

.admin-events-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 1px;
  background: rgba(1, 32, 48, 0.12);
  border: var(--hairline);
}

.admin-event-card {
  background: var(--surface-white);
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.admin-event-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.event-title-badge-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.event-card-title {
  font-size: 1.12rem;
  font-weight: 800;
  color: var(--c-dark);
  margin: 0;
}

.event-card-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 16px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-card-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.84rem;
  color: var(--c-dark);
  margin-bottom: 18px;
  background: var(--bg-color);
  padding: 12px 14px;
  border: var(--hairline);
}

.detail-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.detail-label {
  color: var(--text-muted);
}

.grade-limit-tag {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: var(--c-dark);
  font-weight: 700;
}

.admin-event-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 14px;
  border-top: var(--hairline);
}

.btn-edit-event {
  background: var(--surface-white);
  color: var(--c-dark);
  border: var(--hairline-strong);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 7px 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-edit-event:hover {
  background: var(--c-dark);
  color: #FFFFFF;
  border-color: var(--c-dark);
}

.btn-delete-event {
  background: var(--surface-white);
  color: #991B1B;
  border: 1px solid rgba(153, 27, 27, 0.3);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 7px 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-delete-event:hover {
  background: #991B1B;
  color: #FFFFFF;
}

/* 模态弹窗样式 */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(1, 32, 48, 0.55);
  backdrop-filter: blur(6px);
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
  background: var(--surface-white);
  border-top: var(--rule-heavy);
  border-left: var(--hairline);
  border-right: var(--hairline);
  border-bottom: var(--hairline);
  padding: 32px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: var(--hairline);
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--c-dark);
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 1.8rem;
  line-height: 1;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 4px;
}

.btn-close-modal:hover {
  color: var(--c-dark);
}

.required-star {
  color: #DC2626;
  font-weight: 900;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: var(--hairline);
}

/* 活动状态标签 */
.status-badge {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border: var(--hairline);
}

.status-recruiting {
  background: rgba(69, 196, 176, 0.12);
  border-color: rgba(69, 196, 176, 0.5);
  color: var(--c-dark);
}

.status-ongoing {
  background: var(--c-dark);
  color: #FFFFFF;
}

.status-full {
  background: var(--surface-subtle);
  color: var(--text-muted);
}

.status-ended,
.status-closed {
  background: transparent;
  color: var(--text-subtle);
}

/* ==================== 工时补录模块样式 ==================== */
.makeup-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
}

.makeup-step-card {
  background: var(--surface-white);
  border: var(--hairline);
  padding: 24px;
}

.step-badge-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: var(--hairline);
}

.step-badge-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--c-dark);
}

.step-num {
  background: var(--c-dark);
  color: #FFFFFF;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 8px;
  letter-spacing: 0.08em;
}

.makeup-filter-row {
  margin-bottom: 14px;
}

.batch-select-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.selected-pills-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-color);
  border: var(--hairline);
  margin-bottom: 14px;
}

.pills-label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
}

.stu-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  background: var(--surface-white);
  border: var(--hairline-strong);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-dark);
}

.pill-remove {
  background: none;
  border: none;
  font-weight: 900;
  font-size: 0.95rem;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0 2px;
}

.pill-remove:hover {
  color: #991B1B;
}

.student-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 1px;
  max-height: 300px;
  overflow-y: auto;
  border: var(--hairline);
  background: rgba(1, 32, 48, 0.12);
}

.student-check-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--surface-white);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.student-check-card:hover {
  background: #FCFCFD;
}

.student-check-card.checked {
  background: rgba(69, 196, 176, 0.12);
}

.student-check-card input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--c-dark);
  cursor: pointer;
}

.stu-card-info {
  display: flex;
  flex-direction: column;
}

.stu-card-name {
  font-weight: 800;
  color: var(--c-dark);
  font-size: 0.9rem;
}

.stu-card-meta {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: var(--text-muted);
}

.makeup-submit-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: var(--hairline);
  flex-wrap: wrap;
  gap: 12px;
}

.submit-summary {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.submit-summary strong {
  color: var(--c-dark);
  font-weight: 800;
}

.makeup-two-col {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 20px;
}

@media (max-width: 820px) {
  .makeup-two-col {
    grid-template-columns: 1fr;
  }
}

.single-student-list {
  max-height: 330px;
  overflow-y: auto;
  border: var(--hairline);
  background: var(--surface-white);
  display: flex;
  flex-direction: column;
}

.single-stu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: var(--hairline);
  background: var(--surface-white);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.single-stu-item:hover {
  background: var(--bg-color);
}

.single-stu-item.active {
  background: rgba(69, 196, 176, 0.14);
  border-left: 3px solid var(--c-teal);
}

.stu-item-name {
  font-weight: 800;
  color: var(--c-dark);
  margin-right: 8px;
}

.stu-item-class {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  padding: 2px 6px;
  background: var(--surface-subtle);
  color: var(--text-muted);
}

.stu-item-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
}

.stu-item-phone {
  color: var(--text-muted);
}

.stu-item-hours {
  font-weight: 700;
  color: var(--c-dark);
}

.selected-target-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(69, 196, 176, 0.1);
  border-left: 3px solid var(--c-teal);
  margin-bottom: 16px;
  color: var(--c-dark);
  font-size: 0.88rem;
}

.unselected-target-banner {
  padding: 12px 16px;
  background: var(--bg-color);
  border: var(--hairline);
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.makeup-history-section {
  margin-top: 28px;
  padding-top: 20px;
  border-top: var(--hairline);
}
</style>
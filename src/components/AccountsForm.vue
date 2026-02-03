<template>
  <div class="page">
    <div class="card">
      <div class="header">
        <div class="title">Учетные записи</div>
        <el-button type="primary" circle class="add" @click="onAdd">+</el-button>
      </div>

      <div class="hint">
        Для указания нескольких меток для одной пары логин/пароль используйте разделитель ;
      </div>

      <div class="table">
        <div class="row head">
          <div class="cell">Метки</div>
          <div class="cell">Тип записи</div>
          <div class="cell">Логин</div>
          <div class="cell">Пароль</div>
          <div class="cell actions"></div>
        </div>

        <div class="body">
          <template v-for="a in store.accounts" :key="a.id">
            <div class="row">
              <div class="cell">
                <el-input
                  v-model="draftFor(a.id).labelInput"
                  :maxlength="50"
                  placeholder="Напр.: tag1; tag2"
                  autocomplete="off"
                  @blur="onValidateAndSave(a.id, 'labels')"
                  :class="{ invalid: errors[a.id]?.labels }"
                />
              </div>

              <div class="cell">
                <el-select
                  v-model="draftFor(a.id).type"
                  placeholder="Выберите"
                  @change="onTypeChange(a.id)"
                  :class="{ invalid: errors[a.id]?.type }"
                >
                  <el-option label="LDAP" value="LDAP" />
                  <el-option label="Локальная" value="LOCAL" />
                </el-select>
              </div>

              <div class="cell">
                <el-input
                  v-model="draftFor(a.id).login"
                  :maxlength="100"
                  placeholder="Логин"
                  autocomplete="off"
                  @blur="onValidateAndSave(a.id, 'login')"
                  :class="{ invalid: errors[a.id]?.login }"
                />
              </div>

              <div class="cell">
                <div class="password-slot">
                  <el-input
                    v-if="draftFor(a.id).type === 'LOCAL'"
                    v-model="draftFor(a.id).password"
                    :maxlength="100"
                    placeholder="Пароль"
                    show-password
                    autocomplete="new-password"
                    @blur="onValidateAndSave(a.id, 'password')"
                    :class="{ invalid: errors[a.id]?.password }"
                  />
                  <el-input v-else disabled placeholder="" class="password-disabled" />
                </div>
              </div>

              <div class="cell actions">
                <el-button type="danger" circle @click="onRemove(a.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </template>

          <div v-if="store.accounts.length === 0" class="empty">
            <div class="empty-title">Нет учетных записей</div>
            <div class="empty-subtitle">Нажмите “+”, чтобы добавить новую запись</div>
          </div>
        </div>
      </div>

      <div class="footer-space"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watchEffect } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { useAccountsStore, type AccountType, type LabelItem, type Account } from '../stores/accounts'

type Draft = {
  labelInput: string
  type: AccountType
  login: string
  password: string
}

type Field = 'labels' | 'type' | 'login' | 'password'

type FieldErrors = Partial<Record<Field, boolean>>
type ErrorsMap = Record<string, FieldErrors>

const store = useAccountsStore()

const drafts = reactive<Record<string, Draft>>({})
const errors = reactive<ErrorsMap>({})

const toLabelInput = (labels: LabelItem[]) => labels.map((x) => x.text).join('; ')

const parseLabels = (value: string): LabelItem[] => {
  const parts = value
    .split(';')
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
  return parts.map((p) => ({ text: p }))
}

const getDraft = (id: string): Draft => {
  const existing = drafts[id]
  if (existing) return existing

  const a = store.accounts.find((x) => x.id === id)

  const created: Draft = {
    labelInput: a ? toLabelInput(a.labels) : '',
    type: a ? a.type : 'LOCAL',
    login: a ? a.login : '',
    password: a ? a.password ?? '' : '',
  }

  drafts[id] = created
  if (!errors[id]) errors[id] = {}
  return created
}

const draftFor = (id: string) => getDraft(id)

watchEffect(() => {
  store.accounts.forEach((a) => {
    getDraft(a.id)
  })

  const ids = new Set(store.accounts.map((x) => x.id))
  Object.keys(drafts).forEach((id) => {
    if (!ids.has(id)) delete drafts[id]
  })
  Object.keys(errors).forEach((id) => {
    if (!ids.has(id)) delete errors[id]
  })
})

const validate = (id: string): FieldErrors => {
  const dd = getDraft(id)
  const e: FieldErrors = {}

  const labelOk = dd.labelInput.length <= 50
  e.labels = !labelOk

  const loginOk = dd.login.trim().length > 0 && dd.login.length <= 100
  e.login = !loginOk

  const typeOk = dd.type === 'LDAP' || dd.type === 'LOCAL'
  e.type = !typeOk

  if (dd.type === 'LOCAL') {
    const passOk = dd.password.trim().length > 0 && dd.password.length <= 100
    e.password = !passOk
  } else {
    e.password = false
  }

  errors[id] = e
  return e
}

const isValid = (e: FieldErrors) => !Object.values(e).some((v) => v)

const buildAccountFromDraft = (id: string): Account => {
  const dd = getDraft(id)
  return {
    id,
    labels: parseLabels(dd.labelInput),
    type: dd.type,
    login: dd.login,
    password: dd.type === 'LDAP' ? null : dd.password,
  }
}

const onValidateAndSave = (id: string, field: Field) => {
  const e = validate(id)
  const dd = getDraft(id)

  if (field === 'labels' && dd.labelInput.length > 50) return
  if (field === 'login' && errors[id]?.login) return
  if (field === 'password' && errors[id]?.password) return

  if (isValid(e)) {
    store.upsert(buildAccountFromDraft(id))
  }
}

const onTypeChange = (id: string) => {
  const dd = getDraft(id)
  if (dd.type === 'LDAP') dd.password = ''
  const e = validate(id)
  if (isValid(e)) store.upsert(buildAccountFromDraft(id))
}

const onAdd = () => {
  store.addEmpty()
}

const onRemove = (id: string) => {
  store.remove(id)
}
</script>

<style scoped>
.page {
  max-width: 1100px;
  margin: 24px auto;
  padding: 0 16px;
}

.card {
  background: #ffffff;
  border: 1px solid #e6ebf5;
  border-radius: 16px;
  padding: 18px 18px 10px 18px;
  box-shadow: 0 8px 30px rgba(16, 24, 40, 0.06);
  width: 1100px;
  max-width: 1100px;
  min-width: 1100px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.2px;
  color: #101828;
}

.add {
  box-shadow: 0 8px 18px rgba(64, 158, 255, 0.25);
}

.hint {
  background: #f3f7ff;
  border: 1px solid #d7e5ff;
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 14px;
  font-size: 14px;
  color: #1f2a37;
}

.table {
  border: 1px solid #e6ebf5;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
  width: 100%;
  min-width: 0;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.1fr) minmax(0, 1.6fr) minmax(0, 1.6fr) 72px;
  gap: 12px;
  align-items: center;
  padding: 12px 12px;
}

.head {
  background: #f8fafc;
  border-bottom: 1px solid #eef2f7;
  padding: 10px 12px;
}

.head .cell {
  font-size: 13px;
  font-weight: 600;
  color: #667085;
}

.body {
  min-height: 210px;
  padding: 10px 0;
}

.body .row {
  padding: 10px 12px;
}

.body .row + .row {
  border-top: 1px solid #f0f2f6;
}

.cell.actions {
  display: flex;
  justify-content: flex-end;
}
.cell {
  min-width: 0;
}

.password-slot {
  height: 32px;
  display: flex;
  align-items: center;
}

.password-disabled :deep(.el-input__wrapper) {
  background: #f6f7fb !important;
  box-shadow: 0 0 0 1px #eef2f7 inset !important;
  cursor: not-allowed;
}

.invalid :deep(.el-input__wrapper),
.invalid :deep(.el-select__wrapper) {
  box-shadow: 0 0 0 1px #f56c6c inset !important;
}

.empty {
  height: 210px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #667085;
}

.empty-title {
  font-weight: 700;
  color: #344054;
}

.empty-subtitle {
  font-size: 13px;
}

.footer-space {
  height: 6px;
}
</style>

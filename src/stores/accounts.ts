import { defineStore } from 'pinia'

export type AccountType = 'LDAP' | 'LOCAL'

export type LabelItem = {
  text: string
}

export type Account = {
  id: string
  labels: LabelItem[]
  type: AccountType
  login: string
  password: string | null
}

const STORAGE_KEY = 'accounts_form_state_v1'

const safeParse = (value: string | null): Account[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as Account[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((a) => ({
      id: typeof a.id === 'string' ? a.id : crypto.randomUUID(),
      labels: Array.isArray(a.labels) ? a.labels.filter((x) => x && typeof x.text === 'string') : [],
      type: a.type === 'LDAP' ? 'LDAP' : 'LOCAL',
      login: typeof a.login === 'string' ? a.login : '',
      password: a.type === 'LDAP' ? null : typeof a.password === 'string' ? a.password : a.password === null ? null : '',
    }))
  } catch {
    return []
  }
}

export const useAccountsStore = defineStore('accounts', {
  state: () => ({
    accounts: safeParse(localStorage.getItem(STORAGE_KEY)) as Account[],
  }),
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.accounts))
    },
    addEmpty() {
      const id = crypto.randomUUID()
      this.accounts.push({
        id,
        labels: [],
        type: 'LOCAL',
        login: '',
        password: '',
      })
      this.persist()
      return id
    },
    remove(id: string) {
      this.accounts = this.accounts.filter((a) => a.id !== id)
      this.persist()
    },
    upsert(account: Account) {
      const idx = this.accounts.findIndex((a) => a.id === account.id)
      if (idx === -1) this.accounts.push(account)
      else this.accounts[idx] = account
      this.persist()
    },
  },
})

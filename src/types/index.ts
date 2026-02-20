export type Role = 'admin' | 'customer'
export type AccountStatus = 'pending' | 'active' | 'rejected' | 'suspended'
export type Gender = 'male' | 'female' | 'other'
export type CustomerTier = 'vip' | 'active' | 'normal' | 'inactive'
export type AccountType = 'machine' | 'cash'
export type OperationType = 'transfer' | 'withdrawal' | 'recharge'
export type CycleType = 'monthly' | 'days'
export type ContactMethod = 'whatsapp' | 'call'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'
export type NotificationType = 'reminder' | 'alert' | 'offer' | 'achievement' | 'service_request' | 'approval' | 'transaction'
export type MovementType = 'in' | 'out' | 'damaged'
export type DiscountType = 'percentage' | 'fixed'

export interface User {
  id: string
  email?: string
  phone: string
  full_name: string
  role: Role
  gender?: Gender
  birth_date?: string
  avatar_url?: string
  account_status: AccountStatus
  registration_date: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  name: string
  code: string
  address?: string
  city?: string
  area?: string
  phone?: string
  whatsapp?: string
  latitude?: number
  longitude?: number
  is_open: boolean
  opening_time: string
  closing_time: string
  working_days: string[]
  banner_message?: string
  banner_color: string
  is_main: boolean
  is_active: boolean
  image_url?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  user_id?: string
  branch_id?: string
  balance: number
  initial_balance: number
  area?: string
  loyalty_points: number
  tier: CustomerTier
  can_request_services: boolean
  referral_code?: string
  referred_by?: string
  last_transaction_date?: string
  is_legacy_account: boolean
  total_transactions_count: number
  created_at: string
  updated_at: string
  user?: User
  branch?: Branch
}

export interface Machine {
  id: string
  name: string
  code: string
  company: string
  account_number?: string
  current_balance: number
  branch_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  branch?: Branch
}

export interface Wallet {
  id: string
  name: string
  phone: string
  current_balance: number
  daily_withdrawal_limit: number
  daily_transfer_limit: number
  monthly_withdrawal_limit: number
  monthly_transfer_limit: number
  branch_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  branch?: Branch
  daily_usage?: WalletUsage
  monthly_usage?: WalletUsage
}

export interface WalletUsage {
  id: string
  wallet_id: string
  date: string
  period_type: 'daily' | 'monthly'
  total_withdrawals: number
  total_transfers: number
}

export interface Transaction {
  id: string
  customer_id?: string
  branch_id?: string
  date: string
  account_type: AccountType
  account_id: string
  account_name: string
  operation_type: OperationType
  amount: number
  wallet_fees: number
  service_fees: number
  tier_discount_percent: number
  tier_discount_amount: number
  total_charged: number
  profit: number
  notes?: string
  attachments: string[]
  created_by?: string
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface PricingTier {
  id: string
  name: string
  tier_level: 1 | 2 | 3 | 4
  min_amount: number
  max_amount?: number
  transfer_discount_percent: number
  withdrawal_discount_percent: number
  customer_id?: string
  is_active: boolean
}

export interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  display_order: number
  is_active: boolean
}

export interface Product {
  id: string
  name: string
  description?: string
  category_id?: string
  price: number
  stock_quantity: number
  images: string[]
  branch_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Offer {
  id: string
  title: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  start_date: string
  end_date: string
  target_gender: Gender | 'all'
  target_tier: string
  target_customers: string[]
  is_birthday_offer: boolean
  applies_to: 'products' | 'services' | 'all'
  product_ids: string[]
  is_active: boolean
}

export interface Service {
  id: string
  name: string
  description?: string
  icon?: string
  branch_id?: string
  is_active: boolean
  display_order: number
}

export interface RechargeReminder {
  id: string
  customer_id: string
  phone_number: string
  recharge_cycle_type: CycleType
  recharge_day?: number
  cycle_days?: number
  last_recharge_date: string
  next_recharge_date: string
  remind_before_days: number
  contact_method: ContactMethod
  is_active: boolean
  customer?: Customer
  days_remaining?: number
  is_due_today?: boolean
}

export interface Expense {
  id: string
  date: string
  category: string
  amount: number
  notes?: string
  branch_id?: string
  created_by?: string
  created_at: string
}

export interface CashRegister {
  id: string
  date: string
  notes_200: number
  notes_100: number
  notes_50: number
  notes_20: number
  notes_10: number
  notes_5: number
  coins: number
  total_calculated: number
  expected_balance: number
  difference: number
  branch_id?: string
  created_by?: string
  created_at: string
}

export interface ServiceRequest {
  id: string
  customer_id: string
  branch_id?: string
  request_type: 'transfer' | 'withdrawal'
  amount: number
  target_phone?: string
  estimated_fees: number
  status: RequestStatus
  requested_at: string
  processed_at?: string
  processed_by?: string
  rejection_reason?: string
  notes?: string
  transaction_id?: string
  customer?: Customer
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  link?: string
  created_at: string
}

export type AchievementType =
  | 'first_transaction' | 'transactions_10' | 'transactions_50'
  | 'transactions_100' | 'silver_tier' | 'gold_tier'
  | 'diamond_tier' | 'year_member' | 'loyal_customer'

export interface Achievement {
  id: string
  customer_id: string
  achievement_type: AchievementType
  achieved_at: string
  is_new: boolean
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  referral_date: string
  required_amount: number
  current_amount: number
  status: 'pending' | 'completed'
  reward_given: boolean
  reward_amount: number
}

export interface FeeCalculation {
  amount: number
  wallet_fees: number
  base_service_fees: number
  tier_discount_percent: number
  tier_discount_amount: number
  final_service_fees: number
  total_charged: number
  profit: number
}

export interface DashboardStats {
  today: {
    transactions_count: number
    total_profit: number
    total_expenses: number
    net_profit: number
    new_customers: number
  }
  alerts: {
    wallet_alerts: WalletAlert[]
    reminders_today: number
    pending_requests: number
    pending_registrations: number
  }
  balances: {
    cash_drawer: number
    machines: { id: string; name: string; balance: number }[]
    wallets: { id: string; name: string; balance: number }[]
  }
  weekly_profit: { date: string; profit: number; transactions: number }[]
}

export interface WalletAlert {
  wallet_id: string
  wallet_name: string
  alert_type: 'daily_withdrawal' | 'daily_transfer' | 'monthly_withdrawal' | 'monthly_transfer'
  percentage: number
  used: number
  limit: number
}

export interface Settings {
  wallet_default_fee: number
  service_fee_base: number
  service_fee_per: number
  loyalty_points_per: number
  loyalty_points_value: number
  referral_required_amount: number
  referral_reward_amount: number
  vip_threshold: number
  active_threshold: number
  inactive_days: number
  app_name: string
  currency: string
}

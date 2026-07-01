export interface Person {
  id: number;
  accounting_code: string;
  first_name: string;
  last_name: string;
  title: string;
  nickname: string;
  type: 'حقیقی' | 'حقوقی';
  category: string;
  is_employee?: number;
  is_shareholder?: number;
  roles?: string[];
  national_id?: string;
  economic_code?: string;
  registration_number?: string;
  personal_code?: string;
  credit_limit?: number;
  tax_registered?: number | boolean;
  address?: string;
  country?: string;
  city?: string;
  postal_code?: string;
  phone1?: string;
  phone2?: string;
  phone3?: string;
  fax?: string;
  email?: string;
  website?: string;
  bank_account?: string;
  bank_card?: string;
  bank_name?: string;
  iban?: string;
  birth_date?: string;
  membership_date?: string;
  marriage_date?: string;
  description?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
  business_name?: string;
  business_activity?: string;
  business_address?: string;
  brand?: string;
  whatsapp?: string;
  province?: string;
  region?: string;
  last_purchase?: string;
  last_payment?: string;
  last_activity?: string;
}

export interface PersonNote {
  id: number;
  person_id: number;
  description: string;
  followup_date?: string;
  reminder?: string;
  created_at?: string;
}

export interface Shareholder {
  id: number;
  name: string;
  share_percent: number;
  person_id?: number | null;
  join_date?: string | null;
  capital_contribution?: number;
  shares_count?: number;
  share_type?: string;
  voting_rights?: number;
  allocated_profit?: number;
  avatar?: string;
  national_id?: string;
  phone1?: string;
  accounting_code?: string;
  email?: string;
}

export interface Seller {
  id: number;
  name: string;
  person_id?: number | null;
  commission_percent: number;
  return_commission_percent: number;
  description?: string;
  avatar?: string;
  national_id?: string;
  phone1?: string;
  accounting_code?: string;
  email?: string;
}

export interface SystemUser {
  id?: number;
  username: string;
  password?: string;
  role: 'مدیر' | 'کاربر' | 'فروشنده' | 'کارمند';
  permissions: string; // "*" or pages path delimited
  person_id?: number | null;
  first_name?: string;
  last_name?: string;
  title?: string;
  accounting_code?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      addItem: (name: string) => Promise<number>;
      getItems: () => Promise<{id: number, name: string, created_at: string}[]>;
      getDbStats?: () => Promise<any>;
      getDashboardData?: () => Promise<any>;
      windowControl?: (command: string) => void;
      changeDbPath?: () => Promise<{ success: boolean; path?: string; error?: string }>;
      getConfig?: () => Promise<any>;
      saveConfig?: (data: any) => Promise<any>;
      addPerson?: (data: any) => Promise<{ success: boolean; id: number; accounting_code: string }>;
      getPersons?: () => Promise<Person[]>;
      updatePerson?: (data: any) => Promise<{ success: boolean }>;
      deletePerson?: (id: number) => Promise<{ success: boolean }>;
      getShareholders?: () => Promise<Shareholder[]>;
      updateShareholder?: (data: any) => Promise<{ success: boolean }>;
      addShareholderDirect?: (data: any) => Promise<{ success: boolean }>;
      deleteShareholder?: (id: number) => Promise<{ success: boolean }>;
      getShareholdersStatistics?: () => Promise<{ totalSales: number; totalProfit: number; totalExpenses: number; netIncome: number }>;

      // Sellers
      getSellers?: () => Promise<Seller[]>;
      updateSeller?: (data: any) => Promise<{ success: boolean }>;
      addSellerDirect?: (data: any) => Promise<{ success: boolean }>;
      deleteSeller?: (id: number) => Promise<{ success: boolean }>;

      // Onboarding
      checkOnboardingStatus?: () => Promise<{ onboardingRequired: boolean; storeInfo: any }>;
      performOnboarding?: (data: any) => Promise<{ success: boolean }>;

      // Session / Authentications
      loginUser?: (credentials: any) => Promise<{ success: boolean; message?: string; user?: any }>;
      recoverPassword?: (data: any) => Promise<{ success: boolean; message?: string; password?: string }>;
      getUserSecurityQuestion?: (username: string) => Promise<{ success: boolean; message?: string; question?: string }>;

      // User Accounts
      getSystemUsers?: () => Promise<SystemUser[]>;
      saveUserAccount?: (data: any) => Promise<{ success: boolean }>;
      deleteUserAccount?: (id: number) => Promise<{ success: boolean }>;
      getAuditLogs?: () => Promise<any[]>;
      addAuditLog?: (data: { username: string; action: string; target: string; details?: string; date?: string }) => Promise<{ success: boolean }>;

      // Categories & Brands API
      getCategories?: () => Promise<Category[]>;
      saveCategory?: (data: any) => Promise<{ success: boolean; id: number }>;
      deleteCategory?: (id: number) => Promise<{ success: boolean }>;
      getBrands?: () => Promise<Brand[]>;
      saveBrand?: (data: any) => Promise<{ success: boolean; id: number }>;
      deleteBrand?: (id: number) => Promise<{ success: boolean }>;

      // Employees API
      getEmployees?: () => Promise<Employee[]>;
      updateEmployee?: (data: any) => Promise<{ success: boolean }>;
      addEmployeeDirect?: (data: any) => Promise<{ success: boolean; id: number }>;
      deleteEmployee?: (id: number) => Promise<{ success: boolean }>;
      getEmployeeTransactions?: (employeeId: number) => Promise<EmployeeTransaction[]>;
      addEmployeeTransaction?: (data: any) => Promise<{ success: boolean; id: number }>;
      deleteEmployeeTransaction?: (id: number) => Promise<{ success: boolean }>;

      // Warehouses & Products API
      selectLocalImage?: () => Promise<{ success: boolean; base64?: string; error?: string }>;
      getProducts?: () => Promise<Product[]>;
      saveProduct?: (data: any) => Promise<{ success: boolean; id: number }>;
      deleteProduct?: (id: number) => Promise<{ success: boolean }>;
      getWarehouses?: () => Promise<Warehouse[]>;
      saveWarehouse?: (data: any) => Promise<{ success: boolean; id: number }>;
      deleteWarehouse?: (id: number) => Promise<{ success: boolean }>;
      getWarehouseStocks?: (warehouseId: number) => Promise<WarehouseStock[]>;
      getInventoryHistory?: () => Promise<any[]>;
      addWarehouseTransaction?: (data: any) => Promise<{ success: boolean; error?: string }>;
      getProductSalesHistory?: (productId: number) => Promise<any[]>;
      getProductPurchaseHistory?: (productId: number) => Promise<any[]>;
      getProductInventoryCirculation?: (productId: number) => Promise<any[]>;

       // Price updates & Audit trail API
      applyPriceUpdate?: (data: any) => Promise<{ success: boolean; id: number }>;
      getPriceUpdates?: () => Promise<any[]>;
      getPriceUpdateItems?: (updateId: number) => Promise<any[]>;
      rollbackPriceUpdate?: (updateId: number) => Promise<{ success: boolean }>;

      // Invoices & Sales API
      saveInvoice?: (data: any) => Promise<{ success: boolean; id?: number; error?: string; invoice_number?: string; profit?: number }>;
      getInvoices?: () => Promise<Invoice[]>;
      deleteInvoice?: (id: number) => Promise<{ success: boolean; error?: string }>;
      saveReturn?: (data: any) => Promise<{ success: boolean; id?: number; error?: string; invoice_number?: string }>;

      // Debtors and Creditors API
      getDebtorsCreditorsSummary?: () => Promise<any[]>;
      getPersonFinancialTransactions?: (personId: number) => Promise<any[]>;
      addPersonFinancialTransaction?: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      deletePersonFinancialTransaction?: (id: number) => Promise<{ success: boolean; error?: string }>;
      getPersonNotes?: (personId: number) => Promise<PersonNote[]>;
      addPersonNote?: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      deletePersonNote?: (id: number) => Promise<{ success: boolean; error?: string }>;

      // Cash and Bank APIs
      getCashRegisters?: () => Promise<any[]>;
      getBankAccounts?: () => Promise<any[]>;
      addCashRegister?: (name: string) => Promise<{ success: boolean; id?: number; error?: string }>;
      addBankAccount?: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      getTreasuryTransactions?: () => Promise<any[]>;
      addTreasuryTransaction?: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
      deleteTreasuryTransaction?: (id: number) => Promise<{ success: boolean; error?: string }>;
    }
  }
}

export interface Product {
  id: number;
  name: string;
  code: string;
  price: number;
  cost: number;
  category_id?: number | null;
  category_name?: string;
  brand_id?: number | null;
  brand_name?: string;
  total_stock: number;
  unit: string;
  description?: string;
  internal_sku?: string;
  serial_number?: string;
  image_base64?: string;
  type?: 'product' | 'service';
  required_docs?: string;
  barcode?: string;
  min_stock?: number;
  wholesale_price?: number;
  min_selling_price?: number;
  status?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string;
  description?: string;
  total_items?: number;
  unique_products?: number;
}

export interface WarehouseStock {
  id: number;
  warehouse_id: number;
  product_id: number;
  quantity: number;
  product_name: string;
  product_code: string;
  unit: string;
  price: number;
  cost: number;
}

export interface Category {
  id: number;
  name: string;
  parent_id?: number | null;
  image?: string;
  description?: string;
  type?: 'product' | 'service' | 'both';
  parent_name?: string;
}

export interface Brand {
  id: number;
  name: string;
  logo?: string;
  description?: string;
}

export interface Employee {
  id: number;
  name: string;
  phone?: string;
  position?: string;
  salary: number;
  person_id?: number | null;
  hire_date?: string;
  avatar?: string;
  national_id?: string;
  accounting_code?: string;
  balance?: number;
}

export interface EmployeeTransaction {
  id: number;
  employee_id: number;
  date: string;
  type: 'salary_accrual' | 'cash_advance' | 'item_pickup' | 'fine_deduction' | 'bonus';
  amount: number;
  item_name?: string;
  description?: string;
}

export interface Invoice {
  id?: number;
  invoice_number: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  date: string;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  status: string; // 'پرداخت شده' | 'پرداخت نشده' | 'لغو شده'
  payment_method: string; // 'کارتخوان' | 'نقدی' | 'کارت به کارت' | 'واریز به حساب' | 'چکی' | 'اقساطی'
  payment_details?: string; // JSON holding detailed metadata
  description?: string;
  items?: InvoiceItem[];
  payment_cash?: number;
  payment_card?: number;
  payment_bank?: number;
  payment_cheque?: number;
  payment_credit?: number;
  payment_installment?: number;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  product_unit?: string;
  type?: 'product' | 'service';
  quantity: number;
  unit_price: number;
  total: number;
  discount_percent?: number;
  discount_amount?: number;
}

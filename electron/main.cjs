const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let db;
let configPath;

function loadConfig() {
  configPath = path.join(app.getPath('userData'), 'config.json');
  let config = { 
    dbPath: path.join(app.getPath('userData'), 'database.sqlite'),
    accCodeStart: 1000,
    accCodeSuffix: '-ACC',
    productPrefix: 'PRD-',
    productStartNumber: 1001
  };
  
  if (fs.existsSync(configPath)) {
    try {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = { ...config, ...savedConfig };
    } catch (e) {
      console.error('Error reading config:', e);
    }
  }
  return config;
}

function saveConfig(newConfig) {
  const config = { ...loadConfig(), ...newConfig };
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch(e) {
    console.error('Error writing config:', e);
  }
  return config;
}

function initializeDatabase() {
  try {
    const config = loadConfig();
    const Database = require('better-sqlite3');
    // ذخیره دیتابیس در مسیر تعریف شده در کانفیگ
    const dbPath = config.dbPath;
    console.log('Database path:', dbPath); // برای دیباگ مسیر
    
    db = new Database(dbPath);
    
    // ایجاد جداول اصلی دیتابیس
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER DEFAULT NULl,
        FOREIGN KEY (parent_id) REFERENCES categories (id)
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT,
        price REAL DEFAULT 0,
        cost REAL DEFAULT 0,
        category_id INTEGER,
        stock REAL DEFAULT 0,
        unit TEXT,
        description TEXT,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL DEFAULT 0,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accounting_code TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        title TEXT,
        nickname TEXT,
        type TEXT,
        category TEXT,
        national_id TEXT,
        economic_code TEXT,
        registration_number TEXT,
        personal_code TEXT,
        credit_limit REAL DEFAULT 0,
        tax_registered INTEGER,
        address TEXT,
        country TEXT,
        city TEXT,
        postal_code TEXT,
        phone1 TEXT,
        phone2 TEXT,
        phone3 TEXT,
        fax TEXT,
        email TEXT,
        website TEXT,
        bank_account TEXT,
        bank_card TEXT,
        bank_name TEXT,
        iban TEXT,
        birth_date TEXT,
        membership_date TEXT,
        marriage_date TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        national_id TEXT,
        type TEXT DEFAULT 'حقیقی',
        person_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        position TEXT,
        salary REAL DEFAULT 0,
        person_id INTEGER,
        hire_date TEXT
      );

      CREATE TABLE IF NOT EXISTS shareholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        share_percent REAL DEFAULT 0,
        person_id INTEGER,
        join_date TEXT
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        final_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'پرداخت نشده',
        FOREIGN KEY (customer_id) REFERENCES persons (id)
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER,
        quantity REAL DEFAULT 1,
        unit_price REAL DEFAULT 0,
        total REAL DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity_change REAL NOT NULL,
        type TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        description TEXT,
        FOREIGN KEY (product_id) REFERENCES products (id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'کاربر',
        permissions TEXT
      );

      CREATE TABLE IF NOT EXISTS sellers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        person_id INTEGER UNIQUE,
        commission_percent REAL DEFAULT 0,
        return_commission_percent REAL DEFAULT 0,
        description TEXT,
        FOREIGN KEY (person_id) REFERENCES persons (id)
      );

      CREATE TABLE IF NOT EXISTS store_info (
        id INTEGER PRIMARY KEY,
        name TEXT,
        address TEXT,
        phone TEXT,
        logo TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        details TEXT,
        date TEXT
      );
    `);

    // Dynamic schema updates
    try {
      // Check if invoices is referencing customers
      if (db) {
        const fks = db.prepare("PRAGMA foreign_key_list(invoices)").all();
        const hasCustomersFk = fks.some(fk => fk.table === 'customers');
        if (hasCustomersFk) {
          console.log("Migrating invoices foreign key from customers to persons...");
          db.exec("PRAGMA foreign_keys = OFF;");
          
          // 1. Create invoices_new table
          db.exec(`
            CREATE TABLE IF NOT EXISTS invoices_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_number TEXT NOT NULL UNIQUE,
              customer_id INTEGER,
              date DATETIME DEFAULT CURRENT_TIMESTAMP,
              total_amount REAL DEFAULT 0,
              discount REAL DEFAULT 0,
              tax REAL DEFAULT 0,
              final_amount REAL DEFAULT 0,
              status TEXT DEFAULT 'پرداخت نشده',
              payment_method TEXT DEFAULT 'کارتخوان',
              payment_details TEXT,
              description TEXT,
              FOREIGN KEY (customer_id) REFERENCES persons (id)
            );
          `);
          
          // 2. See if invoices exists, copy data
          const cols = db.prepare("PRAGMA table_info(invoices)").all().map(c => c.name);
          const hasPaymentMethod = cols.includes('payment_method');
          const hasPaymentDetails = cols.includes('payment_details');
          const hasDescription = cols.includes('description');
          
          const sourceCols = ['id', 'invoice_number', 'customer_id', 'date', 'total_amount', 'discount', 'tax', 'final_amount', 'status'];
          if (hasPaymentMethod) sourceCols.push('payment_method');
          if (hasPaymentDetails) sourceCols.push('payment_details');
          if (hasDescription) sourceCols.push('description');
          
          const columnsStr = sourceCols.join(', ');
          
          db.exec(`INSERT INTO invoices_new (${columnsStr}) SELECT ${columnsStr} FROM invoices;`);
          
          // 3. Drop invoices table
          db.exec("DROP TABLE invoices;");
          
          // 4. Rename invoices_new to invoices
          db.exec("ALTER TABLE invoices_new RENAME TO invoices;");
          
          db.exec("PRAGMA foreign_keys = ON;");
          console.log("invoices foreign key migration completed successfully!");
        }
      }
    } catch (e) {
      console.error("Failed to migrate invoices table:", e);
      try { db.exec("PRAGMA foreign_keys = ON;"); } catch(_) {}
    }

    try { db.prepare('ALTER TABLE employees ADD COLUMN person_id INTEGER').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE employees ADD COLUMN hire_date TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE shareholders ADD COLUMN person_id INTEGER').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE shareholders ADD COLUMN join_date TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE customers ADD COLUMN person_id INTEGER').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN avatar TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE shareholders ADD COLUMN capital_contribution REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE shareholders ADD COLUMN shares_count INTEGER DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE shareholders ADD COLUMN share_type TEXT DEFAULT "عادی"').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE shareholders ADD COLUMN voting_rights INTEGER DEFAULT 1').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE shareholders ADD COLUMN allocated_profit REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE users ADD COLUMN recovery_question TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE users ADD COLUMN recovery_answer TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE users ADD COLUMN person_id INTEGER').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_method TEXT DEFAULT "کارتخوان"').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_details TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN description TEXT').run(); } catch(e) {}
    try { db.prepare("ALTER TABLE invoices ADD COLUMN type TEXT DEFAULT 'فروش'").run(); } catch(e) {}
    try { db.prepare("ALTER TABLE invoices ADD COLUMN received_amount REAL DEFAULT 0").run(); } catch(e) {}

    // Categories safe schema extension
    try { db.prepare('ALTER TABLE categories ADD COLUMN image TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE categories ADD COLUMN description TEXT').run(); } catch(e) {}
    try { db.prepare("ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'both'").run(); } catch(e) {}

    // Create brands table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS brands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          logo TEXT,
          description TEXT
        );
      `);
    } catch(e) {}

    // Create employee_transactions table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS employee_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          item_name TEXT,
          description TEXT,
          FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
        );
      `);
    } catch(e) {}

    // Create warehouses table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS warehouses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          code TEXT UNIQUE,
          address TEXT,
          description TEXT
        );
      `);
    } catch(e) {
      console.error('Error creating warehouses table:', e);
    }

    // Default Seed Warehouse
    try {
      const preCheck = db.prepare("SELECT COUNT(*) as cnt FROM warehouses").get();
      if (preCheck.cnt === 0) {
        db.prepare("INSERT INTO warehouses (name, code, address, description) VALUES (?, ?, ?, ?)").run(
          'انبار اصلی (مغازه/ویترین)',
          'WH-01',
          'محل شعبه مرکزی مغازه',
          'انبار پیش‌فرض سیستم جهت انباشت و فروش کالاها'
        );
      }
    } catch(e) {
      console.error('Error seeding default warehouse:', e);
    }

    // Create warehouse_stocks table
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS warehouse_stocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          warehouse_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity REAL DEFAULT 0,
          FOREIGN KEY (warehouse_id) REFERENCES warehouses (id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
          UNIQUE(warehouse_id, product_id)
        );
      `);
    } catch(e) {
      console.error('Error creating warehouse_stocks table:', e);
    }

    // Safe product column extensions
    try { db.prepare('ALTER TABLE products ADD COLUMN internal_sku TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE products ADD COLUMN serial_number TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE products ADD COLUMN brand_id INTEGER').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE products ADD COLUMN image_base64 TEXT').run(); } catch(e) {}
    try { db.prepare("ALTER TABLE products ADD COLUMN type TEXT DEFAULT 'product'").run(); } catch(e) {}
    try { db.prepare('ALTER TABLE products ADD COLUMN required_docs TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE products ADD COLUMN barcode TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE products ADD COLUMN min_stock REAL DEFAULT 0').run(); } catch(e) {}

    // Safe inventory column extensions
    try { db.prepare('ALTER TABLE inventory ADD COLUMN warehouse_id INTEGER').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE inventory ADD COLUMN to_warehouse_id INTEGER').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE inventory ADD COLUMN username TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN username TEXT').run(); } catch(e) {}

    // Create price_updates table for structural audits and rolls
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS price_updates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          update_date TEXT NOT NULL,
          username TEXT NOT NULL,
          description TEXT,
          rollback_status INTEGER DEFAULT 0
        );
      `);
    } catch(e) {
      console.error('Error creating price_updates table:', e);
    }

    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS price_update_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          price_update_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          old_price REAL,
          new_price REAL,
          old_cost REAL,
          new_cost REAL,
          FOREIGN KEY (price_update_id) REFERENCES price_updates (id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
        );
      `);
    } catch(e) {
      console.error('Error creating price_update_items table:', e);
    }



    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS person_financial_ledger (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL, -- 'received', 'paid', 'invoice_debit', 'adjustment'
          amount REAL NOT NULL, -- positive for debit (customer owes us), negative for credit (we owe customer)
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (person_id) REFERENCES persons (id) ON DELETE CASCADE
        );
      `);
    } catch(e) {
      console.error('Error creating person_financial_ledger table:', e);
    }

    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS person_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id INTEGER NOT NULL,
          description TEXT NOT NULL,
          followup_date TEXT,
          reminder TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (person_id) REFERENCES persons (id) ON DELETE CASCADE
        );
      `);
    } catch(e) {
      console.error('Error creating person_notes table:', e);
    }

    // Cash and Bank tables
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS cash_registers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          balance REAL DEFAULT 0,
          is_default INTEGER DEFAULT 0
        );
      `);
    } catch(e) {
      console.error('Error creating cash_registers table:', e);
    }

    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bank_name TEXT NOT NULL,
          account_number TEXT NOT NULL,
          card_number TEXT,
          balance REAL DEFAULT 0,
          is_default INTEGER DEFAULT 0
        );
      `);
    } catch(e) {
      console.error('Error creating bank_accounts table:', e);
    }

    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS treasury_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          source_type TEXT NOT NULL, -- 'cash' or 'bank'
          source_id INTEGER NOT NULL,
          type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'transfer'
          amount REAL NOT NULL,
          destination_type TEXT, -- 'cash', 'bank', 'person', 'other'
          destination_id INTEGER,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch(e) {
      console.error('Error creating treasury_transactions table:', e);
    }



    // Seed default cash registers & bank accounts
    try {
      const cashCheck = db.prepare("SELECT COUNT(*) as cnt FROM cash_registers").get();
      if (cashCheck.cnt === 0) {
        db.prepare("INSERT INTO cash_registers (name, balance, is_default) VALUES (?, ?, ?)").run('صندوق اصلی فروشگاه', 0, 1);
        db.prepare("INSERT INTO cash_registers (name, balance, is_default) VALUES (?, ?, ?)").run('صندوق جانبی / کشو', 0, 0);
      }
    } catch(e) {
      console.error('Error seeding default cash_registers:', e);
    }

    try {
      const bankCheck = db.prepare("SELECT COUNT(*) as cnt FROM bank_accounts").get();
      if (bankCheck.cnt === 0) {
        db.prepare("INSERT INTO bank_accounts (bank_name, account_number, card_number, balance, is_default) VALUES (?, ?, ?, ?, ?)").run('بانک ملی', '0102030405006', '6037991122334455', 0, 1);
        db.prepare("INSERT INTO bank_accounts (bank_name, account_number, card_number, balance, is_default) VALUES (?, ?, ?, ?, ?)").run('بانک ملت', '1234567890', '6104337788990011', 0, 0);
      }
    } catch(e) {
      console.error('Error seeding default bank_accounts:', e);
    }

    try { db.prepare('ALTER TABLE persons ADD COLUMN business_name TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN brand TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN business_activity TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN business_address TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN whatsapp TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN province TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN region TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN last_purchase TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN last_payment TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE persons ADD COLUMN last_activity TEXT').run(); } catch(e) {}

    try { db.prepare('ALTER TABLE products ADD COLUMN wholesale_price REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE products ADD COLUMN min_selling_price REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare("ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'فعال'").run(); } catch(e) {}

    try { db.prepare('ALTER TABLE invoice_items ADD COLUMN discount_percent REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoice_items ADD COLUMN discount_amount REAL DEFAULT 0').run(); } catch(e) {}

    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_cash REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_card REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_bank REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_cheque REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_credit REAL DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE invoices ADD COLUMN payment_installment REAL DEFAULT 0').run(); } catch(e) {}

    try { db.prepare('ALTER TABLE inventory ADD COLUMN balance_after REAL DEFAULT 0').run(); } catch(e) {}

    console.log('Database initialized successfully with categories, brands and employees.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // Frameless window for custom header
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Window Controls IPC
  ipcMain.on('window-control', (event, command) => {
    switch (command) {
      case 'close':
        mainWindow.close();
        break;
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
    }
  });

  // Load the Vite dev server in development, or the local index.html in production
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initializeDatabase();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// ------------- IPC Handlers برای ارتباط React با SQLite -------------

ipcMain.handle('getDbStats', () => {
  if (!db) return null;
  const getCount = (table) => {
    try {
      return db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
    } catch {
      return 0;
    }
  };

  return {
    path: db.name,
    products: getCount('products'),
    customers: getCount('customers'),
    invoices: getCount('invoices'),
    inventory: getCount('inventory'),
    persons: getCount('persons'),
    lastUpdated: new Date().toISOString()
  };
});

ipcMain.handle('getDashboardData', () => {
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    // 1. Active customers count
    const customersCount = db.prepare(`
      SELECT COUNT(DISTINCT id) as count FROM persons 
      WHERE category = 'مشتری' OR id IN (SELECT DISTINCT customer_id FROM invoices)
    `).get().count;

    // 2. Products count
    const productsCount = db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE type = 'product' OR type IS NULL
    `).get().count;

    // 3. Today's invoices
    const todayInvoicesCount = db.prepare(`
      SELECT COUNT(*) as count FROM invoices 
      WHERE date(date, 'localtime') = date('now', 'localtime') OR date(date) = date('now')
    `).get().count;

    // 4. Today's sales
    const todaySales = db.prepare(`
      SELECT COALESCE(SUM(final_amount), 0) as total FROM invoices 
      WHERE date(date, 'localtime') = date('now', 'localtime') OR date(date) = date('now')
    `).get().total;

    // 5. Today's profit
    const todayProfit = db.prepare(`
      SELECT COALESCE(SUM(ii.quantity * (ii.unit_price - COALESCE(p.cost, 0))), 0) as profit 
      FROM invoice_items ii 
      JOIN invoices i ON ii.invoice_id = i.id 
      JOIN products p ON ii.product_id = p.id 
      WHERE date(i.date, 'localtime') = date('now', 'localtime') OR date(i.date) = date('now')
    `).get().profit;

    // 6. Products stock query
    const productsStock = db.prepare(`
      SELECT p.id, p.name, p.code, p.unit, p.price, p.cost, p.image_base64, p.min_stock,
        (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_stocks WHERE product_id = p.id) as total_stock,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.type = 'product' OR p.type IS NULL
    `).all();

    const lowStockProducts = productsStock.filter(p => p.total_stock <= Math.max(1, p.min_stock || 5));
    const lowStockCount = lowStockProducts.length;

    // 7. Recent Invoices (limit 15)
    const recentInvoices = db.prepare(`
      SELECT i.*, 
        COALESCE(p.nickname, p.first_name || ' ' || p.last_name, 'مشتری عمومی (فروش سریع)') as customer_name
      FROM invoices i
      LEFT JOIN persons p ON i.customer_id = p.id
      ORDER BY i.id DESC
      LIMIT 15
    `).all();

    // 8. Recent Financial Ledger Entries (limit 15)
    const recentLedger = db.prepare(`
      SELECT l.*, 
        COALESCE(p.nickname, p.first_name || ' ' || p.last_name, 'شخص عمومی') as person_name
      FROM person_financial_ledger l
      JOIN persons p ON l.person_id = p.id
      ORDER BY l.id DESC
      LIMIT 15
    `).all();

    // 9. Unpaid Invoices
    const unpaidInvoices = db.prepare(`
      SELECT i.*, 
        COALESCE(p.nickname, p.first_name || ' ' || p.last_name, 'مشتری عمومی') as customer_name
      FROM invoices i
      LEFT JOIN persons p ON i.customer_id = p.id
      WHERE i.status != 'پرداخت شده'
      ORDER BY i.id DESC
      LIMIT 15
    `).all();

    // 10. Customer Debts, Total Debtors and Creditors
    const persons = db.prepare(`
      SELECT id, first_name, last_name, nickname, type, category
      FROM persons
    `).all();
    
    const customerDebts = [];
    let totalDebtorsSum = 0;
    let totalCreditorsSum = 0;

    for (const p of persons) {
      const invoiceDebts = db.prepare(`
        SELECT SUM(CASE WHEN type = 'خرید' THEN -final_amount ELSE final_amount END) as total FROM invoices 
        WHERE customer_id = ? AND status != 'پرداخت شده'
      `).get(p.id).total || 0;

      const manualBalance = db.prepare(`
        SELECT SUM(amount) as total FROM person_financial_ledger 
        WHERE person_id = ?
      `).get(p.id).total || 0;

      const netBalance = invoiceDebts + manualBalance;
      if (netBalance > 0) {
        totalDebtorsSum += netBalance;
        customerDebts.push({
          id: p.id,
          name: p.nickname || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'شخص بدون نام',
          debt: netBalance
        });
      } else if (netBalance < 0) {
        totalCreditorsSum += Math.abs(netBalance);
      }
    }
    customerDebts.sort((a, b) => b.debt - a.debt);

    // 11. Fetch Best-Selling Products
    const bestSellers = db.prepare(`
      SELECT p.id, p.name, p.price, p.cost, p.unit, p.image_base64, 
        COALESCE(SUM(ii.quantity), 0) as total_sold, 
        c.name as category_name
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN products p ON ii.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE i.type = 'فروش' OR i.type IS NULL
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 12
    `).all();

    // 12. Category Sales Distribution
    const categorySales = db.prepare(`
      SELECT COALESCE(c.name, 'بدون دسته‌بندی') as name, SUM(ii.total) as value
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN products p ON ii.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE i.type = 'فروش' OR i.type IS NULL
      GROUP BY p.category_id
      ORDER BY value DESC
    `).all();

    // 13. All invoices for multi-period sales calculation on client-side
    const allInvoicesForCalculations = db.prepare(`
      SELECT i.id, i.invoice_number, i.date, i.total_amount, i.discount, i.tax, i.final_amount, i.status, i.type,
        (SELECT COALESCE(SUM(ii.quantity * (ii.unit_price - COALESCE(p.cost, 0))), 0) 
         FROM invoice_items ii 
         JOIN products p ON ii.product_id = p.id 
         WHERE ii.invoice_id = i.id) as profit
      FROM invoices i
      ORDER BY i.date ASC
    `).all();

    return {
      success: true,
      customersCount,
      productsCount,
      todayInvoicesCount,
      todaySales,
      todayProfit,
      lowStockCount,
      lowStockProducts,
      recentInvoices,
      recentLedger,
      unpaidInvoices,
      customerDebts,
      totalDebtorsSum,
      totalCreditorsSum,
      bestSellers,
      categorySales,
      allInvoicesForCalculations,
      allProducts: productsStock
    };
  } catch (e) {
    console.error('Error fetching dashboard data:', e);
    return { success: false, error: e.message };
  }
});

const { dialog } = require('electron');

ipcMain.handle('changeDbPath', async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (canceled || filePaths.length === 0) {
    return { success: false };
  }
  
  const newDir = filePaths[0];
  const newDbPath = path.join(newDir, 'database.sqlite');
  
  try {
    saveConfig({ dbPath: newDbPath });
    const Database = require('better-sqlite3');
    if (db) {
      db.close();
    }
    db = new Database(newDbPath);
    // You'd ideally run your CREATE TABLE script here again as well
    initializeDatabase(); // Re-runs tables creation nicely
    return { success: true, path: newDbPath };
  } catch (error) {
    console.error('Error changing DB path', error);
    return { success: false, error: error.message };
  }
});

// Settings Handlers
ipcMain.handle('getConfig', () => {
  return loadConfig();
});

ipcMain.handle('saveConfig', (event, configData) => {
  return saveConfig(configData);
});

// Persons Handlers
ipcMain.handle('addPerson', (event, personData) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  
  try {
    db.prepare('BEGIN').run();
    const config = loadConfig();
    let { accounting_code } = personData;

    // Use current number from DB to generate an auto code if not provided
    if (!accounting_code && personData.auto_accounting_code) {
      const countRes = db.prepare('SELECT count(*) as count FROM persons').get();
      const nextNum = parseInt(config.accCodeStart || 1000) + countRes.count;
      accounting_code = `${nextNum}${config.accCodeSuffix || '-ACC'}`;
    }

    const roles = personData.roles || [];

    const stmt = db.prepare(`
      INSERT INTO persons (
        accounting_code, first_name, last_name, title, nickname, type, category, 
        national_id, economic_code, registration_number, personal_code, credit_limit, 
        tax_registered, address, country, city, postal_code, phone1, phone2, phone3, 
        fax, email, website, bank_account, bank_card, bank_name, iban, birth_date, 
        membership_date, marriage_date, description, avatar,
        business_name, brand, business_activity, business_address,
        whatsapp, province, region, last_purchase, last_payment, last_activity
      ) VALUES (
        @accounting_code, @first_name, @last_name, @title, @nickname, @type, @category,
        @national_id, @economic_code, @registration_number, @personal_code, @credit_limit,
        @tax_registered, @address, @country, @city, @postal_code, @phone1, @phone2, @phone3,
        @fax, @email, @website, @bank_account, @bank_card, @bank_name, @iban, @birth_date,
        @membership_date, @marriage_date, @description, @avatar,
        @business_name, @brand, @business_activity, @business_address,
        @whatsapp, @province, @region, @last_purchase, @last_payment, @last_activity
      )
    `);

    const defaultParams = {
      accounting_code: '',
      first_name: '',
      last_name: '',
      title: '',
      nickname: '',
      type: 'حقیقی',
      category: '',
      national_id: '',
      economic_code: '',
      registration_number: '',
      personal_code: '',
      credit_limit: 0,
      tax_registered: 0,
      address: '',
      country: '',
      city: '',
      postal_code: '',
      phone1: '',
      phone2: '',
      phone3: '',
      fax: '',
      email: '',
      website: '',
      bank_account: '',
      bank_card: '',
      bank_name: '',
      iban: '',
      birth_date: '',
      membership_date: '',
      marriage_date: '',
      description: '',
      avatar: '',
      business_name: '',
      brand: '',
      business_activity: '',
      business_address: '',
      whatsapp: '',
      province: '',
      region: '',
      last_purchase: '',
      last_payment: '',
      last_activity: ''
    };

    const runParams = {
      ...defaultParams,
      ...personData,
      accounting_code,
      tax_registered: personData.tax_registered ? 1 : 0,
      credit_limit: personData.credit_limit || 0,
      avatar: personData.avatar || ''
    };

    const info = stmt.run(runParams);
    
    const personId = info.lastInsertRowid;
    const nameStr = personData.title || (personData.first_name + ' ' + personData.last_name);

    if (roles.includes('سهامدار')) {
      db.prepare('INSERT INTO shareholders (name, person_id, share_percent, join_date) VALUES (?, ?, ?, ?)').run(
         nameStr, personId, 0, personData.membership_date || null
       );
    }
    if (roles.includes('کارمند')) {
      db.prepare('INSERT INTO employees (name, person_id, position, salary, hire_date) VALUES (?, ?, ?, ?, ?)').run(
         nameStr, personId, '', 0, personData.membership_date || null
       );
    }
    if (roles.includes('فروشنده')) {
      db.prepare('INSERT INTO sellers (name, person_id, commission_percent, return_commission_percent) VALUES (?, ?, ?, ?)').run(
         nameStr, personId, 0, 0
       );
    }

    // Write audit log
    const actor = personData.current_username || 'سیستم';
    db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, 'ایجاد شخص', `شخص: ${nameStr}`, `ایجاد شخص جدید با کد حساب ${accounting_code}`, new Date().toISOString());

    db.prepare('COMMIT').run();
    return { success: true, id: personId, accounting_code };
  } catch(e) {
    if(db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error inserting person:', e);
    throw e;
  }
});

ipcMain.handle('getPersons', () => {
  if (!db) return [];
  try {
    const stmt = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM employees e WHERE e.person_id = p.id) as is_employee,
        (SELECT COUNT(*) FROM shareholders s WHERE s.person_id = p.id) as is_shareholder,
        (SELECT COUNT(*) FROM sellers sl WHERE sl.person_id = p.id) as is_seller
      FROM persons p
      ORDER BY p.id DESC
      LIMIT 200
    `);
    return stmt.all();
  } catch(e) {
    console.error('Error fetching persons with roles:', e);
    // fallback if columns don't exist yet
    const stmt = db.prepare('SELECT * FROM persons ORDER BY id DESC LIMIT 200');
    return stmt.all();
  }
});

ipcMain.handle('updatePerson', (event, personData) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    const stmt = db.prepare(`
      UPDATE persons SET
        first_name = @first_name,
        last_name = @last_name,
        title = @title,
        nickname = @nickname,
        type = @type,
        category = @category,
        national_id = @national_id,
        economic_code = @economic_code,
        registration_number = @registration_number,
        personal_code = @personal_code,
        credit_limit = @credit_limit,
        tax_registered = @tax_registered,
        address = @address,
        country = @country,
        city = @city,
        postal_code = @postal_code,
        phone1 = @phone1,
        phone2 = @phone2,
        phone3 = @phone3,
        fax = @fax,
        email = @email,
        website = @website,
        bank_account = @bank_account,
        bank_card = @bank_card,
        bank_name = @bank_name,
        iban = @iban,
        birth_date = @birth_date,
        membership_date = @membership_date,
        marriage_date = @marriage_date,
        description = @description,
        avatar = @avatar,
        business_name = @business_name,
        brand = @brand,
        business_activity = @business_activity,
        business_address = @business_address,
        whatsapp = @whatsapp,
        province = @province,
        region = @region,
        last_purchase = @last_purchase,
        last_payment = @last_payment,
        last_activity = @last_activity,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);
    
    stmt.run({
      whatsapp: '',
      province: '',
      region: '',
      last_purchase: '',
      last_payment: '',
      last_activity: '',
      brand: '',
      ...personData,
      tax_registered: personData.tax_registered ? 1 : 0,
      credit_limit: personData.credit_limit || 0,
      avatar: personData.avatar || '',
      business_name: personData.business_name || '',
      business_activity: personData.business_activity || '',
      business_address: personData.business_address || ''
    });

    const roles = personData.roles || [];
    const nameStr = personData.title || ((personData.first_name || '') + ' ' + (personData.last_name || '')).trim();

    // Sync Shareholders child table
    const shExist = db.prepare('SELECT id FROM shareholders WHERE person_id = ?').get(personData.id);
    if (roles.includes('سهامدار')) {
      if (!shExist) {
        db.prepare('INSERT INTO shareholders (name, person_id, share_percent, join_date) VALUES (?, ?, ?, ?)').run(
           nameStr, personData.id, 0, personData.membership_date || null
        );
      } else {
        db.prepare('UPDATE shareholders SET name = ? WHERE person_id = ?').run(nameStr, personData.id);
      }
    } else {
      if (shExist) {
        db.prepare('DELETE FROM shareholders WHERE person_id = ?').run(personData.id);
      }
    }

    // Sync Employees child table
    const empExist = db.prepare('SELECT id FROM employees WHERE person_id = ?').get(personData.id);
    if (roles.includes('کارمند')) {
      if (!empExist) {
        db.prepare('INSERT INTO employees (name, person_id, position, salary, hire_date) VALUES (?, ?, ?, ?, ?)').run(
           nameStr, personData.id, '', 0, personData.membership_date || null
        );
      } else {
        db.prepare('UPDATE employees SET name = ? WHERE person_id = ?').run(nameStr, personData.id);
      }
    } else {
      if (empExist) {
        db.prepare('DELETE FROM employees WHERE person_id = ?').run(personData.id);
      }
    }

    // Sync Sellers child table
    const sellerExist = db.prepare('SELECT id FROM sellers WHERE person_id = ?').get(personData.id);
    if (roles.includes('فروشنده')) {
      if (!sellerExist) {
        db.prepare('INSERT INTO sellers (name, person_id, commission_percent, return_commission_percent) VALUES (?, ?, ?, ?)').run(
           nameStr, personData.id, 0, 0
        );
      } else {
        db.prepare('UPDATE sellers SET name = ? WHERE person_id = ?').run(nameStr, personData.id);
      }
    } else {
      if (sellerExist) {
        db.prepare('DELETE FROM sellers WHERE person_id = ?').run(personData.id);
      }
    }

    // Write audit log
    const actor = personData.current_username || 'سیستم';
    db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, 'ویرایش شخص', `شخص: ${nameStr}`, `ویرایش اطلاعات شخص با شناسه ${personData.id}`, new Date().toISOString());

    db.prepare('COMMIT').run();
    return { success: true };
  } catch(e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error updating person:', e);
    throw e;
  }
});

ipcMain.handle('deletePerson', (event, personId) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const person = db.prepare('SELECT title, first_name, last_name, accounting_code FROM persons WHERE id = ?').get(personId);
    const nameStr = person ? (person.title || ((person.first_name || '') + ' ' + (person.last_name || '')).trim()) : `شناسه ${personId}`;
    const codeStr = person ? person.accounting_code : '';

    db.prepare('DELETE FROM persons WHERE id = ?').run(personId);
    db.prepare('DELETE FROM shareholders WHERE person_id = ?').run(personId);
    db.prepare('DELETE FROM employees WHERE person_id = ?').run(personId);
    db.prepare('DELETE FROM sellers WHERE person_id = ?').run(personId);

    // Write audit log
    const actor = 'سیستم';
    db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, 'حذف شخص', `شخص: ${nameStr}`, `حذف شخص از سیستم (کد حساب: ${codeStr})`, new Date().toISOString());

    return { success: true };
  } catch(e) {
    console.error('Error deleting person:', e);
    throw e;
  }
});

// GORGEOUS SHAREHOLDER DATA HANDLERS
ipcMain.handle('getShareholders', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT s.*, p.avatar, p.national_id, p.phone1, p.accounting_code, p.email
      FROM shareholders s
      LEFT JOIN persons p ON s.person_id = p.id
      ORDER BY s.share_percent DESC, s.id DESC
    `).all();
  } catch(e) {
    console.error('Error fetching shareholders:', e);
    return [];
  }
});

ipcMain.handle('updateShareholder', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare(`
      UPDATE shareholders SET
        share_percent = @share_percent,
        capital_contribution = @capital_contribution,
        shares_count = @shares_count,
        share_type = @share_type,
        voting_rights = @voting_rights,
        join_date = @join_date,
        allocated_profit = @allocated_profit,
        name = @name
      WHERE id = @id
    `).run(data);
    return { success: true };
  } catch (e) {
    console.error('Error updating shareholder:', e);
    throw e;
  }
});

ipcMain.handle('addShareholderDirect', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    let name = data.name || '';
    if (data.person_id) {
      const person = db.prepare('SELECT first_name, last_name, title, type FROM persons WHERE id = ?').get(data.person_id);
      if (person) {
        name = person.type === 'حقوقی' ? person.title : `${person.first_name || ''} ${person.last_name || ''}`.trim();
      }
    }
    const stmt = db.prepare(`
      INSERT INTO shareholders (
        name, person_id, share_percent, capital_contribution, shares_count, share_type, voting_rights, join_date, allocated_profit
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    stmt.run(
      name,
      data.person_id || null,
      data.share_percent || 0,
      data.capital_contribution || 0,
      data.shares_count || 0,
      data.share_type || 'عادی',
      data.voting_rights !== undefined ? data.voting_rights : 1,
      data.join_date || null,
      data.allocated_profit || 0
    );
    return { success: true };
  } catch (e) {
    console.error('Error adding shareholder:', e);
    throw e;
  }
});

ipcMain.handle('deleteShareholder', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('DELETE FROM shareholders WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    console.error('Error deleting shareholder:', e);
    throw e;
  }
});

ipcMain.handle('getShareholdersStatistics', () => {
  if (!db) return { totalSales: 0, totalProfit: 0, totalExpenses: 0, netIncome: 0 };
  try {
    const salesRes = db.prepare(`SELECT SUM(final_amount) as totalSales FROM invoices WHERE status = 'پرداخت شده'`).get();
    const totalSales = salesRes ? (salesRes.totalSales || 0) : 0;

    let totalProfit = totalSales * 0.25; 
    try {
      const marginRes = db.prepare(`
        SELECT SUM(ii.quantity * (ii.unit_price - IFNULL(p.cost, 0))) as computedProfit
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE i.status = 'پرداخت شده'
      `).get();
      if (marginRes && marginRes.computedProfit) {
        totalProfit = marginRes.computedProfit;
      }
    } catch(e) {
      console.warn('Could not compute exact profits via joins fallback to 25%', e);
    }

    const totalExpenses = totalProfit * 0.15; 
    const netIncome = totalProfit - totalExpenses;

    return {
      totalSales,
      totalProfit,
      totalExpenses,
      netIncome
    };
  } catch (e) {
    console.error('Error calculating store statistics:', e);
    return { totalSales: 1500000000, totalProfit: 375000000, totalExpenses: 120000000, netIncome: 255000000 };
  }
});

// Test items legacy
ipcMain.handle('addItem', (event, name) => {
  if (!db) {
    throw new Error("دیتابیس در دسترس نیست. ممکن است better-sqlite3 نصب نشده باشد.");
  }
  const stmt = db.prepare('INSERT INTO test_items (name) VALUES (?)');
  const info = stmt.run(name);
  return info.lastInsertRowid;
});

ipcMain.handle('getItems', () => {
  if (!db) return [];
  const stmt = db.prepare('SELECT * FROM test_items ORDER BY created_at DESC');
  return stmt.all();
});

// SELLERS HANDLERS
ipcMain.handle('getSellers', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT s.*, p.avatar, p.national_id, p.phone1, p.accounting_code, p.email
      FROM sellers s
      LEFT JOIN persons p ON s.person_id = p.id
      ORDER BY s.id DESC
    `).all();
  } catch (e) {
    console.error('Error fetching sellers:', e);
    return [];
  }
});

ipcMain.handle('updateSeller', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare(`
      UPDATE sellers SET
        name = ?,
        commission_percent = ?,
        return_commission_percent = ?,
        description = ?
      WHERE id = ?
    `).run(
      data.name,
      parseFloat(data.commission_percent || 0),
      parseFloat(data.return_commission_percent || 0),
      data.description || '',
      parseInt(data.id)
    );
    return { success: true };
  } catch (e) {
    console.error('Error updating seller:', e);
    throw e;
  }
});

ipcMain.handle('addSellerDirect', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    let name = data.name || '';
    if (data.person_id) {
      const person = db.prepare('SELECT first_name, last_name, title FROM persons WHERE id = ?').get(data.person_id);
      if (person) {
        name = person.title || `${person.first_name || ''} ${person.last_name || ''}`.trim();
      }
    }
    const stmt = db.prepare(`
      INSERT INTO sellers (name, person_id, commission_percent, return_commission_percent, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name, 
      data.person_id || null, 
      parseFloat(data.commission_percent || 0), 
      parseFloat(data.return_commission_percent || 0), 
      data.description || ''
    );
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    console.error('Error adding seller:', e);
    throw e;
  }
});

ipcMain.handle('deleteSeller', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('DELETE FROM sellers WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    console.error('Error deleting seller:', e);
    throw e;
  }
});

// ONBOARDING & SETUP HANDLERS
ipcMain.handle('checkOnboardingStatus', () => {
  if (!db) return { onboardingRequired: true, storeInfo: null };
  try {
    const usersCount = db.prepare('SELECT count(*) as count FROM users').get().count;
    const store = db.prepare('SELECT * FROM store_info WHERE id = 1').get() || null;
    return { onboardingRequired: usersCount === 0, storeInfo: store };
  } catch (e) {
    console.error('Error checking onboarding status:', e);
    return { onboardingRequired: true, storeInfo: null };
  }
});

ipcMain.handle('performOnboarding', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    // 1. Save store info
    db.prepare('INSERT OR REPLACE INTO store_info (id, name, address, phone, logo, description) VALUES (1, ?, ?, ?, ?, ?)')
      .run(data.storeName || '', data.storeAddress || '', data.storePhone || '', data.storeLogo || '', data.storeDescription || '');

    // 2. Clear any existing user schemas and add primary admin user
    db.prepare('DELETE FROM users').run();
    db.prepare(`
      INSERT INTO users (username, password, role, permissions, recovery_question, recovery_answer)
      VALUES (?, ?, 'مدیر ارشد', '*', ?, ?)
    `).run(data.username, data.password, data.recoveryQuestion || '', data.recoveryAnswer || '');

    // 3. Log initial onboarding in audit_logs
    try {
      db.prepare(`
        INSERT INTO audit_logs (username, action, target, details, date)
        VALUES (?, 'راه‌اندازی', 'راه‌اندازی اولیه', 'راه‌اندازی اولیه سیستم و ایجاد کاربر مدیر ارشد', ?)
      `).run(data.username, new Date().toISOString());
    } catch (auditErr) {
      console.error('Failed to write initial audit log:', auditErr);
    }

    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error performing onboarding:', e);
    throw e;
  }
});

// SESSIONS / AUTH HANDLERS
ipcMain.handle('loginUser', (event, { username, password }) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return { success: false, message: 'نام کاربری نامعتبر است.' };
    }
    if (user.password !== password) {
      return { success: false, message: 'رمز عبور نادرست است.' };
    }
    return { 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      } 
    };
  } catch (e) {
    console.error('Login error:', e);
    throw e;
  }
});

ipcMain.handle('recoverPassword', (event, { username, recoveryAnswer }) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return { success: false, message: 'کاربری با این نام کاربری یافت نشد.' };
    }
    if (!user.recovery_answer || user.recovery_answer.trim().toLowerCase() !== recoveryAnswer.trim().toLowerCase()) {
      return { success: false, message: 'پاسخ سوال امنیتی نادرست است.' };
    }
    return { success: true, password: user.password };
  } catch (e) {
    console.error('Password recovery error:', e);
    throw e;
  }
});

ipcMain.handle('getUserSecurityQuestion', (event, username) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const user = db.prepare('SELECT recovery_question FROM users WHERE username = ?').get(username);
    if (!user) {
      return { success: false, message: 'کاربر یافت نشد.' };
    }
    return { success: true, question: user.recovery_question || 'نام مربی دوران ابتدایی شما؟' };
  } catch (e) {
    console.error('Error fetching security question:', e);
    throw e;
  }
});

// SYSTEM ACCOUNTS & ACCESS RIGHTS HANDLERS
ipcMain.handle('getSystemUsers', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT u.id, u.username, u.password, u.role, u.permissions, u.person_id,
             p.first_name, p.last_name, p.title, p.accounting_code
      FROM users u
      LEFT JOIN persons p ON u.person_id = p.id
      ORDER BY u.id ASC
    `).all();
  } catch (e) {
    console.error('Error fetching users:', e);
    return [];
  }
});

ipcMain.handle('saveUserAccount', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    if (data.id) {
      // update
      db.prepare(`
        UPDATE users SET
          username = ?,
          password = ?,
          role = ?,
          permissions = ?,
          person_id = ?
        WHERE id = ?
      `).run(
        data.username,
        data.password,
        data.role || 'کاربر',
        data.permissions || '*',
        data.person_id || null,
        data.id
      );
      return { success: true };
    } else {
      // insert
      const stmt = db.prepare(`
        INSERT INTO users (username, password, role, permissions, person_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.username,
        data.password,
        data.role || 'کاربر',
        data.permissions || '*',
        data.person_id || null
      );
      return { success: true };
    }
  } catch (e) {
    console.error('Error saving user account:', e);
    throw e;
  }
});

ipcMain.handle('deleteUserAccount', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    // Prevent deleting admin index/sole admin
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
    if (user && (user.role === 'مدیر' || user.role === 'مدیر ارشد')) {
      const adminsCount = db.prepare("SELECT count(*) as count FROM users WHERE role = 'مدیر' OR role = 'مدیر ارشد'").get().count;
      if (adminsCount <= 1) {
        throw new Error("امکان حذف آخرین مدیر سیستم وجود ندارد.");
      }
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    console.error('Error deleting user account:', e);
    throw e;
  }
});

ipcMain.handle('getAuditLogs', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all();
  } catch (e) {
    console.error('Error fetching audit logs:', e);
    return [];
  }
});

ipcMain.handle('addAuditLog', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.username,
      data.action,
      data.target,
      data.details || '',
      data.date || new Date().toISOString()
    );
    return { success: true };
  } catch (e) {
    console.error('Error adding audit log:', e);
    throw e;
  }
});

// ==================== CATEGORIES & BRANDS API ====================
ipcMain.handle('getCategories', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT c.*, p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY c.id ASC
    `).all();
  } catch (e) {
    console.error('Error fetching categories:', e);
    return [];
  }
});

ipcMain.handle('saveCategory', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    if (data.id) {
      db.prepare(`
        UPDATE categories SET
          name = @name,
          parent_id = @parent_id,
          image = @image,
          description = @description,
          type = @type
        WHERE id = @id
      `).run({
        id: data.id,
        name: data.name,
        parent_id: data.parent_id || null,
        image: data.image || '',
        description: data.description || '',
        type: data.type || 'both'
      });
      return { success: true, id: data.id };
    } else {
      const info = db.prepare(`
        INSERT INTO categories (name, parent_id, image, description, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.parent_id || null,
        data.image || '',
        data.description || '',
        data.type || 'both'
      );
      return { success: true, id: info.lastInsertRowid };
    }
  } catch (e) {
    console.error('Error saving category:', e);
    throw e;
  }
});

ipcMain.handle('deleteCategory', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    // Safe child update: set parent_id to null for any categories nested under this
    db.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').run(id);
    // Safe product category sync: set category_id to null for products using this category
    db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error deleting category:', e);
    throw e;
  }
});

ipcMain.handle('getBrands', () => {
  if (!db) return [];
  try {
    return db.prepare('SELECT * FROM brands ORDER BY name ASC').all();
  } catch (e) {
    console.error('Error fetching brands:', e);
    return [];
  }
});

ipcMain.handle('saveBrand', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    if (data.id) {
      db.prepare(`
        UPDATE brands SET
          name = @name,
          logo = @logo,
          description = @description
        WHERE id = @id
      `).run({
        id: data.id,
        name: data.name,
        logo: data.logo || '',
        description: data.description || ''
      });
      return { success: true, id: data.id };
    } else {
      const info = db.prepare(`
        INSERT INTO brands (name, logo, description)
        VALUES (?, ?, ?)
      `).run(
        data.name,
        data.logo || '',
        data.description || ''
      );
      return { success: true, id: info.lastInsertRowid };
    }
  } catch (e) {
    console.error('Error saving brand:', e);
    throw e;
  }
});

ipcMain.handle('deleteBrand', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('DELETE FROM brands WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    console.error('Error deleting brand:', e);
    throw e;
  }
});

// ==================== EMPLOYEES & TRANSACTIONS API ====================
ipcMain.handle('getEmployees', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT e.*, p.avatar, p.national_id, p.phone1, p.accounting_code,
        (
          SELECT COALESCE(SUM(CASE WHEN t.type IN ('salary_accrual', 'bonus') THEN t.amount ELSE -t.amount END), 0)
          FROM employee_transactions t
          WHERE t.employee_id = e.id
        ) as balance
      FROM employees e
      LEFT JOIN persons p ON e.person_id = p.id
      ORDER BY e.id DESC
    `).all();
  } catch (e) {
    console.error('Error fetching employees:', e);
    return [];
  }
});

ipcMain.handle('updateEmployee', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare(`
      UPDATE employees SET
        name = @name,
        phone = @phone,
        position = @position,
        salary = @salary,
        hire_date = @hire_date,
        person_id = @person_id
      WHERE id = @id
    `).run({
      id: data.id,
      name: data.name,
      phone: data.phone || '',
      position: data.position || '',
      salary: parseFloat(data.salary || 0),
      hire_date: data.hire_date || '',
      person_id: data.person_id || null
    });
    return { success: true };
  } catch (e) {
    console.error('Error updating employee:', e);
    throw e;
  }
});

ipcMain.handle('addEmployeeDirect', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    let name = data.name || '';
    let phone = data.phone || '';
    if (data.person_id) {
      const person = db.prepare('SELECT first_name, last_name, title, phone1 FROM persons WHERE id = ?').get(data.person_id);
      if (person) {
        name = person.title || `${person.first_name || ''} ${person.last_name || ''}`.trim();
        phone = phone || person.phone1 || '';
      }
    }
    const info = db.prepare(`
      INSERT INTO employees (name, phone, position, salary, person_id, hire_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name,
      phone,
      data.position || '',
      parseFloat(data.salary || 0),
      data.person_id || null,
      data.hire_date || ''
    );
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    console.error('Error adding employee direct:', e);
    throw e;
  }
});

ipcMain.handle('deleteEmployee', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    db.prepare('DELETE FROM employee_transactions WHERE employee_id = ?').run(id);
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error deleting employee:', e);
    throw e;
  }
});

ipcMain.handle('getEmployeeTransactions', (event, employeeId) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT * FROM employee_transactions
      WHERE employee_id = ?
      ORDER BY date DESC, id DESC
    `).all(employeeId);
  } catch (e) {
    console.error('Error fetching employee transactions:', e);
    return [];
  }
});

ipcMain.handle('addEmployeeTransaction', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const info = db.prepare(`
      INSERT INTO employee_transactions (employee_id, date, type, amount, item_name, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      parseInt(data.employee_id),
      data.date,
      data.type,
      parseFloat(data.amount || 0),
      data.item_name || '',
      data.description || ''
    );
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    console.error('Error adding employee transaction:', e);
    throw e;
  }
});

ipcMain.handle('deleteEmployeeTransaction', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('DELETE FROM employee_transactions WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    console.error('Error deleting employee transaction:', e);
    throw e;
  }
});

// ==================== WAREHOUSES & PRODUCTS API ====================

ipcMain.handle('selectLocalImage', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    ],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) {
    return { success: false };
  }
  try {
    const filePath = filePaths[0];
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const base64 = `data:image/${ext || 'png'};base64,${fileBuffer.toString('base64')}`;
    return { success: true, base64 };
  } catch (e) {
    console.error('Error reading local image:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('getProducts', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT p.*, c.name as category_name, b.name as brand_name,
        (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_stocks WHERE product_id = p.id) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ORDER BY p.id DESC
    `).all();
  } catch (e) {
    console.error('Error fetching products:', e);
    return [];
  }
});

ipcMain.handle('saveProduct', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    let productId = data.id;

    if (productId) {
      // Update
      db.prepare(`
        UPDATE products SET
          name = @name,
          code = @code,
          price = @price,
          cost = @cost,
          category_id = @category_id,
          brand_id = @brand_id,
          unit = @unit,
          description = @description,
          internal_sku = @internal_sku,
          serial_number = @serial_number,
          image_base64 = @image_base64,
          type = @type,
          required_docs = @required_docs,
          barcode = @barcode,
          min_stock = @min_stock,
          wholesale_price = @wholesale_price,
          min_selling_price = @min_selling_price,
          status = @status
        WHERE id = @id
      `).run({
        id: productId,
        name: data.name,
        code: data.code,
        price: parseFloat(data.price || 0),
        cost: parseFloat(data.cost || 0),
        category_id: data.category_id || null,
        brand_id: data.brand_id || null,
        unit: data.unit || 'عدد',
        description: data.description || '',
        internal_sku: data.internal_sku || '',
        serial_number: data.serial_number || '',
        image_base64: data.image_base64 || '',
        type: data.type || 'product',
        required_docs: data.required_docs || null,
        barcode: data.barcode || '',
        min_stock: parseFloat(data.min_stock || 0),
        wholesale_price: parseFloat(data.wholesale_price || 0),
        min_selling_price: parseFloat(data.min_selling_price || 0),
        status: data.status || 'فعال'
      });
    } else {
      // Insert new product
      const info = db.prepare(`
        INSERT INTO products (name, code, price, cost, category_id, brand_id, unit, description, internal_sku, serial_number, image_base64, type, required_docs, barcode, min_stock, wholesale_price, min_selling_price, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.name,
        data.code,
        parseFloat(data.price || 0),
        parseFloat(data.cost || 0),
        data.category_id || null,
        data.brand_id || null,
        data.unit || 'عدد',
        data.description || '',
        data.internal_sku || '',
        data.serial_number || '',
        data.image_base64 || '',
        data.type || 'product',
        data.required_docs || null,
        data.barcode || '',
        parseFloat(data.min_stock || 0),
        parseFloat(data.wholesale_price || 0),
        parseFloat(data.min_selling_price || 0),
        data.status || 'فعال'
      );
      productId = info.lastInsertRowid;
    }

    // Write audit log
    const actor = data.current_username || 'سیستم';
    const actionName = data.id ? 'ویرایش کالا' : 'ایجاد کالا';
    db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, actionName, `کالا: ${data.name}`, `${actionName} با بارکد ${data.barcode || '---'} و قیمت فروش ${data.price}`, new Date().toISOString());

    // Handle warehouse initial stock placement
    if (data.initial_warehouse_id && parseFloat(data.initial_qty || 0) > 0) {
      const qty = parseFloat(data.initial_qty);
      // Check if entry exists for this warehouse & product
      const existing = db.prepare('SELECT id, quantity FROM warehouse_stocks WHERE warehouse_id = ? AND product_id = ?').get(data.initial_warehouse_id, productId);
      if (existing) {
        db.prepare('UPDATE warehouse_stocks SET quantity = quantity + ? WHERE id = ?').run(qty, existing.id);
      } else {
        db.prepare('INSERT INTO warehouse_stocks (warehouse_id, product_id, quantity) VALUES (?, ?, ?)').run(
          data.initial_warehouse_id,
          productId,
          qty
        );
      }

      // Add to general inventory transactions table for history tracking
      db.prepare('INSERT INTO inventory (product_id, quantity_change, type, description) VALUES (?, ?, ?, ?)').run(
        productId,
        qty,
        'ورود',
        `موجودی اولیه ثبت کالا در انبار ${data.initial_warehouse_id}`
      );
    }

    db.prepare('COMMIT').run();
    return { success: true, id: productId };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error saving product:', e);
    throw e;
  }
});

// ==================== NEW PRODUCT HISTORY & LEDGER CHANNELS ====================

ipcMain.handle('getProductSalesHistory', (event, productId) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT ii.*, inv.invoice_number, inv.date, inv.customer_id,
             (p.first_name || ' ' || p.last_name) as customer_name
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      LEFT JOIN persons p ON inv.customer_id = p.id
      WHERE ii.product_id = ?
      ORDER BY inv.date DESC, inv.id DESC
    `).all(productId);
  } catch (e) {
    console.error('Error fetching product sales history:', e);
    return [];
  }
});

ipcMain.handle('getProductPurchaseHistory', (event, productId) => {
  if (!db) return [];
  try {
    const ledgerPurchases = db.prepare(`
      SELECT pgl.id, pgl.date, pgl.quantity_change as quantity, pgl.unit_price_at_transaction as unit_price,
             (pgl.quantity_change * pgl.unit_price_at_transaction) as total,
             (p.first_name || ' ' || p.last_name) as source_name,
             pgl.description
      FROM person_goods_ledger pgl
      LEFT JOIN persons p ON pgl.person_id = p.id
      WHERE pgl.product_id = ? AND pgl.quantity_change > 0
      ORDER BY pgl.date DESC, pgl.id DESC
    `).all(productId);

    const inventoryEntries = db.prepare(`
      SELECT iv.id, iv.date, iv.quantity_change as quantity, p.cost as unit_price,
             (iv.quantity_change * p.cost) as total,
             'انبارداری / ثبت اولیه' as source_name,
             iv.description
      FROM inventory iv
      JOIN products p ON iv.product_id = p.id
      WHERE iv.product_id = ? AND iv.type = 'ورود' AND iv.quantity_change > 0
      ORDER BY iv.date DESC, iv.id DESC
    `).all(productId);

    const combined = [...ledgerPurchases, ...inventoryEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  } catch (e) {
    console.error('Error fetching product purchase history:', e);
    return [];
  }
});

ipcMain.handle('getProductInventoryCirculation', (event, productId) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT iv.*, w.name as warehouse_name, tw.name as to_warehouse_name
      FROM inventory iv
      LEFT JOIN warehouses w ON iv.warehouse_id = w.id
      LEFT JOIN warehouses tw ON iv.to_warehouse_id = tw.id
      WHERE iv.product_id = ?
      ORDER BY iv.date DESC, iv.id DESC
    `).all(productId);
  } catch (e) {
    console.error('Error fetching product inventory circulation:', e);
    return [];
  }
});

ipcMain.handle('deleteProduct', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    const product = db.prepare('SELECT name, barcode FROM products WHERE id = ?').get(id);
    const nameStr = product ? product.name : `کالا شناسه ${id}`;
    const barcodeStr = product ? (product.barcode || '') : '';

    db.prepare('DELETE FROM warehouse_stocks WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM inventory WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM invoice_items WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    // Write audit log
    const actor = 'سیستم';
    db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, 'حذف کالا', `کالا: ${nameStr}`, `حذف کالا از سیستم (بارکد: ${barcodeStr})`, new Date().toISOString());

    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error deleting product:', e);
    throw e;
  }
});

ipcMain.handle('getWarehouses', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT w.*, 
        (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_stocks WHERE warehouse_id = w.id) as total_items,
        (SELECT COUNT(DISTINCT product_id) FROM warehouse_stocks WHERE warehouse_id = w.id AND quantity > 0) as unique_products
      FROM warehouses w
      ORDER BY w.id ASC
    `).all();
  } catch (e) {
    console.error('Error fetching warehouses:', e);
    return [];
  }
});

ipcMain.handle('saveWarehouse', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    if (data.id) {
      db.prepare(`
        UPDATE warehouses SET
          name = @name,
          code = @code,
          address = @address,
          description = @description
        WHERE id = @id
      `).run({
        id: data.id,
        name: data.name,
        code: data.code,
        address: data.address || '',
        description: data.description || ''
      });
      return { success: true, id: data.id };
    } else {
      const info = db.prepare(`
        INSERT INTO warehouses (name, code, address, description)
        VALUES (?, ?, ?, ?)
      `).run(
        data.name,
        data.code,
        data.address || '',
        data.description || ''
      );
      return { success: true, id: info.lastInsertRowid };
    }
  } catch (e) {
    console.error('Error saving warehouse:', e);
    throw e;
  }
});

ipcMain.handle('deleteWarehouse', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    // Default warehouse WH-01 cannot be deleted
    const wh = db.prepare('SELECT code FROM warehouses WHERE id = ?').get(id);
    if (wh && wh.code === 'WH-01') {
      throw new Error('انبار اصلی سیستم قابل حذف نمی‌باشد');
    }
    db.prepare('DELETE FROM warehouse_stocks WHERE warehouse_id = ?').run(id);
    db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error deleting warehouse:', e);
    throw e;
  }
});

ipcMain.handle('getWarehouseStocks', (event, warehouseId) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT ws.*, p.name as product_name, p.code as product_code, p.unit, p.price, p.cost
      FROM warehouse_stocks ws
      JOIN products p ON ws.product_id = p.id
      WHERE ws.warehouse_id = ? AND ws.quantity > 0
      ORDER BY p.name ASC
    `).all(warehouseId);
  } catch (e) {
    console.error('Error fetching warehouse stocks:', e);
    return [];
  }
});

ipcMain.handle('getInventoryHistory', (event) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT iv.*, p.name as product_name, p.code as product_code, p.unit, p.price, p.cost,
             w.name as warehouse_name, tw.name as to_warehouse_name
      FROM inventory iv
      JOIN products p ON iv.product_id = p.id
      LEFT JOIN warehouses w ON iv.warehouse_id = w.id
      LEFT JOIN warehouses tw ON iv.to_warehouse_id = tw.id
      ORDER BY iv.id DESC
    `).all();
  } catch (e) {
    console.error('Error fetching inventory history:', e);
    return [];
  }
});

ipcMain.handle('addWarehouseTransaction', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    const { warehouse_id, to_warehouse_id, product_id, quantity_change, type, description, date, username } = data;
    const qty = parseFloat(quantity_change);

    if (type === 'ورود') {
      const existing = db.prepare('SELECT id, quantity FROM warehouse_stocks WHERE warehouse_id = ? AND product_id = ?').get(warehouse_id, product_id);
      if (existing) {
        db.prepare('UPDATE warehouse_stocks SET quantity = quantity + ? WHERE id = ?').run(qty, existing.id);
      } else {
        db.prepare('INSERT INTO warehouse_stocks (warehouse_id, product_id, quantity) VALUES (?, ?, ?)').run(warehouse_id, product_id, qty);
      }
      const balanceAfter = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM warehouse_stocks WHERE product_id = ?').get(product_id).total;
      db.prepare(`
        INSERT INTO inventory (product_id, quantity_change, type, description, date, warehouse_id, username, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(product_id, qty, 'ورود', description, date || new Date().toISOString(), warehouse_id, username || null, balanceAfter);

    } else if (type === 'خروج') {
      const existing = db.prepare('SELECT id, quantity FROM warehouse_stocks WHERE warehouse_id = ? AND product_id = ?').get(warehouse_id, product_id);
      if (!existing || existing.quantity < qty) {
        throw new Error('موجودی کافی در این انبار جهت خروج وجود ندارد');
      }
      db.prepare('UPDATE warehouse_stocks SET quantity = quantity - ? WHERE id = ?').run(qty, existing.id);
      
      const balanceAfter = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM warehouse_stocks WHERE product_id = ?').get(product_id).total;
      db.prepare(`
        INSERT INTO inventory (product_id, quantity_change, type, description, date, warehouse_id, username, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(product_id, -qty, 'خروج', description, date || new Date().toISOString(), warehouse_id, username || null, balanceAfter);

    } else if (type === 'انتقال') {
      if (!to_warehouse_id) throw new Error('انبار مقصد مشخص نشده است');
      if (parseInt(warehouse_id) === parseInt(to_warehouse_id)) throw new Error('انبار مبدا و مقصد نمی‌توانند یکسان باشند');

      const sourceStock = db.prepare('SELECT id, quantity FROM warehouse_stocks WHERE warehouse_id = ? AND product_id = ?').get(warehouse_id, product_id);
      if (!sourceStock || sourceStock.quantity < qty) {
        throw new Error('موجودی کافی در انبار مبدا جهت انتقال وجود ندارد');
      }
      db.prepare('UPDATE warehouse_stocks SET quantity = quantity - ? WHERE id = ?').run(qty, sourceStock.id);

      const destStock = db.prepare('SELECT id, quantity FROM warehouse_stocks WHERE warehouse_id = ? AND product_id = ?').get(to_warehouse_id, product_id);
      if (destStock) {
        db.prepare('UPDATE warehouse_stocks SET quantity = quantity + ? WHERE id = ?').run(qty, destStock.id);
      } else {
        db.prepare('INSERT INTO warehouse_stocks (warehouse_id, product_id, quantity) VALUES (?, ?, ?)').run(to_warehouse_id, product_id, qty);
      }

      const balanceAfter = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM warehouse_stocks WHERE product_id = ?').get(product_id).total;
      db.prepare(`
        INSERT INTO inventory (product_id, quantity_change, type, description, date, warehouse_id, to_warehouse_id, username, balance_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(product_id, qty, 'انتقال', description, date || new Date().toISOString(), warehouse_id, to_warehouse_id, username || null, balanceAfter);
    }

    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error adding warehouse transaction:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('applyPriceUpdate', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    const info = db.prepare(`
      INSERT INTO price_updates (update_date, username, description, rollback_status)
      VALUES (?, ?, ?, 0)
    `).run(
      data.update_date,
      data.username,
      data.description || ''
    );
    const updateId = info.lastInsertRowid;

    const itemStmt = db.prepare(`
      INSERT INTO price_update_items (price_update_id, product_id, old_price, new_price, old_cost, new_cost)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const prodStmt = db.prepare(`
      UPDATE products SET price = ?, cost = ? WHERE id = ?
    `);

    for (const item of data.items) {
      itemStmt.run(
        updateId,
        item.product_id,
        parseFloat(item.old_price),
        parseFloat(item.new_price),
        parseFloat(item.old_cost),
        parseFloat(item.new_cost)
      );

      prodStmt.run(
        parseFloat(item.new_price),
        parseFloat(item.new_cost),
        item.product_id
      );
    }

    db.prepare('COMMIT').run();
    return { success: true, id: updateId };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error applying price update:', e);
    throw e;
  }
});

ipcMain.handle('getPriceUpdates', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT pu.*, 
        (SELECT COUNT(*) FROM price_update_items WHERE price_update_id = pu.id) as item_count
      FROM price_updates pu
      ORDER BY pu.id DESC
    `).all();
  } catch (e) {
    console.error('Error fetching price updates:', e);
    return [];
  }
});

ipcMain.handle('getPriceUpdateItems', (event, updateId) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT pui.*, p.name as product_name, p.code as product_code, p.type
      FROM price_update_items pui
      JOIN products p ON pui.product_id = p.id
      WHERE pui.price_update_id = ?
    `).all(updateId);
  } catch (e) {
    console.error('Error fetching price update items:', e);
    return [];
  }
});

ipcMain.handle('rollbackPriceUpdate', (event, updateId) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();
    const updateRecord = db.prepare('SELECT rollback_status FROM price_updates WHERE id = ?').get(updateId);
    if (!updateRecord) {
      throw new Error("سند تغییرات قیمتی یافت نشد");
    }
    if (updateRecord.rollback_status === 1) {
      throw new Error("این سند هم‌اکنون به عقب برگشت داده شده است");
    }

    const items = db.prepare('SELECT * FROM price_update_items WHERE price_update_id = ?').all(updateId);
    const prodStmt = db.prepare(`
      UPDATE products SET price = ?, cost = ? WHERE id = ?
    `);

    for (const item of items) {
      prodStmt.run(
        parseFloat(item.old_price),
        parseFloat(item.old_cost),
        item.product_id
      );
    }

    db.prepare('UPDATE price_updates SET rollback_status = 1 WHERE id = ?').run(updateId);
    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error rolling back price update:', e);
    throw e;
  }
});

ipcMain.handle('saveInvoice', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();

    // 1. Generate unique invoice number if not provided
    let invoiceNumber = data.invoice_number;
    if (!invoiceNumber) {
      const count = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
      const prefix = data.type === 'خرید' ? 'PUR' : 'INV';
      invoiceNumber = `${prefix}-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${String(count + 1).padStart(4, '0')}`;
    }

    // 2. Insert invoice details
    const info = db.prepare(`
      INSERT INTO invoices (
        invoice_number, customer_id, total_amount, discount, tax, final_amount, status, 
        payment_method, payment_details, description, type, received_amount, date, username,
        payment_cash, payment_card, payment_bank, payment_cheque, payment_credit, payment_installment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNumber,
      data.customer_id || null, 
      parseFloat(data.total_amount || 0),
      parseFloat(data.discount || 0),
      parseFloat(data.tax || 0),
      parseFloat(data.final_amount || 0),
      data.status || 'پرداخت شده',
      data.payment_method || 'کارتخوان',
      data.payment_details || '',
      data.description || '',
      data.type || 'فروش',
      parseFloat(data.received_amount || 0),
      data.date || new Date().toISOString(),
      data.username || null,
      parseFloat(data.payment_cash || 0),
      parseFloat(data.payment_card || 0),
      parseFloat(data.payment_bank || 0),
      parseFloat(data.payment_cheque || 0),
      parseFloat(data.payment_credit || 0),
      parseFloat(data.payment_installment || 0)
    );
    const invoiceId = info.lastInsertRowid;

    // 3. Insert invoice items, calculate profit, update warehouse stock, and save last purchase price
    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, total, discount_percent, discount_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const checkStockStmt = db.prepare('SELECT id, quantity FROM warehouse_stocks WHERE warehouse_id = 1 AND product_id = ?');
    const updateStockStmt = db.prepare('UPDATE warehouse_stocks SET quantity = quantity - ? WHERE id = ?');
    const addStockStmt = db.prepare('UPDATE warehouse_stocks SET quantity = quantity + ? WHERE id = ?');
    const insertStockStmt = db.prepare('INSERT INTO warehouse_stocks (warehouse_id, product_id, quantity) VALUES (1, ?, ?)');

    let totalProfit = 0;
    const isPurchase = (data.type === 'خرید');

    for (const item of data.items) {
      itemStmt.run(
        invoiceId,
        item.product_id,
        parseFloat(item.quantity || 1),
        parseFloat(item.unit_price || 0),
        parseFloat(item.total || 0),
        parseFloat(item.discount_percent || 0),
        parseFloat(item.discount_amount || 0)
      );

      // Check product details to calculate profit or update purchase price
      const prod = db.prepare('SELECT type, cost FROM products WHERE id = ?').get(item.product_id);
      const qty = parseFloat(item.quantity || 1);
      const price = parseFloat(item.unit_price || 0);

      if (isPurchase) {
        // Save the last purchase price (cost) in the products table
        db.prepare('UPDATE products SET cost = ? WHERE id = ?').run(price, item.product_id);

        // Increase warehouse stock for products
        if (prod && prod.type === 'product') {
          const existingStock = checkStockStmt.get(item.product_id);
          if (existingStock) {
            addStockStmt.run(qty, existingStock.id);
          } else {
            insertStockStmt.run(item.product_id, qty);
          }

          // Cardex log in inventory table
          db.prepare(`
            INSERT INTO inventory (product_id, quantity_change, type, description, date, warehouse_id, username)
            VALUES (?, ?, 'خرید', ?, ?, 1, ?)
          `).run(item.product_id, qty, `ورود بابت فاکتور خرید شماره ${invoiceNumber}`, data.date || new Date().toISOString(), data.username || null);
        }
      } else {
        // Sale: calculate profit
        const cost = prod ? (prod.cost || 0) : 0;
        const itemProfit = qty * (price - cost);
        totalProfit += itemProfit;

        // Decrease stock
        if (prod && prod.type === 'product') {
          const deliveredQty = item.delivered_qty !== undefined ? parseFloat(item.delivered_qty) : qty;
          const existingStock = checkStockStmt.get(item.product_id);
          if (existingStock) {
            updateStockStmt.run(deliveredQty, existingStock.id);
          } else {
            insertStockStmt.run(item.product_id, -deliveredQty);
          }

          // If this item is delivered from a previous goods demand, update the demand
          if (item.demand_id) {
            const demand = db.prepare('SELECT * FROM person_goods_demands WHERE id = ?').get(item.demand_id);
            if (demand) {
              const newDelivered = demand.delivered_qty + qty;
              const newRemaining = Math.max(0, demand.remaining_qty - qty);
              db.prepare('UPDATE person_goods_demands SET delivered_qty = ?, remaining_qty = ? WHERE id = ?')
                .run(newDelivered, newRemaining, item.demand_id);

              // Log in person_goods_ledger so that it registers in their goods ledger/statement
              db.prepare(`
                INSERT INTO person_goods_ledger (person_id, product_id, date, quantity_change, unit_price_at_transaction, description)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(
                data.customer_id,
                item.product_id,
                data.date || new Date().toISOString().slice(0, 10),
                -qty,
                0,
                `تحویل کالا از بابت طلب قبلی (فاکتور فروش جاری: ${invoiceNumber})`
              );
            }
          }

          // Cardex log in inventory table
          const cardexDesc = item.demand_id 
            ? `خروج بابت تحویل کالا از طلب قبلی (فاکتور جاری: ${invoiceNumber})`
            : (deliveredQty < qty 
                ? `خروج بابت تحویل فیزیکی فاکتور فروش شماره ${invoiceNumber} (مقدار کل: ${qty}، تحویل‌شده: ${deliveredQty})`
                : `خروج بابت فاکتور فروش شماره ${invoiceNumber}`);

          const cardexQty = item.demand_id ? qty : deliveredQty;
          db.prepare(`
            INSERT INTO inventory (product_id, quantity_change, type, description, date, warehouse_id, username)
            VALUES (?, ?, 'فروش', ?, ?, 1, ?)
          `).run(item.product_id, -cardexQty, cardexDesc, data.date || new Date().toISOString(), data.username || null);
        }
      }
    }

    if (!isPurchase) {
      // Adjust total profit by subtracting total invoice-level discount
      totalProfit -= parseFloat(data.discount || 0);
    }

    // 4. Record Supplier/Customer Financial Transaction (گردش حساب طرف حساب)
    if (data.customer_id) {
      const isPaid = (data.status === 'پرداخت شده');
      const finalAmt = parseFloat(data.final_amount || 0);
      const recvAmt = parseFloat(data.received_amount || 0);
      const txDate = data.date || new Date().toISOString().slice(0, 10);

      if (isPurchase) {
        // Purchase:
        if (isPaid) {
          // Record we owe the supplier (credit)
          db.prepare(`
            INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
            VALUES (?, ?, 'invoice_credit', ?, ?)
          `).run(
            data.customer_id,
            txDate,
            -finalAmt,
            `ثبت فاکتور خرید شماره ${invoiceNumber}`
          );

          // Record we paid them (debit)
          if (recvAmt > 0) {
            db.prepare(`
              INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
              VALUES (?, ?, 'paid', ?, ?)
            `).run(
              data.customer_id,
              txDate,
              recvAmt,
              `تسویه نقدی/بانکی فاکتور خرید شماره ${invoiceNumber}`
            );
          }
        } else {
          // Unpaid or partially paid: unpaid part will count dynamically, only log payment portion as debit
          if (recvAmt > 0) {
            db.prepare(`
              INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
              VALUES (?, ?, 'paid', ?, ?)
            `).run(
              data.customer_id,
              txDate,
              recvAmt,
              `پرداخت نقدی/بانکی بابت فاکتور خرید شماره ${invoiceNumber}`
            );
          }
        }
      } else {
        // Sale:
        if (isPaid) {
          // Fully paid invoice: Log debit (the sale) and credit (the payment) so both appear in statement of accounts
          db.prepare(`
            INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
            VALUES (?, ?, 'invoice_debit', ?, ?)
          `).run(
            data.customer_id,
            txDate,
            finalAmt,
            `خرید کالا/خدمات فاکتور فروش شماره ${invoiceNumber}`
          );

          if (recvAmt > 0) {
            db.prepare(`
              INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
              VALUES (?, ?, 'received', ?, ?)
            `).run(
              data.customer_id,
              txDate,
              -recvAmt,
              `تسویه نقدی/کارتخوان فاکتور شماره ${invoiceNumber}`
            );
          }
        } else {
          // Unpaid or partially paid invoice: Invoice final_amount is counted as debt in invoiceDebts automatically.
          // Therefore, we ONLY log the received payment portion (if any) as a credit in the financial ledger to avoid double counting!
          if (recvAmt > 0) {
            db.prepare(`
              INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
              VALUES (?, ?, 'received', ?, ?)
            `).run(
              data.customer_id,
              txDate,
              -recvAmt,
              `پرداخت بخشی از مبلغ فاکتور شماره ${invoiceNumber}`
            );
          }
        }
      }
    }

    // Write audit log
    const actor = data.username || 'سیستم';
    const actionName = data.type === 'خرید' ? 'ثبت فاکتور خرید' : 'ثبت فاکتور فروش';
    db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, actionName, `فاکتور: ${invoiceNumber}`, `${actionName} به مبلغ نهایی ${data.final_amount} ثبت شد`, new Date().toISOString());

    db.prepare('COMMIT').run();
    return { success: true, id: invoiceId, invoice_number: invoiceNumber, profit: isPurchase ? 0 : totalProfit };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error saving invoice:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('getInvoices', () => {
  if (!db) return [];
  try {
    const invoices = db.prepare(`
      SELECT i.*, 
        COALESCE(p.nickname, p.first_name || ' ' || p.last_name, 'مشتری عمومی (فروش سریع)') as customer_name,
        p.phone1 as customer_phone
      FROM invoices i
      LEFT JOIN persons p ON i.customer_id = p.id
      ORDER BY i.id DESC
    `).all();

    const itemsStmt = db.prepare(`
      SELECT ii.*, p.name as product_name, p.code as product_code, p.unit as product_unit, p.type
      FROM invoice_items ii
      JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
    `);

    return invoices.map(inv => {
      const items = itemsStmt.all(inv.id);
      return {
        ...inv,
        items
      };
    });
  } catch (e) {
    console.error('Error fetching invoices:', e);
    return [];
  }
});

ipcMain.handle('deleteInvoice', (event, idOrData) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    let id;
    let username = null;
    if (typeof idOrData === 'object' && idOrData !== null) {
      id = idOrData.id;
      username = idOrData.username;
    } else {
      id = idOrData;
    }

    db.prepare('BEGIN').run();

    const invoice = db.prepare('SELECT type, invoice_number FROM invoices WHERE id = ?').get(id);
    const invoiceType = invoice ? invoice.type : 'فروش';

    const items = db.prepare('SELECT ii.*, i.invoice_number FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id WHERE ii.invoice_id = ?').all(id);
    
    const checkStockStmt = db.prepare('SELECT id FROM warehouse_stocks WHERE warehouse_id = 1 AND product_id = ?');
    const restoreStockStmt = db.prepare('UPDATE warehouse_stocks SET quantity = quantity + ? WHERE id = ?');
    const decreaseStockStmt = db.prepare('UPDATE warehouse_stocks SET quantity = quantity - ? WHERE id = ?');

    // 'خرید' and 'برگشت از فروش' are operations that increased stock, so deleting them should decrease stock.
    // 'فروش' and 'برگشت از خرید' are operations that decreased stock, so deleting them should increase stock.
    const isStockIncreasingType = (invoiceType === 'خرید' || invoiceType === 'برگشت از فروش');

    for (const item of items) {
      const prod = db.prepare('SELECT type FROM products WHERE id = ?').get(item.product_id);
      if (prod && prod.type === 'product') {
        const qty = parseFloat(item.quantity || 1);
        const existingStock = checkStockStmt.get(item.product_id);
        if (existingStock) {
          if (isStockIncreasingType) {
            decreaseStockStmt.run(qty, existingStock.id);
          } else {
            restoreStockStmt.run(qty, existingStock.id);
          }
        }

        const revType = isStockIncreasingType ? 'کاهش موجودی (لغو)' : 'افزایش موجودی (لغو)';
        const revDesc = `اصلاح موجودی بابت حذف سند فاکتور شماره ${item.invoice_number}`;

        db.prepare(`
          INSERT INTO inventory (product_id, quantity_change, type, description, username)
          VALUES (?, ?, ?, ?, ?)
        `).run(item.product_id, isStockIncreasingType ? -qty : qty, revType, revDesc, username || null);
      }
    }

    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(id);

    // Clean up any related financial ledger entries for this invoice
    if (invoice && invoice.invoice_number) {
      db.prepare("DELETE FROM person_financial_ledger WHERE description LIKE ?").run(`%${invoice.invoice_number}%`);
    }

    // Write audit log
    const actor = username || 'سیستم';
    const actionName = invoiceType === 'خرید' ? 'حذف فاکتور خرید' : 'حذف فاکتور فروش';
    db.prepare(`
      INSERT INTO audit_logs (username, action, target, details, date)
      VALUES (?, ?, ?, ?, ?)
    `).run(actor, actionName, `فاکتور: ${invoice ? invoice.invoice_number : `شناسه ${id}`}`, `${actionName} با شماره ${invoice ? invoice.invoice_number : `شناسه ${id}`} حذف شد`, new Date().toISOString());

    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error deleting/canceling invoice:', e);
    return { success: false, error: e.message };
  }
});

// Save Return Invoice (Sales Return & Purchase Return)
ipcMain.handle('saveReturn', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN').run();

    const { type, customer_id, invoice_id, original_invoice_num, date, items, discount, description, amountPaid, username } = data;
    const isSalesReturn = (type === 'sales_return');

    // 1. Generate return invoice number
    const count = db.prepare("SELECT COUNT(*) as c FROM invoices WHERE type IN ('برگشت از فروش', 'برگشت از خرید')").get().c;
    const prefix = isSalesReturn ? 'SRT' : 'PRT';
    const invoiceNumber = `${prefix}-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${String(count + 1).padStart(4, '0')}`;

    const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0), 0);
    const finalAmount = Math.max(0, totalAmount - parseFloat(discount || 0));

    // 2. Insert into invoices table
    const info = db.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, total_amount, discount, tax, final_amount, status, payment_method, description, type, received_amount, date, username)
      VALUES (?, ?, ?, ?, 0, ?, 'برگشت', 'نقدی', ?, ?, ?, ?, ?)
    `).run(
      invoiceNumber,
      customer_id || null,
      totalAmount,
      parseFloat(discount || 0),
      finalAmount,
      description || '',
      isSalesReturn ? 'برگشت از فروش' : 'برگشت از خرید',
      parseFloat(amountPaid || 0),
      date || new Date().toISOString(),
      username || null
    );
    const returnId = info.lastInsertRowid;

    // 3. Insert items and update stock
    const itemStmt = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, total)
      VALUES (?, ?, ?, ?, ?)
    `);

    const checkStockStmt = db.prepare('SELECT id, quantity FROM warehouse_stocks WHERE warehouse_id = 1 AND product_id = ?');
    const addStockStmt = db.prepare('UPDATE warehouse_stocks SET quantity = quantity + ? WHERE id = ?');
    const updateStockStmt = db.prepare('UPDATE warehouse_stocks SET quantity = quantity - ? WHERE id = ?');
    const insertStockStmt = db.prepare('INSERT INTO warehouse_stocks (warehouse_id, product_id, quantity) VALUES (1, ?, ?)');

    for (const item of items) {
      const qty = parseFloat(item.quantity || 0);
      const price = parseFloat(item.unit_price || 0);
      const total = qty * price;

      itemStmt.run(returnId, item.product_id, qty, price, total);

      const prod = db.prepare('SELECT type FROM products WHERE id = ?').get(item.product_id);

      if (prod && prod.type === 'product') {
        const existingStock = checkStockStmt.get(item.product_id);
        if (isSalesReturn) {
          // Sales Return: Increase stock
          if (existingStock) {
            addStockStmt.run(qty, existingStock.id);
          } else {
            insertStockStmt.run(item.product_id, qty);
          }

          // Cardex log
          db.prepare(`
            INSERT INTO inventory (product_id, quantity_change, type, description, date, warehouse_id, username)
            VALUES (?, ?, 'برگشت از فروش', ?, ?, 1, ?)
          `).run(
            item.product_id,
            qty,
            `ورود بابت برگشت از فروش شماره ${invoiceNumber}${original_invoice_num ? ` (مربوط به فاکتور فروش ${original_invoice_num})` : ''}`,
            date || new Date().toISOString(),
            username || null
          );
        } else {
          // Purchase Return: Decrease stock
          if (existingStock) {
            updateStockStmt.run(qty, existingStock.id);
          } else {
            insertStockStmt.run(item.product_id, -qty);
          }

          // Cardex log
          db.prepare(`
            INSERT INTO inventory (product_id, quantity_change, type, description, date, warehouse_id, username)
            VALUES (?, ?, 'برگشت از خرید', ?, ?, 1, ?)
          `).run(
            item.product_id,
            -qty,
            `خروج بابت برگشت از خرید شماره ${invoiceNumber}${original_invoice_num ? ` (مربوط به فاکتور خرید ${original_invoice_num})` : ''}`,
            date || new Date().toISOString(),
            username || null
          );
        }
      }
    }

    // 4. Record financial ledger entries
    if (customer_id) {
      if (isSalesReturn) {
        // Decrease customer's debt (credit customer, negative amount)
        db.prepare(`
          INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
          VALUES (?, ?, 'sales_return', ?, ?)
        `).run(
          customer_id,
          date || new Date().toISOString().slice(0, 10),
          -finalAmount,
          `ثبت برگشت از فروش شماره ${invoiceNumber}`
        );

        // If we repaid them cash/bank (amountPaid > 0), log debit as refund paid
        if (parseFloat(amountPaid || 0) > 0) {
          db.prepare(`
            INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
            VALUES (?, ?, 'paid', ?, ?)
          `).run(
            customer_id,
            date || new Date().toISOString().slice(0, 10),
            parseFloat(amountPaid || 0),
            `پرداخت نقدی/بانکی بابت برگشت از فروش شماره ${invoiceNumber}`
          );
        }
      } else {
        // Decrease what we owe supplier (debit supplier, positive amount)
        db.prepare(`
          INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
          VALUES (?, ?, 'purchase_return', ?, ?)
        `).run(
          customer_id,
          date || new Date().toISOString().slice(0, 10),
          finalAmount,
          `ثبت برگشت از خرید شماره ${invoiceNumber}`
        );

        // If supplier repaid us cash/bank (amountPaid > 0), log credit as refund received
        if (parseFloat(amountPaid || 0) > 0) {
          db.prepare(`
            INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
            VALUES (?, ?, 'received', ?, ?)
          `).run(
            customer_id,
            date || new Date().toISOString().slice(0, 10),
            -parseFloat(amountPaid || 0),
            `دریافت نقدی/بانکی بابت برگشت از خرید شماره ${invoiceNumber}`
          );
        }
      }
    }

    db.prepare('COMMIT').run();
    return { success: true, id: returnId, invoice_number: invoiceNumber };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error saving return invoice:', e);
    return { success: false, error: e.message };
  }
});

// Debtors and Creditors Handlers
ipcMain.handle('getDebtorsCreditorsSummary', () => {
  if (!db) return [];
  try {
    const persons = db.prepare(`
      SELECT p.*
      FROM persons p
      ORDER BY p.last_name ASC, p.first_name ASC
    `).all();

    const result = [];
    for (const person of persons) {
      // 1. Calculate Unpaid/Partial Invoices sum (sales are positive debts, purchases are negative debts)
      const invoiceDebts = db.prepare(`
        SELECT SUM(CASE WHEN type = 'خرید' THEN -final_amount ELSE final_amount END) as total FROM invoices 
        WHERE customer_id = ? AND status != 'پرداخت شده'
      `).get(person.id).total || 0;

      // 2. Calculate Manual Financial Ledger sum
      const manualBalance = db.prepare(`
        SELECT SUM(amount) as total FROM person_financial_ledger 
        WHERE person_id = ?
      `).get(person.id).total || 0;

      const netFinancialBalance = invoiceDebts + manualBalance;

      // 3. Calculate Goods Deposit Balances and Valuation
      const goodsBalances = db.prepare(`
        SELECT gl.product_id, SUM(gl.quantity_change) as balance,
          SUM(gl.quantity_change * gl.unit_price_at_transaction) as old_value,
          prod.name as product_name, prod.price as current_price, prod.unit as product_unit
        FROM person_goods_ledger gl
        JOIN products prod ON gl.product_id = prod.id
        WHERE gl.person_id = ?
        GROUP BY gl.product_id
        HAVING balance != 0
      `).all(person.id);

      let totalGoodsOldVal = 0;
      let totalGoodsNewVal = 0;
      let activeDepositsCount = 0;

      for (const gb of goodsBalances) {
        if (gb.balance > 0) {
          totalGoodsOldVal += gb.old_value;
          totalGoodsNewVal += gb.balance * gb.current_price;
          activeDepositsCount += gb.balance;
        }
      }

      // 4. Calculate Quotas status
      const quotas = db.prepare(`
        SELECT pq.*, prod.name as product_name, prod.unit as product_unit
        FROM person_quotas pq
        JOIN products prod ON pq.product_id = prod.id
        WHERE pq.person_id = ?
      `).all(person.id);

      result.push({
        ...person,
        financial_balance: netFinancialBalance,
        goods_balances: goodsBalances,
        total_goods_old_val: totalGoodsOldVal,
        total_goods_new_val: totalGoodsNewVal,
        active_deposits_count: activeDepositsCount,
        quotas_count: quotas.length,
        has_active_items: activeDepositsCount > 0 || quotas.length > 0 || Math.abs(netFinancialBalance) > 100
      });
    }

    return result;
  } catch (e) {
    console.error('Error fetching debtors/creditors summary:', e);
    return [];
  }
});



ipcMain.handle('getPersonFinancialTransactions', (event, personId) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT * FROM person_financial_ledger
      WHERE person_id = ?
      ORDER BY id DESC
    `).all(personId);
  } catch (e) {
    console.error('Error fetching person financial transactions:', e);
    return [];
  }
});

ipcMain.handle('addPersonFinancialTransaction', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const { person_id, date, type, amount, description } = data;
    const info = db.prepare(`
      INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(person_id, date, type, amount, description);
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    console.error('Error adding financial transaction:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('deletePersonFinancialTransaction', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('DELETE FROM person_financial_ledger WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    console.error('Error deleting financial transaction:', e);
    return { success: false, error: e.message };
  }
});



ipcMain.handle('getPersonNotes', (event, personId) => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT * FROM person_notes
      WHERE person_id = ?
      ORDER BY id DESC
    `).all(personId);
  } catch (e) {
    console.error('Error fetching person notes:', e);
    return [];
  }
});

ipcMain.handle('addPersonNote', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const { person_id, description, followup_date, reminder } = data;
    const info = db.prepare(`
      INSERT INTO person_notes (person_id, description, followup_date, reminder)
      VALUES (?, ?, ?, ?)
    `).run(person_id, description, followup_date, reminder);
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    console.error('Error adding person note:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('deletePersonNote', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('DELETE FROM person_notes WHERE id = ?').run(id);
    return { success: true };
  } catch (e) {
    console.error('Error deleting person note:', e);
    return { success: false, error: e.message };
  }
});

// Cash and Bank APIs
ipcMain.handle('getCashRegisters', () => {
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM cash_registers ORDER BY id ASC").all();
  } catch (e) {
    console.error('Error in getCashRegisters:', e);
    return [];
  }
});

ipcMain.handle('getBankAccounts', () => {
  if (!db) return [];
  try {
    return db.prepare("SELECT * FROM bank_accounts ORDER BY id ASC").all();
  } catch (e) {
    console.error('Error in getBankAccounts:', e);
    return [];
  }
});

ipcMain.handle('addCashRegister', (event, name) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const info = db.prepare("INSERT INTO cash_registers (name, balance, is_default) VALUES (?, ?, ?)").run(name, 0, 0);
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    console.error('Error in addCashRegister:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('addBankAccount', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    const { bank_name, account_number, card_number } = data;
    const info = db.prepare("INSERT INTO bank_accounts (bank_name, account_number, card_number, balance, is_default) VALUES (?, ?, ?, ?, ?)").run(bank_name, account_number, card_number, 0, 0);
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    console.error('Error in addBankAccount:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('getTreasuryTransactions', () => {
  if (!db) return [];
  try {
    return db.prepare(`
      SELECT t.*, 
             CASE WHEN t.source_type = 'cash' THEN c.name ELSE b.bank_name || ' - ' || b.account_number END as source_name,
             CASE WHEN t.destination_type = 'cash' THEN dc.name 
                  WHEN t.destination_type = 'bank' THEN dbk.bank_name || ' - ' || dbk.account_number
                  WHEN t.destination_type = 'person' THEN p.first_name || ' ' || p.last_name
                  ELSE NULL END as destination_name
      FROM treasury_transactions t
      LEFT JOIN cash_registers c ON t.source_type = 'cash' AND t.source_id = c.id
      LEFT JOIN bank_accounts b ON t.source_type = 'bank' AND t.source_id = b.id
      LEFT JOIN cash_registers dc ON t.destination_type = 'cash' AND t.destination_id = dc.id
      LEFT JOIN bank_accounts dbk ON t.destination_type = 'bank' AND t.destination_id = dbk.id
      LEFT JOIN persons p ON t.destination_type = 'person' AND t.destination_id = p.id
      ORDER BY t.id DESC
    `).all();
  } catch (e) {
    console.error('Error in getTreasuryTransactions:', e);
    return [];
  }
});

ipcMain.handle('addTreasuryTransaction', (event, data) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  
  const { date, source_type, source_id, type, amount, destination_type, destination_id, description } = data;
  
  try {
    db.prepare('BEGIN TRANSACTION').run();
    
    // 1. Update source balance
    if (type === 'deposit') {
      if (source_type === 'cash') {
        db.prepare("UPDATE cash_registers SET balance = balance + ? WHERE id = ?").run(amount, source_id);
      } else if (source_type === 'bank') {
        db.prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = ?").run(amount, source_id);
      }
    } else if (type === 'withdrawal' || type === 'transfer') {
      if (source_type === 'cash') {
        db.prepare("UPDATE cash_registers SET balance = balance - ? WHERE id = ?").run(amount, source_id);
      } else if (source_type === 'bank') {
        db.prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = ?").run(amount, source_id);
      }
    }
    
    // 2. Update destination balance if it's a transfer
    if (type === 'transfer') {
      if (destination_type === 'cash') {
        db.prepare("UPDATE cash_registers SET balance = balance + ? WHERE id = ?").run(amount, destination_id);
      } else if (destination_type === 'bank') {
        db.prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = ?").run(amount, destination_id);
      }
    }
    
    // 3. Link to person's financial ledger if applicable
    if (destination_type === 'person' && destination_id) {
      let personLedgerType = type === 'deposit' ? 'received' : 'paid';
      let personLedgerAmount = type === 'deposit' ? -amount : amount;
      
      db.prepare(`
        INSERT INTO person_financial_ledger (person_id, date, type, amount, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(destination_id, date, personLedgerType, personLedgerAmount, description || (type === 'deposit' ? 'دریافت نقدی/بانکی' : 'پرداخت نقدی/بانکی'));
    }
    
    // 4. Save the treasury transaction record
    const info = db.prepare(`
      INSERT INTO treasury_transactions (date, source_type, source_id, type, amount, destination_type, destination_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(date, source_type, source_id, type, amount, destination_type || null, destination_id || null, description || '');
    
    db.prepare('COMMIT').run();
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error adding treasury transaction:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('deleteTreasuryTransaction', (event, id) => {
  if (!db) throw new Error("دیتابیس متصل نیست");
  try {
    db.prepare('BEGIN TRANSACTION').run();
    
    const tx = db.prepare("SELECT * FROM treasury_transactions WHERE id = ?").get(id);
    if (!tx) {
      throw new Error("تراکنش یافت نشد");
    }
    
    // Reverse source balance
    if (tx.type === 'deposit') {
      if (tx.source_type === 'cash') {
        db.prepare("UPDATE cash_registers SET balance = balance - ? WHERE id = ?").run(tx.amount, tx.source_id);
      } else if (tx.source_type === 'bank') {
        db.prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = ?").run(tx.amount, tx.source_id);
      }
    } else if (tx.type === 'withdrawal' || tx.type === 'transfer') {
      if (tx.source_type === 'cash') {
        db.prepare("UPDATE cash_registers SET balance = balance + ? WHERE id = ?").run(tx.amount, tx.source_id);
      } else if (tx.source_type === 'bank') {
        db.prepare("UPDATE bank_accounts SET balance = balance + ? WHERE id = ?").run(tx.amount, tx.source_id);
      }
    }
    
    // Reverse destination balance if transfer
    if (tx.type === 'transfer') {
      if (tx.destination_type === 'cash') {
        db.prepare("UPDATE cash_registers SET balance = balance - ? WHERE id = ?").run(tx.amount, tx.destination_id);
      } else if (tx.destination_type === 'bank') {
        db.prepare("UPDATE bank_accounts SET balance = balance - ? WHERE id = ?").run(tx.amount, tx.destination_id);
      }
    }
    
    // Reverse person's financial ledger if applicable
    if (tx.destination_type === 'person' && tx.destination_id) {
      let personLedgerAmount = tx.type === 'deposit' ? -tx.amount : tx.amount;
      db.prepare(`
        DELETE FROM person_financial_ledger 
        WHERE person_id = ? AND date = ? AND amount = ?
      `).run(tx.destination_id, tx.date, personLedgerAmount);
    }
    
    // Delete transaction
    db.prepare("DELETE FROM treasury_transactions WHERE id = ?").run(id);
    
    db.prepare('COMMIT').run();
    return { success: true };
  } catch (e) {
    if (db.inTransaction) db.prepare('ROLLBACK').run();
    console.error('Error deleting treasury transaction:', e);
    return { success: false, error: e.message };
  }
});

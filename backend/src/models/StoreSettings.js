const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoreSettings = sequelize.define('store_settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1,
    validate: {
      is: /^1$/,
    },
  },
  store_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'BensBurger',
  },
  store_description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'Restaurant Rapide',
  },
  address_line1: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: '123 Avenue des Burgers',
  },
  address_line2: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: '75001',
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Paris',
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'France',
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '01 23 45 67 89',
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  legal_form: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'SARL',
  },
  capital_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 10000.00,
  },
  siret: {
    type: DataTypes.STRING(14),
    allowNull: true,
    defaultValue: '12345678900012',
  },
  vat_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'FR12345678901',
  },
  rcs: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Paris B 123 456 789',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
  },
  currency_symbol: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: '€',
  },
  // Configuration paramétrable pour multi-commerce
  categories: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  vat_rates: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  payment_methods: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  theme_color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#FF6B35',
  },
  logo_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  language: {
    type: DataTypes.STRING(5),
    allowNull: true,
    defaultValue: 'fr-FR',
  },
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Europe/Paris',
  },
  // Configuration SumUp
  sumup_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      enabled: false,
      api_key: '',
      merchant_code: '',
      affiliate_key: '',
    },
  },
  // Configuration imprimante ESC/POS
  printer_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      enabled: false,
      type: 'epson', // epson, star, tanca
      interface: 'tcp', // tcp, usb, printer
      ip: '',
      port: 9100,
      path: '', // Pour USB/printer
      auto_print: true,
    },
  },
  // Configuration email/SMTP
  email_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {
      enabled: false,
      smtp_host: '',
      smtp_port: 587,
      smtp_secure: false, // true pour port 465
      smtp_user: '',
      smtp_password: '',
      from_email: '',
      from_name: '',
    },
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'store_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = StoreSettings;

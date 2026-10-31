const mongoose = require('mongoose');

async function showDb() {
  await mongoose.connect('mongodb://localhost:27017/supermarket_db');
  console.log('=== DATABASE OVERVIEW ===');
  console.log('Database Name:', mongoose.connection.name);
  console.log('Host:', mongoose.connection.host + ':' + mongoose.connection.port);
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\n=== COLLECTIONS & DOCUMENT COUNTS ===');
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log('- ' + c.name.padEnd(25) + ': ' + count + ' documents');
  }

  console.log('\n=== REGISTERED STAFF USERS ===');
  const users = await mongoose.connection.db.collection('users').find().toArray();
  users.forEach(u => {
    console.log(`• ${u.name.padEnd(30)} | Email: ${u.email.padEnd(28)} | Role: ${u.role}`);
  });

  console.log('\n=== SAMPLE PRODUCTS (FIRST 8) ===');
  const products = await mongoose.connection.db.collection('products').find().limit(8).toArray();
  products.forEach(p => {
    console.log(`• [${p.sku.padEnd(14)}] ${p.name.padEnd(35)} | Stock: ${String(p.currentStock).padEnd(4)} | Qiimaha: $${p.sellingPrice} (Cost: $${p.costPrice})`);
  });

  console.log('\n=== SAMPLE CUSTOMERS ===');
  const customers = await mongoose.connection.db.collection('customers').find().limit(8).toArray();
  customers.forEach(c => {
    console.log(`• ${c.name.padEnd(26)} | Tel: ${c.phone} | Points: ${String(c.loyaltyPoints).padEnd(4)} | Total Spent: $${c.totalSpent}`);
  });

  console.log('\n=== RECENT SALES TRANSACTIONS (LAST 6) ===');
  const sales = await mongoose.connection.db.collection('sales').find().sort({ createdAt: -1 }).limit(6).toArray();
  sales.forEach(s => {
    const pay = s.payments.map(p => p.method + ' ($' + p.amount + ')').join(', ');
    const dt = new Date(s.createdAt).toISOString().slice(0, 16).replace('T', ' ');
    console.log(`• ${s.receiptNumber} | ${dt} | Total: $${String(s.grandTotal).padEnd(6)} | Alaab: ${s.items.length} xabbad | Bixin: ${pay}`);
  });

  console.log('\n=== SAMPLE INVENTORY LOTS & EXPIRY DATES ===');
  const lots = await mongoose.connection.db.collection('inventorylots').find().limit(6).toArray();
  lots.forEach(l => {
    const exp = l.expirationDate ? new Date(l.expirationDate).toISOString().slice(0, 10) : 'None';
    console.log(`• Batch: ${l.batchNumber.padEnd(24)} | Qty: ${String(l.remainingQuantity).padEnd(4)} | Unit Cost: $${String(l.unitCost).padEnd(5)} | Dhacaya: ${exp}`);
  });

  console.log('\n=== OPERATING EXPENSES ===');
  const expenses = await mongoose.connection.db.collection('expenses').find().toArray();
  expenses.forEach(e => {
    const dt = new Date(e.paidDate).toISOString().slice(0, 10);
    console.log(`• [${e.expenseNumber}] $${String(e.amount).padEnd(6)} | ${dt} | ${e.category.padEnd(25)} | ${e.description}`);
  });

  console.log('\n=== CASHIER SHIFTS ===');
  const shifts = await mongoose.connection.db.collection('cashiershifts').find().toArray();
  shifts.forEach(sh => {
    console.log(`• Shift: ${sh.shiftNumber} | Status: ${sh.status.toUpperCase()} | Opening Cash: $${sh.openingCash} | Sales Cash: $${sh.totalSalesCash}`);
  });

  await mongoose.disconnect();
}

showDb().catch(console.error);

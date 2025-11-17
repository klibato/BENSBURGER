const bcrypt = require('bcryptjs');

console.log('Generating bcrypt hashes for seed users...\n');

const users = [
  { username: 'admin', pin: '1234', role: 'admin' },
  { username: 'john', pin: '5678', role: 'cashier' },
  { username: 'marie', pin: '9999', role: 'cashier' },
];

users.forEach(user => {
  const hash = bcrypt.hashSync(user.pin, 10);
  console.log(`${user.username}/${user.pin} (${user.role}):`);
  console.log(`  Hash: ${hash}`);
  console.log('');
});

console.log('SQL INSERT Statement:');
console.log('');
users.forEach(user => {
  const hash = bcrypt.hashSync(user.pin, 10);
  const firstName = user.username.charAt(0).toUpperCase() + user.username.slice(1);
  const lastName = user.role === 'admin' ? 'Principal' : user.username === 'john' ? 'Doe' : 'Martin';
  const email = `${user.username}@bensburger.com`;

  console.log(`('${user.username}', '${hash}', '${user.role}', '${firstName}', '${lastName}', '${email}', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),`);
});

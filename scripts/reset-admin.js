const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data/afterschool.db'));
const hash = bcrypt.hashSync('Tudor300419*', 10);

const existing = db.prepare("SELECT id FROM admin_users WHERE username = 'bogdanbratu'").get();
if (existing) {
  db.prepare("UPDATE admin_users SET password = ? WHERE username = 'bogdanbratu'").run(hash);
  console.log('Parola actualizata cu succes.');
} else {
  db.prepare("INSERT INTO admin_users (username, password) VALUES ('bogdanbratu', ?)").run(hash);
  console.log('User creat cu succes.');
}
db.close();

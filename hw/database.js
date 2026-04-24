const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./microblog.db', (err) => {
  if (err) {
    console.error('資料庫連線失敗:', err.message);
    process.exit(1);
  }
  console.log('已成功連線至 SQLite 資料庫');
});

db.serialize(() => {
  db.run("PRAGMA timezone = 'Asia/Taipei'");
  
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE(user_id, post_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
});

function htmlEscape(text) {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  return String(text).replace(/[&<>"'`]/g, char => escapeMap[char]);
}

function parseHashtags(content) {
  const hashtagRegex = /#(\w+)/g;
  const tags = [];
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return [...new Set(tags)];
}

function convertHashtagsToLinks(content) {
  return content.replace(
    /#(\w+)/g,
    '<a href="/tag/$1" class="hashtag">#$1</a>'
  );
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getAvatarGradient(username) {
  const gradients = [
    ['#ff6b6b', '#feca57'],
    ['#5f27cd', '#341f97'],
    ['#00d2d3', '#10ac84'],
    ['#ff9ff3', '#f368e0'],
    ['#54a0ff', '#2e86de'],
    ['#00b894', '#00cec9'],
    ['#e17055', '#d63031'],
    ['#6c5ce7', '#a29bfe'],
    ['#fd79a8', '#e84393'],
    ['#00cec9', '#81ecec'],
    ['#fdcb6e', '#f39c12'],
    ['#a29bfe', '#6c5ce7']
  ];
  const index = hashCode(username) % gradients.length;
  return gradients[index].join(', ');
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr + ' +0800');
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小時前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('zh-TW', options);
}

function promisifyDB(method, isRun = false) {
  return (...args) => {
    return new Promise((resolve, reject) => {
      const callback = function(err, result) {
        if (err) reject(err);
        else if (isRun) resolve({ lastID: this.lastID, changes: this.changes });
        else resolve(result);
      };
      method.call(db, ...args, callback);
    });
  };
}

const dbGet = promisifyDB(db.get.bind(db));
const dbAll = promisifyDB(db.all.bind(db));
const dbRun = promisifyDB(db.run.bind(db), true);

module.exports = {
  db,
  dbGet,
  dbAll,
  dbRun,
  htmlEscape,
  parseHashtags,
  convertHashtagsToLinks,
  getAvatarGradient,
  formatTimeAgo
};
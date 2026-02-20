/**
 * eCollect Enterprise - Backend API
 * Connects directly to PostgreSQL
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool (Neon-safe)
const pool = new Pool({
  host: process.env.PG_HOST,
  port: 5432, // Neon always uses 5432
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,

  ssl: { rejectUnauthorized: false },

  connectionTimeoutMillis: 10000, // increase timeout
  idleTimeoutMillis: 30000,
  max: 5,          
  family: 4,       
});

// Test database connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    console.error('   Check your database credentials in .env file');
  } else {
    console.log('✅ PostgreSQL connected successfully!');
    console.log(`   Host: ${process.env.PG_HOST}`);
    console.log(`   Database: ${process.env.PG_DATABASE}`);
    release();
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// ============================================
// NOTEHIS ENDPOINTS
// ============================================

// Get all notes (paginated)
app.get('/api/notehis', async (req, res) => {
  try {
    const { limit = 1000, offset = 0 } = req.query;
    const result = await pool.query(
      'SELECT * FROM notehis ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notehis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notes by account number
app.get('/api/notehis/account/:accnumber', async (req, res) => {
  try {
    const { accnumber } = req.params;
    const result = await pool.query(
      'SELECT * FROM notehis WHERE accnumber = $1 ORDER BY notedate DESC',
      [accnumber]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes by account:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notes by customer number
app.get('/api/notehis/customer/:custnumber', async (req, res) => {
  try {
    const { custnumber } = req.params;
    const result = await pool.query(
      'SELECT * FROM notehis WHERE custnumber = $1 ORDER BY notedate DESC',
      [custnumber]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notes by customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new note
app.post('/api/notehis', async (req, res) => {
  try {
    const { custnumber, accnumber, notemade, owner, notesrc, noteimp, reason, reasondetails } = req.body;
    
    // Get next ID
    const maxIdResult = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM notehis');
    const nextId = maxIdResult.rows[0].next_id;
    
    const result = await pool.query(
      `INSERT INTO notehis (id, custnumber, accnumber, notemade, owner, notedate, notesrc, noteimp, reason, reasondetails)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
       RETURNING *`,
      [nextId, custnumber, accnumber, notemade, owner, notesrc, noteimp, reason, reasondetails]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SMS_LOGS ENDPOINTS
// ============================================

// Get all SMS logs (paginated)
app.get('/api/sms_logs', async (req, res) => {
  try {
    const { limit = 1000, offset = 0 } = req.query;
    const result = await pool.query(
      'SELECT * FROM sms_logs ORDER BY sms_id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sms_logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get SMS by customer number
app.get('/api/sms_logs/customer/:customer_number', async (req, res) => {
  try {
    const { customer_number } = req.params;
    const result = await pool.query(
      'SELECT * FROM sms_logs WHERE customer_number = $1 ORDER BY date_sent DESC',
      [customer_number]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching SMS by customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACCOUNTS ENDPOINT (Aggregated from both tables)
// ============================================

app.get('/api/accounts', async (req, res) => {
  try {
    // Get all notes
    const notesResult = await pool.query('SELECT * FROM notehis WHERE accnumber IS NOT NULL AND accnumber != \'NULL\'');
    const notes = notesResult.rows;

    // Get all SMS
    let smsRecords = [];
    try {
      const smsResult = await pool.query('SELECT * FROM sms_logs WHERE customer_number IS NOT NULL');
      smsRecords = smsResult.rows;
    } catch (e) {
      console.log('Note: sms_logs table not found or empty, continuing without SMS data');
    }

    // Group by customer
    const customerMap = new Map();

    // Process notes
    notes.forEach(note => {
      const custKey = note.custnumber || note.accnumber;
      if (!custKey || custKey === 'NULL') return;

      if (!customerMap.has(custKey)) {
        customerMap.set(custKey, {
          id: custKey,
          custnumber: note.custnumber || '',
          accnumber: note.accnumber || '',
          customerName: `Customer ${note.custnumber || note.accnumber}`,
          notes: [],
          smsLogs: [],
          source: 'notes'
        });
      }
      customerMap.get(custKey).notes.push(note);
    });

    // Process SMS
    smsRecords.forEach(sms => {
      const custKey = sms.customer_number;
      if (!custKey || custKey === 'NULL') return;

      if (!customerMap.has(custKey)) {
        customerMap.set(custKey, {
          id: custKey,
          custnumber: custKey,
          accnumber: '',
          customerName: `Customer ${custKey}`,
          notes: [],
          smsLogs: [],
          source: 'sms'
        });
      } else if (customerMap.get(custKey).source === 'notes') {
        customerMap.get(custKey).source = 'both';
      }
      customerMap.get(custKey).smsLogs.push(sms);
    });

    // Build accounts array
    const accounts = [];
    customerMap.forEach((value, key) => {
      const latestNote = value.notes[0];
      accounts.push({
        id: key,
        custnumber: value.custnumber,
        accnumber: value.accnumber || value.custnumber,
        customerName: value.customerName,
        dpd: extractDPD(value.notes),
        status: extractStatus(value.notes),
        lastContact: latestNote?.notedate || 'N/A',
        noteCount: value.notes.length,
        smsCount: value.smsLogs.length,
        source: value.source
      });
    });

    // Sort by DPD
    accounts.sort((a, b) => b.dpd - a.dpd);

    console.log(`✅ Returning ${accounts.length} accounts`);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEARCH ENDPOINT
// ============================================

app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT * FROM notehis 
       WHERE notemade ILIKE $1 OR reason ILIKE $1 OR reasondetails ILIKE $1
       ORDER BY notedate DESC LIMIT 50`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractStatus(notes) {
  const statusKeywords = [
    { keyword: 'bankruptcy', status: 'Bankruptcy' },
    { keyword: 'legal', status: 'Legal' },
    { keyword: 'promise to pay', status: 'Promise to Pay' },
    { keyword: 'ptp', status: 'Promise to Pay' },
    { keyword: 'paid', status: 'Paid' },
    { keyword: 'dispute', status: 'Dispute' },
    { keyword: 'broken', status: 'Broken Promise' },
    { keyword: 'skip', status: 'Skip' },
    { keyword: 'deceased', status: 'Deceased' },
    { keyword: 'settlement', status: 'Settlement' },
    { keyword: 'arrangement', status: 'Arrangement' }
  ];

  for (const note of notes) {
    const content = `${note.notemade || ''} ${note.reason || ''} ${note.reasondetails || ''}`.toLowerCase();
    for (const { keyword, status } of statusKeywords) {
      if (content.includes(keyword)) {
        return status;
      }
    }
  }
  return 'Active';
}

function extractDPD(notes) {
  for (const note of notes) {
    const content = `${note.notemade || ''} ${note.reason || ''} ${note.reasondetails || ''}`;
    const dpdPatterns = [
      /(\d+)\s*(?:days?\s*past\s*due|dpd)/i,
      /dpd[:\s]*(\d+)/i,
      /(\d+)\s*dpd/i,
      /(\d+)\s*day\(s\)\s*overdue/i,
      /late\s*by\s*(\d+)\s*days?/i
    ];

    for (const pattern of dpdPatterns) {
      const match = content.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  // Use note count as proxy
  const noteCount = notes.length;
  if (noteCount > 10) return 60 + Math.min(noteCount * 3, 120);
  if (noteCount > 5) return 30 + noteCount * 3;
  return 10 + noteCount * 2;
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         eCollect Enterprise - Backend API             ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  🚀 Server running on http://localhost:${PORT}            ║`);
  console.log('║  📊 Health check: http://localhost:' + PORT + '/health        ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
});

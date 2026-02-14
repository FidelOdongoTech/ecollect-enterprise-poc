import { createClient } from '@supabase/supabase-js';
import { NoteHistory, Account } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase credentials not found in environment variables');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Connection test (runs once on load)
async function testConnection() {
  try {
    const { error } = await supabase.from('notehis').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connected to notehis table');
    }
  } catch (e) {
    console.error('❌ Exception:', e);
  }
}

testConnection();

/**
 * Fetch all note history records from notehis table
 * If accnumber is provided, filters by that account
 */
export async function fetchNoteHistory(accnumber?: string): Promise<NoteHistory[]> {
  let query = supabase.from('notehis').select('*');
  
  if (accnumber) {
    query = query.eq('accnumber', accnumber);
  }
  
  const { data, error } = await query.order('notedate', { ascending: false });

  if (error) {
    console.error('Error fetching note history:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch notes for a specific account
 */
export async function fetchAccountNotes(accnumber: string): Promise<NoteHistory[]> {
  const { data, error } = await supabase
    .from('notehis')
    .select('*')
    .eq('accnumber', accnumber)
    .order('notedate', { ascending: false });

  if (error) {
    console.error('Error fetching account notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch notes for a specific customer
 */
export async function fetchCustomerNotes(custnumber: string): Promise<NoteHistory[]> {
  const { data, error } = await supabase
    .from('notehis')
    .select('*')
    .eq('custnumber', custnumber)
    .order('notedate', { ascending: false });

  if (error) {
    console.error('Error fetching customer notes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Check if an account number is valid (not NULL, empty, etc.)
 */
function isValidAccountNumber(accNum: unknown): boolean {
  if (!accNum) return false;
  const str = String(accNum).trim().toUpperCase();
  if (str === '') return false;
  if (str === 'NULL') return false;
  if (str === 'N/A') return false;
  if (str === 'NONE') return false;
  if (str === 'UNDEFINED') return false;
  return true;
}

/**
 * Get unique accounts from notehis table with aggregated data
 * Derives accounts dynamically from your existing note data
 * Fetches ALL records using pagination (Supabase default limit is 1000)
 */
export async function fetchAccounts(): Promise<Account[]> {
  // Paginate to fetch ALL records (5000+)
  let allData: NoteHistory[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error } = await supabase
      .from('notehis')
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);
    
    if (error) {
      console.error('❌ Error fetching page:', error);
      break;
    }
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  if (allData.length === 0) {
    console.warn('⚠️ No data returned from notehis table');
    return [];
  }

  // Filter to only records with valid account numbers
  const validRecords = allData.filter(note => isValidAccountNumber(note.accnumber));

  // Group notes by account number
  const accountMap = new Map<string, { notes: NoteHistory[], custnumber: string }>();
  
  validRecords.forEach((note: NoteHistory) => {
    const accKey = String(note.accnumber).trim();
    
    if (!accountMap.has(accKey)) {
      accountMap.set(accKey, { notes: [], custnumber: note.custnumber || '' });
    }
    accountMap.get(accKey)!.notes.push(note);
  });
  
  // Accounts grouped

  // Create account objects
  const accounts: Account[] = [];
  
  accountMap.forEach((value, accnumber) => {
    const { notes, custnumber } = value;
    const latestNote = notes[0];
    
    // Extract status and DPD from notes
    const status = extractStatus(notes);
    const dpd = extractDPD(notes);
    
    accounts.push({
      id: accnumber,
      custnumber,
      accnumber,
      customerName: custnumber ? `Customer ${custnumber}` : `Account ${accnumber}`,
      dpd,
      status,
      lastContact: latestNote?.notedate || 'N/A',
      noteCount: notes.length
    });
  });

  // Sort by DPD (highest first) for priority
  accounts.sort((a, b) => b.dpd - a.dpd);

  console.log(`✅ Loaded ${accounts.length} accounts from Supabase`);

  return accounts;
}

/**
 * Add a new note to an account
 */
export async function addNote(note: Partial<NoteHistory>): Promise<NoteHistory> {
  // Get the max ID first to generate next ID
  const { data: maxIdData } = await supabase
    .from('notehis')
    .select('id')
    .order('id', { ascending: false })
    .limit(1);
  
  const nextId = (maxIdData && maxIdData.length > 0) ? maxIdData[0].id + 1 : 1;

  const { data, error } = await supabase
    .from('notehis')
    .insert([{
      id: nextId,
      custnumber: note.custnumber,
      accnumber: note.accnumber,
      notemade: note.notemade,
      owner: note.owner,
      notedate: new Date().toISOString(),
      notesrc: note.notesrc || 'Manual Entry',
      noteimp: note.noteimp || 'Normal',
      reason: note.reason,
      reasondetails: note.reasondetails
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding note:', error);
    throw error;
  }

  return data;
}

/**
 * Search notes by content
 */
export async function searchNotes(query: string): Promise<NoteHistory[]> {
  const { data, error } = await supabase
    .from('notehis')
    .select('*')
    .or(`notemade.ilike.%${query}%,reason.ilike.%${query}%,reasondetails.ilike.%${query}%`)
    .order('notedate', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error searching notes:', error);
    throw error;
  }

  return data || [];
}

// Helper functions to extract data from notes
function extractStatus(notes: NoteHistory[]): string {
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

function extractDPD(notes: NoteHistory[]): number {
  // Try to extract DPD from note content
  for (const note of notes) {
    const content = `${note.notemade || ''} ${note.reason || ''} ${note.reasondetails || ''}`;
    
    // Look for patterns like "90 days past due", "DPD: 45", "45 DPD", etc.
    const dpdPatterns = [
      /(\d+)\s*(?:days?\s*past\s*due|dpd)/i,
      /dpd[:\s]*(\d+)/i,
      /(\d+)\s*dpd/i,
      /delinquent[:\s]*(\d+)/i
    ];
    
    for (const pattern of dpdPatterns) {
      const match = content.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }
  
  // Use note count as a proxy for activity level (more notes = longer overdue)
  // This is a reasonable heuristic for debt collection
  const noteCount = notes.length;
  if (noteCount > 10) return 60 + Math.min(noteCount * 3, 120);
  if (noteCount > 5) return 30 + noteCount * 3;
  return 10 + noteCount * 2;
}

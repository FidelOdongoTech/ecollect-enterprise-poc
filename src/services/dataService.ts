import { createClient } from '@supabase/supabase-js';
import { NoteHistory, Account, SMSLog } from '@/types';
import {
  isDirectAPIMode,
  fetchAccountsFromAPI,
  fetchNoteHistoryFromAPI,
  fetchSMSLogsFromAPI,
  addNoteFromAPI,
  searchNotesFromAPI
} from './apiService';

// Check which mode we're in
const API_MODE = isDirectAPIMode();

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
    // Test notehis table
    const { data: notesTest, error: notesError } = await supabase
      .from('notehis')
      .select('id, custnumber')
      .limit(3);
    
    if (notesError) {
      console.error('❌ notehis connection error:', notesError.message);
    } else {
      console.log('✅ notehis connected:', notesTest?.length, 'sample records');
    }
    
    // Test sms_logs table
    const { data: smsTest, error: smsError } = await supabase
      .from('sms_logs')
      .select('sms_id, customer_number')
      .limit(3);
    
    if (smsError) {
      console.error('❌ sms_logs connection error:', smsError.message);
      console.error('❌ Make sure RLS policy exists! Run this SQL:');
      console.error(`
        ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Allow all" ON sms_logs FOR ALL USING (true) WITH CHECK (true);
      `);
    } else {
      console.log('✅ sms_logs connected:', smsTest?.length, 'sample records');
      if (smsTest && smsTest.length > 0) {
        console.log('📱 Sample SMS customer_numbers:', smsTest.map(s => s.customer_number));
      }
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
  // Use direct API if configured
  if (API_MODE && accnumber) {
    return fetchNoteHistoryFromAPI(accnumber);
  }

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
 * Check if a value is valid (not NULL, empty, etc.)
 */
function isValidValue(value: unknown): boolean {
  if (!value) return false;
  const str = String(value).trim().toUpperCase();
  if (str === '') return false;
  if (str === 'NULL') return false;
  if (str === 'N/A') return false;
  if (str === 'NONE') return false;
  if (str === 'UNDEFINED') return false;
  return true;
}

/**
 * Fetch paginated data from a table
 */
async function fetchPaginatedData<T>(tableName: string, _orderBy?: string): Promise<T[]> {
  let allData: T[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  console.log(`📄 Fetching from ${tableName}...`);
  
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, status } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to);
    
    if (error) {
      console.error(`❌ Error fetching ${tableName} page ${page}:`, error.message);
      console.error(`❌ Status: ${status}, Details:`, error);
      break;
    }
    
    if (data && data.length > 0) {
      console.log(`   Page ${page + 1}: ${data.length} records`);
      allData = [...allData, ...data as T[]];
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`✅ Total from ${tableName}: ${allData.length} records`);
  return allData;
}

/**
 * Get unique accounts from BOTH notehis and sms_logs tables
 * Merges customers from both sources so you see:
 * - Customers with notes only
 * - Customers with SMS only
 * - Customers with both
 */
export async function fetchAccounts(): Promise<Account[]> {
  // Use direct API if configured
  if (API_MODE) {
    console.log('📡 Using direct PostgreSQL API...');
    return fetchAccountsFromAPI();
  }
  
  console.log('📡 Fetching accounts from both notehis and sms_logs...');
  
  // Fetch data from both tables in parallel
  let notesData: NoteHistory[] = [];
  let smsData: SMSLog[] = [];
  
  try {
    const results = await Promise.all([
      fetchPaginatedData<NoteHistory>('notehis', 'id'),
      fetchPaginatedData<SMSLog>('sms_logs', 'sms_id')
    ]);
    notesData = results[0];
    smsData = results[1];
  } catch (error) {
    console.error('❌ Error fetching data:', error);
  }
  
  console.log(`📊 Fetched ${notesData.length} notes and ${smsData.length} SMS records`);
  
  // Debug: Show sample SMS data
  if (smsData.length > 0) {
    console.log('📱 Sample SMS record:', smsData[0]);
    console.log('📱 SMS customer_number field:', smsData[0].customer_number);
  } else {
    console.warn('⚠️ No SMS data fetched! Check sms_logs table.');
  }

  // Create a unified customer map
  // Key: custnumber, Value: { notes, sms, accnumbers }
  const customerMap = new Map<string, {
    notes: NoteHistory[];
    sms: SMSLog[];
    accnumbers: Set<string>;
  }>();

  // Process notes - group by custnumber
  notesData.forEach(note => {
    const custKey = String(note.custnumber || '').trim();
    if (!isValidValue(custKey)) return;
    
    if (!customerMap.has(custKey)) {
      customerMap.set(custKey, { notes: [], sms: [], accnumbers: new Set() });
    }
    
    const customer = customerMap.get(custKey)!;
    customer.notes.push(note);
    
    if (isValidValue(note.accnumber)) {
      customer.accnumbers.add(String(note.accnumber).trim());
    }
  });

  // Process SMS - group by customer_number
  smsData.forEach(sms => {
    const custKey = String(sms.customer_number || '').trim();
    if (!isValidValue(custKey)) return;
    
    if (!customerMap.has(custKey)) {
      customerMap.set(custKey, { notes: [], sms: [], accnumbers: new Set() });
    }
    
    customerMap.get(custKey)!.sms.push(sms);
  });

  // Create account objects from merged data
  const accounts: Account[] = [];
  
  customerMap.forEach((data, custnumber) => {
    const { notes, sms, accnumbers } = data;
    
    // Determine source
    let source: 'notes' | 'sms' | 'both';
    if (notes.length > 0 && sms.length > 0) {
      source = 'both';
    } else if (notes.length > 0) {
      source = 'notes';
    } else {
      source = 'sms';
    }
    
    // Get account number (prefer from notes, fallback to custnumber)
    const accnumber = accnumbers.size > 0 
      ? Array.from(accnumbers)[0] 
      : `SMS-${custnumber}`;
    
    // Extract status and DPD from notes or SMS
    let status = 'Active';
    let dpd = 0;
    let lastContact = 'N/A';
    
    if (notes.length > 0) {
      status = extractStatus(notes);
      dpd = extractDPD(notes);
      lastContact = notes[0]?.notedate || 'N/A';
    } else if (sms.length > 0) {
      // Extract DPD from SMS messages
      const smsStats = getSMSStats(sms);
      dpd = smsStats.latestDPD || 0;
      lastContact = sms[0]?.date_sent || 'N/A';
      status = dpd > 30 ? 'SMS Only - Overdue' : 'SMS Only';
    }
    
    accounts.push({
      id: custnumber,
      custnumber,
      accnumber,
      customerName: `Customer ${custnumber}`,
      dpd,
      status,
      lastContact,
      noteCount: notes.length,
      smsCount: sms.length,
      source
    });
  });

  // Sort by DPD (highest first) for priority
  accounts.sort((a, b) => b.dpd - a.dpd);

  // Log summary
  const notesOnly = accounts.filter(a => a.source === 'notes').length;
  const smsOnly = accounts.filter(a => a.source === 'sms').length;
  const both = accounts.filter(a => a.source === 'both').length;
  
  console.log(`✅ Loaded ${accounts.length} total customers:`);
  console.log(`   📝 Notes only: ${notesOnly}`);
  console.log(`   📱 SMS only: ${smsOnly}`);
  console.log(`   📝📱 Both: ${both}`);

  return accounts;
}

/**
 * Add a new note to an account
 */
export async function addNote(note: Partial<NoteHistory>): Promise<NoteHistory> {
  // Use direct API if configured
  if (API_MODE) {
    return addNoteFromAPI(note);
  }
  
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
  // Use direct API if configured
  if (API_MODE) {
    return searchNotesFromAPI(query);
  }
  
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

/**
 * Fetch SMS logs for a specific customer
 */
export async function fetchSMSLogs(customerNumber: string): Promise<SMSLog[]> {
  // Use direct API if configured
  if (API_MODE) {
    return fetchSMSLogsFromAPI(customerNumber);
  }
  
  const { data, error } = await supabase
    .from('sms_logs')
    .select('*')
    .eq('customer_number', customerNumber)
    .order('date_sent', { ascending: false });

  if (error) {
    console.error('Error fetching SMS logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all SMS logs (paginated)
 */
export async function fetchAllSMSLogs(): Promise<SMSLog[]> {
  let allData: SMSLog[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .order('sms_id', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('❌ Error fetching SMS page:', error);
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

  console.log(`✅ Loaded ${allData.length} SMS logs from Supabase`);
  return allData;
}

/**
 * Get SMS statistics for a customer
 */
export function getSMSStats(smsLogs: SMSLog[]) {
  const total = smsLogs.length;
  const successful = smsLogs.filter(s => s.send_status?.toLowerCase() === 'success').length;
  const failed = total - successful;
  
  // Extract arrears from messages
  const arrearsAmounts: number[] = [];
  smsLogs.forEach(sms => {
    const match = sms.message?.match(/Kes\.?\s*([\d,]+(?:\.\d{2})?)/i);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) arrearsAmounts.push(amount);
    }
  });
  
  // Extract DPD from messages
  const dpdValues: number[] = [];
  smsLogs.forEach(sms => {
    const match = sms.message?.match(/late by (\d+)\s*days?/i);
    if (match) {
      dpdValues.push(parseInt(match[1], 10));
    }
  });

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    latestArrears: arrearsAmounts.length > 0 ? arrearsAmounts[0] : null,
    latestDPD: dpdValues.length > 0 ? dpdValues[0] : null,
    lastSentDate: smsLogs.length > 0 ? smsLogs[0].date_sent : null
  };
}
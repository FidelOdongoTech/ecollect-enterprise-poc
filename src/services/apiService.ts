/**
 * API Service - Connects to Backend API (PostgreSQL)
 * Used when VITE_API_URL is set (direct PostgreSQL mode)
 */

import { NoteHistory, Account, SMSLog } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Check if we're using direct API mode
 */
export function isDirectAPIMode(): boolean {
  return !!API_URL && API_URL.length > 0;
}

/**
 * Test API connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    if (data.status === 'healthy') {
      console.log('✅ Backend API connected successfully');
      return true;
    }
    console.error('❌ Backend API unhealthy:', data);
    return false;
  } catch (error) {
    console.error('❌ Backend API connection failed:', error);
    return false;
  }
}

/**
 * Fetch all accounts (aggregated from notehis + sms_logs)
 */
export async function fetchAccountsFromAPI(): Promise<Account[]> {
  try {
    console.log('📡 Fetching accounts from backend API...');
    const response = await fetch(`${API_URL}/api/accounts`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const accounts = await response.json();
    console.log(`✅ Loaded ${accounts.length} accounts from PostgreSQL`);
    return accounts;
  } catch (error) {
    console.error('❌ Error fetching accounts:', error);
    throw error;
  }
}

/**
 * Fetch note history for an account
 */
export async function fetchNoteHistoryFromAPI(accnumber: string): Promise<NoteHistory[]> {
  try {
    const response = await fetch(`${API_URL}/api/notehis/account/${encodeURIComponent(accnumber)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching note history:', error);
    return [];
  }
}

/**
 * Fetch SMS logs for a customer
 */
export async function fetchSMSLogsFromAPI(customerNumber: string): Promise<SMSLog[]> {
  try {
    const response = await fetch(`${API_URL}/api/sms_logs/customer/${encodeURIComponent(customerNumber)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    return [];
  }
}

/**
 * Add a new note
 */
export async function addNoteFromAPI(note: Partial<NoteHistory>): Promise<NoteHistory> {
  try {
    const response = await fetch(`${API_URL}/api/notehis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
}

/**
 * Search notes
 */
export async function searchNotesFromAPI(query: string): Promise<NoteHistory[]> {
  try {
    const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
}

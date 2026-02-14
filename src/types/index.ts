export interface NoteHistory {
  id: number;
  custnumber: string;
  accnumber: string;
  notemade: string;
  owner: string;
  notedate: string;
  notesrc: string;
  noteimp: string;
  reason: string;
  reasondetails: string;
}

export interface SMSLog {
  sms_id: number;
  message: string;
  owner: string;
  customer_number: string;
  date_sent: string;
  send_status: string;
  arrears: string;
  phone_number: string;
  stage_date: string;
  reference_number: string;
  gw_response: any;
  extra: string;
}

export interface Account {
  id: string;
  custnumber: string;
  accnumber: string;
  customerName: string;
  dpd: number;
  status: string;
  lastContact: string;
  noteCount: number;
  smsCount: number;
  source: 'notes' | 'sms' | 'both';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type RiskLevel = 'LOW' | 'HIGH' | 'CRITICAL';

export interface RiskAssessment {
  level: RiskLevel;
  color: string;
  bgColor: string;
  borderColor: string;
}
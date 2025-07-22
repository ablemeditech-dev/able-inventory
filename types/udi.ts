export interface UDIRecord {
  id: string;
  created_at: string;
  inbound_date?: string;
  product_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  quantity: number;
  lot_number?: string;
  ubd_date?: string;
  notes?: string;
  product?: {
    cfn: string;
    upn: string;
    description: string;
    client_id?: string;
  };
  to_location?: {
    location_name: string;
  };
} 
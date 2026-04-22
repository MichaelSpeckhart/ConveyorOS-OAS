export type TicketField = {
  id: string;
  label: string;
  enabled: boolean;
  showBarcode?: boolean;
};

export type TicketTemplateConfig = {
  headerText: string;
  footerText: string;
  fields: TicketField[];
};

export const DEFAULT_TICKET_TEMPLATE: TicketTemplateConfig = {
  headerText: "",
  footerText: "",
  fields: [
    { id: "ticketNumber",       label: "Ticket Number",    enabled: true,  showBarcode: true  },
    { id: "customerIdentifier", label: "Customer ID",      enabled: true,  showBarcode: false },
    { id: "customerName",       label: "Customer Name",    enabled: true,  showBarcode: false },
    { id: "numItems",           label: "Number of Items",  enabled: true,  showBarcode: false },
    { id: "dropoffDate",        label: "Drop-off Date",    enabled: true,  showBarcode: false },
    { id: "pickupDate",         label: "Pickup Date",      enabled: true,  showBarcode: false },
    { id: "comments",           label: "Notes / Comments", enabled: false, showBarcode: false },
    { id: "itemList",           label: "Garment List",     enabled: true,  showBarcode: false },
  ],
};

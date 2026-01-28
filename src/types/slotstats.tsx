export interface SlotManagerStats {
    total_slots: number;
    slots_used: number;
    capacity_percentage: number;
}

export interface SlotStatRow {
    id: number;
    stat_date: string;
    total_slots: number;
    slots_used: number;
    capacity_percentage: number;
}

export interface SlotStatSummary {
    average_capacity_percentage: number;
    max_capacity_percentage: number;
    min_capacity_percentage: number;
    total_slots_used: number;
}

export interface SlotStatReport {
    stats: SlotStatRow[];
    summary: SlotStatSummary;
}
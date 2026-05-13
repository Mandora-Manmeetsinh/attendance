export interface AttendanceRecord {
    _id: string;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
    distance_at_check_in?: number | null;
    distance_at_check_out?: number | null;
}

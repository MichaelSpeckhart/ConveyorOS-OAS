use chrono::{DateTime, TimeZone, Utc};

use crate::model::OperatorStats;

use crate::db::{sessions_repo, users_repo};





pub fn get_operator_averaged_stats_start_end(start_date: DateTime<Utc>, end_date: DateTime<Utc>) -> Result<Vec<OperatorStats>, String> {
	if start_date >= end_date {
        return Err("Start date must be before end date".to_string());
    }

    // 1. Query sessions for all the operator stats from start to end date
    let mut conn = crate::db::connection::establish_connection()?;
    let sessions = sessions_repo::get_sessions_start_end(&mut conn, start_date.naive_utc().date(), end_date.naive_utc().date())
        .map_err(|e| e.to_string())?;

    // 2. Group by the operator_id 
    let mut operator_map: std::collections::HashMap<i32, (i64, i64)> = std::collections::HashMap::new();
    for session in sessions {
        let entry = operator_map.entry(session.user_id).or_insert((0, 0));
        entry.0 += session.garments_scanned as i64; 
        entry.1 += session.tickets_completed as i64;
    }   


    // 3. Average their garments scanned on per hour basiss for that time frame of start -> end
    let mut operator_stats: Vec<OperatorStats> = Vec::new();
    let total_hours = (end_date - start_date).num_hours() as f64;
    for (user_id, (total_garments, total_tickets)) in operator_map {
        let user = users_repo::get_user_by_id(&mut conn, user_id)
            .map_err(|e| e.to_string())?;   
        let avg_garments = (total_garments as f64 / total_hours).round() as i64;
        let avg_tickets = (total_tickets as f64 / total_hours).round()
            as i64;
        operator_stats.push(OperatorStats {
            user_id,
            username: user.username,
            total_garments: avg_garments,
            total_tickets: avg_tickets,
        });
    }

    // 4. return list of operator stats


    return Ok(operator_stats);
} 

pub fn get_operator_stats_today() -> Result<Vec<OperatorStats>, String> {
    let now = Utc::now();
    let start_of_day = Utc.from_utc_datetime(
        &now.date_naive()
            .and_hms_opt(0, 0, 0)
            .expect("valid start of day time"),
    );
    let end_of_day = Utc.from_utc_datetime(
        &now.date_naive()
            .and_hms_opt(23, 59, 59)
            .expect("valid end of day time"),
    );
    get_operator_averaged_stats_start_end(start_of_day, end_of_day)
}
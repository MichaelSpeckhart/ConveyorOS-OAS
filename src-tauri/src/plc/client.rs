use std::error::Error;
use tokio::net::TcpStream;
use tokio_modbus::prelude::*;
use tokio_modbus::client::tcp;

const IP_ADDRESS: &str = "192.168.1.210"; 
const MODBUS_PORT: u16 = 502;
const UNIT_ID: u8 = 1; // Modbus slave ID configured on PLC

// Adjust these to match your Modbus mapping in GX Works3
const REG_D116: u16 = 116; // holding register for D116
const COIL_M5: u16 = 5;    // coil for M5

async fn make_modbus_ctx() -> Result<tokio_modbus::client::Context, String> {
    let socket_addr = format!("{IP_ADDRESS}:{MODBUS_PORT}")
        .parse()
        .map_err(|e| format!("Failed to parse socket address: {e}"))?;

    tcp::connect_slave(socket_addr, Slave(UNIT_ID))
        .await
        .map_err(|e| format!("Failed to create Modbus context: {e}"))
}

// --------- READ D116 as i16 via Modbus holding register ---------

pub async fn read_d116_modbus_internal() -> Result<i16, String> {
    let mut ctx = make_modbus_ctx().await?;



    // Read 1 holding register
    let regs = ctx
        .read_holding_registers(REG_D116, 1)
        .await
        .map_err(|e| format!("Modbus read D116 failed: {e}"))?;

    // let raw_u16 = regs.().ok_or("No data returned for D116")?;
    // let value_i16 = *raw_u16 as i16; // reinterpret as signed

    Ok(0)
}

pub async fn test_tcp_connect() {
    println!("Attempting TCP connect to {}:502...", IP_ADDRESS);

    match tokio::net::TcpStream::connect((IP_ADDRESS, 502)).await {
        Ok(_) => println!("✅ TCP connection succeeded! Port 502 is open."),
        Err(e) => println!("❌ TCP connection failed: {}", e),
    }
}

pub async fn test_modbus_context() {
    println!("Attempting Modbus connect...");

    let socket_addr = format!("{}:502", IP_ADDRESS)
        .parse()
        .expect("Failed to parse socket address");

    match tokio_modbus::client::tcp::connect_slave(socket_addr, Slave(1)).await {
        Ok(_) => println!("✅ Modbus context created successfully!"),
        Err(e) => println!("❌ Failed to create Modbus context: {}", e),
    }
}

pub async fn write_m5_modbus(state: bool) -> Result<(), String> {
    test_tcp_connect().await;

    test_modbus_context().await;

    let mut ctx = make_modbus_ctx().await?;

    ctx.write_single_coil(COIL_M5, true)
        .await
        .map_err(|e| format!("Modbus write M5 failed: {e}"))
        .map_err(|e| e)?;

    Ok(())
}


// This is the function Tauri will expose to the frontend:
#[tauri::command]
pub async fn read_slot_id1() -> Result<i16, String> {
    read_d116_modbus_internal().await
}

#[tauri::command]
pub async fn write_m5_command(state: bool) -> Result<(), String> {
    write_m5_modbus(state).await.map_err(|e| e.to_string())
}
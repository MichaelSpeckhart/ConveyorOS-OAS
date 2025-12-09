import { useState } from "react";
import React from "react";
import { invoke } from "@tauri-apps/api/core";


export default function Home() {
    // Show all users
    const users = useState<any[]>([]);
    const getAllUsers = async () => {
        try {
            users[1](await invoke<any[]>("get_all_users_tauri"));
            console.log("All Users:", users[0]);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }

    return (

        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h1>Welcome to the Home Page</h1>
        <p>This is the main landing page after login.</p>
        <button onClick={getAllUsers} style={{ padding: "10px 20px", fontSize: "16px" }}>
            Get All Users
        </button>
        <div style={{ marginTop: "20px" }}>
            <h2>Users:</h2>
            {users[0].length === 0 ? (
                <p>No users found.</p>
            ) : (
                <ul>
                    {users[0].map((user) => (
                        <li key={user.id}>
                            ID: {user.id}, Username: {user.username}, Created At: {user.created_at} Pin: {user.pin}
                        </li>
                    ))}
                </ul>
            )}
        </div>
            
        </div>
    );
}
        


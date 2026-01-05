import React, { useState } from "react";

export default function PosSettings() {
    const [csvPath, setCsvPath] = useState("");
    const [pos, setPos] = useState("");

    const handleCsvPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCsvPath(e.target.value);
    };
    
    const handlePosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPos(e.target.value);
    };

    return (
        <div>
            <h1>POS Settings</h1>
            <div>
                <label>
                    CSV Path:
                    <input type="text" value={csvPath} onChange={handleCsvPathChange} />
                </label>
            </div>
            <div>
                <label>
                    POS:
                    <input type="text" value={pos} onChange={handlePosChange} />
                </label>
            </div>
        </div>
    );

    


}
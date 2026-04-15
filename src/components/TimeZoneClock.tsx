import React, { useEffect, useState } from 'react';

const TimeZoneClock = ({ timeZone }) => {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleString('en-US', { timeZone }));

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleString('en-US', { timeZone }));
        }, 1000);
        return () => clearInterval(timer);
    }, [timeZone]);

    return (
        <div>
            <h2>Current Time ({timeZone}):</h2>
            <p>{currentTime}</p>
        </div>
    );
};

export default TimeZoneClock;
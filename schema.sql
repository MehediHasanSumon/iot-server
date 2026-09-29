-- Create IoT database if not exists
CREATE DATABASE IF NOT EXISTS iot_db;
USE iot_db;

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('on', 'off') NOT NULL DEFAULT 'off',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed initial 4 devices
INSERT INTO devices (id, name, status) VALUES
    (1, 'Device 1', 'off'),
    (2, 'Device 2', 'off'),
    (3, 'Device 3', 'off'),
    (4, 'Device 4', 'off')
ON DUPLICATE KEY UPDATE name=VALUES(name);

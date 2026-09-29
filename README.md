# IoT 4-Device Status Controller (Node.js + Express + MySQL)

A complete IoT device status tracking and control solution using Node.js, Express, and MySQL. It controls 4 devices (`Device 1`, `Device 2`, `Device 3`, `Device 4`) with individual `ON` and `OFF` states.

## 🚀 Features

- **Express REST API**: Fast endpoints for reading & updating device states.
- **MySQL Integration**: Persistent storage with automatic database and table initialization (`iot_db` & `devices`).
- **Interactive Web UI**: Modern dark-mode dashboard with individual **ON** and **OFF** buttons for all 4 devices.
- **Live Sync**: Auto-refreshes every 3 seconds to keep UI synced with hardware changes.
- **Microcontroller Friendly**: Direct HTTP GET endpoints (`/api/devices/1/set/on`) designed for easy integration with ESP8266 / ESP32 / Arduino.

---

## 📁 Project Structure

```
├── .env                # MySQL & server configuration
├── .env.example        # Example environment variables
├── db.js               # MySQL pool & automatic table initialization
├── package.json        # Dependencies & start scripts
├── public/
│   └── index.html      # Responsive IoT control dashboard with buttons
├── schema.sql          # SQL schema (optional manual execution)
└── server.js           # Express API server
```

---

## 🛠️ Setup Instructions

### 1. Configure MySQL Credentials

Open `.env` and set your MySQL password and user:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=iot_db
```

> **Note**: The application will automatically create the database `iot_db` and the `devices` table, and seed 4 devices when it starts!

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
npm start
```
Or for development with auto-reload:
```bash
npm run dev
```

### 4. Open the Web Dashboard

Open your web browser at:
👉 **`http://localhost:3000`**

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/devices` | Get status of all 4 devices (JSON) |
| `GET` | `/api/devices/:id` | Get status of a specific device (`1` - `4`) |
| `GET` | `/api/devices/:id?format=plain` | Returns raw string `on` or `off` |
| `POST` | `/api/devices/:id/status` | Set status with JSON: `{"status": "on"}` or `{"status": "off"}` |
| `POST` | `/api/devices/:id/toggle` | Toggles device between `on` and `off` |
| `GET` | `/api/devices/:id/set/:status` | Microcontroller shortcut (`/api/devices/1/set/on`) |

---

## 💡 ESP8266 / ESP32 Arduino Example

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://192.168.1.100:3000/api/devices/1?format=plain";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  pinMode(D1, OUTPUT); // Relay connected to D1
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, serverUrl);
    int httpCode = http.GET();

    if (httpCode == 200) {
      String status = http.getString();
      if (status == "on") {
        digitalWrite(D1, HIGH); // Turn Relay ON
      } else {
        digitalWrite(D1, LOW);  // Turn Relay OFF
      }
    }
    http.end();
  }
  delay(2000); // Check every 2 seconds
}
```

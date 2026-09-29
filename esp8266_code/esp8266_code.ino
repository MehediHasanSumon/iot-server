/*
 * =========================================================================
 * Project: ESP8266 NodeMCU 4-Device IoT Controller
 * Server: Node.js + Express + MySQL
 * Author: Antigravity
 * =========================================================================
 * 
 * Hardware Connections (NodeMCU to Relay Module):
 * - Device 1 -> D1 (GPIO 5)
 * - Device 2 -> D2 (GPIO 4)
 * - Device 3 -> D3 (GPIO 0)
 * - Device 4 -> D4 (GPIO 2)
 * - Relay VCC -> 5V (or Vin)
 * - Relay GND -> GND
 * 
 * Library Requirement:
 * - ArduinoJson (Install from: Tools -> Manage Libraries -> Search "ArduinoJson" by Benoît Blanchon)
 *   Supports both ArduinoJson v6 and v7.
 * =========================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ======================= CONFIGURATION =======================
// 1. WiFi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_NAME";        // আপনার WiFi নাম
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";    // আপনার WiFi পাসওয়ার্ড

// 2. Server Link / Domain (এখানে আপনার লিংক বা ডোমেইন বসাবেন)
// - VPS ডোমেইন হলে: "https://iot.yourdomain.com/api/devices" অথবা "http://iot.yourdomain.com/api/devices"
// - লোকাল পিসি হলে: "http://192.168.0.186:3000/api/devices"
const char* SERVER_URL = "http://192.168.0.186:3000/api/devices";

// 3. Relay type configuration
// Most 4-channel relay modules are ACTIVE LOW (LOW = ON, HIGH = OFF)
// If your relay is Active HIGH, change this to false.
const bool RELAY_ACTIVE_LOW = true;

// 4. Update Interval (how often ESP8266 checks status from server)
const unsigned long POLL_INTERVAL_MS = 1500;         // 1.5 seconds

// ======================= PIN ASSIGNMENTS =====================
const int PIN_DEV1 = D1; // Device 1
const int PIN_DEV2 = D2; // Device 2
const int PIN_DEV3 = D3; // Device 3
const int PIN_DEV4 = D4; // Device 4

unsigned long lastPollTime = 0;

// Helper function to set relay state based on active low / high
void setRelay(int pin, bool turnOn) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(pin, turnOn ? LOW : HIGH);
  } else {
    digitalWrite(pin, turnOn ? HIGH : LOW);
  }
}

// Helper to apply status string ("on" / "off") to a pin
void applyDeviceStatus(int pin, const char* status, const char* devName) {
  bool isOn = (strcmp(status, "on") == 0 || strcmp(status, "ON") == 0);
  setRelay(pin, isOn);
  Serial.printf("[%s] => %s\n", devName, isOn ? "ON" : "OFF");
}

void connectToWiFi() {
  Serial.println();
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempts++;
    if (attempts > 40) {
      Serial.println("\n[WiFi] Connection timeout. Retrying...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      attempts = 0;
    }
  }

  Serial.println();
  Serial.println("[WiFi] Connected successfully!");
  Serial.print("[WiFi] NodeMCU IP Address: ");
  Serial.println(WiFi.localIP());
}

void checkDeviceStatuses() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Disconnected. Reconnecting...");
    connectToWiFi();
    return;
  }

  HTTPClient http;
  bool beginSuccess = false;

  // Check if URL is HTTPS or HTTP
  String url = String(SERVER_URL);
  if (url.startsWith("https://")) {
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // SSL Fingerprint check bypass for ESP8266
    beginSuccess = http.begin(secureClient, url);
  } else {
    WiFiClient client;
    beginSuccess = http.begin(client, url);
  }

  if (!beginSuccess) {
    Serial.println("[HTTP] Unable to connect to server endpoint");
    return;
  }

  http.setTimeout(3000); // 3 seconds timeout
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();

    // Parse JSON
    // ArduinoJson v6/v7 compatible allocation
    #if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
    #else
      DynamicJsonDocument doc(2048);
    #endif

    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
      Serial.print("[JSON] Parse failed: ");
      Serial.println(error.f_str());
      http.end();
      return;
    }

    bool success = doc["success"];
    if (!success) {
      Serial.println("[API] Server responded with success = false");
      http.end();
      return;
    }

    JsonArray data = doc["data"].as<JsonArray>();

    Serial.println("----------------------------------------");
    for (JsonObject dev : data) {
      int id = dev["id"];
      const char* name = dev["name"];
      const char* status = dev["status"];

      switch (id) {
        case 1:
          applyDeviceStatus(PIN_DEV1, status, name);
          break;
        case 2:
          applyDeviceStatus(PIN_DEV2, status, name);
          break;
        case 3:
          applyDeviceStatus(PIN_DEV3, status, name);
          break;
        case 4:
          applyDeviceStatus(PIN_DEV4, status, name);
          break;
        default:
          break;
      }
    }
    Serial.println("----------------------------------------");

  } else {
    Serial.printf("[HTTP] GET failed, code: %d - %s\n", httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n========================================");
  Serial.println(" ESP8266 4-Device IoT Controller Init");
  Serial.println("========================================");

  // Configure Relay Pins as OUTPUT
  pinMode(PIN_DEV1, OUTPUT);
  pinMode(PIN_DEV2, OUTPUT);
  pinMode(PIN_DEV3, OUTPUT);
  pinMode(PIN_DEV4, OUTPUT);

  // Turn all devices OFF initially
  setRelay(PIN_DEV1, false);
  setRelay(PIN_DEV2, false);
  setRelay(PIN_DEV3, false);
  setRelay(PIN_DEV4, false);

  // Connect to WiFi network
  connectToWiFi();
}

void loop() {
  unsigned long currentMillis = millis();

  // Poll server every POLL_INTERVAL_MS
  if (currentMillis - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = currentMillis;
    checkDeviceStatuses();
  }
}

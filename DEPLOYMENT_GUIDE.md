# VPS & Domain Deployment Guide

এই গাইডের মাধ্যমে আপনি যেকোনো লিনাক্স VPS (Ubuntu/Debian) সার্ভারে এই Node.js IoT অ্যাপ্লিকেশনটি ডেপ্লয় করতে পারবেন এবং নিজস্ব ডোমেইন ও ফ্রি SSL (HTTPS) যুক্ত করতে পারবেন।

---

## ১. ডোমেইন DNS সেটআপ (Cloudflare / Namecheap / GoDaddy)
আপনার ডোমেইন প্রোভাইডারের DNS ম্যানেজমেন্টে যান এবং একটি **A Record** অ্যাড করুন:
- **Type**: `A`
- **Name/Host**: `@` (মূল ডোমেইনের জন্য) অথবা `iot` (সাব-ডোমেইনের জন্য, যেমন `iot.yourdomain.com`)
- **Points to / Target**: আপনার VPS-এর **Public IP Address**
- **TTL**: Auto / 1 min

---

## ২. VPS সার্ভার প্রস্তুত করা (Ubuntu / Debian)
SSH দিয়ে আপনার VPS-এ লগইন করুন (`ssh root@YOUR_VPS_IP`):

```bash
# প্যাকেজ আপডেট করুন
sudo apt update && sudo apt upgrade -y

# প্রয়োজনীয় টুলস ইনস্টল করুন
sudo apt install -y curl git ufw

# Node.js (v20 LTS) ইনস্টল করুন
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 ইনস্টল করুন (সার্ভার ব্যাকগ্রাউন্ডে সবসময় সচল রাখার জন্য)
sudo npm install -g pm2

# MySQL Server ইনস্টল করুন
sudo apt install -y mysql-server

# Nginx ওয়েব সার্ভার ইনস্টল করুন
sudo apt install -y nginx

# SSL (Let's Encrypt) এর জন্য Certbot ইনস্টল করুন
sudo apt install -y certbot python3-certbot-nginx
```

---

## ৩. MySQL ডাটাবেজ সিকিউরিটি ও কনফিগারেশন

```bash
# MySQL কনফিগার করুন
sudo mysql_secure_installation
```
MySQL টার্মিনালে প্রবেশ করুন:
```bash
sudo mysql
```
একটি ডেডিকেটেড ইউজার এবং পাসওয়ার্ড তৈরি করুন:
```sql
CREATE USER 'iotuser'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON *.* TO 'iotuser'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

---

## ৪. প্রজেক্ট ফাইল VPS-এ আপলোড ও ডিপেনডেন্সি ইনস্টল

VPS-এর ডিরেক্টরিতে প্রজেক্ট ক্লোন বা কপি করুন:
```bash
# ডিরেক্টরি তৈরি
sudo mkdir -p /var/www/iot
cd /var/www/iot

# গিট বা SCP দিয়ে ফাইল নিয়ে আসুন, অথবা সরাসরি git clone করুন:
# git clone <your-repo-url> .

# প্যাকেজ ইনস্টল করুন
npm install --production
```

`.env` ফাইল তৈরি করে ডাটাবেজ ইনফো দিন:
```bash
nano .env
```
ভেতরে লিখুন:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=iotuser
DB_PASSWORD=StrongPassword123!
DB_NAME=iot_db
```
*(সংরক্ষণ করতে: `Ctrl + O` তারপর `Enter`, বের হতে `Ctrl + X`)*

---

## ৫. PM2 দিয়ে অ্যাপ রান করা

```bash
# অ্যাপ চালু করুন
pm2 start server.js --name "iot-app"

# সার্ভার রিবুট হলেও যাতে অটো-স্টার্ট হয়
pm2 startup
pm2 save
```

---

## ৬. Nginx রিভার্স প্রক্সি কনফিগারেশন

Nginx কনফিগারেশন ফাইল তৈরি করুন:
```bash
sudo nano /etc/nginx/sites-available/iot.yourdomain.com
```

নিচের কনফিগারেশনটি পেস্ট করুন (আপনার ডোমেইনের নাম বসিয়ে দিন):
```nginx
server {
    listen 80;
    server_name iot.yourdomain.com; # আপনার ডোমেইন বা সাবডোমেইন নাম

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

কনফিগারেশন সক্রিয় করুন:
```bash
sudo ln -s /etc/nginx/sites-available/iot.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ৭. ফ্রি SSL (HTTPS) সক্রিয় করা

Certbot দিয়ে ১ কমান্ডে SSL সার্টিফিকেট নিন:
```bash
sudo certbot --nginx -d iot.yourdomain.com
```
এটি স্বয়ংক্রিয়ভাবে HTTPS রিডাইরেক্ট এবং SSL সেটআপ করে দেবে।

ফায়ারওয়াল এলাও করুন:
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## ৮. ডোমেইন ব্যবহারের পর ESP8266 কোডে পরিবর্তন

ডোমেইনে SSL (HTTPS) থাকলে ESP8266-এর সাধারণ `WiFiClient` এর পরিবর্তে `WiFiClientSecure` ব্যবহার করতে হয়, অথবা `client.setInsecure()` দিয়ে সার্টিফিকেট ভেরিফিকেশন স্কিপ করতে হয়।

Arduino কোডে:
```cpp
#include <WiFiClientSecure.h>

// ডোমেইন নাম দিন
const char* SERVER_HOST = "iot.yourdomain.com";

void checkDeviceStatuses() {
  WiFiClientSecure client;
  client.setInsecure(); // SSL Fingerprint ভেরিফিকেশন স্কিপ করার জন্য

  HTTPClient http;
  String serverUrl = "https://" + String(SERVER_HOST) + "/api/devices";

  if (http.begin(client, serverUrl)) {
    int httpCode = http.GET();
    // বাকি প্রসেসিং একই থাকবে...
  }
}
```
*(অথবা HTTP পোর্ট 80 ব্যবহারের সুবিধার্থে Nginx-এ শুধু API পাথ `/api/` এর জন্য সাধারণ HTTP খোলা রাখা যেতে পারে)*

#define ENABLE_USER_AUTH
#define ENABLE_DATABASE

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseClient.h>
#include "time.h"

#define WIFI_SSID     "Putyourcode"
#define WIFI_PASSWORD "Putyourcode"
#define Web_API_KEY   "Putyourcode"
#define DATABASE_URL  "Putyourcode"
#define USER_EMAIL    "Putyourcode"
#define USER_PASS     "Putyourcode"

// Pins for UART and LED
#define RXD2 16
#define LED  2

const char* ntpServer = "pool.ntp.org";

void processData(AsyncResult &aResult);

UserAuth user_auth(Web_API_KEY, USER_EMAIL, USER_PASS);
FirebaseApp app;
WiFiClientSecure ssl_client;
using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);
RealtimeDatabase Database;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 10000;

String uid;
String databasePath;
String parentPath;

object_t jsonData, obj1, obj2, obj3, obj4;
JsonWriter writer;

struct EmployeeData {
    String name;
    String rfid;
    String status;
};

EmployeeData employees[11];

String getFormattedTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "0000-00-00 00:00:00";
  }
  char timeString[20];
  strftime(timeString, sizeof(timeString), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timeString);
}

void blinkLED(int times, int delayMs) {
  for(int i = 0; i < times; i++) {
    digitalWrite(LED, HIGH);
    delay(delayMs);
    digitalWrite(LED, LOW);
    delay(delayMs);
  }
}

void initWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.');
    delay(1000);
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, RXD2, -1);
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);
  
  initWiFi();
  configTime(3600, 0, ntpServer);  // UTC+1 (add 1 hour)
  
  // Wait for time to be set
  time_t now = time(nullptr);
  int attempts = 0;
  while (now < 24 * 3600 * 2 && attempts < 20) {
    delay(500);
    now = time(nullptr);
    attempts++;
  }
  Serial.println("Time synchronized: " + String(ctime(&now)));

  // Initialize employee data
  employees[1] = {"Rachid", "6138FA05", "Entry"};
  employees[2] = {"Rachid", "6138FA05", "Exit"};
  employees[3] = {"Rabia", "4A8949D5", "Entry"};
  employees[4] = {"Rabia", "4A8949D5", "Exit"};
  employees[5] = {"Leila", "3AF608D5", "Entry"};
  employees[6] = {"Leila", "3AF608D5", "Exit"};
  employees[7] = {"Rania", "2AA5CAD5", "Entry"};
  employees[8] = {"Rania", "2AA5CAD5", "Exit"};
  employees[9] = {"Meriem", "0AF461D5", "Entry"};
  employees[10] = {"Meriem", "0AF461D5", "Exit"};

  ssl_client.setInsecure();
  ssl_client.setHandshakeTimeout(5);

  initializeApp(aClient, app, getAuth(user_auth), processData, "🔐 authTask");
  app.getApp<RealtimeDatabase>(Database);
  Database.url(DATABASE_URL);

  Serial.println("System ready. Waiting for RFID data...");
  Serial.println("Serial (Monitor) input or Serial2 (UART) - Numbers 1-10");
}

void loop() {
  app.loop();

  // Check for Serial2 input (UART - from external RFID device)
  if (Serial2.available()) {
    uint8_t received = Serial2.read();
    Serial.println("[UART] Received: " + String(received));

    // LED feedback
    switch(received) {
      case 1: blinkLED(1, 500); break;
      case 2: blinkLED(2, 500); break;
      case 3: blinkLED(3, 500); break;
      case 4: blinkLED(4, 200); break;
      case 5: blinkLED(5, 200); break;
      case 6:
        digitalWrite(LED, HIGH);
        delay(2000);
        digitalWrite(LED, LOW);
        break;
    }

    // Send to Firebase (mapping data for valid RFID codes)
    if (received >= 1 && received <= 10) {
      if (app.ready()) {
        uid = app.getUid().c_str();
        
        // Validate UID is not empty
        if (uid.length() == 0) {
          Serial.println("❌ Error: UID is empty - authentication not complete");
        } else {
          databasePath = "/UsersData/" + uid + "/readings";

          unsigned long timestamp = millis();
          String timeString = getFormattedTime();

          parentPath = databasePath + "/" + String(timestamp);

          // Create fresh objects for each write to avoid reuse issues
          object_t tempData, n, u, s, t;
          writer.create(n, "name", employees[received].name);
          writer.create(u, "uid", employees[received].rfid);
          writer.create(s, "status", employees[received].status);
          writer.create(t, "time", timeString);
          writer.join(tempData, 4, n, u, s, t);

          Database.set<object_t>(aClient, parentPath, tempData, processData, "UART_Data");

          Serial.printf("📤 Firebase: Name=%s, UID=%s, Status=%s, Time=%s\n",
                        employees[received].name.c_str(),
                        employees[received].rfid.c_str(),
                        employees[received].status.c_str(),
                        timeString.c_str());
        }
      } else {
        Serial.println("⚠️  Firebase not ready");
      }
    }
  }

  // Check for Serial input (Monitor - for testing)
  if (Serial.available()) {
    int number = Serial.parseInt();
    if (number >= 1 && number <= 10) {
      if (app.ready()) {
        uid = app.getUid().c_str();
        
        // Validate UID is not empty
        if (uid.length() == 0) {
          Serial.println("❌ Error: UID is empty - authentication not complete");
        } else {
          databasePath = "/UsersData/" + uid + "/readings";

          unsigned long timestamp = millis();
          String timeString = getFormattedTime();

          parentPath = databasePath + "/" + String(timestamp);

          // Create fresh objects for each write to avoid reuse issues
          object_t tempData, n, u, s, t;
          writer.create(n, "name", employees[number].name);
          writer.create(u, "uid", employees[number].rfid);
          writer.create(s, "status", employees[number].status);
          writer.create(t, "time", timeString);
          writer.join(tempData, 4, n, u, s, t);

          Database.set<object_t>(aClient, parentPath, tempData, processData, "Serial_Test");

          Serial.printf("📤 Firebase (Test): Name=%s, UID=%s, Status=%s, Time=%s\n",
                        employees[number].name.c_str(),
                        employees[number].rfid.c_str(),
                        employees[number].status.c_str(),
                        timeString.c_str());
        }
      } else {
        Serial.println("⚠️  Firebase not ready");
      }
    } else if (number != 0) {
      Serial.println("Invalid number. Enter 1-10.");
    }
    // Clear serial buffer
    while (Serial.available()) Serial.read();
  }
}

void processData(AsyncResult &aResult) {
  if (!aResult.isResult())
    return;

  if (aResult.isEvent())
    Firebase.printf("Event task: %s, msg: %s, code: %d\n",
      aResult.uid().c_str(), aResult.eventLog().message().c_str(), aResult.eventLog().code());

  if (aResult.isDebug())
    Firebase.printf("Debug task: %s, msg: %s\n",
      aResult.uid().c_str(), aResult.debug().c_str());

  if (aResult.isError())
    Firebase.printf("Error task: %s, msg: %s, code: %d\n",
      aResult.uid().c_str(), aResult.error().message().c_str(), aResult.error().code());

  if (aResult.available())
    Firebase.printf("task: %s, payload: %s\n",
      aResult.uid().c_str(), aResult.c_str());
}
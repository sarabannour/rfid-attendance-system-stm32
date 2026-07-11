#  Overview

The **Smart Attendance System** is an embedded IoT solution designed to automate personnel attendance using **RFID technology**, **STM32**, and **ESP32**. The system identifies authorized users through RFID cards, manages access via a servo-controlled mechanism, provides real-time feedback through an LCD and status indicators, and synchronizes attendance records with **Firebase**. A web-based dashboard enables centralized monitoring and management of attendance data.

---

#  Key Features

- Secure RFID-based user identification
- Servo-controlled access mechanism
- Real-time LCD status display
- LED and buzzer event notifications
- STM32–ESP32 serial communication
- Firebase cloud synchronization
- Web dashboard for attendance monitoring
- Modular and scalable firmware architecture

---

#  System Architecture

```text
                RFID Card
                    │
                    ▼
              RC522 RFID Reader
                    │ SPI
                    ▼
               STM32 MCU
     ┌──────────┼──────────┐
     │          │          │
   I2C        PWM        GPIO
     │          │          │
 LCD Display  Servo    LEDs & Buzzer
                    │
                 UART
                    │
                    ▼
                 ESP32 Wi-Fi
                    │
                    ▼
             Firebase Database
                    │
                    ▼
             Web Dashboard
```

---

# Technology Stack

### Hardware
- STM32 Microcontroller
- ESP32 Wi-Fi Module
- RC522 RFID Reader
- SG90 Servo Motor
- I2C LCD Display
- LEDs
- Active Buzzer

### Software
- STM32CubeMX
- STM32CubeIDE
- Embedded C (STM32 HAL)
- Arduino Framework (ESP32)
- Firebase Realtime Database
- HTML, CSS & JavaScript
- Proteus Design Suite

---

#  Core Components

| Component | Function |
|-----------|----------|
| **STM32** | Main embedded controller |
| **ESP32** | Wi-Fi communication and cloud connectivity |
| **RC522** | RFID card authentication |
| **SG90 Servo** | Access control mechanism |
| **LCD I2C** | User interaction and system status |
| **LEDs & Buzzer** | Visual and audible notifications |
| **Firebase** | Cloud-based attendance storage |
| **Dashboard** | Real-time attendance visualization |

---
#  System Demonstration

### 🔹 Waiting for RFID Card

![Scan Card](Images/project_layout.jpg)

The system remains idle while waiting for an RFID card.

---

### ✅ Access Granted

![Access Granted](Images/access_welcome.jpg)

A registered user is authenticated, the servo unlocks the door, and a welcome message is displayed.

---

### 👋 Exit Registered

![Goodbye](Images/access_goodbye.jpg)

The user's exit is recorded, and a goodbye message is displayed.

---

###  Access Denied

![Access Denied](Images/access_denied.jpg)

An unregistered RFID card is detected. Access is denied.

#  Skills & Knowledge Acquired

This project strengthened my practical experience in:

- Embedded systems development
- STM32 peripheral configuration (SPI, I2C, UART, PWM, GPIO)
- RFID-based authentication systems
- Real-time embedded software design
- STM32–ESP32 communication
- IoT and cloud integration using Firebase
- Full-stack dashboard development
- Hardware/software integration and debugging
- Embedded system simulation with Proteus
- Version control using Git and GitHub

---

#  Repository Structure

```text
Smart-Attendance-System/
│
├── Core/                    # STM32 firmware
├── ESP32/                   # ESP32 source code
├── Dashboard/               # Web application
├── Proteus/
│   ├── Schematic/
│   ├── 3D_Model/
│   └── Simulation/
├── Documentation/
│   └── Project_Report.pdf
├── Images/
└── README.md
```

---

#  Future Enhancements

- Mobile application integration
- Offline data synchronization
- Enhanced cybersecurity and access control

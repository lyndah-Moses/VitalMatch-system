VitalMatch: A Cloud-Mobile Orchestration System for Blood Donor Recruitment
VitalMatch is a proximity-based digital healthcare solution designed to address the "geographic blindness" in Kenya’s blood supply chain. By replacing manual social media appeals with automated cloud orchestration and AI-driven screening, the system ensures that life-saving blood donations are coordinated with precision, speed, and security.

1. Executive Overview
In many urban centers such as Nairobi and Mombasa, emergency blood recruitment relies on unverified social media posts. VitalMatch addresses this by establishing a geofenced nexus that connects healthcare facilities directly to eligible donors within a 10km radius in real-time.

2. Key Functionalities
Emergency Appeal Orchestration: Facilitates the broadcasting of localized distress calls based on blood type and urgency by healthcare facilities.

Geospatial Matching: Implements the Haversine formula to identify and notify donors within a defined 10km geofence.

AI Health Triage: Integrated with Google Gemini AI to conduct automated pre-donation health screenings based on KNBTS standards.

Secure QR Verification: Generates time-sensitive tokens to verify donor identity and facilitate a secure "vein-to-vein" handshake at the point of care.

3. Technology Stack
Frontend: Flutter / Dart (Cross-platform Mobile and Web)

Backend: Firebase Cloud Functions (Serverless Architecture)

Database: Google Cloud Firestore (NoSQL)

AI Engine: Google Gemini Pro API

Version Control: Git and GitHub

4. Project Structure
lib/ – Contains core Dart implementation and UI components.

assets/ – Supporting documentation, architecture diagrams, and branding materials.

firebase/ – Backend orchestration logic and security rules.

5. Installation and Setup
Clone the Repository:
git clone https://github.com/lyndah-Moses/VitalMatch-system.git

Install Dependencies:
flutter pub get

Configuration:

Place the google-services.json file in the /android/app directory.

Configure the Gemini API Key within the environment variables.

Execution:
flutter run

6. Academic Context
This project was developed as a final-year research initiative at the United States International University-Africa (USIU-Africa) under the supervision of Prof. Stanley Githinji.

7. License
Distributed under the MIT License. Refer to the LICENSE file for further details.

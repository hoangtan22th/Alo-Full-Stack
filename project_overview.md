# Project Overview: Alo-Full-Stack

This document provides a high-level overview of the `Alo-Full-Stack` project, specifically focusing on the `auth-service`, `Mobile` (alo-chat), and `infrastructure` directories as requested.

The project follows a standard microservices architecture for the backend (using Spring Boot & Spring Cloud), alongside a React Native mobile application.

---

## 1. Infrastructure (`/infrastructure`)
This directory contains the core microservice architecture foundation components.

- **`discovery-service`**: Acts as a **Service Registry** using Netflix Eureka. All other backend services will register themselves here so they can discover and communicate with each other dynamically.
- **`api-gateway`**: Acts as the single entry point for all client requests (Mobile/Web) using Spring Cloud Gateway. 
  - **Security check**: It contains custom filters like `AuthenticationFilter` and `JwtUtils`. This means before a request reaches any backend service, the gateway intercepts it, validates the JWT token, and only forwards it if authorized.

## 2. Backend Authentication Service (`/Backend/auth-service`)
This is a Spring Boot application responsible for handling user identities, registration, login, and session management.

### Key Technologies
- **Java 21**, **Spring Boot 3.x**
- **JWT (jjwt)**, **Spring Security**, and **OAuth2** for token generation and validation.
- **Spring Data JPA** (MariaDB) for structured data storage.
- **Redis** & **RabbitMQ (AMQP)** for caching, session management, or asynchronous tasks (like sending emails).
- **AWS S3** for file storage (likely avatars/profile pictures).

### Core Features & Structure
- **Classic Authentication (`AuthController`)**: Handles standard registration, login, password recovery, and tokens.
- **QR Authentication (`QrAuthController`, `QrAuthService`)**: Allows users to log in on the Web by scanning a QR code using their Mobile app. Uses `QrSession`.
- **Social Login (`SocialAuthController`)**: Supports logging in via external providers like Google (`google-api-client` dependency).
- **Session Management**: Tracks user sessions (`UserSession` entity) allowing users to see and manage their active sign-ins across multiple devices.
- **Profile Management (`ProfileController`)**: Viewing/updating user profiles and avatars via `S3Service`.

## 3. Mobile Application (`/Mobile/alo-chat`)
This is the client-facing mobile chat app.

### Key Technologies
- **React Native** & **Expo**: A modern framework for building cross-platform (iOS/Android) mobile apps. 
- **Expo Router**: Handles file-based routing/navigation (inside the `app/` folder).
- **NativeWind & TailwindCSS**: Used for modern, utility-first UI styling.

### Notable Capabilities (From dependencies)
- **Cameras & QR Scanning**: `expo-camera` is used heavily, likely serving the QR Code Authentication feature where the mobile app scans the Web's login QR code.
- **Google Sign-In**: Integrates with `@react-native-google-signin/google-signin` to support seamless OAuth login on mobile.
- **Assets & UI**: Uses `expo-image-picker` for profile picture updates, `lucide-react-native`/`react-native-heroicons` for icons, and Reanimated for fluid animations.
- **Structure**: Typical React structure with `components`, `hooks`, `contexts`, and `services` (for defining API calls using `axios`).

---

## Summary of How They Connect
1. The **Mobile app** sends an HTTP request (e.g., login or get profile) to the backend.
2. The request hits the **API Gateway** (`infrastructure/api-gateway`).
3. The Gateway handles CORS, validates any provided JWT, and routes the request to the appropriate microservice (e.g., **Auth-Service**) by looking it up in the **Discovery Service**.
4. The **Auth-Service** processes the request (e.g., checks credentials against MariaDB or saves an avatar to S3) and returns a response, along with newly minted JWT tokens if it was a login attempt.

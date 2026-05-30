# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy the shared library first and install it to the local Maven repo
COPY Backend/common-service /app/Backend/common-service
WORKDIR /app/Backend/common-service
RUN mvn clean install -DskipTests

# Copy the notification-service code and build it
WORKDIR /app
COPY Backend/notification-service /app/Backend/notification-service
WORKDIR /app/Backend/notification-service
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/Backend/notification-service/target/*.jar app.jar

EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]

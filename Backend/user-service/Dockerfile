# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy the shared library first and install it to the local Maven repo
COPY Backend/common-service /app/Backend/common-service
WORKDIR /app/Backend/common-service
RUN mvn clean install -DskipTests

# Copy the user-service code and build it
WORKDIR /app
COPY Backend/user-service /app/Backend/user-service
WORKDIR /app/Backend/user-service
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/Backend/user-service/target/*.jar app.jar

EXPOSE 8086
ENTRYPOINT ["java", "-jar", "app.jar"]

FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/actuator/health >/dev/null || exit 1

# Run application
ENTRYPOINT ["java", "-jar", "app.jar"]

FROM production AS cloudrun
COPY cloudrun-entrypoint.sh /app/cloudrun-entrypoint.sh
ENTRYPOINT ["/bin/sh", "/app/cloudrun-entrypoint.sh"]

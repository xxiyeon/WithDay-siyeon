FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
# 백엔드 빌드에 필요한 파일들을 복사

COPY gradlew .
COPY gradle ./gradle
COPY build.gradle .
COPY settings.gradle .

RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon || true

COPY src ./src
RUN ./gradlew clean bootJar -x test --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 10400

ENTRYPOINT ["java", "-jar", "app.jar"]
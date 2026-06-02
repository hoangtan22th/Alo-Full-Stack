@echo off
set USERNAME=hoangtan22th

echo Dang login Docker...
docker login

echo Bat dau build va push...

@REM echo --------------------------------------------------
@REM echo 1. Dang build alo-discovery-service...
@REM docker build -t %USERNAME%/alo-discovery-service:latest -f infrastructure/discovery-service/Dockerfile .
@REM docker push %USERNAME%/alo-discovery-service:latest

@REM echo --------------------------------------------------
@REM echo 2. Dang build alo-api-gateway...
@REM docker build -t %USERNAME%/alo-api-gateway:latest -f infrastructure/api-gateway/Dockerfile .
@REM docker push %USERNAME%/alo-api-gateway:latest

@REM echo --------------------------------------------------
@REM echo 3. Dang build alo-auth-service...
@REM docker build -t %USERNAME%/alo-auth-service:latest -f Backend/auth-service/Dockerfile .
@REM docker push %USERNAME%/alo-auth-service:latest

@REM echo --------------------------------------------------
@REM echo 4. Dang build alo-user-service...
@REM docker build -t %USERNAME%/alo-user-service:latest -f Backend/user-service/Dockerfile .
@REM docker push %USERNAME%/alo-user-service:latest

@REM echo --------------------------------------------------
@REM echo 5. Dang build alo-contact-service...
@REM docker build -t %USERNAME%/alo-contact-service:latest -f Backend/contact-service/Dockerfile .
@REM docker push %USERNAME%/alo-contact-service:latest

@REM echo --------------------------------------------------
@REM echo 6. Dang build alo-notification-service...
@REM docker build -t %USERNAME%/alo-notification-service:latest -f Backend/notification-service/Dockerfile .
@REM docker push %USERNAME%/alo-notification-service:latest

@REM echo --------------------------------------------------
@REM echo 7. Dang build alo-chatbot-service...
@REM docker build -t %USERNAME%/alo-chatbot-service:latest -f Backend/chatbot-service/Dockerfile .
@REM docker push %USERNAME%/alo-chatbot-service:latest

@REM echo --------------------------------------------------
@REM echo 8. Dang build alo-report-service...
@REM docker build -t %USERNAME%/alo-report-service:latest -f Backend/report-service/Dockerfile .
@REM docker push %USERNAME%/alo-report-service:latest

@REM echo --------------------------------------------------
@REM echo 9. Dang build alo-message-service...
@REM docker build -t %USERNAME%/alo-message-service:latest -f Backend/message-service/Dockerfile .
@REM docker push %USERNAME%/alo-message-service:latest

@REM echo --------------------------------------------------
@REM echo 10. Dang build alo-group-service...
@REM docker build -t %USERNAME%/alo-group-service:latest -f Backend/group-service/Dockerfile .
@REM docker push %USERNAME%/alo-group-service:latest

@REM echo --------------------------------------------------
@REM echo 11. Dang build alo-realtime-service...
@REM docker build -t %USERNAME%/alo-realtime-service:latest -f Backend/realtime-service/Dockerfile .
@REM docker push %USERNAME%/alo-realtime-service:latest

@REM echo --------------------------------------------------
@REM echo 12. Dang build alo-voting-service...
@REM docker build -t %USERNAME%/alo-voting-service:latest -f Backend/voting-service/Dockerfile .
@REM docker push %USERNAME%/alo-voting-service:latest

@REM echo --------------------------------------------------
@REM echo 13. Dang build alo-chat-web...
@REM docker build -t %USERNAME%/alo-chat-web:latest -f Web/alo-chat-2/Dockerfile .
@REM docker push %USERNAME%/alo-chat-web:latest

echo --------------------------------------------------
echo 14. Dang build alo-chat-admin...
docker build -t %USERNAME%/alo-chat-admin:latest -f Web/alo-chat-admin/Dockerfile .
docker push %USERNAME%/alo-chat-admin:latest

echo ==================================================
echo TAT CA DA DUOC BUILD & PUSH CONG XONG!
pause
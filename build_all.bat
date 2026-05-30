@echo off
set USERNAME=hoangtan22th

echo Dang login Docker...
docker login

echo Bat dau build va push...

echo --------------------------------------------------
echo 1. Dang build alo-discovery-service...
docker build -t %USERNAME%/alo-discovery-service:latest -f infrastructure/discovery-service/Dockerfile .
docker push %USERNAME%/alo-discovery-service:latest

echo --------------------------------------------------
echo 2. Dang build alo-api-gateway...
docker build -t %USERNAME%/alo-api-gateway:latest -f infrastructure/api-gateway/Dockerfile .
docker push %USERNAME%/alo-api-gateway:latest

echo --------------------------------------------------
echo 3. Dang build alo-auth-service...
docker build -t %USERNAME%/alo-auth-service:latest -f Backend/auth-service/Dockerfile .
docker push %USERNAME%/alo-auth-service:latest

echo --------------------------------------------------
echo 4. Dang build alo-user-service...
docker build -t %USERNAME%/alo-user-service:latest -f Backend/user-service/Dockerfile .
docker push %USERNAME%/alo-user-service:latest

echo --------------------------------------------------
echo 5. Dang build alo-contact-service...
docker build -t %USERNAME%/alo-contact-service:latest -f Backend/contact-service/Dockerfile .
docker push %USERNAME%/alo-contact-service:latest

echo --------------------------------------------------
echo 6. Dang build alo-notification-service...
docker build -t %USERNAME%/alo-notification-service:latest -f Backend/notification-service/Dockerfile .
docker push %USERNAME%/alo-notification-service:latest

echo --------------------------------------------------
echo 7. Dang build alo-chatbot-service...
docker build -t %USERNAME%/alo-chatbot-service:latest -f Backend/chatbot-service/Dockerfile .
docker push %USERNAME%/alo-chatbot-service:latest

echo --------------------------------------------------
echo 8. Dang build alo-report-service...
docker build -t %USERNAME%/alo-report-service:latest -f Backend/report-service/Dockerfile .
docker push %USERNAME%/alo-report-service:latest

echo --------------------------------------------------
echo 9. Dang build alo-message-service...
docker build -t %USERNAME%/alo-message-service:latest -f Backend/message-service/Dockerfile .
docker push %USERNAME%/alo-message-service:latest

echo --------------------------------------------------
echo 10. Dang build alo-group-service...
docker build -t %USERNAME%/alo-group-service:latest -f Backend/group-service/Dockerfile .
docker push %USERNAME%/alo-group-service:latest

echo --------------------------------------------------
echo 11. Dang build alo-realtime-service...
docker build -t %USERNAME%/alo-realtime-service:latest -f Backend/realtime-service/Dockerfile .
docker push %USERNAME%/alo-realtime-service:latest

echo --------------------------------------------------
echo 12. Dang build alo-voting-service...
docker build -t %USERNAME%/alo-voting-service:latest -f Backend/voting-service/Dockerfile .
docker push %USERNAME%/alo-voting-service:latest

echo --------------------------------------------------
echo 13. Dang build alo-chat-web...
docker build -t %USERNAME%/alo-chat-web:latest -f Web/alo-chat-2/Dockerfile .
docker push %USERNAME%/alo-chat-web:latest

echo --------------------------------------------------
echo 14. Dang build alo-chat-admin...
docker build -t %USERNAME%/alo-chat-admin:latest -f Web/alo-chat-admin/Dockerfile .
docker push %USERNAME%/alo-chat-admin:latest

echo ==================================================
echo TAT CA DA DUOC BUILD & PUSH CONG XONG!
pause
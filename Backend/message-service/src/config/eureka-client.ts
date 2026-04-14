import { Eureka } from 'eureka-js-client';
import dotenv from 'dotenv';

dotenv.config();

const PORT: number = parseInt(process.env.PORT as string, 10) || 8083;
const hostName = 'localhost'; 

const eurekaClient = new Eureka({
  instance: {
    // Sửa instanceId để Eureka hiển thị đúng địa chỉ localhost
    instanceId: `${hostName}:message-service:${PORT}`,
    app: 'MESSAGE-SERVICE',
    hostName: hostName,
    ipAddr: '127.0.0.1', // Trỏ thẳng về loopback
    statusPageUrl: `http://${hostName}:${PORT}/info`,
    healthCheckUrl: `http://${hostName}:${PORT}/health`,
    port: {
      $: PORT,
      '@enabled': true,
    },
    vipAddress: 'message-service',
    dataCenterInfo: {
      '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
      name: 'MyOwn',
    },
  },
  eureka: {
    host: process.env.EUREKA_HOST || 'localhost',
    port: parseInt(process.env.EUREKA_PORT as string, 10) || 8761,
    servicePath: '/eureka/apps/',
    maxRetries: 10,
    requestRetryDelay: 2000,
  },
});

export default eurekaClient;
import { Eureka } from 'eureka-js-client';
import dotenv from 'dotenv';

dotenv.config();

const PORT: number = parseInt(process.env.PORT as string, 10) || 8089;
const hostName = process.env.HOSTNAME || '127.0.0.1'; 
const ipAddr = process.env.IP_ADDR || '127.0.0.1';

const eurekaClient = new Eureka({
  instance: {
    instanceId: `${hostName}:post-service:${PORT}`,
    app: 'POST-SERVICE',
    hostName: hostName,
    ipAddr: ipAddr,
    statusPageUrl: `http://${hostName}:${PORT}/info`,
    healthCheckUrl: `http://${hostName}:${PORT}/health`,
    port: {
      $: PORT,
      '@enabled': true,
    },
    vipAddress: 'post-service',
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

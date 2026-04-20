import { Eureka } from "eureka-js-client";
import dotenv from "dotenv";
dotenv.config();

const port = parseInt(process.env.PORT || "8087", 10);
const hostName = process.env.HOSTNAME || "localhost";
const ipAddr = process.env.IP_ADDR || "127.0.0.1";

export const eurekaClient = new Eureka({
  instance: {
    app: "VOTING-SERVICE",
    instanceId: `voting-service:${port}`,
    hostName: hostName,
    ipAddr: ipAddr,
    statusPageUrl: `http://${hostName}:${port}/health`,
    port: {
      $: port,
      "@enabled": true,
    },
    vipAddress: "VOTING-SERVICE",
    dataCenterInfo: {
      "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
      name: "MyOwn",
    },
  },
  eureka: {
    host: process.env.EUREKA_HOST || "localhost",
    port: parseInt(process.env.EUREKA_PORT || "8761", 10),
    servicePath: "/eureka/apps/",
    maxRetries: 10,
    requestRetryDelay: 2000,
  },
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eureka_js_client_1 = require("eureka-js-client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT, 10) || 8089;
const hostName = process.env.HOSTNAME || '127.0.0.1';
const ipAddr = process.env.IP_ADDR || '127.0.0.1';
const eurekaClient = new eureka_js_client_1.Eureka({
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
        port: parseInt(process.env.EUREKA_PORT, 10) || 8761,
        servicePath: '/eureka/apps/',
        maxRetries: 10,
        requestRetryDelay: 2000,
    },
});
exports.default = eurekaClient;
//# sourceMappingURL=eureka-client.js.map
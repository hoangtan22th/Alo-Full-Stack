export declare function connectRabbitMQ(): Promise<any>;
export declare function getChannel(): any;
export declare function publishToRealtime(event: string, payload: {
    room?: string;
    target?: string;
    data: any;
}): Promise<void>;
export declare function closeRabbitMQ(): Promise<void>;
//# sourceMappingURL=rabbitmq.d.ts.map
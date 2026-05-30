package edu.iuh.fit.report_service.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "admin.exchange";
    public static final String ROUTING_KEY_USER_BANNED = "user.banned";
    public static final String ROUTING_KEY_USER_WARNED = "user.warned";
    public static final String ROUTING_KEY_GROUP_DISBANDED = "group.disbanded";
    public static final String ROUTING_KEY_GROUP_WARNED = "group.warned";
    public static final String ROUTING_KEY_GROUP_BANNED = "group.banned";
    public static final String ROUTING_KEY_REPORT_CREATED = "report.created";
    public static final String ROUTING_KEY_REPORT_RESOLVED = "report.resolved";
    public static final String QUEUE_REPORT_AI_ANALYZE = "report.ai.analyze.queue";

    @Bean
    public TopicExchange adminExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public org.springframework.amqp.core.Queue reportAiAnalyzeQueue() {
        return new org.springframework.amqp.core.Queue(QUEUE_REPORT_AI_ANALYZE, true);
    }

    @Bean
    public org.springframework.amqp.core.Binding reportAiAnalyzeBinding() {
        return org.springframework.amqp.core.BindingBuilder
                .bind(reportAiAnalyzeQueue())
                .to(adminExchange())
                .with(ROUTING_KEY_REPORT_CREATED);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}

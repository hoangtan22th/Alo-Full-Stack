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
    public static final String ROUTING_KEY_REPORT_CREATED = "report.created";
    public static final String ROUTING_KEY_REPORT_RESOLVED = "report.resolved";

    @Bean
    public TopicExchange adminExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}

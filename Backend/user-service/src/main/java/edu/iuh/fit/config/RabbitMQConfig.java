package edu.iuh.fit.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "user.exchange";
    public static final String QUEUE_REGISTRATION = "user.registration.queue";
    public static final String ROUTING_KEY_UPDATE = "user.updated";

    public static final String EXCHANGE_ADMIN = "admin.exchange";
    public static final String ROUTING_KEY_USER_BANNED = "user.banned";
    public static final String ROUTING_KEY_USER_UNBANNED = "user.unbanned";
    public static final String ROUTING_KEY_USER_WARNED = "user.warned";
    
    public static final String EXCHANGE_PRESENCE = "presence_events";
    public static final String QUEUE_PRESENCE = "user.presence.queue";
    public static final String ROUTING_KEY_PRESENCE_ALL = "user.#";

    @Bean
    public TopicExchange userExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public TopicExchange adminExchange() {
        return new TopicExchange(EXCHANGE_ADMIN);
    }

    @Bean
    public TopicExchange presenceExchange() {
        return new TopicExchange(EXCHANGE_PRESENCE);
    }

    @Bean
    public Queue userRegistrationQueue() {
        return new Queue(QUEUE_REGISTRATION, true);
    }

    @Bean
    public Queue presenceQueue() {
        return new Queue(QUEUE_PRESENCE, true);
    }

    @Bean
    public Binding presenceBinding(Queue presenceQueue, TopicExchange presenceExchange) {
        return BindingBuilder.bind(presenceQueue).to(presenceExchange).with(ROUTING_KEY_PRESENCE_ALL);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}

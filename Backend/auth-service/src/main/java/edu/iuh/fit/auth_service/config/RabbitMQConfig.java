package edu.iuh.fit.auth_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "user.exchange";
    public static final String QUEUE_REGISTRATION = "user.registration.queue";
    public static final String ROUTING_KEY_REGISTRATION = "user.registered";
    public static final String QUEUE_AUTH_UPDATE = "auth.user.update.queue";
    public static final String ROUTING_KEY_UPDATE = "user.updated";
    
    // Exchange cho Realtime Chat System (dùng chung với realtime-service)
    public static final String CHAT_EXCHANGE = "chat_exchange";

    @Bean
    public TopicExchange userExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    @Bean
    public Queue userRegistrationQueue() {
        return new Queue(QUEUE_REGISTRATION, true); // Durable
    }

    @Bean
    public Binding bindingRegistration(Queue userRegistrationQueue, TopicExchange userExchange) {
        return BindingBuilder.bind(userRegistrationQueue).to(userExchange).with(ROUTING_KEY_REGISTRATION);
    }

    @Bean
    public Queue authUserUpdateQueue() {
        return new Queue(QUEUE_AUTH_UPDATE, true);
    }

    @Bean
    public Binding bindingUserUpdate(Queue authUserUpdateQueue, TopicExchange userExchange) {
        return BindingBuilder.bind(authUserUpdateQueue).to(userExchange).with(ROUTING_KEY_UPDATE);
    }

    @Bean
    public TopicExchange chatExchange() {
        // Đảm bảo chat_exchange cũng được tạo nếu Auth service boot trước
        return new TopicExchange(CHAT_EXCHANGE);
    }

    // Dùng JSON thay vì Binary serializer mặc định
    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}

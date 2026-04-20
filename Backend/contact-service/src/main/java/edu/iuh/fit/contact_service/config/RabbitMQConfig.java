// package edu.iuh.fit.contactservice.config;
//
// import
// org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
// import org.springframework.amqp.support.converter.MessageConverter;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import com.fasterxml.jackson.databind.ObjectMapper;
//
// @Configuration
// public class RabbitMQConfig {
//
// @Bean
// public MessageConverter jsonMessageConverter() {
// // Tạo một ObjectMapper để xử lý JSON chuyên nghiệp hơn
// ObjectMapper objectMapper = new ObjectMapper();
//
// // Vẫn dùng tên Class này nhưng Spring Boot 3 sẽ ưu tiên bản Smart
// return new Jackson2JsonMessageConverter(objectMapper);
// }
// }
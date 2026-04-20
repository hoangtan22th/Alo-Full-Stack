package edu.iuh.fit.chatbot_service.config;

import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    private final VectorStore vectorStore;

    // Trỏ tới file txt ông vừa tạo trong resources
    @Value("classpath:guidelines.txt")
    private Resource guidelineResource;

    public DataLoader(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println(">>> Đang kiểm tra dữ liệu trong Qdrant...");

        // Đọc file txt
        TextReader textReader = new TextReader(guidelineResource);
        textReader.getCustomMetadata().put("source", "alo-chat-guideline");

        // Băm nhỏ văn bản (để AI dễ đọc, không bị tràn token)
        TokenTextSplitter splitter = new TokenTextSplitter();
        var documents = splitter.apply(textReader.get());

        // Đẩy thẳng vào Qdrant qua cổng 6334
        vectorStore.accept(documents);
        System.out.println(">>> Đã nạp xong Guidelines vào Vector Store!");

    }
}
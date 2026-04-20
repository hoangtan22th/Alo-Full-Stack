package edu.iuh.fit.chatbot_service.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MemoryVectorService {

    private final VectorStore vectorStore;

    public MemoryVectorService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    /**
     * Lưu một đoạn hội thoại hoặc thông tin vào vector store
     */
    public void saveMemory(String content, Map<String, Object> metadata) {
        Document doc = new Document(content, metadata);
        vectorStore.add(List.of(doc));
    }

    /**
     * Tìm kiếm các ký ức liên quan đến câu hỏi của user
     */
    public List<Document> findRelevantMemories(String query, String userId, int topK) {
        return vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(topK)                    // sửa từ withTopK thành topK
                        .similarityThreshold(0.7)      // sửa from withSimilarityThreshold
                        .filterExpression("userId == '" + userId + "'")
                        .build()
        );
    }
}
package edu.iuh.fit.auth_service.service;

import edu.iuh.fit.auth_service.entity.Account;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.security.Key;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TokenService {

    @Value("${jwt.secret}")
    private String secret;

    private final StringRedisTemplate redisTemplate;

    public String generateAccessToken(Account user, String sessionId) {
        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName())
                .collect(Collectors.toList());

        return Jwts.builder()
                .setSubject(user.getId())
                .claim("email", user.getEmail())
                .claim("fullName", user.getFullName())
                .claim("sessionId", sessionId)
                .claim("roles", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 900000)) // 15 mins
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(Account user, String deviceId) {
        String tokenId = UUID.randomUUID().toString();
        // Lưu tokenId vào Redis để quản lý logout từ xa
//        redisTemplate.opsForValue().set("rt:" + user.getId() + ":" + deviceId, tokenId, 7, TimeUnit.DAYS);

        return Jwts.builder()
                .setId(tokenId)
                .setSubject(user.getId())
                .setExpiration(new Date(System.currentTimeMillis() + 604800000)) // 7 days
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)), SignatureAlgorithm.HS256)
                .compact();
    }
    // Trong TokenService.java

    public String getTokenIdFromJWT(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)))
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getId(); // Trả về giá trị JTI (tokenId)
    }

    public String getUserIdFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)))
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }
}

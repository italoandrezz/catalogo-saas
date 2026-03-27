package com.catalogo.api.security;

import com.catalogo.api.exception.TooManyRequestsException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private final int maxAttempts;
    private final long lockDurationSeconds;
    private final long stateTtlSeconds;
    private final int maxTrackedKeys;
    private final boolean redisEnabled;
    private final String redisKeyPrefix;
    private final StringRedisTemplate redisTemplate;
    private final Map<String, AttemptState> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(
            @Value("${auth.login.max-attempts:5}") int maxAttempts,
            @Value("${auth.login.lock-duration-seconds:900}") long lockDurationSeconds,
            @Value("${auth.login.state-ttl-seconds:86400}") long stateTtlSeconds,
            @Value("${auth.login.max-tracked-keys:20000}") int maxTrackedKeys,
            @Value("${auth.login.redis-enabled:false}") boolean redisEnabled,
            @Value("${auth.login.redis-key-prefix:auth:rl:}") String redisKeyPrefix,
            ObjectProvider<StringRedisTemplate> redisTemplateProvider
    ) {
        this.maxAttempts = maxAttempts;
        this.lockDurationSeconds = lockDurationSeconds;
        this.stateTtlSeconds = stateTtlSeconds;
        this.maxTrackedKeys = maxTrackedKeys;
        this.redisEnabled = redisEnabled;
        this.redisKeyPrefix = redisKeyPrefix;
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    public void ensureCanAttempt(String key) {
        ensureCanAttempt(key, "request");
    }

    public void ensureCanAttempt(String key, String operationLabel) {
        if (isUsingRedis()) {
            ensureCanAttemptRedis(key, operationLabel);
            return;
        }

        cleanup();
        AttemptState state = attempts.get(key);
        if (state == null) {
            return;
        }

        state.lastTouched = Instant.now();

        if (state.lockedUntil != null && Instant.now().isBefore(state.lockedUntil)) {
            long remaining = Math.max(1, state.lockedUntil.getEpochSecond() - Instant.now().getEpochSecond());
            throw new TooManyRequestsException("Too many " + operationLabel + " attempts. Try again in " + remaining + " seconds");
        }

        if (state.lockedUntil != null && Instant.now().isAfter(state.lockedUntil)) {
            attempts.remove(key);
        }
    }

    public void registerSuccess(String key) {
        if (isUsingRedis()) {
            redisTemplate.delete(redisKey(key));
            return;
        }

        cleanup();
        attempts.remove(key);
    }

    public void registerFailure(String key) {
        if (isUsingRedis()) {
            registerFailureRedis(key);
            return;
        }

        cleanup();
        attempts.compute(key, (ignored, state) -> {
            AttemptState current = state == null ? new AttemptState() : state;
            current.failures++;
            current.lastTouched = Instant.now();

            if (current.failures >= maxAttempts) {
                current.failures = 0;
                current.lockedUntil = Instant.now().plusSeconds(lockDurationSeconds);
            }

            return current;
        });

        if (attempts.size() > maxTrackedKeys) {
            attempts.entrySet().stream()
                    .min(Comparator.comparing(entry -> entry.getValue().lastTouched))
                    .ifPresent(entry -> attempts.remove(entry.getKey()));
        }
    }

    private void ensureCanAttemptRedis(String key, String operationLabel) {
        String redisKey = redisKey(key);
        Instant now = Instant.now();

        String lockedUntilRaw = (String) redisTemplate.opsForHash().get(redisKey, "lockedUntil");
        long lockedUntil = parseLong(lockedUntilRaw);

        if (lockedUntil > now.getEpochSecond()) {
            long remaining = Math.max(1, lockedUntil - now.getEpochSecond());
            throw new TooManyRequestsException("Too many " + operationLabel + " attempts. Try again in " + remaining + " seconds");
        }

        redisTemplate.opsForHash().put(redisKey, "lastTouched", String.valueOf(now.getEpochSecond()));
        redisTemplate.expire(redisKey, java.time.Duration.ofSeconds(stateTtlSeconds));
    }

    private void registerFailureRedis(String key) {
        String redisKey = redisKey(key);
        Instant now = Instant.now();

        Long failures = redisTemplate.opsForHash().increment(redisKey, "failures", 1);
        long failureCount = failures != null ? failures : 1;

        redisTemplate.opsForHash().put(redisKey, "lastTouched", String.valueOf(now.getEpochSecond()));

        if (failureCount >= maxAttempts) {
            redisTemplate.opsForHash().put(redisKey, "failures", "0");
            redisTemplate.opsForHash().put(redisKey, "lockedUntil", String.valueOf(now.plusSeconds(lockDurationSeconds).getEpochSecond()));
        }

        redisTemplate.expire(redisKey, java.time.Duration.ofSeconds(stateTtlSeconds));
    }

    private long parseLong(String value) {
        if (value == null || value.isBlank()) return 0;
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private boolean isUsingRedis() {
        return redisEnabled && redisTemplate != null;
    }

    private String redisKey(String key) {
        return redisKeyPrefix + key;
    }

    private void cleanup() {
        Instant now = Instant.now();
        attempts.entrySet().removeIf(entry -> {
            AttemptState state = entry.getValue();
            boolean lockExpired = state.lockedUntil == null || now.isAfter(state.lockedUntil);
            boolean stale = now.isAfter(state.lastTouched.plusSeconds(stateTtlSeconds));
            return lockExpired && stale;
        });
    }

    private static final class AttemptState {
        private int failures;
        private Instant lockedUntil;
        private Instant lastTouched = Instant.now();
    }
}

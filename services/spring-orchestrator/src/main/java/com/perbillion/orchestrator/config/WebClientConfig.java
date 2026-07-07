package com.perbillion.orchestrator.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${ml.engine.url:http://ml-engine:5000}")
    private String mlEngineUrl;

    @Bean
    public WebClient mlEngineClient() {
        return WebClient.builder()
            .baseUrl(mlEngineUrl)
            .build();
    }
}

package com.perbillion.orchestrator.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    @Value("${ml.engine.url:http://ml-engine:5000}")
    private String mlEngineUrl;

    @Bean
    public WebClient mlEngineClient() {
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ofSeconds(90));
        return WebClient.builder()
            .baseUrl(mlEngineUrl)
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
